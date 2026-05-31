# The Facet Theory

Facet is a **denotational UI protocol**.

It exists to make interactive interface meaning portable across tools, runtimes, renderers, testing systems, and companion packages.

A Facet UI is not a component instance, a DOM subtree, a lifecycle object, a framework application, or a renderer-owned structure. It is a value: a finite description of interface structure together with the type of events that structure may emit.

Facet separates:

```text
meaning → projection → denotation → representation → interpretation → interaction
```

Application code owns meaning: domain state, domain events, transitions, invariants, and effects.

Facet provides a public surface for projecting that meaning into UI denotations, translating event vocabularies, preserving explicit identity, inspecting or representing UI values, and interpreting those values through chosen targets.

The central claim is:

> Interactive UI can be described as pure, compositional, event-emitting data, and the ecosystem around that data can be made of replaceable parts.

Facet is therefore not primarily a rendering technique. It is a small protocol for cooperation between independent UI tools.

---

## 1. Facet is not an application owner

Facet should not own the whole application.

It should not require one central runtime to own:

```text
application state
domain transitions
effects
routing
data fetching
forms
validation
styling
animation
subscriptions
testing
browser observations
foreign widgets
deployment model
```

Those things may exist around Facet. They may produce Facet UI values. They may consume Facet events. They may interpret Facet denotations. They may provide optional runtime shells or companion theories.

But they should not require Facet core to become their owner.

Facet’s role is smaller:

> Facet owns the public handoffs by which independent parts can cooperate.

The important boundaries are:

```text
application meaning → UI denotation
UI denotation → representation
UI denotation → interpretation target
target event → typed application event
target observation → typed application event
application event → state transition
effect description → effect interpreter
foreign configuration → imperative island
imperative island event → typed event
```

Facet should make these handoffs explicit.

---

## 2. UI is denotation

A value of type:

```text
Ui<Event>
```

describes what may be shown and what may be emitted.

It does not own state.
It does not fetch data.
It does not schedule work.
It does not perform effects.
It does not depend on a renderer to have meaning.
It does not require a particular runtime to be useful.

A UI value is meaningful before it is mounted.

The same UI denotation may be interpreted as live DOM, static HTML, normalized data, test structure, serialized representation, or another target. These interpretations may differ operationally, but they should preserve the abstract structure and event behavior of the UI value.

This is the first principle of Facet:

> UI is data before it is behavior in a target.

---

## 3. Events are outputs

A Facet UI may emit events. It does not handle them.

Event handling belongs to the application transition function, not to the UI denotation itself.

A reusable view may speak in a local event vocabulary. A parent may translate that vocabulary into a broader event vocabulary.

```text
Ui<ChildEvent> + (ChildEvent → ParentEvent) = Ui<ParentEvent>
```

This is one of the most important composition rules in Facet.

It means a child view does not need to know the application that uses it. It emits local events. The parent maps those events upward. The application decides what they mean.

Facet therefore treats interaction as a typed output surface rather than hidden control flow.

---

## 4. Meaning belongs to the application

Facet distinguishes application meaning from UI description.

Application meaning includes things such as:

```text
State
Event
Transition
Invariant
Effect
Policy
Resource
Domain model
```

A typical application may choose a shape like:

```text
view       : State → Ui<Event>
update     : State × Event → State × Effect[]
runEffect  : Effect × Dispatch<Event> → void
```

Facet may provide tools that make this shape convenient, but this shape is not the core UI denotation itself.

The core distinction is:

```text
application state decides what is true
Facet UI describes what can be presented
events report what the interface emitted
application transitions decide what happens next
effects are interpreted at the edge
```

Facet does not own application meaning. It gives application meaning a portable interface description.

---

## 5. The core language is small

Facet’s core language should contain only the primitive concepts needed to describe denotational UI.

The essential vocabulary is:

```text
empty     — the absent UI
text      — textual content
node      — tagged structure with attributes and children
concat    — ordered composition
keyed     — explicit stable identity annotation
memo      — interpretation hint
mapEvent  — event translation
```

These are not merely convenience helpers. They are the minimal public vocabulary for describing UI denotations and how event surfaces compose.

Everything else should usually be one of:

```text
a derived authoring vocabulary
a concrete representation
an interpreter
a testing tool
an optional runtime shell
a boundary protocol
a companion package
an escape hatch
```

