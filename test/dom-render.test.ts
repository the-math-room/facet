import { describe, expect, it } from "vitest";
import { html, on, prop } from "../src/html/html";
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

  it("delegates decoded events from the root", () => {
    const H = html(TreeAlgebra);
    const root = document.createElement("div");

    let rootListenerCount = 0;
    const originalAddEventListener = root.addEventListener.bind(root);

    root.addEventListener = ((...args: Parameters<Element["addEventListener"]>) => {
      rootListenerCount += 1;
      originalAddEventListener(...args);
    }) as Element["addEventListener"];

    const events: string[] = [];

    DomRenderer.mount(
      root,
      H.div(
        [],
        [
          H.button(
            [on("click", () => "first")],
            [H.text("First")]
          ),
          H.button(
            [on("click", () => "second")],
            [H.text("Second")]
          )
        ]
      ),
      (event) => events.push(event)
    );

    expect(rootListenerCount).toBe(1);

    const buttons = root.querySelectorAll("button");
    buttons[0]!.click();
    buttons[1]!.click();

    expect(events).toEqual(["first", "second"]);
  });

  it("does not add duplicate delegated root listeners after patches", () => {
    const H = html(TreeAlgebra);
    const root = document.createElement("div");

    let rootListenerCount = 0;
    const originalAddEventListener = root.addEventListener.bind(root);

    root.addEventListener = ((...args: Parameters<Element["addEventListener"]>) => {
      rootListenerCount += 1;
      originalAddEventListener(...args);
    }) as Element["addEventListener"];

    const mounted = DomRenderer.mount(
      root,
      H.button(
        [on("click", () => "clicked")],
        [H.text("Click")]
      ),
      () => {}
    );

    DomRenderer.patch(
      mounted,
      H.button(
        [on("click", () => "clicked")],
        [H.text("Click")]
      ),
      () => {}
    );

    DomRenderer.patch(
      mounted,
      H.button(
        [on("click", () => "clicked")],
        [H.text("Click")]
      ),
      () => {}
    );

    expect(rootListenerCount).toBe(1);
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

  it("dispatches patched mapped events", () => {
    const H = html(TreeAlgebra);
    const root = document.createElement("div");

    type ChildEvent = { readonly type: "ChildClicked" };
    type ParentEvent =
      | { readonly type: "Before"; readonly event: ChildEvent }
      | { readonly type: "After"; readonly event: ChildEvent };

    const child = H.button<ChildEvent>(
      [on("click", () => ({ type: "ChildClicked" }))],
      [H.text("Click")]
    );

    const before = H.mapEvent<ChildEvent, ParentEvent>(
      child,
      (event) => ({ type: "Before", event })
    );

    const after = H.mapEvent<ChildEvent, ParentEvent>(
      child,
      (event) => ({ type: "After", event })
    );

    const events: ParentEvent[] = [];

    const mounted = DomRenderer.mount(
      root,
      before,
      (event) => events.push(event)
    );

    DomRenderer.patch(
      mounted,
      after,
      (event) => events.push(event)
    );

    const button = root.querySelector("button");
    expect(button).not.toBeNull();

    button!.click();

    expect(events).toEqual([
      {
        type: "After",
        event: { type: "ChildClicked" }
      }
    ]);
  });

  it("patches same-tag nodes in place", () => {
    const H = html(TreeAlgebra);
    const root = document.createElement("div");

    const mounted = DomRenderer.mount(
      root,
      H.div([], [H.text("Before")]),
      () => {}
    );

    const divBefore = root.querySelector("div");
    expect(divBefore).not.toBeNull();

    DomRenderer.patch(
      mounted,
      H.div([], [H.text("After")]),
      () => {}
    );

    const divAfter = root.querySelector("div");

    expect(root.textContent).toBe("After");
    expect(divAfter).toBe(divBefore);
  });

  it("replaces different-tag nodes", () => {
    const H = html(TreeAlgebra);
    const root = document.createElement("div");

    const mounted = DomRenderer.mount(
      root,
      H.div([], [H.text("Before")]),
      () => {}
    );

    const divBefore = root.querySelector("div");
    expect(divBefore).not.toBeNull();

    DomRenderer.patch(
      mounted,
      H.section([], [H.text("After")]),
      () => {}
    );

    const sectionAfter = root.querySelector("section");

    expect(root.textContent).toBe("After");
    expect(sectionAfter).not.toBeNull();
    expect(sectionAfter).not.toBe(divBefore);
  });

  it("preserves focused input identity across same-tag patch", () => {
    const H = html(TreeAlgebra);
    const root = document.createElement("div");
    document.body.appendChild(root);

    try {
      const mounted = DomRenderer.mount(
        root,
        H.input<string>(
          [
            prop<string>("value", "a"),
            on("input", () => "input")
          ],
          []
        ),
        () => {}
      );

      const inputBefore = root.querySelector("input");
      expect(inputBefore).not.toBeNull();

      inputBefore!.focus();
      expect(document.activeElement).toBe(inputBefore);

      DomRenderer.patch(
        mounted,
        H.input<string>(
          [
            prop<string>("value", "b"),
            on("input", () => "input")
          ],
          []
        ),
        () => {}
      );

      const inputAfter = root.querySelector("input");

      expect(inputAfter).toBe(inputBefore);
      expect(document.activeElement).toBe(inputBefore);
      expect(inputAfter).toHaveProperty("value", "b");
    } finally {
      root.remove();
    }
  });

  it("does not duplicate dispatched events after repeated patches", () => {
    const H = html(TreeAlgebra);
    const root = document.createElement("div");
    const events: string[] = [];

    const mounted = DomRenderer.mount(
      root,
      H.button(
        [on("click", () => "clicked")],
        [H.text("Click")]
      ),
      (event) => events.push(event)
    );

    DomRenderer.patch(
      mounted,
      H.button(
        [on("click", () => "clicked")],
        [H.text("Click")]
      ),
      (event) => events.push(event)
    );

    DomRenderer.patch(
      mounted,
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
});
