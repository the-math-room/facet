import type { UiOf } from "../core";
import { DomRenderer } from "../dom/render";
import { htmlDsl } from "../html";
import { runApp, transition } from "../runtime";
import { renderToHtml } from "../string";
import {
  createTestEvent,
  fireEvent,
  inspect,
  queryByText
} from "../testing";
import {
  TreeAlgebra,
  type TreeUi
} from "../tree/tree-ui";

export type WorkbenchState = {
  readonly title: string;
  readonly details: string;
  readonly enabled: boolean;
  readonly clicks: number;
};

export type WorkbenchEvent =
  | { readonly type: "TitleChanged"; readonly title: string }
  | { readonly type: "DetailsChanged"; readonly details: string }
  | { readonly type: "EnabledChanged"; readonly enabled: boolean }
  | { readonly type: "PreviewClicked" }
  | { readonly type: "ResetRequested" };

export type WorkbenchEffect = {
  readonly type: "Logged";
  readonly message: string;
};

type PreviewEvent = {
  readonly type: "Clicked";
};

export const initialWorkbenchState: WorkbenchState = {
  title: "Facet dogfood",
  details: "One denotation, several interpretations.",
  enabled: true,
  clicks: 0
};

export function updateWorkbench(
  state: WorkbenchState,
  event: WorkbenchEvent
) {
  switch (event.type) {
    case "TitleChanged":
      return transition<WorkbenchState, WorkbenchEffect>({
        ...state,
        title: event.title
      });

    case "DetailsChanged":
      return transition<WorkbenchState, WorkbenchEffect>({
        ...state,
        details: event.details
      });

    case "EnabledChanged":
      return transition<WorkbenchState, WorkbenchEffect>({
        ...state,
        enabled: event.enabled
      });

    case "PreviewClicked":
      return transition<WorkbenchState, WorkbenchEffect>(
        {
          ...state,
          clicks: state.clicks + 1
        },
        [
          {
            type: "Logged",
            message: `Preview clicked ${state.clicks + 1} time(s).`
          }
        ]
      );

    case "ResetRequested":
      return transition<WorkbenchState, WorkbenchEffect>(
        initialWorkbenchState,
        [
          {
            type: "Logged",
            message: "Workbench reset."
          }
        ]
      );
  }
}

export function viewWorkbench(
  state: WorkbenchState
): UiOf<TreeUi, WorkbenchEvent> {
  const H = htmlDsl(TreeAlgebra);
  const preview = viewPreview(state);
  const staticHtml = renderToHtml(preview);
  const inspected = inspect(preview);
  const button = queryByText(preview, "Save");
  const decoded = button === null
    ? []
    : fireEvent(
        button,
        "click",
        createTestEvent()
      );

  return H.main(
    H.cls("shell"),

    H.section(
      H.cls("card"),
      H.header(
        H.cls("stack"),
        H.h1("Facet workbench"),
        H.p(
          H.cls("lede"),
          "Dogfooding the core promise: one UI denotation, interpreted three ways."
        )
      ),

      H.form(
        H.cls("task-form"),
        H.onSubmit(() => null),
        H.label(
          H.forId("workbench-title"),
          H.cls("visually-hidden"),
          "Preview title"
        ),
        H.input(
          H.id("workbench-title"),
          H.type("text"),
          H.value(state.title),
          H.placeholder("Preview title"),
          H.onTextInput((title) => ({ type: "TitleChanged", title }))
        ),
        H.button(
          H.type("button"),
          H.onClick(() => ({ type: "ResetRequested" })),
          "Reset"
        )
      ),

      H.label(
        H.cls("task-label"),
        H.input(
          H.type("checkbox"),
          H.checked(state.enabled),
          H.onCheckedChange((enabled) => ({
            type: "EnabledChanged",
            enabled
          }))
        ),
        H.span("Preview button enabled")
      ),

      H.label(
        H.cls("stack"),
        H.span("Details"),
        H.textarea(
          H.name("details"),
          H.value(state.details),
          H.onTextInput((details) => ({
            type: "DetailsChanged",
            details
          }))
        )
      ),

      H.section(
        H.cls("stack"),
        H.h2("1. Live DOM interpretation"),
        H.p(
          H.cls("hint"),
          "The preview below is mounted as real interactive browser nodes."
        ),
        H.mapEvents<PreviewEvent, WorkbenchEvent>(
          () => ({ type: "PreviewClicked" })
        )(preview),
        H.p(
          H.cls("hint"),
          `Preview clicks: ${state.clicks}`
        )
      ),

      H.section(
        H.cls("stack"),
        H.h2("2. Static HTML interpretation"),
        H.p(
          H.cls("hint"),
          "The same preview denotation is rendered as escaped static HTML text."
        ),
        H.pre(
          H.code(staticHtml)
        )
      ),

      H.section(
        H.cls("stack"),
        H.h2("3. Pure ADT testing interpretation"),
        H.p(
          H.cls("hint"),
          "The same preview denotation is queried and fired without mounting the DOM."
        ),
        H.p(
          H.cls("hint"),
          `Root nodes inspected: ${inspected.length}`
        ),
        H.p(
          H.cls("hint"),
          `Preview-only event: ${JSON.stringify(decoded)}`
        )
      )
    )
  );
}

function viewPreview(
  state: WorkbenchState
): UiOf<TreeUi, PreviewEvent> {
  const H = htmlDsl(TreeAlgebra);

  return H.article(
    H.cls("task"),
    H.data({
      enabled: state.enabled,
      clicks: state.clicks
    }),
    H.header(
      H.h3(state.title),
      H.p(state.details)
    ),
    H.button(
      H.type("button"),
      H.disabled(!state.enabled),
      H.onClick(() => ({ type: "Clicked" })),
      "Save"
    )
  );
}

export function runWorkbenchApp(target: Element): void {
  runApp<TreeUi, WorkbenchState, WorkbenchEvent, WorkbenchEffect, Element, ReturnType<typeof DomRenderer.mount>>({
    init: () => transition(initialWorkbenchState),

    update: updateWorkbench,

    view: viewWorkbench,

    runEffect: (effect) => {
      console.info(effect.message);
    },

    renderer: DomRenderer,
    target
  });
}
