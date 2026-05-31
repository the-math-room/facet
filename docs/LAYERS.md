# Facet layers

Facet is organized around a small separation:

meaning -> projection -> representation -> interpretation -> interaction

## Meaning

Meaning belongs to application/domain code.

Examples:

- state types
- event unions
- transition functions
- domain invariants
- user workflows

Facet should not own this layer.

For the counter demo, meaning is represented by CounterState, CounterEvent, and updateCounter.

## Projection

Projection is a pure function from domain meaning into a UI denotation.

For the counter demo, viewCounter projects CounterState into UiOf<Ui, CounterEvent>.

This layer chooses what to show and which domain events can be observed.

## Authoring

src/html/dsl.ts is an authoring convenience over the same algebra.

It reduces bracket noise and offers common HTML helpers, but it does not add a new runtime model.

Good DSL helpers are representation conveniences, such as links, buttons, inputs, attributes, ARIA attributes, and data attributes.

The DSL should not own app-level meaning:

- no state architecture
- no effects
- no routing
- no data fetching
- no validation model
- no lifecycle
- no hooks

## Representation

Representation is the abstract and concrete UI description.

- src/core defines UiAlgebra
- src/tree defines TreeAlgebra

The core vocabulary is intentionally small: empty, text, node, concat, keyed, memo, and mapEvent.

## Interpretation

Interpreters give a representation concrete behavior.

Current interpreters:

- src/dom interprets Tree into browser DOM
- src/test-renderer interprets Tree into normalized JSON

## Interaction

Interaction belongs to the application shell.

The shell owns:

- current state
- dispatch
- calling update
- calling renderer patch

In the counter demo, src/examples/app.ts owns this loop.

## Boundaries

Facet may grow HTML vocabulary and ergonomic authoring helpers.

Facet should not become a kitchen-sink application framework.
