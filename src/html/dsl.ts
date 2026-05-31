import type { Key, UiAlgebra, UiOf } from "../core/ui";
import {
  type HtmlAttribute,
  type HtmlAttributeAny,
  type HtmlTag,
  attr,
  className,
  on,
  prop
} from "./html";

type AttributeValue = string | number | boolean;
type OptionalAttributeValue = AttributeValue | null | undefined;
type AttributeRecord = Readonly<Record<string, OptionalAttributeValue>>;

export type HtmlDslArg<Ui, Event> =
  | HtmlAttribute<Event>
  | UiOf<Ui, Event>
  | string
  | number
  | boolean
  | null
  | undefined
  | readonly HtmlDslArg<Ui, Event>[];

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

    fragment<Event>(
      ...children: readonly HtmlDslArg<Ui, Event>[]
    ): UiOf<Ui, Event> {
      return A.concat(parseArgs(A, children).children);
    },

    when<Event>(
      condition: boolean,
      child: HtmlDslArg<Ui, Event>
    ): UiOf<Ui, Event> {
      if (!condition) {
        return A.empty();
      }

      return A.concat(parseArgs(A, [child]).children);
    },

    unless<Event>(
      condition: boolean,
      child: HtmlDslArg<Ui, Event>
    ): UiOf<Ui, Event> {
      if (condition) {
        return A.empty();
      }

      return A.concat(parseArgs(A, [child]).children);
    },

    maybe<Value, Event>(
      value: Value | null | undefined,
      view: (value: Value) => HtmlDslArg<Ui, Event>
    ): UiOf<Ui, Event> {
      if (value === null || value === undefined) {
        return A.empty();
      }

      return A.concat(parseArgs(A, [view(value)]).children);
    },

    list<Value, Event>(
      values: readonly Value[],
      view: (value: Value, index: number) => HtmlDslArg<Ui, Event>
    ): UiOf<Ui, Event> {
      return A.concat(
        parseArgs(
          A,
          values.map((value, index) => view(value, index))
        ).children
      );
    },

    keyedList<Value, Event>(
      values: readonly Value[],
      key: (value: Value, index: number) => Key,
      view: (value: Value, index: number) => HtmlDslArg<Ui, Event>
    ): UiOf<Ui, Event> {
      const children = values.map((value, index) => {
        const parsed = parseArgs(A, [view(value, index)]);

        if (parsed.children.length !== 1) {
          throw new Error("keyedList view must produce exactly one child.");
        }

        return A.keyed(
          key(value, index),
          parsed.children[0]!
        );
      });

      return A.concat(children);
    },

    keyed: A.keyed.bind(A),
    memo: A.memo.bind(A),
    mapEvent: A.mapEvent.bind(A),

    mapEvents<AEvent, BEvent>(
      map: (event: AEvent) => BEvent
    ): (ui: UiOf<Ui, AEvent>) => UiOf<Ui, BEvent> {
      return (ui) => A.mapEvent(ui, map);
    },

    attr,
    prop,
    className,
    cls: className,
    on,

    onClick<Event>(
      decode: () => Event | null
    ): HtmlAttribute<Event> {
      return on("click", () => decode());
    },

    onKeyDown<Event>(
      decode: (key: string, event: KeyboardEvent) => Event | null
    ): HtmlAttribute<Event> {
      return on("keydown", (event) => {
        if (event instanceof KeyboardEvent) {
          return decode(event.key, event);
        }

        return null;
      });
    },

    onSubmit<Event>(
      decode: () => Event | null
    ): HtmlAttribute<Event> {
      return on("submit", (event) => {
        event.preventDefault();
        return decode();
      });
    },

    onInput<Event>(
      decode: (event: globalThis.Event) => Event | null
    ): HtmlAttribute<Event> {
      return on("input", decode);
    },

    onTextInput<Event>(
      decode: (value: string) => Event | null
    ): HtmlAttribute<Event> {
      return on("input", (event) => {
        const target = event.target;

        if (isTextValueTarget(target)) {
          return decode(target.value);
        }

        return null;
      });
    },

    onCheckedChange<Event>(
      decode: (checked: boolean) => Event | null
    ): HtmlAttribute<Event> {
      return on("change", (event) => {
        const target = event.target;

        if (isCheckedTarget(target)) {
          return decode(target.checked);
        }

        return null;
      });
    },

    id: propertyHelper("id"),
    title: propertyHelper("title"),
    type: propertyHelper("type"),
    name: propertyHelper("name"),
    value: propertyHelper("value"),
    defaultValue: propertyHelper("defaultValue"),
    checked: propertyHelper("checked"),
    defaultChecked: propertyHelper("defaultChecked"),
    disabled: propertyHelper("disabled"),
    hidden: propertyHelper("hidden"),
    selected: propertyHelper("selected"),
    placeholder: propertyHelper("placeholder"),
    required: propertyHelper("required"),
    readOnly: propertyHelper("readOnly"),
    multiple: propertyHelper("multiple"),
    tabIndex: propertyHelper("tabIndex"),

    forId: attributeHelper("for"),
    href: attributeHelper("href"),
    target: attributeHelper("target"),
    rel: attributeHelper("rel"),
    src: attributeHelper("src"),
    alt: attributeHelper("alt"),
    role: attributeHelper("role"),
    aria: prefixedAttributes("aria"),
    ariaLabel: ariaAlias("label"),
    describedBy: ariaAlias("describedby"),
    controls: ariaAlias("controls"),
    expanded: ariaAlias("expanded"),
    pressed: ariaAlias("pressed"),
    current: ariaAlias("current"),
    data: prefixedAttributes("data"),
    styleAttr: attributeHelper("style"),

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

