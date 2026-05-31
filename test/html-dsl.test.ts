import { describe, expect, it } from "vitest";
import { htmlDsl } from "../src/html";
import { renderToJson } from "../src/test-renderer";
import { TreeAlgebra } from "../src/tree/tree-ui";

describe("htmlDsl", () => {
  it("supports ARIA alias helpers and hidden property helper", () => {
    const H = htmlDsl(TreeAlgebra);

    const ui = H.button(
      H.ariaLabel("Toggle menu"),
      H.describedBy("menu-hint"),
      H.controls("menu"),
      H.expanded(true),
      H.pressed(false),
      H.current("page"),
      H.hidden(false),
      "Menu"
    );

    expect(renderToJson(ui)).toEqual({
      kind: "node",
      tag: "button",
      attributes: [
        { kind: "attribute", name: "aria-label", value: "Toggle menu" },
        { kind: "attribute", name: "aria-describedby", value: "menu-hint" },
        { kind: "attribute", name: "aria-controls", value: "menu" },
        { kind: "attribute", name: "aria-expanded", value: "true" },
        { kind: "attribute", name: "aria-pressed", value: "false" },
        { kind: "attribute", name: "aria-current", value: "page" },
        { kind: "property", name: "hidden", value: false }
      ],
      children: [{ kind: "text", value: "Menu" }]
    });
  });


  it("supports small event and attribute convenience helpers", () => {
    const H = htmlDsl(TreeAlgebra);

    type HelperEvent =
      | { readonly type: "EnterPressed" }
      | { readonly type: "Clicked" };

    const ui = H.form<HelperEvent>(
      H.label(H.forId("email"), "Email"),
      H.input<HelperEvent>(
        H.id("email"),
        H.required(true),
        H.readOnly(false),
        H.tabIndex(0),
        H.onKeyDown<HelperEvent>((key) =>
          key === "Enter" ? { type: "EnterPressed" } : null
        )
      ),
      H.select<HelperEvent>(
        H.multiple(true),
        H.option<HelperEvent>(H.value("a"), "A")
      ),
      H.button<HelperEvent>(
        H.type("button"),
        H.onClick<HelperEvent>(() => ({ type: "Clicked" })),
        "Click"
      )
    );

    expect(renderToJson(ui)).toEqual({
      kind: "node",
      tag: "form",
      attributes: [],
      children: [
        {
          kind: "node",
          tag: "label",
          attributes: [
            { kind: "attribute", name: "for", value: "email" }
          ],
          children: [{ kind: "text", value: "Email" }]
        },
        {
          kind: "node",
          tag: "input",
          attributes: [
            { kind: "property", name: "id", value: "email" },
            { kind: "property", name: "required", value: true },
            { kind: "property", name: "readOnly", value: false },
            { kind: "property", name: "tabIndex", value: 0 },
            { kind: "event", name: "keydown" }
          ],
          children: []
        },
        {
          kind: "node",
          tag: "select",
          attributes: [
            { kind: "property", name: "multiple", value: true }
          ],
          children: [
            {
              kind: "node",
              tag: "option",
              attributes: [
                { kind: "property", name: "value", value: "a" }
              ],
              children: [{ kind: "text", value: "A" }]
            }
          ]
        },
        {
          kind: "node",
          tag: "button",
          attributes: [
            { kind: "property", name: "type", value: "button" },
            { kind: "event", name: "click" }
          ],
          children: [{ kind: "text", value: "Click" }]
        }
      ]
    });
  });

  it("merges class attributes and supports conditional classes", () => {
    const H = htmlDsl(TreeAlgebra);

    const active = true;
    const hidden = false;

    const ui = H.div(
      H.cls("button primary"),
      active && H.cls("active"),
      hidden && H.cls("hidden"),
      H.className("rounded")
    );

    expect(renderToJson(ui)).toEqual({
      kind: "node",
      tag: "div",
      attributes: [
        { kind: "class", value: "button primary active rounded" }
      ],
      children: []
    });
  });

  it("supports object aria and data helpers", () => {
    const H = htmlDsl(TreeAlgebra);

    const ui = H.button(
      H.aria({
        expanded: true,
        controls: "menu-1",
        label: "Toggle menu",
        hidden: null
      }),
      H.data({
        state: "open",
        index: 1,
        ignored: undefined
      }),
      "Toggle"
    );

    expect(renderToJson(ui)).toEqual({
      kind: "node",
      tag: "button",
      attributes: [
        { kind: "attribute", name: "aria-expanded", value: "true" },
        { kind: "attribute", name: "aria-controls", value: "menu-1" },
        { kind: "attribute", name: "aria-label", value: "Toggle menu" },
        { kind: "attribute", name: "data-state", value: "open" },
        { kind: "attribute", name: "data-index", value: "1" }
      ],
      children: [{ kind: "text", value: "Toggle" }]
    });
  });

  it("supports single aria and data helper pairs", () => {
    const H = htmlDsl(TreeAlgebra);

    const ui = H.div(
      H.aria("label", "Panel"),
      H.data("kind", "demo")
    );

    expect(renderToJson(ui)).toEqual({
      kind: "node",
      tag: "div",
      attributes: [
        { kind: "attribute", name: "aria-label", value: "Panel" },
        { kind: "attribute", name: "data-kind", value: "demo" }
      ],
      children: []
    });
  });

  it("supports curried event mapping", () => {
    const H = htmlDsl(TreeAlgebra);

    type ChildEvent = { readonly type: "Child" };
    type ParentEvent = {
      readonly type: "Parent";
      readonly event: ChildEvent;
    };

    const child = H.button<ChildEvent>(
      H.on("click", () => ({ type: "Child" })),
      "Click"
    );

    const parent = H.mapEvents<ChildEvent, ParentEvent>(
      (event) => ({ type: "Parent", event })
    )(child);

    expect(renderToJson(parent)).toEqual({
      kind: "node",
      tag: "button",
      attributes: [
        { kind: "event", name: "click" }
      ],
      children: [
        { kind: "text", value: "Click" }
      ]
    });
  });

  it("supports semantic form event helpers", () => {
    const H = htmlDsl(TreeAlgebra);

    type FormEvent =
      | { readonly type: "Submitted" }
      | { readonly type: "DraftChanged"; readonly text: string }
      | { readonly type: "CheckedChanged"; readonly checked: boolean };

    const ui = H.form<FormEvent>(
      H.onSubmit<FormEvent>(() => ({ type: "Submitted" })),
      H.input<FormEvent>(
        H.onTextInput<FormEvent>((text) => ({
          type: "DraftChanged",
          text
        }))
      ),
      H.input<FormEvent>(
        H.type("checkbox"),
        H.onCheckedChange<FormEvent>((checked) => ({
          type: "CheckedChanged",
          checked
        }))
      )
    );

    expect(renderToJson(ui)).toEqual({
      kind: "node",
      tag: "form",
      attributes: [
        { kind: "event", name: "submit" }
      ],
      children: [
        {
          kind: "node",
          tag: "input",
          attributes: [
            { kind: "event", name: "input" }
          ],
          children: []
        },
        {
          kind: "node",
          tag: "input",
          attributes: [
            { kind: "property", name: "type", value: "checkbox" },
            { kind: "event", name: "change" }
          ],
          children: []
        }
      ]
    });
  });

  it("lowers mixed attributes, strings, and children into the existing tree algebra", () => {
    const H = htmlDsl(TreeAlgebra);

    const ui = H.section(
      H.className("card"),
      H.h1("Facet"),
      H.p(
        H.className("lede"),
        "A tiny denotational UI toolkit."
      ),
      H.button(
        H.className("button"),
        H.prop("type", "button"),
        H.on("click", () => ({ type: "Clicked" as const })),
        "Click"
      )
    );

    expect(renderToJson(ui)).toEqual({
      kind: "node",
      tag: "section",
      attributes: [
        { kind: "class", value: "card" }
      ],
      children: [
        {
          kind: "node",
          tag: "h1",
          attributes: [],
          children: [{ kind: "text", value: "Facet" }]
        },
        {
          kind: "node",
          tag: "p",
          attributes: [
            { kind: "class", value: "lede" }
          ],
          children: [
            {
              kind: "text",
              value: "A tiny denotational UI toolkit."
            }
          ]
        },
        {
          kind: "node",
          tag: "button",
          attributes: [
            { kind: "class", value: "button" },
            { kind: "property", name: "type", value: "button" },
            { kind: "event", name: "click" }
          ],
          children: [{ kind: "text", value: "Click" }]
        }
      ]
    });
  });

  it("flattens child arrays and ignores nullish or boolean values", () => {
    const H = htmlDsl(TreeAlgebra);

    const ui = H.div(
      null,
      false,
      [
        H.span("A"),
        undefined,
        true,
        H.span("B")
      ]
    );

    expect(renderToJson(ui)).toEqual({
      kind: "node",
      tag: "div",
      attributes: [],
      children: [
        {
          kind: "node",
          tag: "span",
          attributes: [],
          children: [{ kind: "text", value: "A" }]
        },
        {
          kind: "node",
          tag: "span",
          attributes: [],
          children: [{ kind: "text", value: "B" }]
        }
      ]
    });
  });

  it("preserves domain-event typing through event attributes and mapEvent", () => {
    const H = htmlDsl(TreeAlgebra);

    type ChildEvent = { readonly type: "ChildClicked" };
    type ParentEvent = {
      readonly type: "ParentObserved";
      readonly event: ChildEvent;
    };

    const child = H.button<ChildEvent>(
      H.on("click", () => ({ type: "ChildClicked" })),
      "Click"
    );

    const parent = H.mapEvent<ChildEvent, ParentEvent>(
      child,
      (event) => ({
        type: "ParentObserved",
        event
      })
    );

    expect(renderToJson(parent)).toEqual({
      kind: "node",
      tag: "button",
      attributes: [
        { kind: "event", name: "click" }
      ],
      children: [
        { kind: "text", value: "Click" }
      ]
    });
  });

  it("supports expanded semantic HTML tags and common attribute helpers", () => {
    const H = htmlDsl(TreeAlgebra);

    const ui = H.article(
      H.id("post-1"),
      H.data("kind", "demo"),
      H.aria("label", "Demo article"),
      H.header(
        H.h2("Title"),
        H.p(H.small("Published today"))
      ),
      H.nav(
        H.a(H.href("/docs"), H.rel("help"), "Docs")
      ),
      H.figure(
        H.img(H.src("/facet.png"), H.alt("Facet logo")),
        H.figcaption("A logo")
      ),
      H.pre(H.code("const x = 1;")),
      H.table(
        H.thead(
          H.tr(H.th("Name"))
        ),
        H.tbody(
          H.tr(H.td("Facet"))
        )
      )
    );

    expect(renderToJson(ui)).toEqual({
      kind: "node",
      tag: "article",
      attributes: [
        { kind: "property", name: "id", value: "post-1" },
        { kind: "attribute", name: "data-kind", value: "demo" },
        { kind: "attribute", name: "aria-label", value: "Demo article" }
      ],
      children: [
        {
          kind: "node",
          tag: "header",
          attributes: [],
          children: [
            {
              kind: "node",
              tag: "h2",
              attributes: [],
              children: [{ kind: "text", value: "Title" }]
            },
            {
              kind: "node",
              tag: "p",
              attributes: [],
              children: [
                {
                  kind: "node",
                  tag: "small",
                  attributes: [],
                  children: [{ kind: "text", value: "Published today" }]
                }
              ]
            }
          ]
        },
        {
          kind: "node",
          tag: "nav",
          attributes: [],
          children: [
            {
              kind: "node",
              tag: "a",
              attributes: [
                { kind: "attribute", name: "href", value: "/docs" },
                { kind: "attribute", name: "rel", value: "help" }
              ],
              children: [{ kind: "text", value: "Docs" }]
            }
          ]
        },
        {
          kind: "node",
          tag: "figure",
          attributes: [],
          children: [
            {
              kind: "node",
              tag: "img",
              attributes: [
                { kind: "attribute", name: "src", value: "/facet.png" },
                { kind: "attribute", name: "alt", value: "Facet logo" }
              ],
              children: []
            },
            {
              kind: "node",
              tag: "figcaption",
              attributes: [],
              children: [{ kind: "text", value: "A logo" }]
            }
          ]
        },
        {
          kind: "node",
          tag: "pre",
          attributes: [],
          children: [
            {
              kind: "node",
              tag: "code",
              attributes: [],
              children: [{ kind: "text", value: "const x = 1;" }]
            }
          ]
        },
        {
          kind: "node",
          tag: "table",
          attributes: [],
          children: [
            {
              kind: "node",
              tag: "thead",
              attributes: [],
              children: [
                {
                  kind: "node",
                  tag: "tr",
                  attributes: [],
                  children: [
                    {
                      kind: "node",
                      tag: "th",
                      attributes: [],
                      children: [{ kind: "text", value: "Name" }]
                    }
                  ]
                }
              ]
            },
            {
              kind: "node",
              tag: "tbody",
              attributes: [],
              children: [
                {
                  kind: "node",
                  tag: "tr",
                  attributes: [],
                  children: [
                    {
                      kind: "node",
                      tag: "td",
                      attributes: [],
                      children: [{ kind: "text", value: "Facet" }]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    });
  });

  it("supports form-oriented property helpers", () => {
    const H = htmlDsl(TreeAlgebra);

    const ui = H.form(
      H.label(H.attr("for", "name"), "Name"),
      H.input(
        H.id("name"),
        H.name("name"),
        H.type("text"),
        H.value("Ada"),
        H.placeholder("Your name"),
        H.disabled(false)
      ),
      H.textarea(
        H.name("bio"),
        H.defaultValue("Hello")
      ),
      H.select(
        H.name("choice"),
        H.value("b"),
        H.option(H.value("a"), "A"),
        H.option(H.value("b"), "B")
      )
    );

    expect(renderToJson(ui)).toEqual({
      kind: "node",
      tag: "form",
      attributes: [],
      children: [
        {
          kind: "node",
          tag: "label",
          attributes: [{ kind: "attribute", name: "for", value: "name" }],
          children: [{ kind: "text", value: "Name" }]
        },
        {
          kind: "node",
          tag: "input",
          attributes: [
            { kind: "property", name: "id", value: "name" },
            { kind: "property", name: "name", value: "name" },
            { kind: "property", name: "type", value: "text" },
            { kind: "property", name: "value", value: "Ada" },
            { kind: "property", name: "placeholder", value: "Your name" },
            { kind: "property", name: "disabled", value: false }
          ],
          children: []
        },
        {
          kind: "node",
          tag: "textarea",
          attributes: [
            { kind: "property", name: "name", value: "bio" },
            { kind: "property", name: "defaultValue", value: "Hello" }
          ],
          children: []
        },
        {
          kind: "node",
          tag: "select",
          attributes: [
            { kind: "property", name: "name", value: "choice" },
            { kind: "property", name: "value", value: "b" }
          ],
          children: [
            {
              kind: "node",
              tag: "option",
              attributes: [{ kind: "property", name: "value", value: "a" }],
              children: [{ kind: "text", value: "A" }]
            },
            {
              kind: "node",
              tag: "option",
              attributes: [{ kind: "property", name: "value", value: "b" }],
              children: [{ kind: "text", value: "B" }]
            }
          ]
        }
      ]
    });
  });

  it("supports keyed and memo helpers without changing structural JSON", () => {
    const H = htmlDsl(TreeAlgebra);

    const ui = H.ul(
      H.keyed("a", H.li("A")),
      H.memo("stable", H.keyed("b", H.li("B")))
    );

    expect(renderToJson(ui)).toEqual({
      kind: "node",
      tag: "ul",
      attributes: [],
      children: [
        {
          kind: "keyed",
          key: "a",
          child: {
            kind: "node",
            tag: "li",
            attributes: [],
            children: [{ kind: "text", value: "A" }]
          }
        },
        {
          kind: "keyed",
          key: "b",
          child: {
            kind: "node",
            tag: "li",
            attributes: [],
            children: [{ kind: "text", value: "B" }]
          }
        }
      ]
    });
  });
});
