# The Facet Theory

Facet is a theory of interactive user interfaces as **values before effects**.

A Facet UI is not a component instance, a DOM subtree, a lifecycle object, or an application container. It is a denotation: a finite description of interface structure together with the type of events that structure may emit.

Facet separates:

```text
meaning → projection → representation → interpretation → interaction
```

Application code owns **meaning**: domain state, domain events, transitions, invariants, and effects.

Facet owns the small language needed to **project** that meaning into UI values, represent those values explicitly, and interpret them through chosen targets.

The core claim is:

> Interactive UI can be described as pure, compositional data; events can be treated as typed outputs; rendering can be treated as explicit interpretation; and effects can be pushed to the edge.

---

## 1. UI is denotation

A UI value describes what may be shown and what may be emitted.

It does not own state.  
It does not fetch data.  
It does not schedule work.  
It does not hide effects.  
It does not depend on a renderer to have meaning.

A UI value is meaningful before it is mounted.

The same UI denotation may be interpreted as live DOM, static HTML, normalized JSON, test data, or some other target. These interpretations may differ operationally, but they should agree on the abstract structure and event behavior of the UI.

Facet is therefore not primarily a rendering technique. It is a way of making UI meaning explicit before rendering begins.

---

## 2. The core language is small

Facet's core language consists only of the operations needed to describe UI composition:

```text
empty     — the absent UI
text      — textual content
node      — tagged structure with attributes and children
concat    — ordered composition
keyed     — stable identity annotation
memo      — interpretation hint
mapEvent  — event translation
```

These are not convenience helpers. They are the primitive vocabulary of the theory.

Everything else should be one of:

```text
a derived authoring convenience,
a concrete representation,
an interpreter,
a testing tool,
an optional interaction shell,
or a companion theory at the boundary.
```

If a feature cannot be explained in terms of those roles, it does not belong in the core theory.

---

## 3. Composition is structural

UI fragments compose by concatenation.

`empty` is the identity of composition. Grouping does not change meaning. A fragment may be built in pieces without changing the denotation it represents.

These are equivalent in meaning:

```text
concat([])
empty

concat([empty, ui])
ui

concat([ui, empty])
ui

concat([a, concat([b, c])])
concat([concat([a, b]), c])
```

This gives Facet its first basic law:

> UI structure forms an ordered compositional language with `empty` as identity.

Order matters. Grouping does not.

---

## 4. Events are outputs, not control flow

A UI value may emit events. It does not handle them.

Event handling belongs to the application transition function, not to the UI denotation itself.

A child UI may speak in a local event vocabulary. A parent may translate that vocabulary into its own with `mapEvent`.

```text
Ui<A> + (A → B) = Ui<B>
```

This is the central composition rule for interaction.

It means reusable views do not need to know the applications that use them. They emit local events; parents translate those events upward.

The laws are:

```text
mapEvent(ui, identity) = ui

mapEvent(mapEvent(ui, f), g)
  = mapEvent(ui, g ∘ f)
```

So event mapping changes the emitted vocabulary, not the underlying UI meaning.

This gives the second basic law:

> Events are functorial over UI denotations.

---

## 5. Identity is explicit, not ambient

`keyed` attaches stable identity to a child.

Identity is not discovered from component instances, hooks, call order, closure identity, or hidden runtime position. It is explicitly present in the denotation.

A renderer may use keys to preserve interpreted substructure across sibling reordering. But keys are annotations on the UI value; they are not a separate lifecycle mechanism.

The theory says:

> Preservation is permitted only where identity is explicit.

This keeps identity from becoming ambient runtime magic. A child either has a stable identity in the denotation or it does not.

---

## 6. Optimization is not meaning

`memo(token, child)` is denotationally equivalent to `child`.

A renderer may use the token to preserve or skip work. But memoization does not add structure, state, behavior, or lifecycle.

```text
memo(token, child) = child
```

This is an important boundary.

Facet does not let optimization become semantics.

A memoized UI and an unmemoized UI mean the same thing. They may differ in how an interpreter updates an existing target, but they do not differ as denotations.

---

## 7. Rendering is interpretation

A renderer is an interpreter from UI denotations into a target.

The renderer owns mounting, patching, unmounting, event delegation, reconciliation, and target-specific mutation.

The renderer does not own application state.  
It does not own domain transitions.  
It does not own effects.  
It does not define the meaning of the UI.

It merely interprets a value that already has meaning.

This gives another law-shaped boundary:

> Renderers may optimize interpretation, but must preserve denotation.

A DOM renderer may patch nodes in place. A string renderer may produce static HTML. A test renderer may produce normalized JSON. These are different interpretations of the same source term.

