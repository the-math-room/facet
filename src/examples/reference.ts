import type { Renderer, UiAlgebra, UiOf } from "../core";
import type { HtmlAttributeAny, HtmlTag } from "../html";
import { htmlDsl } from "../html";

export type ReferenceTask = {
  readonly id: string;
  readonly title: string;
  readonly done: boolean;
};

export type ReferenceState = {
  readonly draft: string;
  readonly filter: "all" | "open" | "done";
  readonly tasks: readonly ReferenceTask[];
};

export type ReferenceEvent =
  | { readonly type: "DraftChanged"; readonly draft: string }
  | { readonly type: "TaskSubmitted" }
  | { readonly type: "TaskToggled"; readonly id: string; readonly done: boolean }
  | { readonly type: "TaskRemoved"; readonly id: string }
  | { readonly type: "FilterChanged"; readonly filter: ReferenceState["filter"] }
  | { readonly type: "ResetRequested" };

export const initialReferenceState: ReferenceState = {
  draft: "",
  filter: "all",
  tasks: [
    {
      id: "task-1",
      title: "Keep meaning in domain code",
      done: true
    },
    {
      id: "task-2",
      title: "Project meaning into a UI denotation",
      done: false
    },
    {
      id: "task-3",
      title: "Interpret explicitly",
      done: false
    }
  ]
};

const referenceFilters = [
  ["all", "All"],
  ["open", "Open"],
  ["done", "Done"]
] as const satisfies readonly (readonly [ReferenceState["filter"], string])[];

export function updateReference(
  state: ReferenceState,
  event: ReferenceEvent
): ReferenceState {
  switch (event.type) {
    case "DraftChanged":
      return {
        ...state,
        draft: event.draft
      };

    case "TaskSubmitted": {
      const title = state.draft.trim();

      if (title.length === 0) {
        return state;
      }

      return {
        ...state,
        draft: "",
        tasks: [
          ...state.tasks,
          {
            id: `task-${state.tasks.length + 1}-${title.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`,
            title,
            done: false
          }
        ]
      };
    }

    case "TaskToggled":
      return {
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === event.id
            ? { ...task, done: event.done }
            : task
        )
      };

    case "TaskRemoved":
      return {
        ...state,
        tasks: state.tasks.filter((task) => task.id !== event.id)
      };

    case "FilterChanged":
      return {
        ...state,
        filter: event.filter
      };

    case "ResetRequested":
      return initialReferenceState;
  }
}

export function viewReference<Ui>(
  A: UiAlgebra<Ui, HtmlTag, HtmlAttributeAny>,
  state: ReferenceState
): UiOf<Ui, ReferenceEvent> {
  const H = htmlDsl(A);
  const visibleTasks = filterTasks(state);
  const openCount = state.tasks.filter((task) => !task.done).length;
  const doneCount = state.tasks.length - openCount;
  const listId = "reference-task-list";

  return H.main(
    H.cls("shell"),

    H.section(
      H.cls("card"),

      H.header(
        H.cls("stack"),
        H.h1("Facet reference"),
        H.p(
          H.cls("lede"),
          "A small reference app for the public API: domain meaning, pure projection, explicit interpretation."
        )
      ),

      H.form(
        H.cls("task-form"),
        H.onSubmit(() => ({ type: "TaskSubmitted" })),
        H.label(
          H.forId("new-task"),
          H.cls("visually-hidden"),
          "New task"
        ),
        H.input(
          H.id("new-task"),
          H.name("task"),
          H.type("text"),
          H.value(state.draft),
          H.placeholder("Add a task"),
          H.ariaLabel("New task title"),
          H.onTextInput((draft) => ({ type: "DraftChanged", draft }))
        ),
        H.button(
          H.type("submit"),
          H.disabled(state.draft.trim().length === 0),
          "Add"
        )
      ),

      H.nav(
        H.cls("filters"),
        H.ariaLabel("Task filters"),
        H.list(referenceFilters, ([filter, label]) =>
          viewFilterButton(A, state.filter, filter, label)
        )
      ),

      H.div(
        H.cls("summary"),
        H.data({
          open: openCount,
          done: doneCount
        }),
        H.span(`${openCount} open`),
        H.span(`${doneCount} done`)
      ),

      H.when(
        visibleTasks.length === 0,
        H.p(
          H.cls("empty-state"),
          state.filter === "all"
            ? "No tasks yet."
            : `No ${state.filter} tasks.`
        )
      ),

      H.unless(
        visibleTasks.length === 0,
        H.ul(
          H.id(listId),
          H.cls("tasks"),
          H.aria({
            label: "Reference tasks",
            live: "polite"
          }),
          H.keyedList(
            visibleTasks,
            (task) => task.id,
            (task) => viewReferenceTaskItem(A, task)
          )
        )
      ),

      H.maybe(
        state.tasks.find((task) => task.done),
        (task) =>
          H.p(
            H.cls("hint"),
            H.small(`Latest visible completed example: ${task.title}`)
          )
      ),

      H.button(
        H.cls("reset"),
        H.type("button"),
        H.onClick(() => ({ type: "ResetRequested" })),
        "Reset demo"
      )
    )
  );
}

