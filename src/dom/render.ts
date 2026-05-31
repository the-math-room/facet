import type { Dispatch, Renderer, UiOf } from "../core/ui";
import type { HtmlAttribute } from "../core/html";
import type { Tree, TreeUi } from "../tree/tree-ui";
import { exposeTree } from "../tree/tree-ui";

type ListenerRecord = {
  readonly element: Element;
  readonly eventName: string;
  readonly listener: EventListener;
};

type ResolvedTree =
  | { readonly kind: "empty" }
  | { readonly kind: "text"; readonly value: string }
  | {
      readonly kind: "node";
      readonly tag: string;
      readonly attributes: readonly HtmlAttribute<unknown>[];
      readonly children: readonly ResolvedTree[];
    }
  | {
      readonly kind: "concat";
      readonly children: readonly ResolvedTree[];
    }
  | {
      readonly kind: "keyed";
      readonly key: string | number;
      readonly child: ResolvedTree;
    };

export type DomMounted = {
  readonly target: Element;
  readonly listeners: ListenerRecord[];
  root: Node;
  tree: ResolvedTree;
};

/**
 * DOM interpreter.
 *
 * This renderer now performs a small same-position reconciliation instead of
 * remounting the entire tree on every patch. It is intentionally conservative:
 *
 * - Same text nodes are updated in place.
 * - Same-tag elements are updated in place.
 * - Different node kinds/tags are replaced.
 * - Children are reconciled by position.
 * - `keyed` preserves/replaces identity only at the current node.
 *
 * This is not yet a full React-style keyed diff. The immediate goal is to
 * preserve native DOM state for stable same-tag elements, especially focus,
 * cursor position, and input identity.
 */