function propertyHelper(
  name: string
): <Event>(value: unknown) => HtmlAttribute<Event> {
  return (value) => prop(name, value);
}

function attributeHelper(
  name: string
): <Event>(value: AttributeValue) => HtmlAttribute<Event> {
  return (value) => attr(name, String(value));
}

function ariaAlias(
  name: string
): <Event>(value: AttributeValue) => HtmlAttribute<Event> {
  return (value) => attr(`aria-${name}`, String(value));
}

function prefixedAttributes(
  prefix: string
) {
  function helper<Event>(
    name: string,
    value: AttributeValue
  ): HtmlAttribute<Event>;

  function helper<Event>(
    values: AttributeRecord
  ): readonly HtmlAttribute<Event>[];

  function helper<Event>(
    nameOrValues: string | AttributeRecord,
    value?: AttributeValue
  ): HtmlAttribute<Event> | readonly HtmlAttribute<Event>[] {
    if (typeof nameOrValues === "string") {
      if (value === undefined) {
        return [];
      }

      return attr(`${prefix}-${nameOrValues}`, String(value));
    }

    return Object.entries(nameOrValues)
      .filter(([, entryValue]) => entryValue !== null && entryValue !== undefined)
      .map(([entryName, entryValue]) =>
        attr<Event>(`${prefix}-${entryName}`, String(entryValue))
      );
  }

  return helper;
}

function parseArgs<Ui, Event>(
  A: UiAlgebra<Ui, HtmlTag, HtmlAttributeAny>,
  args: readonly HtmlDslArg<Ui, Event>[]
): {
  readonly attributes: readonly HtmlAttribute<Event>[];
  readonly children: readonly UiOf<Ui, Event>[];
} {
  const attributes: HtmlAttribute<Event>[] = [];
  const classes: string[] = [];
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
      if (arg.kind === "class") {
        classes.push(arg.value);
      } else {
        attributes.push(arg as HtmlAttribute<Event>);
      }

      return;
    }

    children.push(arg as UiOf<Ui, Event>);
  };

  for (const arg of args) {
    push(arg);
  }

  const classValue = classes
    .flatMap((value) => value.split(/\s+/))
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .join(" ");

  return {
    attributes:
      classValue.length === 0
        ? attributes
        : [className<Event>(classValue), ...attributes],
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

function isTextValueTarget(
  target: EventTarget | null
): target is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

function isCheckedTarget(
  target: EventTarget | null
): target is HTMLInputElement {
  return target instanceof HTMLInputElement;
}
