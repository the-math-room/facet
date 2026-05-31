import { describe, expect, it } from "vitest";
import {
  initialDynamicComposedState,
  updateDynamicComposed,
  viewDynamicComposed
} from "../src/examples/dynamic-composed";
import { renderToHtml } from "../src/string";
import {
  createTestEvent,
  fireEvent,
  queryByText
} from "../src/testing";
import { TreeAlgebra } from "../src/tree/tree-ui";

describe("dynamic composed package example", () => {
  it("maps dynamic child events by id", () => {
    const ui = viewDynamicComposed(
      TreeAlgebra,
      initialDynamicComposedState
    );

    const increment = queryByText(ui, "Increment Counter 1");
    expect(increment).not.toBeNull();

    expect(
      fireEvent(
        increment!,
        "click",
        createTestEvent()
      )
    ).toEqual([
      {
        type: "Counter",
        id: "counter-1",
        event: { type: "Increment" }
      }
    ]);
  });

  it("delegates dynamic child updates by id", () => {
    const next = updateDynamicComposed(
      initialDynamicComposedState,
      {
        type: "Counter",
        id: "counter-2",
        event: { type: "Increment" }
      }
    );

    expect(next.counters[0]?.counter.count).toBe(0);
    expect(next.counters[1]?.counter.count).toBe(6);
    expect(next.log).toEqual(["counter-2 handled Increment"]);
  });

  it("adds and removes dynamic child instances", () => {
    const added = updateDynamicComposed(
      initialDynamicComposedState,
      { type: "AddCounter" }
    );

    expect(added.counters).toHaveLength(3);
    expect(added.counters[2]?.id).toBe("counter-3");

    const removed = updateDynamicComposed(
      added,
      {
        type: "RemoveCounter",
        id: "counter-1"
      }
    );

    expect(removed.counters.map((entry) => entry.id)).toEqual([
      "counter-2",
      "counter-3"
    ]);
  });

  it("renders dynamic composition to static HTML", () => {
    const html = renderToHtml(
      viewDynamicComposed(TreeAlgebra, initialDynamicComposedState)
    );

    expect(html).toContain("Facet dynamic composition");
    expect(html).toContain("Increment Counter 1");
    expect(html).toContain("Increment Counter 2");
  });
});
