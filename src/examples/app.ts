import type { Renderer, UiAlgebra } from "../core/ui";
import type { HtmlAttributeAny, HtmlTag } from "../html/html";
import {
  type CounterEvent,
  type CounterState,
  updateCounter,
  viewCounter
} from "./counter";

export function runCounterApp<Ui, Mounted>(
  algebra: UiAlgebra<Ui, HtmlTag, HtmlAttributeAny>,
  renderer: Renderer<Ui, Element, Mounted>,
  target: Element
): void {
  let state: CounterState = { count: 0 };
  let mounted: Mounted | null = null;

  const dispatch = (event: CounterEvent): void => {
    state = updateCounter(state, event);

    if (mounted === null) {
      throw new Error("Cannot dispatch before mount.");
    }

    mounted = renderer.patch(
      mounted,
      viewCounter(algebra, state),
      dispatch
    );
  };

  mounted = renderer.mount(
    target,
    viewCounter(algebra, state),
    dispatch
  );
}
