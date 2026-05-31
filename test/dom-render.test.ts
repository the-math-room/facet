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
      (event: unknown) => events.push(String(event))
    );

    expect(rootListenerCount).toBe(1);

    const buttons = root.querySelectorAll("button");
    buttons[0]!.click();
    buttons[1]!.click();

    expect(events).toEqual(["first", "second"]);
  });

  it("uses capture-phase delegation for non-bubbling focus events", () => {
    const H = html(TreeAlgebra);
    const root = document.createElement("div");
    document.body.appendChild(root);

    try {
      const events: string[] = [];

      DomRenderer.mount(
        root,
        H.input<string>(
          [on("focus", () => "focused")],
          []
        ),
        (event: unknown) => events.push(String(event))
      );

      const input = root.querySelector("input");
      expect(input).not.toBeNull();

      input!.focus();

      expect(events).toEqual(["focused"]);
    } finally {
      root.remove();
    }
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

  it("removes delegated handlers from a patched same-tag node", () => {
    const H = html(TreeAlgebra);
    const root = document.createElement("div");
    const events: string[] = [];

    const mounted = DomRenderer.mount(
      root,
      H.button(
        [on("click", () => "clicked")],
        [H.text("Click")]
      ),
      (event: unknown) => events.push(String(event))
    );

    DomRenderer.patch(
      mounted,
      H.button([], [H.text("Click")]),
      (event: unknown) => events.push(String(event))
    );

    const button = root.querySelector("button");
    expect(button).not.toBeNull();

    button!.click();

    expect(events).toEqual([]);
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
      (event: ParentEvent) => events.push(event)
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

  it("dispatches nested mapped events in the correct order", () => {
    const H = html(TreeAlgebra);
    const root = document.createElement("div");

    const base = H.button<number>(
      [on("click", () => 1)],
      [H.text("Click")]
    );

    const plusOne = H.mapEvent<number, number>(
      base,
      (value) => value + 1
    );

    const mapped = H.mapEvent<number, string>(
      plusOne,
      (value) => `value:${value}`
    );

    const events: string[] = [];

    DomRenderer.mount(
      root,
      mapped,
      (event: unknown) => events.push(String(event))
    );

    const button = root.querySelector("button");
    expect(button).not.toBeNull();

    button!.click();

    expect(events).toEqual(["value:2"]);
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
      (event: ParentEvent) => events.push(event)
    );

    DomRenderer.patch(
      mounted,
      after,
      (event: ParentEvent) => events.push(event)
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

  it("reorders keyed children without replacing DOM nodes", () => {
    const H = html(TreeAlgebra);
    const root = document.createElement("div");

    const view = (order: readonly string[]) =>
      H.ul(
        [],
        order.map((name) =>
          H.keyed(
            name,
            H.li([], [H.text(name)])
          )
        )
      );

    const mounted = DomRenderer.mount(
      root,
      view(["A", "B", "C"]),
      () => {}
    );

    const before = Array.from(root.querySelectorAll("li"));
    expect(before.map((node) => node.textContent)).toEqual(["A", "B", "C"]);

    DomRenderer.patch(
      mounted,
      view(["C", "A", "B"]),
      () => {}
    );

    const after = Array.from(root.querySelectorAll("li"));

    expect(after.map((node) => node.textContent)).toEqual(["C", "A", "B"]);
    expect(after[0]).toBe(before[2]);
    expect(after[1]).toBe(before[0]);
    expect(after[2]).toBe(before[1]);
  });

  it("inserts keyed children while preserving existing keyed nodes", () => {
    const H = html(TreeAlgebra);
    const root = document.createElement("div");

    const view = (order: readonly string[]) =>
      H.ul(
        [],
        order.map((name) =>
          H.keyed(
            name,
            H.li([], [H.text(name)])
          )
        )
      );

    const mounted = DomRenderer.mount(
      root,
      view(["A", "C"]),
      () => {}
    );

    const before = Array.from(root.querySelectorAll("li"));

    DomRenderer.patch(
      mounted,
      view(["A", "B", "C"]),
      () => {}
    );

    const after = Array.from(root.querySelectorAll("li"));

    expect(after.map((node) => node.textContent)).toEqual(["A", "B", "C"]);
    expect(after[0]).toBe(before[0]);
    expect(after[2]).toBe(before[1]);
  });

  it("removes keyed children while preserving remaining keyed nodes", () => {
    const H = html(TreeAlgebra);
    const root = document.createElement("div");

    const view = (order: readonly string[]) =>
      H.ul(
        [],
        order.map((name) =>
          H.keyed(
            name,
            H.li([], [H.text(name)])
          )
        )
      );

    const mounted = DomRenderer.mount(
      root,
      view(["A", "B", "C"]),
      () => {}
    );

    const before = Array.from(root.querySelectorAll("li"));

    DomRenderer.patch(
      mounted,
      view(["C", "A"]),
      () => {}
    );

    const after = Array.from(root.querySelectorAll("li"));

    expect(after.map((node) => node.textContent)).toEqual(["C", "A"]);
    expect(after[0]).toBe(before[2]);
    expect(after[1]).toBe(before[0]);
  });

  it("clears removed string DOM properties defensively", () => {
    const H = html(TreeAlgebra);
    const root = document.createElement("div");

    const mounted = DomRenderer.mount(
      root,
      H.input<string>(
        [prop<string>("value", "Hello")],
        []
      ),
      () => {}
    );

    const input = root.querySelector("input");
    expect(input).not.toBeNull();
    expect(input).toHaveProperty("value", "Hello");

    DomRenderer.patch(
      mounted,
      H.input<string>([], []),
      () => {}
    );

    expect(input).toHaveProperty("value", "");
  });

  it("clears removed boolean DOM properties defensively", () => {
    const H = html(TreeAlgebra);
    const root = document.createElement("div");

    const mounted = DomRenderer.mount(
      root,
      H.button<string>(
        [prop<string>("disabled", true)],
        [H.text("Disabled")]
      ),
      () => {}
    );

    const button = root.querySelector("button");
    expect(button).not.toBeNull();
    expect(button).toHaveProperty("disabled", true);

    DomRenderer.patch(
      mounted,
      H.button<string>([], [H.text("Enabled")]),
      () => {}
    );

    expect(button).toHaveProperty("disabled", false);
  });

  it("throws on duplicate keyed children during mount", () => {
    const H = html(TreeAlgebra);
    const root = document.createElement("div");

    expect(() =>
      DomRenderer.mount(
        root,
        H.ul(
          [],
          [
            H.keyed("a", H.li([], [H.text("first")])),
            H.keyed("a", H.li([], [H.text("second")]))
          ]
        ),
        () => {}
      )
    ).toThrow(/Duplicate keyed child "a"/);
  });

  it("throws on duplicate keyed children during patch", () => {
    const H = html(TreeAlgebra);
    const root = document.createElement("div");

    const mounted = DomRenderer.mount(
      root,
      H.ul(
        [],
        [
          H.keyed("a", H.li([], [H.text("first")])),
          H.keyed("b", H.li([], [H.text("second")]))
        ]
      ),
      () => {}
    );

    expect(() =>
      DomRenderer.patch(
        mounted,
        H.ul(
          [],
          [
            H.keyed("a", H.li([], [H.text("first")])),
            H.keyed("a", H.li([], [H.text("second")]))
          ]
        ),
        () => {}
      )
    ).toThrow(/Duplicate keyed child "a"/);
  });

  it("keeps already ordered keyed children in place when appending", () => {
    const H = html(TreeAlgebra);
    const root = document.createElement("div");

    const view = (order: readonly string[]) =>
      H.ul(
        [],
        order.map((name) =>
          H.keyed(
            name,
            H.li([], [H.text(name)])
          )
        )
      );

    const mounted = DomRenderer.mount(
      root,
      view(["A", "B", "C"]),
      () => {}
    );

    const before = Array.from(root.querySelectorAll("li"));

    DomRenderer.patch(
      mounted,
      view(["A", "B", "C", "D"]),
      () => {}
    );

    const after = Array.from(root.querySelectorAll("li"));

    expect(after.map((node) => node.textContent)).toEqual(["A", "B", "C", "D"]);
    expect(after[0]).toBe(before[0]);
    expect(after[1]).toBe(before[1]);
    expect(after[2]).toBe(before[2]);
  });

  it("moves last keyed child to front while preserving all keyed nodes", () => {
    const H = html(TreeAlgebra);
    const root = document.createElement("div");

    const view = (order: readonly string[]) =>
      H.ul(
        [],
        order.map((name) =>
          H.keyed(
            name,
            H.li([], [H.text(name)])
          )
        )
      );

    const mounted = DomRenderer.mount(
      root,
      view(["A", "B", "C", "D"]),
      () => {}
    );

    const before = Array.from(root.querySelectorAll("li"));

    DomRenderer.patch(
      mounted,
      view(["D", "A", "B", "C"]),
      () => {}
    );

    const after = Array.from(root.querySelectorAll("li"));

    expect(after.map((node) => node.textContent)).toEqual(["D", "A", "B", "C"]);
    expect(after[0]).toBe(before[3]);
    expect(after[1]).toBe(before[0]);
    expect(after[2]).toBe(before[1]);
    expect(after[3]).toBe(before[2]);
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
      (event: unknown) => events.push(String(event))
    );

    DomRenderer.patch(
      mounted,
      H.button(
        [on("click", () => "clicked")],
        [H.text("Click")]
      ),
      (event: unknown) => events.push(String(event))
    );

    DomRenderer.patch(
      mounted,
      H.button(
        [on("click", () => "clicked")],
        [H.text("Click")]
      ),
      (event: unknown) => events.push(String(event))
    );

    const button = root.querySelector("button");
    expect(button).not.toBeNull();

    button!.click();

    expect(events).toEqual(["clicked"]);
  });
});
