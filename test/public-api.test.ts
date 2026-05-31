import { describe, expect, it } from "vitest";
import {
  DomRenderer,
  TreeAlgebra,
  className,
  createTestEvent,
  fireEvent,
  html,
  htmlDsl,
  inspect,
  on,
  prop,
  queryByText,
  renderToHtml,
  renderToJson,
  runApp,
  transition
} from "../src";

describe("public API", () => {
  it("exports the explicit HTML helpers, tree algebra, DOM renderer, and test renderer", () => {
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

  it("exports the ergonomic DSL without changing the denotation", () => {
    const H = htmlDsl(TreeAlgebra);

    const ui = H.button(
      H.cls("primary"),
      H.type("button"),
      H.onClick(() => ({ type: "Clicked" as const })),
      "Click"
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
  });

  it("exports the static HTML interpreter", () => {
    const H = htmlDsl(TreeAlgebra);

    const ui = H.main(
      H.cls("shell"),
      H.h1("Facet"),
      H.p("Meaning outside. Interpretation explicit.")
    );

    expect(renderToHtml(ui)).toBe(
      '<main class="shell"><h1>Facet</h1><p>Meaning outside. Interpretation explicit.</p></main>'
    );
  });

  it("exports pure ADT testing utilities", () => {
    const H = htmlDsl(TreeAlgebra);

    const ui = H.button(
      H.onClick(() => ({ type: "Saved" as const })),
      "Save"
    );

    const inspected = inspect(ui);
    const button = queryByText(inspected, "Save");

    expect(button?.tag).toBe("button");
    expect(fireEvent(button!, "click")).toEqual([{ type: "Saved" }]);
  });

  it("exports plain test events for decoder testing", () => {
    const H = htmlDsl(TreeAlgebra);

    const ui = H.input(
      H.onKeyDown((key) =>
        key === "Enter" ? { type: "EnterPressed" as const } : null
      )
    );

    const input = inspect(ui)[0];

    expect(input).toBeDefined();
    expect(
      fireEvent(
        input!,
        "keydown",
        createTestEvent({ key: "Enter" })
      )
    ).toEqual([{ type: "EnterPressed" }]);
  });

  it("exports the optional runtime app loop without requiring DOM semantics", () => {
    type TestUi = {
      readonly label: string;
    };

    type Mounted = {
      ui: TestUi;
      unmounted: boolean;
    };

    type State = {
      readonly count: number;
    };

    type Event = {
      readonly type: "Increment";
    };

    type Effect = {
      readonly type: "Logged";
      readonly count: number;
    };

    const effects: Effect[] = [];

    const renderer = {
      mount(
        _target: unknown,
        ui: TestUi
      ): Mounted {
        return {
          ui,
          unmounted: false
        };
      },

      patch(
        mounted: Mounted,
        ui: TestUi
      ): Mounted {
        mounted.ui = ui;
        return mounted;
      },

      unmount(mounted: Mounted): void {
        mounted.unmounted = true;
      }
    };

    const app = runApp<TestUi, State, Event, Effect, unknown, Mounted>({
      init: () => transition({ count: 0 }),

      update: (state) =>
        transition(
          { count: state.count + 1 },
          [{ type: "Logged", count: state.count + 1 }]
        ),

      view: (state) => ({ label: `count:${state.count}` }),

      runEffect: (effect) => {
        effects.push(effect);
      },

      renderer,
      target: {}
    });

    app.dispatch({ type: "Increment" });

    expect(app.getState()).toEqual({ count: 1 });
    expect(app.mounted.ui.label).toBe("count:1");
    expect(effects).toEqual([{ type: "Logged", count: 1 }]);

    app.unmount();
    expect(() => app.mounted).toThrow("Cannot read mounted app after unmount.");
  });
});
