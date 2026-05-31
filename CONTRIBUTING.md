# Contributing to Facet

Facet is a TypeScript toolkit for building interactive UI denotationally.

## Single responsibility

Facet's responsibility is narrow:

> Interpret an interactive UI denotation into a concrete target while preserving the core algebra's laws and identity guarantees.

Facet should not become a kitchen-sink application framework.

It should not own:

- app state architecture
- effects
- routing
- data fetching
- forms
- validation
- animation
- persistence
- styling systems

Those can live in separate tools that target Facet's ADT.

## Design boundaries

Facet's core should stay representation-agnostic.

`src/core` may define:

- abstract UI operations
- laws
- platform-neutral types
- helper interfaces

`src/core` should not depend on:

- HTML helpers
- the tree representation
- the DOM renderer
- browser-specific node types
- application state architecture
- effects
- routing
- data fetching
- forms
- animation

## Layer ownership

Use this order when deciding where a feature belongs:

1. Domain/application code owns meaning and state transitions.
2. Representation code projects meaning/state into a UI denotation.
3. `src/core` defines abstract operations and laws.
4. `src/html` defines HTML-specific helpers.
5. `src/tree` defines one concrete HTML tree representation.
6. `src/dom` interprets that representation into the browser DOM.
7. Future packages can own routing, forms, resources, animation, devtools, and other ecosystem concerns.

## Laws before optimization

When changing the core algebra or tree representation, prefer adding or updating laws first.

When optimizing the DOM renderer, preserve observable equivalence with the simple renderer except where explicit identity laws promise preservation.

## Current renderer status

The DOM renderer performs conservative same-position reconciliation directly over the tree representation:

- lazy mapped-event nodes are evaluated during render/patch
- text nodes update in place
- same-tag elements update in place
- different tags are replaced
- unkeyed children are reconciled by position
- keyed children are moved/reused across sibling reorders
- events are delegated through one root listener per event type

The next renderer milestones are:

- better attribute/property semantics
- explicit tests for form controls and selection preservation
- optional subtree bailout/memoization
