import type { UiOf } from "../core/ui";
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

export type JsonView =
  | { readonly kind: "empty" }
  | { readonly kind: "text"; readonly value: string }
  | {
      readonly kind: "node";
      readonly tag: string;
      readonly attributes: readonly JsonAttribute[];
      readonly children: readonly JsonView[];
    }
  | {
      readonly kind: "keyed";
      readonly key: string | number;
      readonly child: JsonView;
    };

export type JsonAttribute =
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

export function renderToJson<Event>(
  ui: UiOf<TreeUi, Event>
): JsonView {
  return normalizeTree(exposeTree(ui) as Tree<unknown>, null);
}

function normalizeTree(
  tree: Tree<unknown>,
  pipeline: EventPipeline
): JsonView {
  switch (tree.kind) {
    case "empty":
      return { kind: "empty" };

    case "text":
      return {
        kind: "text",
        value: tree.value
      };

    case "mapped":
      return normalizeTree(tree.child, appendMap(pipeline, tree.map));

    case "keyed":
      return {
        kind: "keyed",
        key: tree.key,
        child: normalizeTree(tree.child as Tree<unknown>, pipeline)
      };

    case "concat": {
      const children = normalizeChildren(tree.children, pipeline);

      if (children.length === 0) {
        return { kind: "empty" };
      }

      if (children.length === 1) {
        return children[0]!;
      }

      return {
        kind: "node",
        tag: "fragment",
        attributes: [],
        children
      };
    }

    case "node":
      return {
        kind: "node",
        tag: tree.tag,
        attributes: tree.attributes.map(normalizeAttribute),
        children: normalizeChildren(tree.children, pipeline)
      };
  }
}

function normalizeChildren(
  children: readonly Tree<unknown>[],
  pipeline: EventPipeline
): readonly JsonView[] {
  const result: JsonView[] = [];

  for (const child of children) {
    const normalized = normalizeTree(child, pipeline);

    if (normalized.kind === "empty") {
      continue;
    }

    if (normalized.kind === "node" && normalized.tag === "fragment") {
      result.push(...normalized.children);
      continue;
    }

    result.push(normalized);
  }

  return result;
}

function normalizeAttribute(
  attribute: HtmlAttribute<unknown>
): JsonAttribute {
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

function appendMap(
  pipeline: EventPipeline,
  map: EventMap
): EventPipeline {
  return {
    map,
    parent: pipeline
  };
}
