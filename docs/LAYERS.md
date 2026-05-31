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

For the reference demo, meaning is represented by ReferenceState, ReferenceEvent, updateReference, and the task/filter domain model.

## Projection

Projection is a pure function from domain meaning into a UI denotation.

Examples:

- viewCounter projects CounterState into UiOf<Ui, CounterEvent>
- viewReference projects ReferenceState into UiOf<Ui, ReferenceEvent>

This layer chooses what to show and which domain events can be observed.

Projection functions should stay pure. They should not fetch data, mutate storage, schedule timers, read the DOM, or own app lifecycle.

## Authoring

src/html/dsl.ts is an authoring convenience over the same algebra.

It reduces bracket noise and offers common HTML helpers, but it does not add a new runtime model.

Good DSL helpers are representation conveniences:

- tags
- attributes
- class merging
- ARIA attributes
- data attributes
- event decoder helpers
- conditional rendering helpers
- list and keyed-list helpers

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

- src/core defines UiAlgebra, UiOf, Renderer, Dispatch, and laws
- src/html defines HTML vocabulary and authoring helpers
- src/tree defines TreeAlgebra, one concrete representation of the UI ADT

The core vocabulary is intentionally small:

- empty
- text
- node
- concat
- keyed
- memo
- mapEvent

memo is denotationally equivalent to its child. It is an interpretation hint, not a semantic change.

keyed marks identity for interpreters that preserve or reconcile concrete nodes.

## Interpretation

Interpreters give a representation concrete behavior.

Current interpreters:

- src/dom interprets Tree into live browser DOM
- src/string interprets Tree into static HTML text
- src/test-renderer interprets Tree into normalized JSON
- src/testing inspects Tree directly for pure ADT-level tests

Interpretation modules may optimize or erase representation hints when laws permit it.

Examples:

- renderToHtml erases events, mapped-event wrappers, memo wrappers, and keyed wrappers
- renderToJson erases semantic-neutral wrappers for structural tests
- DomRenderer may skip unchanged memo subtrees and preserve keyed DOM identity

## Interaction

Interaction belongs at the application shell or optional runtime layer.

The shell owns:

- current state
- dispatch
- calling update
- calling renderer patch
- running effects, if the app uses effects

src/runtime provides an optional app loop for this boundary.

The runtime model is:

- init returns State plus Effect descriptions
- update returns State plus Effect descriptions
- view projects State into UI
- runEffect is the impure boundary

The runtime does not belong to core. It is a shell helper over any Renderer.

## Pure and impure boundaries

Pure layers:

- core laws and types
- update functions
- view/projection functions
- TreeAlgebra values
- renderToJson
- renderToHtml
- ADT testing queries

Impure layers:

- DomRenderer
- browser event dispatch
- mount/patch/unmount loops
- runEffect implementations
- app entrypoints such as src/main.ts

## Boundary enforcement

scripts/check-boundaries.mjs enforces source-layer imports.

Important intended boundaries:

- src/core does not import higher layers
- src/html may depend on core but not tree/dom/runtime
- src/tree may depend on core/html but not dom/runtime/testing
- src/dom may depend on core/html/tree but not runtime/testing/string
- src/string may depend on core/html/tree but not dom/runtime
- src/testing may depend on core/html/tree but not dom/runtime
- src/runtime may depend on core but not html/tree/dom/string/testing

## Boundaries

Facet may grow HTML vocabulary, interpreters, pure testing utilities, and optional shell/runtime helpers.

Facet should not become a kitchen-sink application framework.

Routing, resources, forms, validation, animation, persistence, styling systems, and devtools can target Facet without belonging to Facet core.
