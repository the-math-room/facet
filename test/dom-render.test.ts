import { describe, expect, it } from "vitest";
import { html, on } from "../src/core/html";
import { DomRenderer } from "../src/dom/render";
import { TreeAlgebra } from "../src/tree/tree-ui";

describe("DomRenderer", () => {
  it("renders text into the DOM", () => {
    const H = html(TreeAlgebra);
    const root = document.createElement("div");

    DomRenderer.mount(
      root,
      H.div([], [H.text("Hello")]),
      () => {}
    );

    expect(root.textContent).toBe("Hello");
  });

  it("dispatches decoded events", () => {
    const H = html(TreeAlgebra);
    const root = document.createElement("div");

    const events: string[] = [];

    DomRenderer.mount(
      root,
      H.button(
        [on("click", () => "clicked")],
        [H.text("Click")]
      ),
      (event) => events.push(event)
    );

    const button = root.querySelector("button");
    expect(button).not.toBeNull();

    button!.click();

    expect(events).toEqual(["clicked"]);
  });

  it("dispatches lazily mapped events", () => {
    const H = html(TreeAlgebra);
    const root = document.createElement("div");

    type ChildEvent = { readonly type: "ChildClicked" };
    type ParentEvent = {
      readonly type: "FromChild";
      readonly event: ChildEvent;
    };

    const child = H.button<ChildEvent>(
      [on("click", () => ({ type: "ChildClicked" }))],
      [H.text("Click")]
    );

    const parent = H.mapEvent<ChildEvent, ParentEvent>(
      child,
      (event) => ({ type: "FromChild", event })
    );

    const events: ParentEvent[] = [];

    DomRenderer.mount(
      root,
      parent,
      (event) => events.push(event)
    );

    const button = root.querySelector("button");
    expect(button).not.toBeNull();

    button!.click();

    expect(events).toEqual([
      {
        type: "FromChild",
        event: { type: "ChildClicked" }
      }
    ]);
  });

  it("patches by replacing the mounted UI", () => {
    const H = html(TreeAlgebra);
    const root = document.createElement("div");

    const mounted = DomRenderer.mount(
      root,
      H.div([], [H.text("Before")]),
      () => {}
    );

    DomRenderer.patch(
      mounted,
      H.div([], [H.text("After")]),
      () => {}
    );

    expect(root.textContent).toBe("After");
  });
});
