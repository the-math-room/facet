import { describe, expect, it } from "vitest";
import { renderToJson } from "../src/test-renderer";
import { TreeAlgebra } from "../src/tree/tree-ui";
import {
  initialReferenceState,
  updateReference,
  viewReference
} from "../src/examples/reference";

describe("reference example", () => {
  it("updates draft text", () => {
    expect(
      updateReference(initialReferenceState, {
        type: "DraftChanged",
        draft: "Ship Facet"
      }).draft
    ).toBe("Ship Facet");
  });

  it("adds a task from the draft", () => {
    const withDraft = updateReference(initialReferenceState, {
      type: "DraftChanged",
      draft: "Ship Facet"
    });

    const submitted = updateReference(withDraft, {
      type: "TaskSubmitted"
    });

    expect(submitted.draft).toBe("");
    expect(submitted.tasks.at(-1)).toMatchObject({
      title: "Ship Facet",
      done: false
    });
  });

  it("toggles and removes tasks", () => {
    const toggled = updateReference(initialReferenceState, {
      type: "TaskToggled",
      id: "task-2",
      done: true
    });

    expect(toggled.tasks.find((task) => task.id === "task-2")?.done).toBe(true);

    const removed = updateReference(toggled, {
      type: "TaskRemoved",
      id: "task-2"
    });

    expect(removed.tasks.some((task) => task.id === "task-2")).toBe(false);
  });

  it("renders a structural reference view", () => {
    const json = renderToJson(
      viewReference(TreeAlgebra, initialReferenceState)
    );

    expect(json).toMatchObject({
      kind: "node",
      tag: "main"
    });
  });
});
