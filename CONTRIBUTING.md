# Contributing to Facet

Facet is a TypeScript toolkit for building interactive UI denotationally.

See docs/LAYERS.md for the meaning/projection/representation/interpretation split.

See docs/PROJECT_STATE.md for the current stop point and next options.

## Single responsibility

Facet's responsibility is narrow:

> Describe interactive UI denotationally and interpret that representation through explicit, law-respecting layers.

Facet should not become a kitchen-sink application framework.

It should not own:

- app-specific state architecture
- routing
- data fetching
- form models
- validation
- animation
- persistence
- styling systems
- component lifecycle
- hooks

Those can live in separate tools that target Facet's ADT.

Facet may provide small optional shell utilities, such as src/runtime, as long as they keep impurity at the edge and do not change the UI denotation.

## Design boundaries

Facet's core should stay representation-agnostic.

src/core may define:

- abstract UI operations
- laws
- platform-neutral types
- helper interfaces

src/core should not depend on:

- HTML helpers
- the tree representation
- the DOM renderer
- string rendering
- testing utilities
- browser-specific node types
- application state architecture
- effects
- routing
- data fetching
- forms
- animation

## Layer ownership

Use this order when deciding where a feature belongs:

1. Domain/application code owns meaning, state, event vocabularies, and transitions.
2. Projection code maps meaning/state into a UI denotation.
3. src/core defines abstract operations, laws, Renderer, Dispatch, and platform-neutral types.
4. src/html defines HTML-specific vocabulary and helpers.
   - src/html/html.ts keeps the explicit array-based helper API.
   - src/html/dsl.ts provides a thin mixed-argument authoring DSL over the same algebra.
5. src/tree defines one concrete HTML tree representation.
6. src/dom interprets that representation into the browser DOM.
7. src/string interprets that representation into static HTML text.
8. src/test-renderer provides normalized structural JSON for tests.
9. src/testing provides pure ADT-level inspection, queries, and event decoder tests.
10. src/runtime provides an optional app/effect loop that keeps effects at the edge.
11. src/examples demonstrates usage; examples are allowed to compose layers.

## Pure and impure code

Prefer this split:

Pure:

- domain update functions
- view/projection functions
- laws
- tree construction
- renderToJson
- renderToHtml
- ADT testing queries

Impure:

- DOM mounting and patching
- browser event handling
- runEffect implementations
- app entrypoints

Do not hide impurity inside the DSL or core algebra.

## Laws before optimization

When changing the core algebra or tree representation, prefer adding or updating laws first.

When optimizing an interpreter, preserve observable equivalence with the simple interpretation except where explicit identity or memoization rules permit preservation or bailout.

## Current renderer status

The DOM renderer performs conservative reconciliation directly over the tree representation:

- lazy mapped-event nodes are evaluated during render/patch
- memo nodes are denotationally equivalent to their child
- unchanged memo tokens may preserve interpreted DOM subtrees, including nested subtrees
- text nodes update in place
- same-tag elements update in place
- different tags are replaced
- unkeyed children are reconciled by position
- keyed children are moved/reused across sibling reorders
- duplicate sibling keys throw eagerly
- removed DOM properties are cleared with defensive zero values
- events are delegated through one capture-phase root listener per event type

The next renderer milestones are:

- explicit tests for more form controls and selection preservation
- additional keyed-reconciliation benchmarks for realistic partial reorders

## Boundary checks

Run npm run check before committing.

The check script runs:

- TypeScript typechecking
- Vitest tests
- source-layer boundary checks
