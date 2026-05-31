# Facet project state

This document records where the project currently stands so it is easy to pick up again later.

## Current thesis

Facet is a small TypeScript toolkit for building interactive UI denotationally.

The guiding split is:

meaning -> projection -> representation -> interpretation -> interaction

Meaning belongs in application/domain code. Facet owns the UI denotation, interpreters, authoring helpers, pure tests, and an optional runtime shell.

## Current architecture

- src/core defines the abstract UI algebra, phantom UiOf encoding, Renderer interface, Dispatch, keys, and laws.
- src/html defines HTML tags, attributes, the explicit array-based helper API, and the ergonomic mixed-argument DSL.
- src/tree defines TreeAlgebra, the concrete HTML-shaped representation.
- src/dom interprets Tree into live browser DOM.
- src/string interprets Tree into static HTML text.
- src/test-renderer interprets Tree into normalized JSON snapshots.
- src/testing provides pure ADT inspection, queries, and event decoder tests.
- src/runtime provides an optional Elm-style app-loop driver with pure update and impure runEffect boundary.
- src/examples contains the minimal counter, reference app, and workbench dogfood app.

## Current dogfood app

src/examples/workbench.ts is the best demonstration of the project.

It shows one Facet UI denotation interpreted three ways:

- live DOM
- static HTML string
- pure ADT testing query plus event firing

It also uses runApp, transition, htmlDsl, renderToHtml, inspect, queryByText, fireEvent, DomRenderer, and TreeAlgebra together.

## Current public API story

The public API is exercised in test/public-api.test.ts.

Important exports include:

- core types and laws
- html and htmlDsl
- TreeAlgebra and exposeTree
- DomRenderer
- renderToJson
- renderToHtml
- inspect/query/fireEvent testing utilities
- runApp and transition

## Boundary enforcement

scripts/check-boundaries.mjs enforces intended source-layer boundaries.

npm run check currently runs:

- typecheck
- tests
- boundary check

Keep this green before committing.

## What is intentionally not included

Facet should not become a kitchen-sink framework.

Keep these out of core and the DSL:

- routing
- data fetching
- app-specific state architecture
- form models
- validation models
- animation systems
- styling systems
- hooks
- component lifecycle
- devtools transport

These can become separate tools that target Facet later.

## Known next options

Good next work, in rough priority order:

1. Dogfood the workbench and reference apps.
2. Add more form-control DOM correctness tests, especially selection preservation.
3. Improve keyed reconciliation only with isolated algorithm tests first.
4. Consider using runApp inside the reference app as the canonical app shell.
5. Add package publishing metadata only when publishing becomes real.
6. Explore devtools or time travel only after runtime conventions settle.

## Stop point

This is a good v1 foundation stop point.

Do not add more abstractions until real usage reveals a need.

## Ecosystem direction

The long-term direction is not a larger framework. It is a Unixy replacement stack made of small packages.

Facet should stay excellent at:

- interactive UI as inspectable data
- event mapping
- explicit interpreters
- laws and tests around equivalence
- pure testing of projections and event decoders

Other packages can orbit Facet:

- routers that produce UI values and route events
- form packages that own form state and emit form events
- resource packages that produce effects and events
- devtools that observe the app loop
- styling tools that produce attributes or classes

Those packages should not require Facet core to own their state, lifecycle, or effects.

## Companion package rules

Companion packages should obey these rules:

- They may define state, events, update functions, effects, and views.
- They may emit Facet UI values.
- They may provide helpers over Facet's DSL.
- They must not mutate Facet UI values.
- They must not require hidden global runtime state.
- They must not depend on the DOM unless they are interpreters or drivers.
- They should expose local events and let parent apps map those events upward.

Reusable libraries should prefer generic UiAlgebra-based views. Apps and demos may use TreeAlgebra directly.

## Future ergonomics research

Possible future ergonomics work, not for the current stop point:

- props-object DSL
- pre-bound TreeAlgebra DSL for app code
- optional JSX runtime
- small transition helpers

Do not add these until real dogfooding shows they are worth the extra API surface.

## Technical debt to revisit

Renderer and interpreter edge cases worth testing before expanding feature count:

- memo plus changed ancestor mapEvent
- root-level concat and fragment patching
- disabled-control behavior in pure testing utilities
- textarea and input selection preservation
- richer form-control semantics
- isolated keyed reconciliation algorithm tests before move-minimizing optimization