This distinction matters because Facet wants a Unix-like ecosystem: small parts, clear surfaces, replaceable implementations, and shared representations.

The core should be small enough that other people can implement against it.

---

## 6. Composition is structural

UI fragments compose by ordered concatenation.

```text
concat([]) = empty

concat([empty, ui]) = ui

concat([ui, empty]) = ui

concat([a, concat([b, c])])
  = concat([concat([a, b]), c])
```

Order matters. Grouping does not.

This means a UI fragment may be built in pieces without changing the denotation it represents.

Conditionals, lists, fragments, and authoring helpers can elaborate into this structural composition without becoming new core concepts.

The principle is:

> UI structure forms an ordered compositional language with `empty` as identity.

---

## 7. Event translation is structural too

Event mapping changes the vocabulary of emitted events without changing the underlying UI structure.

The basic laws are:

```text
mapEvent(ui, identity) = ui

mapEvent(mapEvent(ui, f), g)
  = mapEvent(ui, g ∘ f)
```

This gives Facet a disciplined model of reusable views.

A child package can expose:

```text
State → Ui<ChildEvent>
```

A parent can use it by supplying:

```text
ChildEvent → ParentEvent
```

No hidden global runtime is required.
No child needs to know its parent.
No package needs to seize control of the application.

The principle is:

> Event vocabularies compose by explicit translation.

---

## 8. Identity is explicit

`keyed` attaches stable identity to a child.

Identity is not discovered from component instances, hooks, call order, closure identity, or hidden runtime position. It is explicitly present in the denotation.

A renderer may use keys to preserve interpreted substructure across sibling reordering or replacement. But keys are annotations on UI values; they are not a separate lifecycle model.

The principle is:

> Preservation is permitted only where identity is explicit.

This lets interpreters optimize and preserve target-side objects without turning identity into ambient runtime magic.

---

## 9. Optimization is not meaning

`memo(token, child)` is denotationally equivalent to `child`.

```text
memo(token, child) = child
```

A renderer may use the token to skip work, cache an interpretation, or preserve target-side structure. But memoization does not add UI structure, state, behavior, lifecycle, or meaning.

A memoized UI and an unmemoized UI describe the same interface.

They may differ in how an interpreter performs work. They should not differ in what the UI denotes.

The principle is:

> Optimization may guide interpretation, but it must not become semantics.

---

## 10. Representation is a public surface

A Facet UI value should be representable.

A representation is not necessarily the same thing as the internal implementation of a UI value. It is a public way to inspect, compare, serialize, normalize, test, or interpret the denotation.

Representation surfaces may support tools such as:

```text
test renderers
tree inspectors
serializers
debuggers
diff tools
normalizers
alternative renderers
static analyzers
documentation generators
```

This is part of Facet’s ecosystem goal.

If independent tools are going to cooperate, they need stable ways to observe the same denotation.

The principle is:

> A UI denotation should be portable enough for tools other than its original author to understand.

Representation is therefore a serious compatibility commitment. Once a representation is public, other tools may build on it.

---

## 11. Rendering is interpretation

A renderer is an interpreter from UI denotations into a target.

A DOM renderer interprets UI into live browser nodes.
A string renderer interprets UI into static markup.
A test renderer interprets UI into inspectable test data.
A custom renderer may interpret UI into another target.

The renderer owns target-specific work:

```text
mounting
patching
unmounting
event delegation
target mutation
reconciliation
resource attachment
target-specific preservation
```

The renderer does not own application meaning.

It does not own domain transitions.
It does not own effects.
It does not define what the UI means.
It realizes a value that already has meaning.

The principle is:

> Renderers are replaceable interpreters of the same denotation.

A renderer may be official, third-party, experimental, specialized, server-side, browser-side, native, test-only, or application-specific. Facet’s theory should make room for this.

---

## 12. HTML is a vocabulary, not the core

HTML support is a derived authoring vocabulary over the core denotation.

HTML tags and attributes are useful. They are not the foundation of Facet.

The core should not need to know about:

```text
DOM APIs
HTML strings
browser event loops
CSS
forms
resources
routing
animation
framework lifecycle
```

An HTML helper such as:

```text
button(...)
```

should elaborate into the core language:

```text
node(tag, attributes, children)
```

plus attributes, event decoders, and event mapping.

The principle is:

> HTML is one vocabulary for producing Facet denotations.

This keeps the door open for other vocabularies and other targets.

---

