import type { UiOf } from "../core";
import type { HtmlAttribute } from "../html";
import type { Tree, TreeUi } from "../tree/tree-ui";
import { exposeTree } from "../tree/tree-ui";

type EventMap = (event: unknown) => unknown;

type EventPipeline =
  | {
      readonly map: EventMap;
      readonly parent: EventPipeline;
    }
  | null;

type QueryHandler<Event> = {
  readonly name: string;
  readonly decode: (event: globalThis.Event) => Event | null;
  readonly pipeline: EventPipeline;
};

export type QueryAttribute =
  | {
      readonly kind: "attribute";
      readonly name: string;
      readonly value: string;
    }
  | {
      readonly kind: "property";
      readonly name: string;
      readonly value: unknown;
    }
  | {
      readonly kind: "class";
      readonly value: string;
    }
  | {
      readonly kind: "event";
      readonly name: string;
    };

export type QueryNode<Event = unknown> = {
  readonly kind: "node";
  readonly tag: string;
  readonly attributes: readonly QueryAttribute[];
  readonly children: readonly QueryNode<Event>[];
  readonly textContent: string;
  readonly eventNames: readonly string[];
  readonly handlers: readonly QueryHandler<Event>[];
};

export type TestEventInit = {
  readonly target?: unknown;
  readonly key?: string;
  readonly preventDefault?: () => void;
};

export function inspect<Event>(
  ui: UiOf<TreeUi, Event>
): readonly QueryNode<Event>[] {
  return inspectTree(exposeTree(ui) as Tree<unknown>, null) as readonly QueryNode<Event>[];
}

export function queryByText<Event>(
  ui: UiOf<TreeUi, Event> | readonly QueryNode<Event>[],
  text: string
): QueryNode<Event> | null {
  return queryAll(ui, (node) => node.textContent === text)[0] ?? null;
}

export function queryAllByText<Event>(
  ui: UiOf<TreeUi, Event> | readonly QueryNode<Event>[],
  text: string
): readonly QueryNode<Event>[] {
  return queryAll(ui, (node) => node.textContent === text);
}

export function queryByTag<Event>(
  ui: UiOf<TreeUi, Event> | readonly QueryNode<Event>[],
  tag: string
): QueryNode<Event> | null {
  return queryAllByTag(ui, tag)[0] ?? null;
}

export function queryAllByTag<Event>(
  ui: UiOf<TreeUi, Event> | readonly QueryNode<Event>[],
  tag: string
): readonly QueryNode<Event>[] {
  return queryAll(ui, (node) => node.tag === tag);
}

export function queryByAttribute<Event>(
  ui: UiOf<TreeUi, Event> | readonly QueryNode<Event>[],
  name: string,
  value?: unknown
): QueryNode<Event> | null {
  return queryAllByAttribute(ui, name, value)[0] ?? null;
}

export function queryAllByAttribute<Event>(
  ui: UiOf<TreeUi, Event> | readonly QueryNode<Event>[],
  name: string,
  value?: unknown
): readonly QueryNode<Event>[] {
  return queryAll(ui, (node) =>
    node.attributes.some((attribute) => {
      switch (attribute.kind) {
        case "class":
          return name === "class" && (
            value === undefined || attribute.value === value
          );

        case "event":
          return false;

        case "attribute":
        case "property":
          return (
            attribute.name === name &&
            (value === undefined || attribute.value === value)
          );
      }
    })
  );
}

export function fireEvent<Event>(
  node: QueryNode<Event>,
  eventName: string,
  event: globalThis.Event = createTestEvent()
): readonly Event[] {
  const result: Event[] = [];

  for (const handler of node.handlers) {
    if (handler.name !== eventName) {
      continue;
    }

    const decoded = handler.decode(event);

    if (decoded !== null) {
      result.push(applyPipeline(handler.pipeline, decoded) as Event);
    }
  }

  return result;
}

export function createTestEvent(
  init: TestEventInit = {}
): globalThis.Event {
  return {
    target: init.target ?? null,
    key: init.key,
    preventDefault: init.preventDefault ?? (() => {})
  } as unknown as globalThis.Event;
}

function queryAll<Event>(
  ui: UiOf<TreeUi, Event> | readonly QueryNode<Event>[],
  predicate: (node: QueryNode<Event>) => boolean
): readonly QueryNode<Event>[] {
  const roots: readonly QueryNode<Event>[] = isQueryNodeArray(ui)
    ? ui
    : inspect(ui);
  const result: QueryNode<Event>[] = [];

  for (const root of roots) {
    visit(root, predicate, result);
  }

  return result;
}

function isQueryNodeArray<Event>(
  value: UiOf<TreeUi, Event> | readonly QueryNode<Event>[]
): value is readonly QueryNode<Event>[] {
  return Array.isArray(value);
}

function visit<Event>(
  node: QueryNode<Event>,
  predicate: (node: QueryNode<Event>) => boolean,
  result: QueryNode<Event>[]
): void {
  if (predicate(node)) {
    result.push(node);
  }

  for (const child of node.children) {
    visit(child, predicate, result);
  }
}

function inspectTree(
  tree: Tree<unknown>,
  pipeline: EventPipeline
): readonly QueryNode<unknown>[] {
  switch (tree.kind) {
    case "empty":
      return [];

    case "text":
      return [];

    case "mapped":
      return inspectTree(tree.child, appendMap(pipeline, tree.map));

    case "memo":
      return inspectTree(tree.child as Tree<unknown>, pipeline);

    case "keyed":
      return inspectTree(tree.child as Tree<unknown>, pipeline);

    case "concat":
      return tree.children.flatMap((child) => inspectTree(child, pipeline));

    case "node": {
      const children = tree.children.flatMap((child) =>
        inspectTree(child, pipeline)
      );

      const textContent = tree.children.map(textOfTree).join("");
      const handlers = eventHandlers(
        tree.attributes as readonly HtmlAttribute<unknown>[],
        pipeline
      );

      return [
        {
          kind: "node",
          tag: tree.tag,
          attributes: tree.attributes.map(queryAttribute),
          children,
          textContent,
          eventNames: handlers.map((handler) => handler.name),
          handlers
        }
      ];
    }
  }
}

function textOfTree(tree: Tree<unknown>): string {
  switch (tree.kind) {
    case "empty":
      return "";

    case "text":
      return tree.value;

    case "mapped":
      return textOfTree(tree.child);

    case "memo":
      return textOfTree(tree.child as Tree<unknown>);

    case "keyed":
      return textOfTree(tree.child as Tree<unknown>);

    case "concat":
      return tree.children.map(textOfTree).join("");

    case "node":
      return tree.children.map(textOfTree).join("");
  }
}

function queryAttribute(
  attribute: HtmlAttribute<unknown>
): QueryAttribute {
  switch (attribute.kind) {
    case "attribute":
      return {
        kind: "attribute",
        name: attribute.name,
        value: attribute.value
      };

    case "property":
      return {
        kind: "property",
        name: attribute.name,
        value: attribute.value
      };

    case "class":
      return {
        kind: "class",
        value: attribute.value
      };

    case "event":
      return {
        kind: "event",
        name: attribute.name
      };
  }
}

function eventHandlers(
  attributes: readonly HtmlAttribute<unknown>[],
  pipeline: EventPipeline
): readonly QueryHandler<unknown>[] {
  return attributes.flatMap((attribute) => {
    if (attribute.kind !== "event") {
      return [];
    }

    return [
      {
        name: attribute.name,
        decode: attribute.decode,
        pipeline
      }
    ];
  });
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
