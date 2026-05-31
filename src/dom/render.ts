import type { Dispatch, Renderer, UiOf } from "../core/ui";
import type { HtmlAttribute } from "../html/html";
import type { Tree, TreeUi } from "../tree/tree-ui";
import { exposeTree } from "../tree/tree-ui";

type EventMap = (event: unknown) => unknown;

type ChildFrame = {
  readonly tree: Tree<unknown>;
  readonly mapEvent: EventMap;
};

type DelegatedHandler = {
  readonly decode: (event: globalThis.Event) => unknown | null;
  readonly mapEvent: EventMap;
};

type HandlerTable = WeakMap<Element, Map<string, readonly DelegatedHandler[]>>;

type DelegationState = {
  table: HandlerTable;
  dispatch: Dispatch<unknown>;
  readonly target: Element;
  readonly rootListeners: Map<string, EventListener>;
};

type RenderContext = {
  readonly delegation: DelegationState;
  readonly mapEvent: EventMap;
};

export type DomMounted = {
  readonly target: Element;
  readonly delegation: DelegationState;
  root: Node;
  tree: Tree<unknown>;
};

/**
 * DOM interpreter.
 *
 * This renderer is intentionally scoped to one responsibility: interpret a
 * Facet HTML tree into DOM nodes and keep those nodes reconciled.
 *
 * It does not own app state, effects, routing, forms, resources, or styling.
 *
 * Performance-oriented choices:
 *
 * - Lazy mapped-event nodes are evaluated during render/patch.
 * - Same-tag elements patch in place.
 * - Events are delegated through one root listener per event type.
 *
 * Still intentionally not implemented:
 *
 * - full keyed child reordering
 * - advanced form control semantics
 */
export const DomRenderer: Renderer<TreeUi, Element, DomMounted> = {
  mount<Event>(
    target: Element,
    ui: UiOf<TreeUi, Event>,
    dispatch: Dispatch<Event>
  ): DomMounted {
    const tree = exposeTree(ui) as Tree<unknown>;

    const delegation: DelegationState = {
      table: new WeakMap(),
      dispatch: dispatch as Dispatch<unknown>,
      target,
      rootListeners: new Map()
    };

    target.textContent = "";

    const root = renderTree(tree, {
      delegation,
      mapEvent: identity
    });

    target.appendChild(root);

    return {
      target,
      delegation,
      root,
      tree
    };
  },

  patch<Event>(
    mounted: DomMounted,
    next: UiOf<TreeUi, Event>,
    dispatch: Dispatch<Event>
  ): DomMounted {
    mounted.delegation.table = new WeakMap();
    mounted.delegation.dispatch = dispatch as Dispatch<unknown>;

    const nextTree = exposeTree(next) as Tree<unknown>;

    const nextRoot = patchNode(
      mounted.root,
      mounted.tree,
      identity,
      nextTree,
      identity,
      mounted.delegation
    );

    mounted.root = nextRoot;
    mounted.tree = nextTree;

    return mounted;
  },

  unmount(mounted: DomMounted): void {
    for (const [eventName, listener] of mounted.delegation.rootListeners) {
      mounted.target.removeEventListener(eventName, listener);
    }

    mounted.delegation.rootListeners.clear();
    mounted.delegation.table = new WeakMap();
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
  delegation: DelegationState
): Node {
  if (oldTree.kind === "mapped") {
    return patchNode(
      node,
      oldTree.child,
      composeMap(oldMap, oldTree.map),
      newTree,
      newMap,
      delegation
    );
  }

  if (newTree.kind === "mapped") {
    return patchNode(
      node,
      oldTree,
      oldMap,
      newTree.child,
      composeMap(newMap, newTree.map),
      delegation
    );
  }

  if (oldTree.kind === "keyed" && newTree.kind === "keyed") {
    if (oldTree.key !== newTree.key) {
      return replaceNode(node, newTree.child as Tree<unknown>, newMap, delegation);
    }

    return patchNode(
      node,
      oldTree.child as Tree<unknown>,
      oldMap,
      newTree.child as Tree<unknown>,
      newMap,
      delegation
    );
  }

  if (oldTree.kind === "keyed" || newTree.kind === "keyed") {
    return replaceNode(
      node,
      unwrapKeyed(newTree),
      newMap,
      delegation
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
      delegation,
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
      delegation
    );

    return node;
  }

  return replaceNode(
    node,
    unwrapKeyed(newTree),
    newMap,
    delegation
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
  delegation: DelegationState
): Node {
  const newNode = renderTree(newTree, {
    delegation,
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
  delegation: DelegationState
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
          delegation,
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
        delegation
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

      case "event":
        registerDelegatedHandler(
          element,
          attribute.name,
          {
            decode: attribute.decode,
            mapEvent: context.mapEvent
          },
          context.delegation
        );
        break;
    }
  }
}

function registerDelegatedHandler(
  element: Element,
  eventName: string,
  handler: DelegatedHandler,
  delegation: DelegationState
): void {
  let handlersByEvent = delegation.table.get(element);

  if (handlersByEvent === undefined) {
    handlersByEvent = new Map();
    delegation.table.set(element, handlersByEvent);
  }

  const current = handlersByEvent.get(eventName) ?? [];
  handlersByEvent.set(eventName, [...current, handler]);

  ensureRootListener(eventName, delegation);
}

function ensureRootListener(
  eventName: string,
  delegation: DelegationState
): void {
  if (delegation.rootListeners.has(eventName)) {
    return;
  }

  const listener: EventListener = (event) => {
    const path = event.composedPath();

    for (const target of path) {
      if (!(target instanceof Element)) {
        continue;
      }

      const handlersByEvent = delegation.table.get(target);
      const handlers = handlersByEvent?.get(event.type);

      if (handlers === undefined) {
        continue;
      }

      for (const handler of handlers) {
        const decoded = handler.decode(event);
        if (decoded !== null) {
          delegation.dispatch(handler.mapEvent(decoded));
        }
      }

      if (target === delegation.target) {
        break;
      }
    }
  };

  delegation.target.addEventListener(eventName, listener);
  delegation.rootListeners.set(eventName, listener);
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