## 13. Testing is interpretation without the browser

If UI is a value, then many UI tests can inspect that value directly or through a normalized interpretation.

A browser is necessary for browser semantics.
It is not necessary for every structural property.

A test should be able to ask whether a denotation contains:

```text
text
nodes
attributes
children
keys
event decoders
foreign boundaries
```

without mounting a browser, when the property being tested is denotational.

The principle is:

> Testing can be a pure interpretation of UI values.

This does not eliminate browser tests. It classifies them. Browser tests are needed when the property under test belongs to the browser or another concrete target.

---

## 14. Interaction is an optional shell

Facet may provide a runtime, but the runtime is a shell around the denotational core.

A typical runtime connects:

```text
init → view → mount
dispatch → update → view → patch → run effects
```

This is useful, but it is not what a UI value is.

The runtime exists to connect pure views, pure transitions, effect descriptions, target events, and interpreters.

The principle is:

> Runtime is coordination, not ownership.

An application should be able to use Facet denotations without adopting a single blessed runtime model for everything else.

---

## 15. Effects live at the edge

Effects are not part of the UI denotation.

A Facet UI does not perform effects.

An update function may describe effects.
An effect interpreter may perform effects.
A runtime may coordinate effect interpretation.
A companion package may define effect descriptions.

But the UI value itself remains pure.

Effects include:

```text
fetching
persistence
timers
logging
navigation
subscriptions
external mutation
imperative commands
```

The principle is:

> Effects are values until interpreted, and interpretation happens at the edge.

This allows effect systems to be replaced, tested, modeled, or omitted without changing what a UI denotation is.

---

## 16. Foreign regions are explicit boundaries

Some interface regions are not internally denotational.

Examples include:

```text
rich text editors
maps
charts
video players
canvas regions
WebGL scenes
code editors
imperative widgets
third-party embeds
```

These systems may own internal state, lifecycle, mutation, scheduling, resources, and effects.

Facet should not pretend their internals are ordinary pure UI values.

Instead, Facet should provide an explicit boundary shape:

```text
configuration flows in
typed events flow out
identity is explicit
lifecycle is interpreter-owned
internal state is opaque
```

The principle is:

> Imperative islands are allowed, but the boundary must be honest.

A foreign region is not a failure of the theory. It is a place where the theory names the handoff rather than hiding it.

---

## 17. Target observations return as events

Some facts are not denotational.

They exist only after a UI has been interpreted into a target.

Examples include:

```text
layout
focus
selection
viewport geometry
scroll position
text measurement
element size
media state
browser-managed input state
intersection
resize
overflow
```

These are not facts inside a pure UI value.

The clean loop is:

```text
Interpret → Observe → Emit Event → Update State → Re-project UI
```

A target observer may report that an element has a certain size.
The application may store that fact in state.
The next view may project a different UI because of that state.

The principle is:

> Target-derived facts become meaningful to the application only when returned as events.

This keeps layout-driven, focus-driven, and measurement-driven behavior explicit without putting target facts into the core UI language.

---

## 18. Packages are ecosystem roles

Facet is intended to support a Unix-like ecosystem of small cooperating packages.

A package should usually correspond to a role, not merely a pile of related implementation details.

Important package roles include:

```text
core package
representation package
authoring vocabulary
interpreter
runtime shell
testing tool
boundary protocol
companion theory
escape hatch
```

A package may define a local theory, expose a vocabulary, provide an interpreter, bridge an external system, or supply tooling around Facet values.

The question for a package is:

> What role does this package play in the ecosystem?

Not every useful thing belongs in the core.

A healthy ecosystem may contain:

```text
facet-core          — denotational UI vocabulary
facet-tree          — concrete inspectable representation
facet-html          — HTML authoring vocabulary
facet-dom           — browser DOM interpretation
facet-string        — static string interpretation
facet-test          — pure structural and event testing
facet-runtime       — optional application loop shell
facet-observation   — target facts as events
facet-foreign       — imperative islands as explicit boundaries
facet-focus         — focus observations and commands at the edge
facet-animation     — animation as interpreter or driver concern
facet-resources     — resource effects and subscriptions outside UI denotation
```

The exact package names may vary. The theory is about roles.

The principle is:

> Package boundaries should follow responsibility boundaries.

---

## 19. Exports are participation points

An export is not just a public function. It is a stable way for outside code to participate in the Facet model.

An export may let users:

