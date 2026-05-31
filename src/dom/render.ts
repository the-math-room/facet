import type { Dispatch, Renderer, UiOf } from "../core/ui";
import type { HtmlAttribute } from "../core/html";
import type { Tree, TreeUi } from "../tree/tree-ui";
import { exposeTree } from "../tree/tree-ui";

type ListenerRecord = {
  readonly element: Element;
  readonly eventName: string;
  readonly listener: EventListener;
};

type EventMap = (event: unknown) => unknown;

type ChildFrame = {
  readonly tree: Tree<unknown>;
  readonly mapEvent: EventMap;
};

type RenderContext = {
  readonly dispatch: Dispatch<unknown>;
  readonly listeners: ListenerRecord[];
  readonly mapEvent: EventMap;
};

export type DomMounted = {
  readonly target: Element;
  readonly listeners: ListenerRecord[];
  root: Node;
  tree: Tree<unknown>;
};

/**
 * DOM interpreter.
 *
 * This renderer performs conservative reconciliation directly over the tree
 * representation. Lazy mapped-event nodes are evaluated while rendering or
 * patching, so there is no intermediate ResolvedTree allocation.
 *
 * Current reconciliation guarantees:
 *
 * - Same text nodes are updated in place.
 * - Same-tag elements are updated in place.
 * - Different node kinds/tags are replaced.
 * - Children are reconciled by position.
 * - `keyed` preserves/replaces identity only at the current node.
 *
 * Still intentionally not implemented:
 *
 * - full keyed child reordering
 * - event delegation
 * - advanced form control semantics
 */
export const DomRenderer: Renderer<TreeUi, Element, DomMounted> = {
  mount<Event>(
    target: Element,
    ui: UiOf<TreeUi, Event>,
    dispatch: Dispatch<Event>
  ): DomMounted {
    const listeners: ListenerRecord[] = [];
    const tree = exposeTree(ui) as Tree<unknown>;

    target.textContent = "";

    const root = renderTree(tree, {
      dispatch: dispatch as Dispatch<unknown>,
      listeners,
      mapEvent: identity
    });

    target.appendChild(root);

    return {
      target,
      root,
      tree,
      listeners
    };
  },

  patch<Event>(
    mounted: DomMounted,
    next: UiOf<TreeUi, Event>,
    dispatch: Dispatch<Event>
  ): DomMounted {
    removeAllListeners(mounted.listeners);

    const nextTree = exposeTree(next) as Tree<unknown>;

    const nextRoot = patchNode(
      mounted.root,
      mounted.tree,
      identity,
      nextTree,
      identity,
      dispatch as Dispatch<unknown>,
      mounted.listeners
    );

    mounted.root = nextRoot;
    mounted.tree = nextTree;

    return mounted;
  },

  unmount(mounted: DomMounted): void {
    removeAllListeners(mounted.listeners);
    mounted.target.textContent = "";
  }
};

function identity(event: unknown): unknown {
  return event;
}

function composeMap(
  outer: EventMap,
  inner: EventMap
): EventMap {
  return (event) => outer(inner(event));
}

function removeAllListeners(listeners: ListenerRecord[]): void {
  for (const record of listeners) {
    record.element.removeEventListener(record.eventName, record.listener);
  }

  listeners.length = 0;
}

function renderTree(
  tree: Tree<unknown>,
  context: RenderContext
): Node {
  switch (tree.kind) {
    case "empty":
      return document.createComment("empty");

    case "text":
      return document.createTextNode(tree.value);

    case "mapped":
      return renderTree(tree.child, {
        ...context,
        mapEvent: composeMap(context.mapEvent, tree.map)
      });

    case "keyed":
      return renderTree(tree.child as Tree<unknown>, context);

    case "concat": {
      const fragment = document.createDocumentFragment();

      for (const frame of flattenChildren(tree.children, context.mapEvent)) {
        fragment.appendChild(
          renderTree(frame.tree, {
            ...context,
            mapEvent: frame.mapEvent
          })
        );
      }

      return fragment;
    }

    case "node": {
      const element = document.createElement(tree.tag);

      applyAttributes(
        element,
        [],
        tree.attributes as readonly HtmlAttribute<unknown>[],
        context
      );

      appendChildren(element, tree.children, context);

      return element;
    }
  }
}

function appendChildren(
  parent: Element,
  children: readonly Tree<unknown>[],
  context: RenderContext
): void {
  for (const frame of flattenChildren(children, context.mapEvent)) {
    parent.appendChild(
      renderTree(frame.tree, {
        ...context,
        mapEvent: frame.mapEvent
      })
    );
  }
}

