import { describe, expect, it } from "vitest";
import {
  concatAssociativityLaw,
  concatEmptyLaw,
  concatLeftIdentityLaw,
  concatRightIdentityLaw,
  mapEventCompositionLaw,
  mapEventIdentityLaw,
  mapEventPreservesConcatLaw,
  mapEventPreservesKeyedLaw
} from "../src/core/laws";
import {
  TreeAlgebra,
  exposeTree,
  type Tree,
  type TreeUi
} from "../src/tree/tree-ui";
import type { HtmlAttribute } from "../src/html/html";
import type { UiOf } from "../src/core/ui";

describe("UiAlgebra laws for TreeAlgebra", () => {
  it("satisfies concat empty", () => {
    expect(concatEmptyLaw(TreeAlgebra, denotationalEq)).toBe(true);
  });

  it("satisfies concat left identity", () => {
    expect(concatLeftIdentityLaw(TreeAlgebra, denotationalEq)).toBe(true);
  });

  it("satisfies concat right identity", () => {
    expect(concatRightIdentityLaw(TreeAlgebra, denotationalEq)).toBe(true);
  });

  it("satisfies concat associativity", () => {
    expect(concatAssociativityLaw(TreeAlgebra, denotationalEq)).toBe(true);
  });

  it("satisfies mapEvent identity", () => {
    expect(mapEventIdentityLaw(TreeAlgebra, "button", denotationalEq)).toBe(true);
  });

  it("satisfies mapEvent composition", () => {
    expect(mapEventCompositionLaw(TreeAlgebra, "button", denotationalEq)).toBe(true);
  });

  it("satisfies mapEvent preserving concat", () => {
    expect(mapEventPreservesConcatLaw(TreeAlgebra, denotationalEq)).toBe(true);
  });

  it("satisfies mapEvent preserving keyed identity", () => {
    expect(mapEventPreservesKeyedLaw(TreeAlgebra, denotationalEq)).toBe(true);
  });
});

function denotationalEq<Event>(
  left: UiOf<TreeUi, Event>,
  right: UiOf<TreeUi, Event>
): boolean {
  return JSON.stringify(normalize(exposeTree(left))) ===
    JSON.stringify(normalize(exposeTree(right)));
}

type Normal =
  | { readonly kind: "empty" }
  | { readonly kind: "text"; readonly value: string }
  | {
      readonly kind: "node";
      readonly tag: string;
      readonly attributes: readonly unknown[];
      readonly children: readonly Normal[];
    }
  | {
      readonly kind: "keyed";
      readonly key: string | number;
      readonly child: Normal;
    };

function normalize<Event>(tree: Tree<Event>): Normal {
  switch (tree.kind) {
    case "empty":
      return { kind: "empty" };

    case "text":
      return tree;

    case "mapped":
      return normalize(tree.child);

    case "keyed":
      return {
        kind: "keyed",
        key: tree.key,
        child: normalize(tree.child)
      };

    case "node":
      return {
        kind: "node",
        tag: tree.tag,
        attributes: tree.attributes.map(normalizeAttribute),
        children: normalizeChildren(tree.children)
      };

    case "concat": {
      const children = normalizeChildren(tree.children);

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
  }
}

function normalizeChildren<Event>(
  trees: readonly Tree<Event>[]
): readonly Normal[] {
  const result: Normal[] = [];

  for (const tree of trees) {
    if (tree.kind === "concat") {
      const normalized = normalize(tree);

      if (normalized.kind === "empty") {
        continue;
      }

      if (normalized.kind === "node" && normalized.tag === "fragment") {
        result.push(...normalized.children);
      } else {
        result.push(normalized);
      }

      continue;
    }

    const normalized = normalize(tree);

    if (normalized.kind !== "empty") {
      result.push(normalized);
    }
  }

  return result;
}

function normalizeAttribute<Event>(attribute: HtmlAttribute<Event>): unknown {
  if (attribute.kind === "event") {
    return {
      kind: "event",
      name: attribute.name
    };
  }

  return attribute;
}