---

## 8. HTML is one vocabulary, not the core

HTML support is a projection vocabulary over the core algebra.

HTML tags and attributes are not fundamental to Facet. They are one useful language instantiated over the abstract UI algebra.

This matters because the core should not know about:

```text
DOM
HTML strings
browser events
CSS
forms
resources
routing
animation
framework lifecycle
```

The HTML layer may provide ergonomic helpers, but those helpers should elaborate into the small core language.

So:

```text
button(...)
```

is not a primitive theoretical concept.

It is a derived term over:

```text
node(tag, attributes, children)
```

plus attributes, event decoders, and event mapping.

---

## 9. Testing is interpretation without the browser

Testing should inspect the same denotation that rendering consumes.

A test should not need a browser when the property being tested is structural or event-decoding behavior. It should be able to query the UI value directly or through a normalized test interpretation.

This follows from the core theory:

> If UI is a value, then testing can be a pure interpretation of that value.

A browser is needed only for browser semantics.

It is not needed to know whether a denotation contains a button, text, attributes, children, keys, or an event decoder that maps an input event into a domain event.

---

## 10. Interaction is an optional shell

The application loop is not the UI theory itself.

Facet may provide a small optional runtime, but the runtime is only a shell around the denotational core:

```text
init → view → mount
dispatch → update → view → patch → run effects
```

The intended application shape is:

```text
State → Ui<Event>
State × Event → State × Effect[]
Effect × Dispatch<Event> → void
```

This keeps the main program split into three parts:

```text
view       — pure projection from state to UI
update     — pure transition from state and event to next state plus effects
runEffect  — impure interpretation of effect descriptions
```

The runtime exists to connect these pieces. It should not absorb application architecture into Facet.

---

## 11. Effects are outside the denotation

Effects are values until interpreted.

A Facet UI does not perform effects.  
An update function does not perform effects.  
An update function may describe effects.  
Only an effect interpreter performs them.

This means fetching, persistence, timers, logging, navigation, subscriptions, and external mutation are not core UI concepts.

They may be modeled by applications or companion packages, but they should remain outside the UI denotation.

---

## 12. Foreign regions are explicit boundaries

Some interface regions are not denotational internally.

A rich text editor, map, charting engine, video player, canvas, WebGL scene, code editor, or imperative widget may own internal state, perform effects, and manage lifecycle.

Facet should not pretend these systems are ordinary pure UI values.

Instead, such systems belong at explicit boundaries:

> A Facet UI may designate an opaque foreign region whose identity, configuration, and event surface are described denotationally, while its internal behavior is owned by a foreign interpreter.

At the boundary:

```text
configuration flows in
events flow out
identity is explicit
lifecycle is interpreter-owned
internal state is opaque to Facet
```

The core theory should acknowledge foreign regions, but not absorb their internal models.

The companion theory of foreign regions should answer questions such as:

```text
How is the foreign object mounted?
How is it updated?
When is it preserved?
When is it destroyed?
How are external events decoded?
How are configuration changes applied?
```

Facet core should only insist that the boundary is explicit and law-respecting.

---

## 13. Target observations return as events

Some facts are not denotational.

Layout, focus, selection, viewport geometry, scroll position, media state, text measurement, element size, and browser-managed input state are facts of an interpretation target.

They do not exist inside a pure UI value.

The clean loop is:

```text
Interpret → Observe → Emit Event → Update State → Re-project UI
```

Target-derived facts may enter the application only as events emitted by an interpreter, observer, or driver. Once stored in application state, they may influence the next UI denotation.

For example:

```text
The browser observes that a dropdown would overflow.
The observation emits a typed event.
The application records that fact in state.
The next view projects the dropdown above the input.
```

This keeps layout-driven behavior explicit without putting layout into the core UI language.

Facet core should not grow primitives such as:

```text
measureWidth
getBoundingClientRect
isOverflowing
scrollTop
focusTrap
resizeObserver
intersectionObserver
```

Those belong to companion theories of observation, focus, selection, layout, or browser drivers.

The core principle is:

> Target facts are not UI denotation; they become meaningful only when returned to the application as events.

---

## 14. Facet is not a framework of ownership

Facet should not own the application.

It should not own:

```text
routing
data fetching
state architecture
form models
validation models
styling systems
animation systems
persistence
component lifecycle
hooks
context
global stores
devtools transport
```

Those may exist around Facet. They may produce Facet UI values. They may consume Facet events. They may interpret Facet representations.

But they should not require Facet to become their owner.

The theory is deliberately smaller:

