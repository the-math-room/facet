import { describe, expect, it } from "vitest";
import {
  initialComposedState,
  updateComposed,
  viewComposed,
  viewMiniCounter
} from "../src/examples/composed";
import { renderToHtml } from "../src/string";
import {
  createTestEvent,
  fireEvent,
  queryByText
} from "../src/testing";
import { TreeAlgebra } from "../src/tree/tree-ui";

describe("composed package example", () => {
  it("lets a reusable child package own its local state and events", () => {
    const ui = viewMiniCounter(TreeAlgebra, {
      label: "Local",
      count: 3
    });

    const increment = queryByText(ui, "Increment Local");

    expect(increment).not.toBeNull();
    expect(
      fireEvent(
        increment!,
        "click",
        createTestEvent()
      )
    ).toEqual([
      {
        type: "Increment"
      }
    ]);
  });

  it("maps child events into parent events", () => {
    const ui = viewComposed(TreeAlgebra, initialComposedState);
    const incrementLeft = queryByText(ui, "Increment Left");
    const decrementRight = queryByText(ui, "Decrement Right");

    expect(incrementLeft).not.toBeNull();
    expect(decrementRight).not.toBeNull();

    expect(
      fireEvent(
        incrementLeft!,
        "click",
        createTestEvent()
      )
    ).toEqual([
      {
        type: "LeftCounter",
        event: { type: "Increment" }
      }
    ]);

    expect(
      fireEvent(
        decrementRight!,
        "click",
        createTestEvent()
      )
    ).toEqual([
      {
        type: "RightCounter",
        event: { type: "Decrement" }
      }
    ]);
  });

  it("delegates child updates in the parent update function", () => {
    const next = updateComposed(initialComposedState, {
      type: "RightCounter",
      event: { type: "Increment" }
    });

    expect(next.left.count).toBe(0);
    expect(next.right.count).toBe(11);
    expect(next.log).toEqual(["Right handled Increment"]);
  });

  it("renders composed package UI as static HTML", () => {
    const html = renderToHtml(
      viewComposed(TreeAlgebra, initialComposedState)
    );

    expect(html).toContain("Facet composition reference");
    expect(html).toContain('data-package="mini-counter"');
    expect(html).toContain("Increment Left");
    expect(html).toContain("Increment Right");
  });
});
