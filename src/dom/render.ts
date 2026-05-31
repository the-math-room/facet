import type { Dispatch, Key, Renderer, UiOf } from "../core/ui";
import type { HtmlAttribute } from "../html/html";
import type { Tree, TreeUi } from "../tree/tree-ui";
import { exposeTree } from "../tree/tree-ui";

type EventMap = (event: unknown) => unknown;

type EventPipeline =
  | {
      readonly map: EventMap;
      readonly parent: EventPipeline;
    }
  | null;

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

type KeyedOldChild = {
  readonly key: Key;
  readonly frame: ChildFrame;
  readonly node: Node;
  readonly oldIndex: number;
  used: boolean;
};

type DesiredChild = {
  readonly node: Node;
  readonly oldIndex: number | null;
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
 * - Event maps are stored as linked pipeline nodes, not copied arrays.
 * - Same-tag elements patch in place.
 * - Keyed children are moved/reused across sibling reorders.
 * - Duplicate sibling keys throw eagerly.
 * - Memo nodes can skip patching unchanged subtrees by token.
 * - Events are delegated through one capture-phase root listener per event type.
 * - Delegated handlers are updated per element, so skipped memo subtrees can
 *   preserve existing handlers without requiring a global event-table rebuild.
 *
 * Still intentionally not implemented:
 *
 * - move-minimizing keyed reconciliation
 * - advanced form control semantics beyond defensive property clearing
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
      pipeline: null
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
      null,
      nextTree,
      null,
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
  let node = pipeline;

  while (node !== null) {
    current = node.map(current);
    node = node.parent;
  }

  return current;
}