function patchNode(
  node: Node,
  oldTree: Tree<unknown>,
  oldMap: EventMap,
  newTree: Tree<unknown>,
  newMap: EventMap,
  dispatch: Dispatch<unknown>,
  listeners: ListenerRecord[]
): Node {
  if (oldTree.kind === "mapped") {
    return patchNode(
      node,
      oldTree.child,
      composeMap(oldMap, oldTree.map),
      newTree,
      newMap,
      dispatch,
      listeners
    );
  }

  if (newTree.kind === "mapped") {
    return patchNode(
      node,
      oldTree,
      oldMap,
      newTree.child,
      composeMap(newMap, newTree.map),
      dispatch,
      listeners
    );
  }

  if (oldTree.kind === "keyed" && newTree.kind === "keyed") {
    if (oldTree.key !== newTree.key) {
      return replaceNode(node, newTree.child as Tree<unknown>, newMap, dispatch, listeners);
    }

    return patchNode(
      node,
      oldTree.child as Tree<unknown>,
      oldMap,
      newTree.child as Tree<unknown>,
      newMap,
      dispatch,
      listeners
    );
  }

  if (oldTree.kind === "keyed" || newTree.kind === "keyed") {
    return replaceNode(
      node,
      unwrapKeyed(newTree),
      newMap,
      dispatch,
      listeners
    );
  }

  if (oldTree.kind === "empty" && newTree.kind === "empty") {
    return node;
  }

  if (oldTree.kind === "text" && newTree.kind === "text") {
    if (node.nodeValue !== newTree.value) {
      node.nodeValue = newTree.value;
    }

    return node;
  }

  if (
    oldTree.kind === "node" &&
    newTree.kind === "node" &&
    oldTree.tag === newTree.tag &&
    node instanceof Element
  ) {
    const context: RenderContext = {
      dispatch,
      listeners,
      mapEvent: newMap
    };

    applyAttributes(
      node,
      oldTree.attributes as readonly HtmlAttribute<unknown>[],
      newTree.attributes as readonly HtmlAttribute<unknown>[],
      context
    );

    patchChildren(
      node,
      oldTree.children,
      oldMap,
      newTree.children,
      newMap,
      dispatch,
      listeners
    );

    return node;
  }

  return replaceNode(
    node,
    unwrapKeyed(newTree),
    newMap,
    dispatch,
    listeners
  );
}

function unwrapKeyed(tree: Tree<unknown>): Tree<unknown> {
  if (tree.kind === "keyed") {
    return unwrapKeyed(tree.child as Tree<unknown>);
  }

  return tree;
}

function replaceNode(
  oldNode: Node,
  newTree: Tree<unknown>,
  newMap: EventMap,
  dispatch: Dispatch<unknown>,
  listeners: ListenerRecord[]
): Node {
  const newNode = renderTree(newTree, {
    dispatch,
    listeners,
    mapEvent: newMap
  });

  if (oldNode.parentNode !== null) {
    oldNode.parentNode.replaceChild(newNode, oldNode);
  }

  return newNode;
}

function flattenChildren(
  children: readonly Tree<unknown>[],
  mapEvent: EventMap
): readonly ChildFrame[] {
  const result: ChildFrame[] = [];

  for (const child of children) {
    if (child.kind === "concat") {
      result.push(...flattenChildren(child.children, mapEvent));
      continue;
    }

    if (child.kind === "mapped") {
      result.push(...flattenChildren([child.child], composeMap(mapEvent, child.map)));
      continue;
    }

    result.push({
      tree: child,
      mapEvent
    });
  }

  return result;
}

function patchChildren(
  parent: Element,
  oldChildrenRaw: readonly Tree<unknown>[],
  oldMap: EventMap,
  newChildrenRaw: readonly Tree<unknown>[],
  newMap: EventMap,
  dispatch: Dispatch<unknown>,
  listeners: ListenerRecord[]
): void {
  const oldChildren = flattenChildren(oldChildrenRaw, oldMap);
  const newChildren = flattenChildren(newChildrenRaw, newMap);
  const existingNodes = Array.from(parent.childNodes);
  const length = Math.max(oldChildren.length, newChildren.length);

  for (let index = 0; index < length; index += 1) {
    const oldChild = oldChildren[index];
    const newChild = newChildren[index];
    const existingNode = existingNodes[index];

    if (oldChild === undefined && newChild !== undefined) {
      parent.appendChild(
        renderTree(newChild.tree, {
          dispatch,
          listeners,
          mapEvent: newChild.mapEvent
        })
      );
      continue;
    }

    if (
      oldChild !== undefined &&
      newChild === undefined &&
      existingNode !== undefined
    ) {
      parent.removeChild(existingNode);
      continue;
    }

    if (
      oldChild !== undefined &&
      newChild !== undefined &&
      existingNode !== undefined
    ) {
      patchNode(
        existingNode,
        oldChild.tree,
        oldChild.mapEvent,
        newChild.tree,
        newChild.mapEvent,
        dispatch,
        listeners
      );
    }
  }
}

function applyAttributes(
  element: Element,
  oldAttributes: readonly HtmlAttribute<unknown>[],
  newAttributes: readonly HtmlAttribute<unknown>[],
  context: RenderContext
): void {
  removeOldAttributes(element, oldAttributes, newAttributes);

  for (const attribute of newAttributes) {
    switch (attribute.kind) {
      case "attribute":
        element.setAttribute(attribute.name, attribute.value);
        break;

      case "class":
        element.className = attribute.value;
        break;

      case "property":
        Reflect.set(element, attribute.name, attribute.value);
        break;

      case "event": {
        const listener: EventListener = (event) => {
          const decoded = attribute.decode(event);
          if (decoded !== null) {
            context.dispatch(context.mapEvent(decoded));
          }
        };

        element.addEventListener(attribute.name, listener);

        context.listeners.push({
          element,
          eventName: attribute.name,
          listener
        });

        break;
      }
    }
  }
}

function removeOldAttributes(
  element: Element,
  oldAttributes: readonly HtmlAttribute<unknown>[],
  newAttributes: readonly HtmlAttribute<unknown>[]
): void {
  for (const oldAttribute of oldAttributes) {
    switch (oldAttribute.kind) {
      case "attribute":
        if (
          !newAttributes.some(
            (attribute) =>
              attribute.kind === "attribute" &&
              attribute.name === oldAttribute.name
          )
        ) {
          element.removeAttribute(oldAttribute.name);
        }

        break;

      case "class":
        if (!newAttributes.some((attribute) => attribute.kind === "class")) {
          element.removeAttribute("class");
        }

        break;

      case "property":
        if (
          !newAttributes.some(
            (attribute) =>
              attribute.kind === "property" &&
              attribute.name === oldAttribute.name
          )
        ) {
          Reflect.set(element, oldAttribute.name, undefined);
        }

        break;

      case "event":
        break;
    }
  }
}
