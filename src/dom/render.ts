import type { Dispatch, Renderer, UiOf } from "../core/ui";
import type { HtmlAttribute } from "../html/html";
import type { Tree, TreeUi } from "../tree/tree-ui";
import { exposeTree } from "../tree/tree-ui";

type EventMap = (event: unknown) => unknown;
type EventPipeline = readonly EventMap[];

type ChildFrame = {
  readonly tree: Tree<unknown>;
  readonly pipeline: EventPipeline;
};

type DelegatedHandler = {
  readonly decode: (event: globalThis.Event) => unknown | null;
  readonly pipeline: EventPipeline;
};

type HandlerTable = WeakMap<Element, Map<string, readonly DelegatedHandler[]>>;

type DelegationState = {
  readonly table: HandlerTable;
  dispatch: Dispatch<unknown>;
  readonly target: Element;
  readonly rootListeners: Map<string, EventListener>;
};

type RenderContext = {
  readonly delegation: DelegationState;
  readonly pipeline: EventPipeline;
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
 * Facet's DOM renderer has one job: interpret an HTML tree denotation into DOM
 * nodes and keep those nodes reconciled.
 *
 * It intentionally does not own app state, effects, routing, forms, resources,
 * validation, persistence, animation, or styling systems.
 *
 * Performance-oriented choices:
 *
 * - Lazy mapped-event nodes are evaluated during render/patch.
 * - Event maps are stored as flat pipelines, not nested closure chains.
 * - Same-tag elements patch in place.
 * - Events are delegated through one capture-phase root listener per event type.
 * - Delegated handlers are updated per element, so future subtree bailouts can
 *   preserve existing handlers instead of requiring a global event-table rebuild.
 *
 * Still intentionally not implemented:
 *
 * - full keyed child reordering
 * - subtree bailout/memoization
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
      pipeline: []
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
    mounted.delegation.dispatch = dispatch as Dispatch<unknown>;

    const nextTree = exposeTree(next) as Tree<unknown>;

    const nextRoot = patchNode(
      mounted.root,
      mounted.tree,
      [],
      nextTree,
      [],
      mounted.delegation
    );

    mounted.root = nextRoot;
    mounted.tree = nextTree;

    return mounted;
  },

  unmount(mounted: DomMounted): void {
    for (const [eventName, listener] of mounted.delegation.rootListeners) {
      mounted.target.removeEventListener(eventName, listener, { capture: true });
    }

    mounted.delegation.rootListeners.clear();
    mounted.target.textContent = "";
  }
};

function applyPipeline(
  pipeline: EventPipeline,
  event: unknown
): unknown {
  let current = event;

  for (let index = pipeline.length - 1; index >= 0; index -= 1) {
    current = pipeline[index]!(current);
  }

  return current;
}

