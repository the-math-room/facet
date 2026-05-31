import { describe, expect, it } from "vitest";
import {
  DomRenderer,
  TreeAlgebra,
  className,
  html,
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

    expect(DomRenderer).toHaveProperty("mount");
    expect(DomRenderer).toHaveProperty("patch");
    expect(DomRenderer).toHaveProperty("unmount");
  });
});