type ReferenceTaskEvent =
  | { readonly type: "Toggled"; readonly done: boolean }
  | { readonly type: "Removed" };

function viewReferenceTaskItem<Ui>(
  A: UiAlgebra<Ui, HtmlTag, HtmlAttributeAny>,
  task: ReferenceTask
): UiOf<Ui, ReferenceEvent> {
  const H = htmlDsl(A);

  return H.mapEvents<ReferenceTaskEvent, ReferenceEvent>(
    (event) => mapTaskEvent(task.id, event)
  )(
    H.memo(
      `${task.id}:${task.title}:${task.done}`,
      viewReferenceTask(A, task)
    )
  );
}

function viewReferenceTask<Ui>(
  A: UiAlgebra<Ui, HtmlTag, HtmlAttributeAny>,
  task: ReferenceTask
): UiOf<Ui, ReferenceTaskEvent> {
  const H = htmlDsl(A);
  const checkboxId = `${task.id}-done`;

  return H.li(
    H.cls("task"),
    H.cls(task.done ? "done" : ""),
    H.data({
      id: task.id,
      done: task.done
    }),

    H.label(
      H.forId(checkboxId),
      H.cls("task-label"),
      H.input(
        H.id(checkboxId),
        H.type("checkbox"),
        H.checked(task.done),
        H.onCheckedChange((done) => ({ type: "Toggled", done }))
      ),
      H.span(task.title)
    ),

    H.button(
      H.type("button"),
      H.cls("remove"),
      H.ariaLabel(`Remove ${task.title}`),
      H.onClick(() => ({ type: "Removed" })),
      "Remove"
    )
  );
}

function viewFilterButton<Ui>(
  A: UiAlgebra<Ui, HtmlTag, HtmlAttributeAny>,
  current: ReferenceState["filter"],
  filter: ReferenceState["filter"],
  label: string
): UiOf<Ui, ReferenceEvent> {
  const H = htmlDsl(A);
  const selected = current === filter;

  return H.button(
    H.type("button"),
    H.cls("filter"),
    selected && H.cls("selected"),
    H.pressed(selected),
    H.onClick(() => ({ type: "FilterChanged", filter })),
    label
  );
}

function mapTaskEvent(
  id: string,
  event: ReferenceTaskEvent
): ReferenceEvent {
  switch (event.type) {
    case "Toggled":
      return {
        type: "TaskToggled",
        id,
        done: event.done
      };

    case "Removed":
      return {
        type: "TaskRemoved",
        id
      };
  }
}

function filterTasks(
  state: ReferenceState
): readonly ReferenceTask[] {
  switch (state.filter) {
    case "all":
      return state.tasks;

    case "open":
      return state.tasks.filter((task) => !task.done);

    case "done":
      return state.tasks.filter((task) => task.done);
  }
}

export function runReferenceApp<Ui, Mounted>(
  algebra: UiAlgebra<Ui, HtmlTag, HtmlAttributeAny>,
  renderer: Renderer<Ui, Element, Mounted>,
  target: Element
): void {
  let state = initialReferenceState;
  let mounted: Mounted | null = null;

  const dispatch = (event: ReferenceEvent): void => {
    state = updateReference(state, event);

    if (mounted === null) {
      throw new Error("Cannot dispatch before mount.");
    }

    mounted = renderer.patch(
      mounted,
      viewReference(algebra, state),
      dispatch
    );
  };

  mounted = renderer.mount(
    target,
    viewReference(algebra, state),
    dispatch
  );
}