function appendMap(
  pipeline: EventPipeline,
  map: EventMap
): EventPipeline {
  return [...pipeline, map];
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
        pipeline: appendMap(context.pipeline, tree.map)
      });

    case "keyed":
      return renderTree(tree.child as Tree<unknown>, context);

    case "concat": {
      const fragment = document.createDocumentFragment();

      for (const frame of flattenChildren(tree.children, context.pipeline)) {
        fragment.appendChild(
          renderTree(frame.tree, {
            ...context,
            pipeline: frame.pipeline
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
  for (const frame of flattenChildren(children, context.pipeline)) {
    parent.appendChild(
      renderTree(frame.tree, {
        ...context,
        pipeline: frame.pipeline
      })
    );
  }
}

function patchNode(
  node: Node,
  oldTree: Tree<unknown>,
  oldPipeline: EventPipeline,
  newTree: Tree<unknown>,
  newPipeline: EventPipeline,
  delegation: DelegationState
): Node {
  if (oldTree.kind === "mapped") {
    return patchNode(
      node,
      oldTree.child,
      appendMap(oldPipeline, oldTree.map),
      newTree,
      newPipeline,
      delegation
    );
  }

  if (newTree.kind === "mapped") {
    return patchNode(
      node,
      oldTree,
      oldPipeline,
      newTree.child,
      appendMap(newPipeline, newTree.map),
      delegation
    );
  }

  if (oldTree.kind === "keyed" && newTree.kind === "keyed") {
    if (oldTree.key !== newTree.key) {
      return replaceNode(
        node,
        newTree.child as Tree<unknown>,
        newPipeline,
        delegation
      );
    }

    return patchNode(
      node,
      oldTree.child as Tree<unknown>,
      oldPipeline,
      newTree.child as Tree<unknown>,
      newPipeline,
      delegation
    );
  }

  if (oldTree.kind === "keyed" || newTree.kind === "keyed") {
    return replaceNode(
      node,
      unwrapKeyed(newTree),
      newPipeline,
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
      pipeline: newPipeline
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
      oldPipeline,
      newTree.children,
      newPipeline,
      delegation
    );

    return node;
  }

  return replaceNode(
    node,
    unwrapKeyed(newTree),
    newPipeline,
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
  newPipeline: EventPipeline,
  delegation: DelegationState
): Node {
  const newNode = renderTree(newTree, {
    delegation,
    pipeline: newPipeline
  });

  if (oldNode.parentNode !== null) {
    oldNode.parentNode.replaceChild(newNode, oldNode);
  }

  return newNode;
}

function flattenChildren(
  children: readonly Tree<unknown>[],
  pipeline: EventPipeline
): readonly ChildFrame[] {
  const result: ChildFrame[] = [];

  for (const child of children) {
    if (child.kind === "concat") {
      result.push(...flattenChildren(child.children, pipeline));
      continue;
    }

    if (child.kind === "mapped") {
      result.push(...flattenChildren([child.child], appendMap(pipeline, child.map)));
      continue;
    }

    result.push({
      tree: child,
      pipeline
    });
  }

  return result;
}

function patchChildren(
  parent: Element,
  oldChildrenRaw: readonly Tree<unknown>[],
  oldPipeline: EventPipeline,
  newChildrenRaw: readonly Tree<unknown>[],
  newPipeline: EventPipeline,
  delegation: DelegationState
): void {
  const oldChildren = flattenChildren(oldChildrenRaw, oldPipeline);
  const newChildren = flattenChildren(newChildrenRaw, newPipeline);
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
          pipeline: newChild.pipeline
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
        oldChild.pipeline,
        newChild.tree,
        newChild.pipeline,
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
  const nextHandlers = new Map<string, DelegatedHandler[]>();

  removeOldAttributes(element, oldAttributes, newAttributes, context.delegation);

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
        const handlers = nextHandlers.get(attribute.name) ?? [];

        handlers.push({
          decode: attribute.decode,
          pipeline: context.pipeline
        });

        nextHandlers.set(attribute.name, handlers);
        ensureRootListener(attribute.name, context.delegation);
        break;
      }
    }
  }

  setElementHandlers(element, nextHandlers, context.delegation);
}

function setElementHandlers(
  element: Element,
  nextHandlers: ReadonlyMap<string, readonly DelegatedHandler[]>,
  delegation: DelegationState
): void {
  if (nextHandlers.size === 0) {
    delegation.table.delete(element);
    return;
  }

  delegation.table.set(element, new Map(nextHandlers));
}

function ensureRootListener(
  eventName: string,
  delegation: DelegationState
): void {
  if (delegation.rootListeners.has(eventName)) {
    return;
  }

  const listener: EventListener = (event) => {
    for (const target of event.composedPath()) {
      if (!(target instanceof Element)) {
        continue;
      }

      const handlersByEvent = delegation.table.get(target);
      const handlers = handlersByEvent?.get(event.type);

      if (handlers !== undefined) {
        for (const handler of handlers) {
          const decoded = handler.decode(event);
          if (decoded !== null) {
            delegation.dispatch(applyPipeline(handler.pipeline, decoded));
          }
        }
      }

      if (target === delegation.target) {
        break;
      }
    }
  };

  delegation.target.addEventListener(eventName, listener, { capture: true });
  delegation.rootListeners.set(eventName, listener);
}

function removeOldAttributes(
  element: Element,
  oldAttributes: readonly HtmlAttribute<unknown>[],
  newAttributes: readonly HtmlAttribute<unknown>[],
  delegation: DelegationState
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
        if (
          !newAttributes.some(
            (attribute) =>
              attribute.kind === "event" &&
              attribute.name === oldAttribute.name
          )
        ) {
          const handlersByEvent = delegation.table.get(element);
          handlersByEvent?.delete(oldAttribute.name);

          if (handlersByEvent?.size === 0) {
            delegation.table.delete(element);
          }
        }

        break;
    }
  }
}
