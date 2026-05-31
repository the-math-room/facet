import type { UiAlgebra, UiOf } from "../core/ui";
import {
  type HtmlAttributeAny,
  type HtmlTag,
  htmlDsl
} from "../html";

export type CounterState = {
  readonly count: number;
};

export type CounterEvent =
  | { readonly type: "IncrementPressed" }
  | { readonly type: "DecrementPressed" }
  | { readonly type: "ResetPressed" };

export function updateCounter(
  state: CounterState,
  event: CounterEvent
): CounterState {
  switch (event.type) {
    case "IncrementPressed":
      return { count: state.count + 1 };

    case "DecrementPressed":
      return { count: state.count - 1 };

    case "ResetPressed":
      return { count: 0 };
  }
}

export function viewCounter<Ui>(
  A: UiAlgebra<Ui, HtmlTag, HtmlAttributeAny>,
  state: CounterState
): UiOf<Ui, CounterEvent> {
  const H = htmlDsl(A);

  return H.main(
    H.className("shell"),

    H.section(
      H.className("card"),

      H.h1("Facet"),

      H.p(
        H.className("lede"),
        "A tiny denotational UI toolkit: meaning outside, representation pure, interpretation explicit."
      ),

      H.div(
        H.className("counter"),

        H.button(
          H.className("button"),
          H.on("click", () => ({ type: "DecrementPressed" })),
          H.prop("type", "button"),
          "-"
        ),

        H.span(
          H.className("count"),
          String(state.count)
        ),

        H.button(
          H.className("button"),
          H.on("click", () => ({ type: "IncrementPressed" })),
          H.prop("type", "button"),
          "+"
        )
      ),

      H.button(
        H.className("reset"),
        H.on("click", () => ({ type: "ResetPressed" })),
        H.prop("type", "button"),
        "Reset"
      )
    )
  );
}
