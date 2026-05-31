import type { UiAlgebra, UiOf } from "../core/ui";
import {
  type HtmlAttribute,
  type HtmlAttributeAny,
  type HtmlTag,
  attr,
  className,
  on,
  prop
} from "./html";

export type HtmlDslArg<Ui, Event> =
  | HtmlAttribute<Event>
  | UiOf<Ui, Event>
  | string
  | number
  | boolean
  | null
  | undefined
  | readonly HtmlDslArg<Ui, Event>[];

/**
 * Thin authoring DSL for HTML-shaped UI.
 *
 * This layer does not introduce a new runtime model. It only lowers a more
 * ergonomic mixed argument style into the existing UiAlgebra operations.
 *
 * Examples:
 *
 *   const H = htmlDsl(TreeAlgebra);
 *
 *   H.button(
 *     H.className("primary"),
 *     H.prop("type", "button"),
 *     H.on("click", () => ({ type: "Clicked" })),
 *     "Click"
 *   )
 */
export function htmlDsl<Ui>(
  A: UiAlgebra<Ui, HtmlTag, HtmlAttributeAny>
) {
  const node =
    (tag: HtmlTag) =>
    <Event>(
      ...args: readonly HtmlDslArg<Ui, Event>[]
    ): UiOf<Ui, Event> => {
      const parsed = parseArgs(A, args);

      return A.node(
        tag,
        parsed.attributes as readonly HtmlAttributeAny[],
        parsed.children
      );
    };

  return {
    empty: A.empty.bind(A),

    text<Event>(value: string | number): UiOf<Ui, Event> {
      return A.text(String(value));
    },

    concat<Event>(
      ...children: readonly HtmlDslArg<Ui, Event>[]
    ): UiOf<Ui, Event> {
      return A.concat(parseArgs(A, children).children);
    },

    keyed: A.keyed.bind(A),
    memo: A.memo.bind(A),
    mapEvent: A.mapEvent.bind(A),

    attr,
    prop,
    className,
    cls: className,
    on,

    div: node("div"),
    span: node("span"),
    button: node("button"),
    input: node("input"),
    form: node("form"),
    label: node("label"),
    ul: node("ul"),
    ol: node("ol"),
    li: node("li"),
    p: node("p"),
    h1: node("h1"),
    h2: node("h2"),
    h3: node("h3"),
    section: node("section"),
    main: node("main"),
    header: node("header"),
    footer: node("footer")
  };
}

function parseArgs<Ui, Event>(
  A: UiAlgebra<Ui, HtmlTag, HtmlAttributeAny>,
  args: readonly HtmlDslArg<Ui, Event>[]
): {
  readonly attributes: readonly HtmlAttribute<Event>[];
  readonly children: readonly UiOf<Ui, Event>[];
} {
  const attributes: HtmlAttribute<Event>[] = [];
  const children: UiOf<Ui, Event>[] = [];

  const push = (arg: HtmlDslArg<Ui, Event>): void => {
    if (
      arg === null ||
      arg === undefined ||
      typeof arg === "boolean"
    ) {
      return;
    }

    if (Array.isArray(arg)) {
      for (const child of arg) {
        push(child);
      }

      return;
    }

    if (typeof arg === "string" || typeof arg === "number") {
      children.push(A.text(String(arg)));
      return;
    }

    if (isHtmlAttribute(arg)) {
      attributes.push(arg as HtmlAttribute<Event>);
      return;
    }

    children.push(arg as UiOf<Ui, Event>);
  };

  for (const arg of args) {
    push(arg);
  }

  return {
    attributes,
    children
  };
}

function isHtmlAttribute(value: unknown): value is HtmlAttribute<unknown> {
  if (
    value === null ||
    typeof value !== "object" ||
    !("kind" in value)
  ) {
    return false;
  }

  const kind = (value as { readonly kind: unknown }).kind;

  return (
    kind === "attribute" ||
    kind === "property" ||
    kind === "class" ||
    kind === "event"
  );
}
