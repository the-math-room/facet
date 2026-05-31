import { describe, expect, it } from "vitest";
import { className, html, on, prop } from "../src/html";
import { renderToJson } from "../src/test-renderer";
import { TreeAlgebra } from "../src/tree/tree-ui";

describe("renderToJson", () => {
  it("renders a simple tree into normalized JSON", () => {
    const H = html(TreeAlgebra);

    const ui = H.div(
      [className("card"), prop("id", "root")],
      [
        H.h1([], [H.text("Facet")]),
        H.p([], [H.text("Hello")])
      ]
    );

    expect(renderToJson(ui)).toEqual({
      kind: "node",
      tag: "div",
      attributes: [
        { kind: "class", value: "card" },
        { kind: "property", name: "id", value: "root" }
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
          attributes: [],
          children: [{ kind: "text", value: "Hello" }]
        }
      ]
    });
  });

  it("normalizes empty and concat children", () => {
    const H = html(TreeAlgebra);

    const ui = H.div(
      [],
      [
        H.empty(),
        H.concat([
          H.text("a"),
          H.empty(),
          H.text("b")
        ])
      ]
    );

    expect(renderToJson(ui)).toEqual({
      kind: "node",
      tag: "div",
      attributes: [],
      children: [
        { kind: "text", value: "a" },
        { kind: "text", value: "b" }
      ]
    });
  });

  it("preserves keyed structure", () => {
    const H = html(TreeAlgebra);

    const ui = H.ul(
      [],
      [
        H.keyed("a", H.li([], [H.text("A")])),
        H.keyed("b", H.li([], [H.text("B")]))
      ]
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

  it("erases mapped nodes from structural JSON while preserving event names", () => {
    const H = html(TreeAlgebra);

    const child = H.button<number>(
      [on("click", () => 1)],
      [H.text("Click")]
    );

    const parent = H.mapEvent<number, string>(
      child,
      (value) => `value:${value}`
    );

    expect(renderToJson(parent)).toEqual({
      kind: "node",
      tag: "button",
      attributes: [{ kind: "event", name: "click" }],
      children: [{ kind: "text", value: "Click" }]
    });
  });
});
