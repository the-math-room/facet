import { describe, expect, it } from "vitest";
import {
  DomRenderer,
  TreeAlgebra,
  className,
  html,
  htmlDsl,
  on,
  prop,
  renderToJson
} from "../src";

describe("public API", () => {
  it("exports the HTML helpers, tree algebra, DOM renderer, and test renderer", () => {
    const H = html(TreeAlgebra);

    const ui = H.button(
      [
        className("primary"),
        prop("type", "button"),
        on("click", () => "clicked")
      ],
      [H.text("Click")]
    );

    expect(renderToJson(ui)).toEqual({
      kind: "node",
      tag: "button",
      attributes: [
        { kind: "class", value: "primary" },
        { kind: "property", name: "type", value: "button" },
        { kind: "event", name: "click" }
      ],
      children: [{ kind: "text", value: "Click" }]
    });

    const memoUi = H.memo("stable", ui);

    expect(renderToJson(memoUi)).toEqual(renderToJson(ui));

    const D = htmlDsl(TreeAlgebra);

    expect(renderToJson(D.button(D.prop("type", "button"), "DSL"))).toEqual({
      kind: "node",
      tag: "button",
      attributes: [
        { kind: "property", name: "type", value: "button" }
      ],
      children: [{ kind: "text", value: "DSL" }]
    });

    expect(DomRenderer).toHaveProperty("mount");
    expect(DomRenderer).toHaveProperty("patch");
    expect(DomRenderer).toHaveProperty("unmount");
  });
});
