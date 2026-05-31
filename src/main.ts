import type { UiOf } from "./core";
import { DomRenderer } from "./dom/render";
import {
  initialComposedState,
  updateComposed,
  viewComposed,
  type ComposedEvent,
  type ComposedState
} from "./examples/composed";
import {
  initialDynamicComposedState,
  updateDynamicComposed,
  viewDynamicComposed,
  type DynamicComposedEvent,
  type DynamicComposedState
} from "./examples/dynamic-composed";
import {
  initialWorkbenchState,
  updateWorkbench,
  viewWorkbench,
  type WorkbenchEffect,
  type WorkbenchEvent,
  type WorkbenchState
} from "./examples/workbench";
import { htmlDsl } from "./html";
import { runApp, transition } from "./runtime";
import { TreeAlgebra, type TreeUi } from "./tree/tree-ui";
import "./style.css";

type ExampleId = "workbench" | "composition" | "dynamic";

type DemoState = {
  readonly active: ExampleId;
  readonly workbench: WorkbenchState;
  readonly composition: ComposedState;
  readonly dynamic: DynamicComposedState;
};

type DemoEvent =
  | { readonly type: "ExampleSelected"; readonly active: ExampleId }
  | { readonly type: "Workbench"; readonly event: WorkbenchEvent }
  | { readonly type: "Composition"; readonly event: ComposedEvent }
  | { readonly type: "Dynamic"; readonly event: DynamicComposedEvent };

type DemoEffect =
  | {
      readonly type: "WorkbenchEffect";
      readonly effect: WorkbenchEffect;
    };

const initialDemoState: DemoState = {
  active: "workbench",
  workbench: initialWorkbenchState,
  composition: initialComposedState,
  dynamic: initialDynamicComposedState
};

const examples = [
  ["workbench", "Workbench"],
  ["composition", "Composition"],
  ["dynamic", "Dynamic list"]
] as const satisfies readonly (readonly [ExampleId, string])[];

const root = document.querySelector<HTMLDivElement>("#app");

if (root === null) {
  throw new Error("Missing #app element.");
}

runApp<TreeUi, DemoState, DemoEvent, DemoEffect, Element, ReturnType<typeof DomRenderer.mount>>({
  init: () => transition(initialDemoState),

  update: updateDemo,

  view: viewDemo,

  runEffect: (effect) => {
    switch (effect.type) {
      case "WorkbenchEffect":
        console.info(effect.effect.message);
        break;
    }
  },

  renderer: DomRenderer,
  target: root
});

function updateDemo(
  state: DemoState,
  event: DemoEvent
) {
  switch (event.type) {
    case "ExampleSelected":
      return transition<DemoState, DemoEffect>({
        ...state,
        active: event.active
      });

    case "Workbench": {
      const [workbench, effects] = updateWorkbench(
        state.workbench,
        event.event
      );

      return transition<DemoState, DemoEffect>(
        {
          ...state,
          workbench
        },
        effects.map((effect) => ({
          type: "WorkbenchEffect",
          effect
        }))
      );
    }

    case "Composition":
      return transition<DemoState, DemoEffect>({
        ...state,
        composition: updateComposed(
          state.composition,
          event.event
        )
      });

    case "Dynamic":
      return transition<DemoState, DemoEffect>({
        ...state,
        dynamic: updateDynamicComposed(
          state.dynamic,
          event.event
        )
      });
  }
}

function viewDemo(
  state: DemoState
): UiOf<TreeUi, DemoEvent> {
  const H = htmlDsl(TreeAlgebra);

  return H.main(
    H.cls("shell"),

    H.section(
      H.cls("card"),
      H.header(
        H.cls("stack"),
        H.h1("Facet demos"),
        H.p(
          H.cls("lede"),
          "Switch between reference examples built from the same UI denotation toolkit."
        )
      ),

      H.nav(
        H.cls("filters"),
        H.ariaLabel("Facet demo switcher"),
        H.keyedList(
          examples,
          ([id]) => id,
          ([id, label]) =>
            H.button<DemoEvent>(
              H.type("button"),
              H.cls("filter"),
              state.active === id && H.cls("selected"),
              H.pressed(state.active === id),
              H.onClick<DemoEvent>(() => ({
                type: "ExampleSelected",
                active: id
              })),
              label
            )
        )
      ),

      H.section(
        H.cls("demo-frame"),
        activeExample(state)
      )
    )
  );
}

function activeExample(
  state: DemoState
): UiOf<TreeUi, DemoEvent> {
  const H = htmlDsl(TreeAlgebra);

  switch (state.active) {
    case "workbench":
      return H.mapEvents<WorkbenchEvent, DemoEvent>(
        (event) => ({
          type: "Workbench",
          event
        })
      )(
        viewWorkbench(state.workbench)
      );

    case "composition":
      return H.mapEvents<ComposedEvent, DemoEvent>(
        (event) => ({
          type: "Composition",
          event
        })
      )(
        viewComposed(TreeAlgebra, state.composition)
      );

    case "dynamic":
      return H.mapEvents<DynamicComposedEvent, DemoEvent>(
        (event) => ({
          type: "Dynamic",
          event
        })
      )(
        viewDynamicComposed(TreeAlgebra, state.dynamic)
      );
  }
}
