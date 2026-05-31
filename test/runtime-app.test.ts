import { describe, expect, it } from "vitest";
import type { Dispatch, Renderer, UiOf } from "../src/core";
import { runApp, transition } from "../src/runtime";

type TestUi = {
  readonly label: string;
  readonly event?: unknown;
};

type Mounted = {
  readonly target: TestTarget;
  ui: UiOf<TestUi, unknown>;
  dispatch: Dispatch<unknown>;
  unmounted: boolean;
};

type TestTarget = {
  mounted: Mounted | null;
};

function ui<Event>(
  label: string,
  event?: Event
): UiOf<TestUi, Event> {
  return { label, event } as UiOf<TestUi, Event>;
}

const testRenderer: Renderer<TestUi, TestTarget, Mounted> = {
  mount<Event>(
    target: TestTarget,
    next: UiOf<TestUi, Event>,
    dispatch: Dispatch<Event>
  ): Mounted {
    const mounted: Mounted = {
      target,
      ui: next as UiOf<TestUi, unknown>,
      dispatch: dispatch as Dispatch<unknown>,
      unmounted: false
    };

    target.mounted = mounted;
    return mounted;
  },

  patch<Event>(
    mounted: Mounted,
    next: UiOf<TestUi, Event>,
    dispatch: Dispatch<Event>
  ): Mounted {
    mounted.ui = next as UiOf<TestUi, unknown>;
    mounted.dispatch = dispatch as Dispatch<unknown>;
    return mounted;
  },

  unmount(mounted: Mounted): void {
    mounted.unmounted = true;
    mounted.target.mounted = null;
  }
};

describe("runApp", () => {
  it("mounts initial state, dispatches updates, patches views, and runs effects", () => {
    type State = {
      readonly count: number;
    };

    type Event =
      | { readonly type: "Increment" }
      | { readonly type: "EffectFinished" };

    type Effect = {
      readonly type: "Log";
      readonly message: string;
    };

    const target: TestTarget = { mounted: null };
    const effects: Effect[] = [];

    const app = runApp<TestUi, State, Event, Effect, TestTarget, Mounted>({
      init: () =>
        transition(
          { count: 0 },
          [{ type: "Log", message: "init" }]
        ),

      update: (state, event) => {
        switch (event.type) {
          case "Increment":
            return transition(
              { count: state.count + 1 },
              [{ type: "Log", message: "incremented" }]
            );

          case "EffectFinished":
            return transition(state);
        }
      },

      view: (state) => ui(`count:${state.count}`),

      runEffect: (effect) => {
        effects.push(effect);
      },

      renderer: testRenderer,
      target
    });

    expect(app.getState()).toEqual({ count: 0 });
    expect(target.mounted?.ui.label).toBe("count:0");
    expect(effects).toEqual([{ type: "Log", message: "init" }]);

    app.dispatch({ type: "Increment" });

    expect(app.getState()).toEqual({ count: 1 });
    expect(target.mounted?.ui.label).toBe("count:1");
    expect(effects).toEqual([
      { type: "Log", message: "init" },
      { type: "Log", message: "incremented" }
    ]);
  });

  it("lets effects dispatch follow-up events", () => {
    type State = {
      readonly messages: readonly string[];
    };

    type Event =
      | { readonly type: "Start" }
      | { readonly type: "Finished"; readonly message: string };

    type Effect = {
      readonly type: "FinishLater";
      readonly message: string;
    };

    const target: TestTarget = { mounted: null };

    const app = runApp<TestUi, State, Event, Effect, TestTarget, Mounted>({
      init: () => transition({ messages: [] }),

      update: (state, event) => {
        switch (event.type) {
          case "Start":
            return transition(
              state,
              [{ type: "FinishLater", message: "done" }]
            );

          case "Finished":
            return transition({
              messages: [...state.messages, event.message]
            });
        }
      },

      view: (state) => ui(state.messages.join(",")),

      runEffect: (effect, dispatch) => {
        dispatch({
          type: "Finished",
          message: effect.message
        });
      },

      renderer: testRenderer,
      target
    });

    app.dispatch({ type: "Start" });

    expect(app.getState()).toEqual({
      messages: ["done"]
    });
    expect(target.mounted?.ui.label).toBe("done");
  });

  it("unmounts through the renderer", () => {
    type State = {
      readonly value: string;
    };

    type Event = never;
    type Effect = never;

    const target: TestTarget = { mounted: null };

    const app = runApp<TestUi, State, Event, Effect, TestTarget, Mounted>({
      init: () => transition({ value: "mounted" }),
      update: (state) => transition(state),
      view: (state) => ui(state.value),
      runEffect: () => {},
      renderer: testRenderer,
      target
    });

    const mounted = target.mounted;
    expect(mounted).not.toBeNull();

    app.unmount();

    expect(mounted?.unmounted).toBe(true);
    expect(target.mounted).toBeNull();
  });
});
