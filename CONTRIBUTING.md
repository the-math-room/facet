# Contributing to Facet

Facet is a TypeScript toolkit for building interactive UI denotationally.

## Design boundaries

Facet's core should stay representation-agnostic.

`src/core` may define:

- abstract UI operations
- laws
- platform-neutral types
- helper interfaces

`src/core` should not depend on:

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
4. `src/tree` defines one concrete representation.
5. `src/dom` interprets that representation into the browser DOM.
6. Future packages can own routing, forms, resources, animation, devtools, and other ecosystem concerns.

## Laws before optimization

When changing the core algebra or tree representation, prefer adding or updating laws first.

When optimizing the DOM renderer, preserve observable equivalence with the simple renderer except where explicit identity laws promise preservation.

## Current renderer status

The DOM renderer performs a conservative same-position reconciliation directly over the tree representation:

- text nodes update in place
- same-tag elements update in place
- different tags are replaced
- children are reconciled by position
- lazy mapped-event nodes are evaluated during render/patch, without a separate resolved-tree allocation
- full keyed child reordering is not implemented yet

The next renderer milestones are:

- keyed child reconciliation
- event delegation
- better attribute/property semantics
- explicit tests for form controls and selection preservation