```text
construct a UI denotation
transform a UI denotation
translate an event vocabulary
attach explicit identity
provide an optimization hint
inspect or represent a denotation
interpret a denotation
cross a boundary
author a derived vocabulary
coordinate with a runtime
```

Exporting something makes it part of the public ontology of the package.

Before export:

```text
this is how the package happens to work
```

After export:

```text
this is something other code may rely on
```

The question for an export is:

> What public dependency are we inviting?

For Facet, a good export should usually fit one of these descriptions:

```text
This lets users build UI denotations.
This lets users compose UI denotations.
This lets users translate emitted events.
This lets users inspect UI denotations.
This lets users interpret UI denotations.
This lets users cross a boundary explicitly.
This lets users author a common derived form.
This lets other packages coordinate with Facet.
This names a distinction users need to preserve.
```

The principle is:

> An export is a stable public affordance for participating in the ecosystem.

---

## 20. Derived conveniences are welcome

Facet should be pleasant to use.

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

may be valuable.

They do not need to justify themselves as core primitives. Their role is authoring fluency.

The question is:

> Does this make common expression clearer without expanding the core model?

Derived conveniences should elaborate into the core denotation or into a clearly named boundary protocol.

This protects the theory from becoming a grab bag while still allowing the ecosystem to be ergonomic.

---

## 21. Escape hatches must be visible

Every practical UI system needs escape hatches.

Facet should allow them, but they should be explicit.

Examples might include:

```text
raw markup
custom attributes
foreign handles
unsafe target access
imperative regions
target-specific commands
```

The question for an escape hatch is:

> What invariant is being relaxed, and how visibly?

An escape hatch is acceptable when it keeps its cost legible. It should not silently smuggle a new ownership model into the core.

The principle is:

> Escape hatches should be doors, not leaks.

---

## 22. Interoperation is the goal

Facet exists because UI systems should not require one entity to own meaning, implementation, runtime, rendering, effects, and tooling all at once.

An integrated framework can be powerful. But Facet is exploring a different shape:

```text
small core
explicit handoffs
portable denotations
replaceable interpreters
independent tooling
local companion theories
runtime as shell
effects at the edge
```

The goal is not minimalism for its own sake.

The goal is interoperation.

A renderer should be replaceable.
A test interpreter should be independent.
An HTML vocabulary should not be the core.
A runtime should not absorb the application.
A companion package should compose through denotation.
A foreign widget should cross an explicit boundary.
An observer should report target facts as events.
An effect system should live outside UI values.

The principle is:

> Facet should increase interoperation more than ownership.

---

## 23. The central theorem

Facet’s central theorem can be stated informally:

> The same interactive UI denotation can be constructed, transformed, represented, inspected, interpreted, tested, and driven by independent tools without surrendering application meaning to a single owning runtime.

More fully:

> Given application meaning expressed as state, events, transitions, invariants, and effects, Facet provides a small denotational protocol for projecting that meaning into pure UI values. These values compose structurally, emit typed events, support explicit event translation, carry explicit identity annotations, and admit optimization hints that do not change meaning. Concrete representations and interpreters may realize the same denotation as DOM, static markup, normalized data, test structure, or another target. Interaction is an optional shell that connects pure views, pure transitions, and effect interpreters. Foreign regions and target observations enter only through explicit boundaries. Facet does not own the application; it supplies the shared surface by which independent tools can cooperate.

---

## 24. The theory in one paragraph

Facet is a denotational UI protocol. Applications own meaning: state, domain events, transitions, invariants, and effects. Facet provides a small public vocabulary for projecting that meaning into pure UI values. Those values compose structurally, emit typed events, support event translation, carry explicit identity, and admit optimization hints that do not change meaning. Representations, renderers, testing tools, runtimes, vocabularies, effect systems, observers, and foreign-region adapters are separate ecosystem roles. They cooperate through explicit handoffs rather than hidden framework ownership. Facet’s purpose is to make interactive UI portable across implementations.

---

## Mottos

```text
UI is data.
Events are outputs.
Rendering is interpretation.
Runtime is a shell.
Effects live at the edge.
```

```text
Meaning belongs to the application.
Facet describes the interface.
Interpreters realize it.
Tools cooperate through public denotations.
```

```text
Small core.
Explicit handoffs.
Replaceable parts.
Portable meaning.
```

```text
Facet should own the protocol,
not the application.
```
