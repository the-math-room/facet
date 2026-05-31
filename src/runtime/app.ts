import type {
  Dispatch,
  Renderer,
  UiOf
} from "../core";

export type Transition<State, Effect> =
  readonly [state: State, effects: readonly Effect[]];

export type AppConfig<Ui, State, Event, Effect, Target, Mounted> = {
  readonly init: () => Transition<State, Effect>;

  readonly update: (
    state: State,
    event: Event
  ) => Transition<State, Effect>;

  readonly view: (state: State) => UiOf<Ui, Event>;

  readonly runEffect: (
    effect: Effect,
    dispatch: Dispatch<Event>
  ) => void;

  readonly renderer: Renderer<Ui, Target, Mounted>;
  readonly target: Target;
};

export type RunningApp<State, Event, Mounted> = {
  readonly mounted: Mounted;

  getState(): State;

  dispatch(event: Event): void;

  unmount(): void;
};

/**
 * Optional app shell.
 *
 * The runtime owns the impure interaction loop:
 *
 *   init -> view -> mount
 *   dispatch -> update -> view -> patch -> run effects
 *
 * Application update functions remain pure by returning Effect descriptions.
 * The only impure boundary is runEffect.
 */
export function runApp<Ui, State, Event, Effect, Target, Mounted>(
  config: AppConfig<Ui, State, Event, Effect, Target, Mounted>
): RunningApp<State, Event, Mounted> {
  let [state, initialEffects] = config.init();
  let mounted: Mounted | null = null;

  const dispatch: Dispatch<Event> = (event) => {
    const [nextState, effects] = config.update(state, event);
    state = nextState;

    if (mounted === null) {
      throw new Error("Cannot dispatch before app is mounted.");
    }

    mounted = config.renderer.patch(
      mounted,
      config.view(state),
      dispatch
    );

    runEffects(effects, config.runEffect, dispatch);
  };

  mounted = config.renderer.mount(
    config.target,
    config.view(state),
    dispatch
  );

  runEffects(initialEffects, config.runEffect, dispatch);

  return {
    get mounted(): Mounted {
      if (mounted === null) {
        throw new Error("Cannot read mounted app after unmount.");
      }

      return mounted;
    },

    getState(): State {
      return state;
    },

    dispatch,

    unmount(): void {
      if (mounted !== null) {
        config.renderer.unmount(mounted);
        mounted = null;
      }
    }
  };
}

function runEffects<Event, Effect>(
  effects: readonly Effect[],
  runEffect: (effect: Effect, dispatch: Dispatch<Event>) => void,
  dispatch: Dispatch<Event>
): void {
  for (const effect of effects) {
    runEffect(effect, dispatch);
  }
}

export function transition<State, Effect>(
  state: State,
  effects: readonly Effect[] = []
): Transition<State, Effect> {
  return [state, effects];
}
