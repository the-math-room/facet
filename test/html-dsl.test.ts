import { describe, expect, it } from "vitest";
import { htmlDsl } from "../src/html";
import { renderToJson } from "../src/test-renderer";
import { TreeAlgebra } from "../src/tree/tree-ui";

describe("htmlDsl", () => {
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
