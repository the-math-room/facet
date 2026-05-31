import type { UiAlgebra, UiOf } from "../core/ui";
import {
  type HtmlAttributeAny,
  type HtmlTag,
  className,
  html,
  on,
  prop
} from "../core/html";

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
  const H = html(A);

  return H.main(
    [className("shell")],
    [
      H.section(
        [className("card")],
        [
          H.h1([], [H.text("Facet")]),

          H.p(
            [className("lede")],
            [
              H.text(
                "A tiny denotational UI toolkit: meaning outside, representation pure, interpretation explicit."
              )
            ]
          ),

          H.div(
            [className("counter")],
            [
              H.button(
                [
                  className("button"),
                  on("click", () => ({ type: "DecrementPressed" })),
                  prop("type", "button")
                ],
                [H.text("-")]
              ),

              H.span(
                [className("count")],
                [H.text(String(state.count))]
              ),

              H.button(
                [
                  className("button"),
                  on("click", () => ({ type: "IncrementPressed" })),
                  prop("type", "button")
                ],
                [H.text("+")]
              )
            ]
          ),

          H.button(
            [
              className("reset"),
              on("click", () => ({ type: "ResetPressed" })),
              prop("type", "button")
            ],
            [H.text("Reset")]
          )
        ]
      )
    ]
  );
}
