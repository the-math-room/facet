# Facet

Facet is an experimental TypeScript toolkit for building interactive UI denotationally.

It is not trying to be a full React replacement. It is a small UI denotation layer with explicit interpreters.

## Thesis

Facet separates:

meaning -> projection -> representation -> interpretation -> interaction

Application code owns meaning: state, events, transitions, and effects.

Facet owns a small UI algebra, an HTML authoring layer, concrete tree representation, interpreters, pure testing utilities, and an optional app runtime shell.

## Current layers

- src/core: abstract UI algebra, laws, Renderer, Dispatch
- src/html: HTML vocabulary and authoring DSL
- src/tree: concrete Tree representation
- src/dom: browser DOM interpreter
- src/string: static HTML string interpreter
- src/test-renderer: normalized JSON interpreter
- src/testing: pure ADT queries and event decoder tests
- src/runtime: optional app/effect loop
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

See docs/LAYERS.md and docs/PROJECT_STATE.md for the design notes.