function appendMap(
  pipeline: EventPipeline,
  map: EventMap
): EventPipeline {
  return {
    map,
    parent: pipeline
  };
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

    case "memo":
      return renderTree(tree.child as Tree<unknown>, context);

    case "keyed":
      return renderTree(tree.child as Tree<unknown>, context);

    case "concat": {
      const fragment = document.createDocumentFragment();
      const children = flattenChildren(tree.children, context.pipeline);

      assertUniqueKeys(children, "mounted");

      for (const frame of children) {
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
  childrenRaw: readonly Tree<unknown>[],
  context: RenderContext
): void {
  const children = flattenChildren(childrenRaw, context.pipeline);

  assertUniqueKeys(children, "mounted");

  for (const frame of children) {
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

  if (oldTree.kind === "memo") {
    if (newTree.kind === "memo" && Object.is(oldTree.token, newTree.token)) {
      return node;
    }

    return patchNode(
      node,
      oldTree.child as Tree<unknown>,
      oldPipeline,
      unwrapMemo(newTree),
      newPipeline,
      delegation
    );
  }

  if (newTree.kind === "memo") {
    return patchNode(
      node,
      unwrapMemo(oldTree),
      oldPipeline,
      newTree.child as Tree<unknown>,
      newPipeline,
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

  if (tree.kind === "memo") {
    return unwrapKeyed(tree.child as Tree<unknown>);
  }

  return tree;
}

function unwrapMemo(tree: Tree<unknown>): Tree<unknown> {
  if (tree.kind === "memo") {
    return tree.child as Tree<unknown>;
  }

  return tree;
}

function keyOfFrame(frame: ChildFrame): Key | null {
  return keyOfTree(frame.tree);
}

function keyOfTree(tree: Tree<unknown>): Key | null {
  if (tree.kind === "mapped") {
    return keyOfTree(tree.child);
  }

  if (tree.kind === "memo") {
    return keyOfTree(tree.child);
  }

  if (tree.kind === "keyed") {
    return tree.key;
  }

  return null;
}

function childForPatching(frame: ChildFrame): Tree<unknown> {
  return frame.tree;
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

  pushFlattenedChildren(result, children, pipeline);

  return result;
}

function pushFlattenedChildren(
  result: ChildFrame[],
  children: readonly Tree<unknown>[],
  pipeline: EventPipeline
): void {
  for (const child of children) {
    pushFlattenedChild(result, child, pipeline);
  }
}


function pushFlattenedChild(
  result: ChildFrame[],
  child: Tree<unknown>,
  pipeline: EventPipeline
): void {
  if (child.kind === "concat") {
    pushFlattenedChildren(result, child.children, pipeline);
    return;
  }

  if (child.kind === "mapped") {
    pushFlattenedChild(result, child.child, appendMap(pipeline, child.map));
    return;
  }

  /*
   * Do not unwrap memo here.
   *
   * patchNode must receive memo frames directly so unchanged nested memo tokens
   * can bail out before walking the child subtree.
   */
  result.push({
    tree: child,
    pipeline
  });
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

  assertUniqueKeys(oldChildren, "old");
  assertUniqueKeys(newChildren, "new");

  if (hasAnyKey(oldChildren) || hasAnyKey(newChildren)) {
    patchKeyedChildren(parent, oldChildren, newChildren, delegation);
    return;
  }

  patchChildrenByPosition(parent, oldChildren, newChildren, delegation);
}

function hasAnyKey(children: readonly ChildFrame[]): boolean {
  return children.some((child) => keyOfFrame(child) !== null);
}

function assertUniqueKeys(
  children: readonly ChildFrame[],
  label: string
): void {
  const seen = new Set<Key>();

  for (const child of children) {
    const key = keyOfFrame(child);

    if (key === null) {
      continue;
    }

    if (seen.has(key)) {
      throw new Error(`Duplicate keyed child "${String(key)}" in ${label} children.`);
    }

    seen.add(key);
  }
}

function patchChildrenByPosition(
  parent: Element,
  oldChildren: readonly ChildFrame[],
  newChildren: readonly ChildFrame[],
  delegation: DelegationState
): void {
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
        childForPatching(oldChild),
        oldChild.pipeline,
        childForPatching(newChild),
        newChild.pipeline,
        delegation
      );
    }
  }
}

function patchKeyedChildren(
  parent: Element,
  oldChildren: readonly ChildFrame[],
  newChildren: readonly ChildFrame[],
  delegation: DelegationState
): void {
  const oldNodes = Array.from(parent.childNodes);
  const oldKeyed = new Map<Key, KeyedOldChild>();
  const oldUnkeyedQueue: KeyedOldChild[] = [];

  for (let index = 0; index < oldChildren.length; index += 1) {
    const frame = oldChildren[index];
    const node = oldNodes[index];

    if (frame === undefined || node === undefined) {
      continue;
    }

    const key = keyOfFrame(frame);

    const oldChild: KeyedOldChild = {
      key: key ?? `__facet_unkeyed_${index}`,
      frame,
      node,
      oldIndex: index,
      used: false
    };

    if (key === null) {
      oldUnkeyedQueue.push(oldChild);
    } else {
      oldKeyed.set(key, oldChild);
    }
  }

  const desired: DesiredChild[] = [];
  let oldUnkeyedIndex = 0;

  for (const newFrame of newChildren) {
    const key = keyOfFrame(newFrame);
    const match =
      key === null
        ? oldUnkeyedQueue[oldUnkeyedIndex++]
        : oldKeyed.get(key);

    if (match !== undefined) {
      match.used = true;

      const patched = patchNode(
        match.node,
        childForPatching(match.frame),
        match.frame.pipeline,
        childForPatching(newFrame),
        newFrame.pipeline,
        delegation
      );

      desired.push({
        node: patched,
        oldIndex: match.oldIndex
      });

      continue;
    }

    desired.push({
      node: renderTree(newFrame.tree, {
        delegation,
        pipeline: newFrame.pipeline
      }),
      oldIndex: null
    });
  }

  for (const oldChild of [...oldKeyed.values(), ...oldUnkeyedQueue]) {
    if (!oldChild.used && oldChild.node.parentNode === parent) {
      parent.removeChild(oldChild.node);
    }
  }

  reorderChildrenByLis(parent, desired);
}


function reorderChildrenByLis(
  parent: Element,
  desired: readonly DesiredChild[]
): void {
  /*
   * Correctness-first ordering pass.
   *
   * This intentionally avoids the broken LIS skip path until the move-minimizing
   * algorithm has stronger tests. It preserves identity while ensuring inserts,
   * removals, and reorders produce the exact desired DOM order.
   */
  for (let index = 0; index < desired.length; index += 1) {
    const child = desired[index]!;
    const current = parent.childNodes[index] ?? null;

    if (current !== child.node) {
      parent.insertBefore(child.node, current);
    }
  }
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
          clearProperty(element, oldAttribute.name);
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

function clearProperty(
  element: Element,
  name: string
): void {
  if (booleanProperties.has(name)) {
    Reflect.set(element, name, false);
    element.removeAttribute(name.toLowerCase());
    return;
  }

  if (stringProperties.has(name)) {
    Reflect.set(element, name, "");
    return;
  }

  if (numberProperties.has(name)) {
    Reflect.set(element, name, 0);
    return;
  }

  const current = Reflect.get(element, name);

  switch (typeof current) {
    case "boolean":
      Reflect.set(element, name, false);
      break;

    case "number":
      Reflect.set(element, name, 0);
      break;

    case "string":
      Reflect.set(element, name, "");
      break;

    default:
      Reflect.set(element, name, null);
      break;
  }
}

const booleanProperties = new Set<string>([
  "autofocus",
  "checked",
  "controls",
  "defaultChecked",
  "defer",
  "disabled",
  "hidden",
  "loop",
  "multiple",
  "muted",
  "open",
  "readOnly",
  "required",
  "selected"
]);

const stringProperties = new Set<string>([
  "alt",
  "className",
  "defaultValue",
  "dir",
  "download",
  "href",
  "id",
  "name",
  "placeholder",
  "rel",
  "src",
  "target",
  "textContent",
  "title",
  "type",
  "value"
]);

const numberProperties = new Set<string>([
  "colSpan",
  "rowSpan",
  "tabIndex"
]);

function longestIncreasingSubsequenceIndexes(
  values: readonly (number | null)[]
): readonly number[] {
  const predecessors = new Array<number>(values.length).fill(-1);
  const tails: number[] = [];

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];

    if (value === null || value === undefined) {
      continue;
    }

    let low = 0;
    let high = tails.length;

    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      const tailIndex = tails[mid];

      if (tailIndex === undefined) {
        break;
      }

      const tailValue = values[tailIndex];

      if (tailValue !== null && tailValue !== undefined && tailValue < value) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }

    if (low > 0) {
      predecessors[index] = tails[low - 1]!;
    }

    tails[low] = index;
  }

  const result: number[] = [];
  let current = tails[tails.length - 1];

  while (current !== undefined && current !== -1) {
    result.push(current);
    current = predecessors[current];
  }

  result.reverse();

  return result;
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
