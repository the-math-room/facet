import type { UiAlgebra, UiOf } from "../core";
import type { HtmlAttributeAny, HtmlTag } from "../html";
import { htmlDsl } from "../html";

/**
 * This file simulates the future "Unixy stack" shape:
 *
 * - a reusable child package owns its own State, Event, update, and view
 * - a parent app owns composition
 * - child events are translated upward with mapEvents
 * - Facet stays only the UI denotation/interpreter layer
 */

/**
 * Pretend this section is from @facet-example/counter-package.
 */

export type MiniCounterState = {
  readonly label: string;
  readonly count: number;
};

export type MiniCounterEvent =
  | { readonly type: "Increment" }
  | { readonly type: "Decrement" }
  | { readonly type: "Reset" };

export function updateMiniCounter(
  state: MiniCounterState,
  event: MiniCounterEvent
): MiniCounterState {
  switch (event.type) {
    case "Increment":
      return {
        ...state,
        count: state.count + 1
      };

    case "Decrement":
      return {
        ...state,
        count: state.count - 1
      };

    case "Reset":
      return {
        ...state,
        count: 0
      };
  }
}

export function viewMiniCounter<Ui>(
  A: UiAlgebra<Ui, HtmlTag, HtmlAttributeAny>,
  state: MiniCounterState
): UiOf<Ui, MiniCounterEvent> {
  const H = htmlDsl(A);

  return H.article<MiniCounterEvent>(
    H.cls("task"),
    H.data({
      package: "mini-counter",
      label: state.label
    }),

    H.header(
      H.h3(`${state.label}: ${state.count}`),
      H.p(
        H.cls("hint"),
        "This child view only knows about MiniCounterEvent."
      )
    ),

    H.div(
      H.cls("filters"),

      H.button<MiniCounterEvent>(
        H.type("button"),
        H.onClick<MiniCounterEvent>(() => ({ type: "Decrement" })),
        `Decrement ${state.label}`
      ),

      H.button<MiniCounterEvent>(
        H.type("button"),
        H.onClick<MiniCounterEvent>(() => ({ type: "Increment" })),
        `Increment ${state.label}`
      ),

      H.button<MiniCounterEvent>(
        H.type("button"),
        H.onClick<MiniCounterEvent>(() => ({ type: "Reset" })),
        `Reset ${state.label}`
      )
    )
  );
}

/**
 * Pretend this section is the parent application.
 */

export type ComposedState = {
  readonly left: MiniCounterState;
  readonly right: MiniCounterState;
  readonly log: readonly string[];
};

export type ComposedEvent =
  | {
      readonly type: "LeftCounter";
      readonly event: MiniCounterEvent;
    }
  | {
      readonly type: "RightCounter";
      readonly event: MiniCounterEvent;
    }
  | { readonly type: "ClearLog" };

export const initialComposedState: ComposedState = {
  left: {
    label: "Left",
    count: 0
  },
  right: {
    label: "Right",
    count: 10
  },
  log: []
};

export function updateComposed(
  state: ComposedState,
  event: ComposedEvent
): ComposedState {
  switch (event.type) {
    case "LeftCounter":
      return {
        ...state,
        left: updateMiniCounter(state.left, event.event),
        log: [
          ...state.log,
          `Left handled ${event.event.type}`
        ]
      };

    case "RightCounter":
      return {
        ...state,
        right: updateMiniCounter(state.right, event.event),
        log: [
          ...state.log,
          `Right handled ${event.event.type}`
        ]
      };

    case "ClearLog":
      return {
        ...state,
        log: []
      };
  }
}

export function viewComposed<Ui>(
  A: UiAlgebra<Ui, HtmlTag, HtmlAttributeAny>,
  state: ComposedState
): UiOf<Ui, ComposedEvent> {
  const H = htmlDsl(A);

  return H.main(
    H.cls("shell"),

    H.section(
      H.cls("card"),

      H.header(
        H.cls("stack"),
        H.h1("Facet composition reference"),
        H.p(
          H.cls("lede"),
          "Two reusable child views emit local events. The parent maps them into app events."
        )
      ),

      H.div(
        H.cls("tasks"),

        H.mapEvents<MiniCounterEvent, ComposedEvent>(
          (event) => mapLeftCounterEvent(event)
        )(
          viewMiniCounter(A, state.left)
        ),

        H.mapEvents<MiniCounterEvent, ComposedEvent>(
          (event) => mapRightCounterEvent(event)
        )(
          viewMiniCounter(A, state.right)
        )
      ),

      H.section(
        H.cls("stack"),
        H.h2("Parent event log"),

        H.when(
          state.log.length === 0,
          H.p(
            H.cls("empty-state"),
            "No child events handled yet."
          )
        ),

        H.unless(
          state.log.length === 0,
          H.ul(
            H.keyedList(
              state.log,
              (_entry, index) => index,
              (entry) => H.li(entry)
            )
          )
        ),

        H.button<ComposedEvent>(
          H.type("button"),
          H.onClick<ComposedEvent>(() => ({ type: "ClearLog" })),
          "Clear log"
        )
      )
    )
  );
}

function mapLeftCounterEvent(
  event: MiniCounterEvent
): ComposedEvent {
  return {
    type: "LeftCounter",
    event
  };
}

function mapRightCounterEvent(
  event: MiniCounterEvent
): ComposedEvent {
  return {
    type: "RightCounter",
    event
  };
}
