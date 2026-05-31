import type { Dispatch, Renderer, UiOf } from "../core/ui";
import type { HtmlAttribute } from "../core/html";
import type { Tree, TreeUi } from "../tree/tree-ui";
import { exposeTree } from "../tree/tree-ui";

type ListenerRecord = {
  readonly element: Element;
  readonly eventName: string;
  readonly listener: EventListener;
};

export type DomMounted = {
  readonly root: Node;
  readonly target: Element;
  readonly listeners: readonly ListenerRecord[];
};

/**
 * A deliberately simple DOM interpreter.
 *
 * patch currently remounts the whole tree. This keeps v0 semantically clear.
 * The next renderer pass should introduce diffing because remounting loses
 * native DOM state such as focus, selection, cursor position, and input state.
 */
export const DomRenderer: Renderer<TreeUi, Element, DomMounted> = {
  mount<Event>(
    target: Element,
    ui: UiOf<TreeUi, Event>,
    dispatch: Dispatch<Event>
  ): DomMounted {
    const listeners: ListenerRecord[] = [];

    target.textContent = "";
    const node = renderTree(
      exposeTree(ui) as Tree<unknown>,
      dispatch as Dispatch<unknown>,
      listeners,
      identity
    );
    target.appendChild(node);

    return {
      root: node,
      target,
      listeners
    };
  },

  patch<Event>(
    mounted: DomMounted,
    next: UiOf<TreeUi, Event>,
    dispatch: Dispatch<Event>
  ): DomMounted {
    for (const record of mounted.listeners) {
      record.element.removeEventListener(record.eventName, record.listener);
    }

    mounted.target.textContent = "";

    const listeners: ListenerRecord[] = [];
    const node = renderTree(
      exposeTree(next) as Tree<unknown>,
      dispatch as Dispatch<unknown>,
      listeners,
      identity
    );
    mounted.target.appendChild(node);

    return {
      root: node,
      target: mounted.target,
      listeners
    };
  },

  unmount(mounted: DomMounted): void {
    for (const record of mounted.listeners) {
      record.element.removeEventListener(record.eventName, record.listener);
    }

    mounted.target.textContent = "";
  }
};

function identity(event: unknown): unknown {
  return event;
}

function renderTree(
  tree: Tree<unknown>,
  dispatch: Dispatch<unknown>,
  listeners: ListenerRecord[],
  mapEvent: (event: unknown) => unknown
): Node {
  switch (tree.kind) {
    case "empty":
      return document.createComment("empty");

    case "text":
      return document.createTextNode(tree.value);

    case "concat": {
      const fragment = document.createDocumentFragment();

      for (const child of tree.children) {
        fragment.appendChild(
          renderTree(child as Tree<unknown>, dispatch, listeners, mapEvent)
        );
      }

      return fragment;
    }

    case "keyed":
      return renderTree(
        tree.child as Tree<unknown>,
        dispatch,
        listeners,
        mapEvent
      );

    case "mapped":
      return renderTree(
        tree.child,
        dispatch,
        listeners,
        (event) => mapEvent(tree.map(event))
      );

    case "node": {
      const element = document.createElement(tree.tag);

      for (const attribute of tree.attributes) {
        applyAttribute(
          element,
          attribute as HtmlAttribute<unknown>,
          dispatch,
          listeners,
          mapEvent
        );
      }

      for (const child of tree.children) {
        element.appendChild(
          renderTree(child as Tree<unknown>, dispatch, listeners, mapEvent)
        );
      }

      return element;
    }
  }
}

function applyAttribute(
  element: Element,
  attribute: HtmlAttribute<unknown>,
  dispatch: Dispatch<unknown>,
  listeners: ListenerRecord[],
  mapEvent: (event: unknown) => unknown
): void {
  switch (attribute.kind) {
    case "attribute":
      element.setAttribute(attribute.name, attribute.value);
      return;

    case "class":
      element.className = attribute.value;
      return;

    case "property":
      Reflect.set(element, attribute.name, attribute.value);
      return;

    case "event": {
      const listener: EventListener = (event) => {
        const decoded = attribute.decode(event);
        if (decoded !== null) {
          dispatch(mapEvent(decoded));
        }
      };

      element.addEventListener(attribute.name, listener);

      listeners.push({
        element,
        eventName: attribute.name,
        listener
      });

      return;
    }
  }
}
