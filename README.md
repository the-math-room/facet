# Facet

Facet is an experimental TypeScript toolkit for building interactive UI denotationally.

It is not a full frontend framework and is not trying to be a React replacement. Facet is a small UI IR plus interpreter stack.

## Thesis

Facet separates:

meaning -> projection -> representation -> interpretation -> interaction

Application code owns meaning: state, events, transitions, invariants, and effects.

Facet owns a small UI algebra, an HTML authoring layer, a concrete tree representation, explicit interpreters, pure testing utilities, and an optional app-loop driver.

## What Facet is

- an inspectable UI denotation
- event mapping and domain-event projection
- an HTML authoring DSL over a small algebra
- a Tree representation
- DOM, static HTML, JSON, and pure testing interpreters
- a tiny optional app-loop driver for pure update plus impure effect boundaries

## What Facet is not

Facet is not a kitchen-sink application framework.

It does not own:

- routing
- data fetching
- app-specific state architecture
- form models
- validation models
- styling systems
- animation systems
- persistence
- component lifecycle
- hooks
- context
- devtools transport

Those should be separate tools that produce Facet UI values, emit events, or interpret Facet representations.

## Current layers

- src/core: abstract UI algebra, laws, Renderer, Dispatch
- src/html: HTML vocabulary and authoring DSL
- src/tree: concrete Tree representation
- src/dom: browser DOM interpreter
- src/string: static HTML string interpreter
- src/test-renderer: normalized JSON interpreter
- src/testing: pure ADT queries and event decoder tests
- src/runtime: optional app-loop driver
- src/examples: counter, reference app, workbench dogfood app

## Dogfood demo

The workbench app demonstrates one UI denotation interpreted three ways:

- live DOM
- static HTML string
- pure ADT testing query plus event firing

Run it locally:

    npm install
    npm run dev

Then open the Vite dev server URL.

## Composing with other packages

Facet's ecosystem shape should be Unixy: small packages that compose by producing UI values and domain events.

Reusable companion packages should generally expose pure views and event types. They should not require Facet to own their state, effects, lifecycle, or global runtime.

A generic reusable view should usually be shaped like:

    type View<Ui, State, Event> =
      (state: State) => UiOf<Ui, Event>

An HTML-specific reusable view should usually be generic over the algebra:

    type HtmlView<Ui, State, Event> =
      (
        A: UiAlgebra<Ui, HtmlTag, HtmlAttributeAny>,
        state: State
      ) => UiOf<Ui, Event>

Apps and demos may use TreeAlgebra directly. Reusable libraries should prefer UiAlgebra when possible.

Parent applications should compose child packages by mapping child events into parent events with mapEvent or htmlDsl(...).mapEvents.

## Checks

Run:

    npm run check

This runs:

- TypeScript typechecking
- Vitest tests
- source boundary checks

Run benchmarks:

    npm run bench

## Status

Facet is experimental and pre-release.

The current goal is to keep the core small and the boundaries clean. New features should preserve the meaning/projection/representation/interpretation split.

See docs/LAYERS.md and docs/PROJECT_STATE.md for design notes.
