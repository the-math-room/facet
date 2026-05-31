import { describe, expect, it } from "vitest";
import {
  initialWorkbenchState,
  updateWorkbench,
  viewWorkbench
} from "../src/examples/workbench";
import { renderToHtml } from "../src/string";
import {
  createTestEvent,
  fireEvent,
  queryByText
} from "../src/testing";

describe("workbench example", () => {
  it("updates pure state", () => {
    const [next] = updateWorkbench(initialWorkbenchState, {
      type: "TitleChanged",
      title: "New title"
    });

    expect(next.title).toBe("New title");
  });

  it("returns effects without running them in update", () => {
    const [next, effects] = updateWorkbench(initialWorkbenchState, {
      type: "PreviewClicked"
    });

    expect(next.clicks).toBe(1);
    expect(effects).toEqual([
      {
        type: "Logged",
        message: "Preview clicked 1 time(s)."
      }
    ]);
  });

  it("renders the workbench as static HTML", () => {
    expect(renderToHtml(viewWorkbench(initialWorkbenchState))).toContain(
      "Facet workbench"
    );
  });

  it("lets pure ADT tests fire the rendered preview event", () => {
    const ui = viewWorkbench(initialWorkbenchState);
    const save = queryByText(ui, "Save");

    expect(save).not.toBeNull();

    expect(
      fireEvent(
        save!,
        "click",
        createTestEvent()
      )
    ).toEqual([
      {
        type: "PreviewClicked"
      }
    ]);
  });
});