> Facet describes interactive UI denotationally and interprets that description through explicit layers.

---

## 15. Companion packages compose by denotation

A companion package should usually expose:

```text
state types
event types
update functions
effect descriptions
views
```

A reusable view should be shaped like:

```text
State → Ui<Event>
```

or, when generic over the UI algebra:

```text
UiAlgebra → State → Ui<Event>
```

A child package should emit child events. A parent package should translate them into parent events.

This keeps composition local and explicit:

```text
child view emits ChildEvent
parent maps ChildEvent to ParentEvent
application update handles ParentEvent
```

No hidden global runtime is required.

No child needs to know its parent.

No package needs to seize control of the app.

---

## 16. Derived conveniences are not axioms

Authoring helpers are welcome, but they should be understood as derived forms.

Helpers such as:

```text
button
input
when
unless
maybe
list
keyedList
class helpers
ARIA helpers
event-specific decoders
```

may make the language pleasant to use. But they are not new theoretical primitives unless they introduce a new irreducible law.

The design test is:

> Can this be explained as a derived term over the core algebra?

If yes, it belongs in an authoring layer, not the core.

This distinction protects the theory from becoming a grab bag of conveniences.

---

## 17. Boundaries are part of the theory

Facet is small, but it should not be naive.

It should not ignore imperative widgets, browser layout, focus, measurement, animation, resources, or subscriptions. It should classify them.

The core theory should say:

```text
Foreign imperative systems are opaque interpreted regions.
Target-derived facts return as events.
Application state decides what those facts mean.
Effects live at the edge.
The core UI denotation remains small.
```

This allows companion theories to be powerful without corrupting the central theorem.

A healthy ecosystem can have:

```text
Facet core          — denotational UI
Facet HTML          — HTML vocabulary over the core
Facet tree          — concrete inspectable representation
Facet DOM           — browser interpretation
Facet string        — static HTML interpretation
Facet testing       — pure structural/event inspection
Facet runtime       — optional app-loop shell
Facet observation   — target facts as events
Facet foreign       — imperative islands as explicit boundaries
Facet focus         — focus observations and commands at the edge
Facet animation     — animation as interpreter/driver concern
Facet resources     — resource effects and subscriptions outside UI denotation
```

The core remains small because the handoffs are explicit.

---

## 18. The package as a theory

Facet should be organized like a small body of mathematics.

It should have:

```text
definitions
constructors
laws
interpretations
corollaries
boundaries
```

The API surface is not merely a set of utilities. It is a proof-shaped argument about what UI is.

The definitions establish the domain.  
The constructors build terms in that domain.  
The laws state when terms are equivalent.  
The interpreters give those terms operational meaning.  
The corollaries show how useful programs arise.  
The boundaries prevent the theory from claiming too much.

Every exported primitive should be able to answer:

> What lemma am I?

If it cannot, it may still be useful, but it is probably a derived helper or an adjacent tool rather than part of the core theory.

---

## 19. The central theorem

Facet's central theorem can be stated informally:

> The same interactive UI term admits multiple lawful interpretations without changing its abstract meaning.

More fully:

> Given application meaning expressed as state, events, transitions, and effects, Facet provides a small algebra for projecting that meaning into pure UI denotations. These denotations compose structurally, emit typed events, support lawful event translation, carry explicit identity annotations, and admit optimization hints that do not change meaning. Concrete representations and renderers interpret the same denotation into DOM, HTML strings, test data, or other targets. Interaction is an optional shell that connects pure views, pure transitions, and impure effect interpreters. Foreign systems and target observations enter only through explicit boundaries. Facet does not own the application; it supplies the language by which an application can describe its interface without surrendering its meaning.

---

## 20. The theory in one paragraph

Facet is a small denotational UI theory. Applications own meaning: state, domain events, transitions, invariants, and effects. Facet provides a minimal algebra for projecting that meaning into pure UI values. Those values compose structurally, emit typed events, support lawful event translation, carry explicit identity annotations, and admit optimization hints that do not change meaning. Concrete representations and renderers interpret the same denotation into DOM, HTML strings, test data, or other targets. Interaction is an optional shell that connects pure views, pure transitions, and impure effect interpreters. Foreign imperative systems are explicit opaque regions, and target-derived facts return as typed events. Facet does not own the application; it supplies the language by which an application can describe its interface without surrendering its meaning.

---

## Mottos

```text
UI is data.
Events are outputs.
Rendering is interpretation.
Effects live at the edge.
```

```text
Meaning belongs to the application.
Facet describes the interface.
Interpreters realize it.
```

```text
Small core.
Explicit boundaries.
Lawful interpretations.
```