export const DomRenderer: Renderer<TreeUi, Element, DomMounted> = {
  mount<Event>(
    target: Element,
    ui: UiOf<TreeUi, Event>,
    dispatch: Dispatch<Event>
  ): DomMounted {
    const listeners: ListenerRecord[] = [];
    const tree = resolveTree(
      exposeTree(ui) as Tree<unknown>,
      identity
    );

    target.textContent = "";
    const root = renderTree(
      tree,
      dispatch as Dispatch<unknown>,
      listeners
    );
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

    const nextTree = resolveTree(
      exposeTree(next) as Tree<unknown>,
      identity
    );

    const nextRoot = patchNode(
      mounted.root,
      mounted.tree,
      nextTree,
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

function removeAllListeners(listeners: ListenerRecord[]): void {
  for (const record of listeners) {
    record.element.removeEventListener(record.eventName, record.listener);
  }

  listeners.length = 0;
}

function resolveTree(
  tree: Tree<unknown>,
  mapEvent: (event: unknown) => unknown
): ResolvedTree {
  switch (tree.kind) {
    case "empty":
      return { kind: "empty" };

    case "text":
      return { kind: "text", value: tree.value };

    case "concat":
      return {
        kind: "concat",
        children: tree.children.map((child) =>
          resolveTree(child as Tree<unknown>, mapEvent)
        )
      };

    case "keyed":
      return {
        kind: "keyed",
        key: tree.key,
        child: resolveTree(tree.child as Tree<unknown>, mapEvent)
      };

    case "mapped":
      return resolveTree(
        tree.child,
        (event) => mapEvent(tree.map(event))
      );

    case "node":
      return {
        kind: "node",
        tag: tree.tag,
        attributes: tree.attributes.map((attribute) =>
          resolveAttribute(
            attribute as HtmlAttribute<unknown>,
            mapEvent
          )
        ),
        children: tree.children.map((child) =>
          resolveTree(child as Tree<unknown>, mapEvent)
        )
      };
  }
}

function resolveAttribute(
  attribute: HtmlAttribute<unknown>,
  mapEvent: (event: unknown) => unknown
): HtmlAttribute<unknown> {
  if (attribute.kind !== "event") {
    return attribute;
  }

  return {
    kind: "event",
    name: attribute.name,
    decode: (event) => {
      const decoded = attribute.decode(event);
      return decoded === null ? null : mapEvent(decoded);
    }
  };
}

function renderTree(
  tree: ResolvedTree,
  dispatch: Dispatch<unknown>,
  listeners: ListenerRecord[]
): Node {
  switch (tree.kind) {
    case "empty":
      return document.createComment("empty");

    case "text":
      return document.createTextNode(tree.value);

    case "concat": {
      const fragment = document.createDocumentFragment();

      for (const child of flattenChildren(tree.children)) {
        fragment.appendChild(renderTree(child, dispatch, listeners));
      }

      return fragment;
    }

    case "keyed":
      return renderTree(tree.child, dispatch, listeners);

    case "node": {
      const element = document.createElement(tree.tag);

      applyAttributes(element, [], tree.attributes, dispatch, listeners);
      appendChildren(element, tree.children, dispatch, listeners);

      return element;
    }
  }
}

function appendChildren(
  parent: Element,
  children: readonly ResolvedTree[],
  dispatch: Dispatch<unknown>,
  listeners: ListenerRecord[]
): void {
  for (const child of flattenChildren(children)) {
    parent.appendChild(renderTree(child, dispatch, listeners));
  }
}

function patchNode(
  node: Node,
  oldTree: ResolvedTree,
  newTree: ResolvedTree,
  dispatch: Dispatch<unknown>,
  listeners: ListenerRecord[]
): Node {
  const oldEffective = effectiveTree(oldTree);
  const newEffective = effectiveTree(newTree);

  if (
    oldTree.kind === "keyed" &&
    newTree.kind === "keyed" &&
    oldTree.key !== newTree.key
  ) {
    return replaceNode(node, newEffective, dispatch, listeners);
  }

  if (
    oldEffective.kind === "empty" &&
    newEffective.kind === "empty"
  ) {
    return node;
  }

  if (
    oldEffective.kind === "text" &&
    newEffective.kind === "text"
  ) {
    if (node.nodeValue !== newEffective.value) {
      node.nodeValue = newEffective.value;
    }

    return node;
  }

  if (
    oldEffective.kind === "node" &&
    newEffective.kind === "node" &&
    oldEffective.tag === newEffective.tag &&
    node instanceof Element
  ) {
    applyAttributes(
      node,
      oldEffective.attributes,
      newEffective.attributes,
      dispatch,
      listeners
    );

    patchChildren(
      node,
      oldEffective.children,
      newEffective.children,
      dispatch,
      listeners
    );

    return node;
  }

  return replaceNode(node, newEffective, dispatch, listeners);
}

function replaceNode(
  oldNode: Node,
  newTree: ResolvedTree,
  dispatch: Dispatch<unknown>,
  listeners: ListenerRecord[]
): Node {
  const newNode = renderTree(newTree, dispatch, listeners);

  if (oldNode.parentNode !== null) {
    oldNode.parentNode.replaceChild(newNode, oldNode);
  }

  return newNode;
}

function effectiveTree(tree: ResolvedTree): ResolvedTree {
  if (tree.kind === "keyed") {
    return effectiveTree(tree.child);
  }

  return tree;
}

function flattenChildren(
  children: readonly ResolvedTree[]
): readonly ResolvedTree[] {
  const result: ResolvedTree[] = [];

  for (const child of children) {
    if (child.kind === "concat") {
      result.push(...flattenChildren(child.children));
    } else {
      result.push(child);
    }
  }

  return result;
}

function patchChildren(
  parent: Element,
  oldChildrenRaw: readonly ResolvedTree[],
  newChildrenRaw: readonly ResolvedTree[],
  dispatch: Dispatch<unknown>,
  listeners: ListenerRecord[]
): void {
  const oldChildren = flattenChildren(oldChildrenRaw);
  const newChildren = flattenChildren(newChildrenRaw);
  const existingNodes = Array.from(parent.childNodes);
  const length = Math.max(oldChildren.length, newChildren.length);

  for (let index = 0; index < length; index += 1) {
    const oldChild = oldChildren[index];
    const newChild = newChildren[index];
    const existingNode = existingNodes[index];

    if (oldChild === undefined && newChild !== undefined) {
      parent.appendChild(renderTree(newChild, dispatch, listeners));
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
      patchNode(existingNode, oldChild, newChild, dispatch, listeners);
    }
  }
}

function applyAttributes(
  element: Element,
  oldAttributes: readonly HtmlAttribute<unknown>[],
  newAttributes: readonly HtmlAttribute<unknown>[],
  dispatch: Dispatch<unknown>,
  listeners: ListenerRecord[]
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
            dispatch(decoded);
          }
        };

        element.addEventListener(attribute.name, listener);

        listeners.push({
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
