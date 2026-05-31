import { describe, expect, it } from "vitest";
import { htmlDsl } from "../src/html";
import {
  createTestEvent,
  fireEvent,
  inspect,
  queryAllByTag,
  queryByAttribute,
  queryByTag,
  queryByText
} from "../src/testing";
import { TreeAlgebra } from "../src/tree/tree-ui";

describe("ADT testing utilities", () => {
  it("queries UI denotations by text, tag, and attribute without DOM", () => {
    const H = htmlDsl(TreeAlgebra);

    const ui = H.main(
      H.section(
        H.id("intro"),
        H.cls("card"),
        H.h1("Facet"),
        H.p("Pure projection")
      ),
      H.button(
        H.type("button"),
        H.data("action", "save"),
        "Save"
      )
    );

    expect(queryByText(ui, "Facet")?.tag).toBe("h1");
    expect(queryByTag(ui, "section")?.textContent).toBe("FacetPure projection");
    expect(queryAllByTag(ui, "button")).toHaveLength(1);
    expect(queryByAttribute(ui, "data-action", "save")?.tag).toBe("button");

    const inspected = inspect(ui);
    expect(inspected[0]?.tag).toBe("main");
  });

  it("fires decoded domain events from the ADT", () => {
    const H = htmlDsl(TreeAlgebra);

    const ui = H.button(
      H.type("button"),
      H.onClick(() => ({ type: "Saved" as const })),
      "Save"
    );

    const button = queryByText(ui, "Save");
    expect(button).not.toBeNull();

    expect(fireEvent(button!, "click")).toEqual([
      { type: "Saved" }
    ]);
  });

  it("applies mapped event pipelines", () => {
    const H = htmlDsl(TreeAlgebra);

    type ChildEvent = { readonly type: "Child" };
    type ParentEvent = {
      readonly type: "Parent";
      readonly event: ChildEvent;
    };

    const child = H.button<ChildEvent>(
      H.onClick(() => ({ type: "Child" })),
      "Click"
    );

    const parent = H.mapEvents<ChildEvent, ParentEvent>(
      (event) => ({ type: "Parent", event })
    )(child);

    const button = queryByText(parent, "Click");
    expect(button).not.toBeNull();

    expect(fireEvent(button!, "click")).toEqual([
      {
        type: "Parent",
        event: { type: "Child" }
      }
    ]);
  });

  it("fires semantic form helpers using plain test events", () => {
    const H = htmlDsl(TreeAlgebra);

    type FormEvent =
      | { readonly type: "Submitted" }
      | { readonly type: "DraftChanged"; readonly text: string }
      | { readonly type: "CheckedChanged"; readonly checked: boolean }
      | { readonly type: "EnterPressed" };

    const ui = H.form<FormEvent>(
      H.onSubmit<FormEvent>(() => ({ type: "Submitted" })),
      H.input<FormEvent>(
        H.onTextInput<FormEvent>((text) => ({
          type: "DraftChanged",
          text
        }))
      ),
      H.input<FormEvent>(
        H.type("checkbox"),
        H.onCheckedChange<FormEvent>((checked) => ({
          type: "CheckedChanged",
          checked
        }))
      ),
      H.input<FormEvent>(
        H.onKeyDown<FormEvent>((key) =>
          key === "Enter" ? { type: "EnterPressed" } : null
        )
      )
    );

    const form = queryByTag(ui, "form");
    const inputs = queryAllByTag(ui, "input");

    expect(form).not.toBeNull();
    expect(inputs).toHaveLength(3);

    let prevented = false;

    expect(
      fireEvent(
        form!,
        "submit",
        createTestEvent({
          preventDefault: () => {
            prevented = true;
          }
        })
      )
    ).toEqual([{ type: "Submitted" }]);

    expect(prevented).toBe(true);

    expect(
      fireEvent(
        inputs[0]!,
        "input",
        createTestEvent({
          target: { value: "hello" }
        })
      )
    ).toEqual([{ type: "DraftChanged", text: "hello" }]);

    expect(
      fireEvent(
        inputs[1]!,
        "change",
        createTestEvent({
          target: { checked: true }
        })
      )
    ).toEqual([{ type: "CheckedChanged", checked: true }]);

    expect(
      fireEvent(
        inputs[2]!,
        "keydown",
        createTestEvent({
          key: "Enter"
        })
      )
    ).toEqual([{ type: "EnterPressed" }]);
  });
});
