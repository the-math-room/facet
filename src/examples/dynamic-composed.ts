import type { UiAlgebra, UiOf } from "../core";
import type { HtmlAttributeAny, HtmlTag } from "../html";
import { htmlDsl } from "../html";
import {
  type MiniCounterEvent,
  type MiniCounterState,
  updateMiniCounter,
  viewMiniCounter
} from "./composed";

/**
 * Dynamic companion-package composition.
 *
 * This example answers the next scaling question after static composition:
 *
 *   "What if I have a dynamic list of reusable child views?"
 *
 * The parent owns collection state, identity, add/remove behavior, and event
 * routing. Each child still owns only MiniCounterState, MiniCounterEvent,
 * updateMiniCounter, and viewMiniCounter.
 */

export type DynamicCounterEntry = {
  readonly id: string;
  readonly counter: MiniCounterState;
};

export type DynamicComposedState = {
  readonly nextId: number;
  readonly counters: readonly DynamicCounterEntry[];
  readonly log: readonly string[];
};

export type DynamicComposedEvent =
  | {
      readonly type: "Counter";
      readonly id: string;
      readonly event: MiniCounterEvent;
    }
  | { readonly type: "AddCounter" }
  | { readonly type: "RemoveCounter"; readonly id: string }
  | { readonly type: "ClearLog" };

export const initialDynamicComposedState: DynamicComposedState = {
  nextId: 3,
  counters: [
    {
      id: "counter-1",
      counter: {
        label: "Counter 1",
        count: 0
      }
    },
    {
      id: "counter-2",
      counter: {
        label: "Counter 2",
        count: 5
      }
    }
  ],
  log: []
};

export function updateDynamicComposed(
  state: DynamicComposedState,
  event: DynamicComposedEvent
): DynamicComposedState {
  switch (event.type) {
    case "Counter":
      return {
        ...state,
        counters: state.counters.map((entry) =>
          entry.id === event.id
            ? {
                ...entry,
                counter: updateMiniCounter(entry.counter, event.event)
              }
            : entry
        ),
        log: [
          ...state.log,
          `${event.id} handled ${event.event.type}`
        ]
      };

    case "AddCounter": {
      const id = `counter-${state.nextId}`;

      return {
        ...state,
        nextId: state.nextId + 1,
        counters: [
          ...state.counters,
          {
            id,
            counter: {
              label: `Counter ${state.nextId}`,
              count: 0
            }
          }
        ],
        log: [
          ...state.log,
          `Added ${id}`
        ]
      };
    }

    case "RemoveCounter":
      return {
        ...state,
        counters: state.counters.filter((entry) => entry.id !== event.id),
        log: [
          ...state.log,
          `Removed ${event.id}`
        ]
      };

    case "ClearLog":
      return {
        ...state,
        log: []
      };
  }
}

export function viewDynamicComposed<Ui>(
  A: UiAlgebra<Ui, HtmlTag, HtmlAttributeAny>,
  state: DynamicComposedState
): UiOf<Ui, DynamicComposedEvent> {
  const H = htmlDsl(A);

  return H.main(
    H.cls("shell"),

    H.section(
      H.cls("card"),

      H.header(
        H.cls("stack"),
        H.h1("Facet dynamic composition"),
        H.p(
          H.cls("lede"),
          "A dynamic list of reusable child views. Identity is explicit, events stay local, and the parent routes by id."
        )
      ),

      H.button<DynamicComposedEvent>(
        H.type("button"),
        H.onClick<DynamicComposedEvent>(() => ({ type: "AddCounter" })),
        "Add counter"
      ),

      H.when(
        state.counters.length === 0,
        H.p(
          H.cls("empty-state"),
          "No counters. Add one to create a child package instance."
        )
      ),

      H.unless(
        state.counters.length === 0,
        H.div(
          H.cls("tasks"),
          H.keyedList(
            state.counters,
            (entry) => entry.id,
            (entry) => viewCounterEntry(A, entry)
          )
        )
      ),

      H.section(
        H.cls("stack"),
        H.h2("Parent event log"),
        H.p(
          H.cls("hint"),
          "The parent observes child events, delegates child updates, and records parent-level domain history."
        ),

        H.when(
          state.log.length === 0,
          H.p(
            H.cls("empty-state"),
            "No dynamic child events handled yet."
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

        H.button<DynamicComposedEvent>(
          H.type("button"),
          H.onClick<DynamicComposedEvent>(() => ({ type: "ClearLog" })),
          "Clear log"
        )
      )
    )
  );
}

function viewCounterEntry<Ui>(
  A: UiAlgebra<Ui, HtmlTag, HtmlAttributeAny>,
  entry: DynamicCounterEntry
): UiOf<Ui, DynamicComposedEvent> {
  const H = htmlDsl(A);

  return H.section(
    H.cls("stack"),
    H.data({
      counterId: entry.id
    }),

    H.mapEvents<MiniCounterEvent, DynamicComposedEvent>(
      (event) => ({
        type: "Counter",
        id: entry.id,
        event
      })
    )(
      viewMiniCounter(A, entry.counter)
    ),

    H.button<DynamicComposedEvent>(
      H.type("button"),
      H.cls("remove"),
      H.onClick<DynamicComposedEvent>(() => ({
        type: "RemoveCounter",
        id: entry.id
      })),
      `Remove ${entry.counter.label}`
    )
  );
}
