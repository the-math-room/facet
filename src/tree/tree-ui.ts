import type { Key, UiAlgebra, UiOf } from "../core/ui";
import type { HtmlAttribute, HtmlAttributeAny, HtmlTag } from "../html/html";

export type Tree<Event> =
  | { readonly kind: "empty" }
  | { readonly kind: "text"; readonly value: string }
  | {
      readonly kind: "node";
      readonly tag: HtmlTag;
      readonly attributes: readonly HtmlAttribute<Event>[];
      readonly children: readonly Tree<Event>[];
    }
  | {
      readonly kind: "concat";
      readonly children: readonly Tree<Event>[];
    }
  | {
      readonly kind: "keyed";
      readonly key: Key;
      readonly child: Tree<Event>;
    }
  | {
      readonly kind: "mapped";
      readonly child: Tree<unknown>;
      readonly map: (event: unknown) => Event;
    };

export type TreeUi = Tree<unknown>;

/**
 * This module is the intentional bridge between the abstract Facet ADT and
 * this concrete HTML tree representation. The casts are localized here because
 * TypeScript cannot directly express the higher-kinded relationship between
 * Tree<Event> and UiOf<TreeUi, Event>.
 */
function cast<Event>(tree: Tree<Event>): UiOf<TreeUi, Event> {
  return tree as unknown as UiOf<TreeUi, Event>;
}

function uncast<Event>(ui: UiOf<TreeUi, Event>): Tree<Event> {
  return ui as unknown as Tree<Event>;
}

export const TreeAlgebra: UiAlgebra<TreeUi, HtmlTag, HtmlAttributeAny> = {
  empty<Event>(): UiOf<TreeUi, Event> {
    return cast({ kind: "empty" });
  },

  text<Event>(value: string): UiOf<TreeUi, Event> {
    return cast({ kind: "text", value });
  },

  node<Event>(
    tag: HtmlTag,
    attributes: readonly HtmlAttributeAny[],
    children: readonly UiOf<TreeUi, Event>[]
  ): UiOf<TreeUi, Event> {
    return cast({
      kind: "node",
      tag,
      attributes: attributes as readonly HtmlAttribute<Event>[],
      children: children.map(uncast)
    });
  },

  concat<Event>(
    children: readonly UiOf<TreeUi, Event>[]
  ): UiOf<TreeUi, Event> {
    return cast({
      kind: "concat",
      children: children.map(uncast)
    });
  },

  keyed<Event>(
    key: Key,
    child: UiOf<TreeUi, Event>
  ): UiOf<TreeUi, Event> {
    return cast({
      kind: "keyed",
      key,
      child: uncast(child)
    });
  },

  mapEvent<A, B>(
    ui: UiOf<TreeUi, A>,
    map: (event: A) => B
  ): UiOf<TreeUi, B> {
    return cast({
      kind: "mapped",
      child: uncast(ui) as Tree<unknown>,
      map: (event: unknown) => map(event as A)
    });
  }
};

export function exposeTree<Event>(
  ui: UiOf<TreeUi, Event>
): Tree<Event> {
  return uncast(ui);
}
