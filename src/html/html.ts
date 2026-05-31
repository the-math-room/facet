import type { UiAlgebra, UiOf } from "../core/ui";

export type HtmlTag =
  | "a"
  | "abbr"
  | "address"
  | "article"
  | "aside"
  | "b"
  | "blockquote"
  | "br"
  | "button"
  | "caption"
  | "cite"
  | "code"
  | "col"
  | "colgroup"
  | "dd"
  | "del"
  | "details"
  | "dfn"
  | "dialog"
  | "div"
  | "dl"
  | "dt"
  | "em"
  | "fieldset"
  | "figcaption"
  | "figure"
  | "footer"
  | "form"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "header"
  | "hr"
  | "i"
  | "img"
  | "input"
  | "ins"
  | "kbd"
  | "label"
  | "legend"
  | "li"
  | "main"
  | "mark"
  | "meter"
  | "nav"
  | "ol"
  | "optgroup"
  | "option"
  | "output"
  | "p"
  | "picture"
  | "pre"
  | "progress"
  | "q"
  | "s"
  | "samp"
  | "section"
  | "select"
  | "small"
  | "source"
  | "span"
  | "strong"
  | "sub"
  | "summary"
  | "sup"
  | "table"
  | "tbody"
  | "td"
  | "textarea"
  | "tfoot"
  | "th"
  | "thead"
  | "time"
  | "tr"
  | "u"
  | "ul"
  | "var"
  | "video"
  | "wbr";

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

    a: node("a"),
    abbr: node("abbr"),
    address: node("address"),
    article: node("article"),
    aside: node("aside"),
    b: node("b"),
    blockquote: node("blockquote"),
    br: node("br"),
    button: node("button"),
    caption: node("caption"),
    cite: node("cite"),
    code: node("code"),
    col: node("col"),
    colgroup: node("colgroup"),
    dd: node("dd"),
    del: node("del"),
    details: node("details"),
    dfn: node("dfn"),
    dialog: node("dialog"),
    div: node("div"),
    dl: node("dl"),
    dt: node("dt"),
    em: node("em"),
    fieldset: node("fieldset"),
    figcaption: node("figcaption"),
    figure: node("figure"),
    footer: node("footer"),
    form: node("form"),
    h1: node("h1"),
    h2: node("h2"),
    h3: node("h3"),
    h4: node("h4"),
    h5: node("h5"),
    h6: node("h6"),
    header: node("header"),
    hr: node("hr"),
    i: node("i"),
    img: node("img"),
    input: node("input"),
    ins: node("ins"),
    kbd: node("kbd"),
    label: node("label"),
    legend: node("legend"),
    li: node("li"),
    main: node("main"),
    mark: node("mark"),
    meter: node("meter"),
    nav: node("nav"),
    ol: node("ol"),
    optgroup: node("optgroup"),
    option: node("option"),
    output: node("output"),
    p: node("p"),
    picture: node("picture"),
    pre: node("pre"),
    progress: node("progress"),
    q: node("q"),
    s: node("s"),
    samp: node("samp"),
    section: node("section"),
    select: node("select"),
    small: node("small"),
    source: node("source"),
    span: node("span"),
    strong: node("strong"),
    sub: node("sub"),
    summary: node("summary"),
    sup: node("sup"),
    table: node("table"),
    tbody: node("tbody"),
    td: node("td"),
    textarea: node("textarea"),
    tfoot: node("tfoot"),
    th: node("th"),
    thead: node("thead"),
    time: node("time"),
    tr: node("tr"),
    u: node("u"),
    ul: node("ul"),
    var: node("var"),
    video: node("video"),
    wbr: node("wbr")
  };
}
