import type { UiAlgebra, UiOf } from "../core/ui";

export type HtmlTag =
  | "div"
  | "span"
  | "button"
  | "input"
  | "form"
  | "label"
  | "ul"
  | "ol"
  | "li"
  | "p"
  | "h1"
  | "h2"
  | "h3"
  | "section"
  | "main"
  | "header"
  | "footer";

export type HtmlAttribute<Event> =
  | {
      readonly kind: "property";
      readonly name: string;
      readonly value: unknown;
    }
  | {
      readonly kind: "attribute";
      readonly name: string;
      readonly value: string;
    }
  | {
      readonly kind: "class";
      readonly value: string;
    }
  | {
      readonly kind: "event";
      readonly name: string;
      readonly decode: (event: globalThis.Event) => Event | null;
    };

export type HtmlAttributeAny = HtmlAttribute<unknown>;

export function attr<Event>(
  name: string,
  value: string
): HtmlAttribute<Event> {
  return { kind: "attribute", name, value };
}

export function prop<Event>(
  name: string,
  value: unknown
): HtmlAttribute<Event> {
  return { kind: "property", name, value };
}

export function className<Event>(
  value: string
): HtmlAttribute<Event> {
  return { kind: "class", value };
}

export function on<Event>(
  name: string,
  decode: (event: globalThis.Event) => Event | null
): HtmlAttribute<Event> {
  return { kind: "event", name, decode };
}

export function html<Ui>(
  A: UiAlgebra<Ui, HtmlTag, HtmlAttributeAny>
) {
  const node =
    (tag: HtmlTag) =>
    <Event>(
      attributes: readonly HtmlAttribute<Event>[],
      children: readonly UiOf<Ui, Event>[]
    ): UiOf<Ui, Event> =>
      A.node(tag, attributes as readonly HtmlAttributeAny[], children);

  return {
    empty: A.empty.bind(A),
    text: A.text.bind(A),
    concat: A.concat.bind(A),
    keyed: A.keyed.bind(A),
    memo: A.memo.bind(A),
    mapEvent: A.mapEvent.bind(A),

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
