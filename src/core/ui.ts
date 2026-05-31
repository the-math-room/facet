export type Key = string | number;

/**
 * Facet's core ADT interface.
 *
 * Ui is intentionally abstract.
 * Tag and Attribute are also abstract so the core does not commit to DOM,
 * HTML, native views, terminal UIs, canvas, WebGL, or any other target.
 */
export interface UiAlgebra<Ui, Tag, Attribute> {
  empty<Event>(): UiOf<Ui, Event>;

  text<Event>(value: string): UiOf<Ui, Event>;

  node<Event>(
    tag: Tag,
    attributes: readonly Attribute[],
    children: readonly UiOf<Ui, Event>[]
  ): UiOf<Ui, Event>;

  concat<Event>(
    children: readonly UiOf<Ui, Event>[]
  ): UiOf<Ui, Event>;

  keyed<Event>(
    key: Key,
    child: UiOf<Ui, Event>
  ): UiOf<Ui, Event>;

  mapEvent<A, B>(
    ui: UiOf<Ui, A>,
    map: (event: A) => B
  ): UiOf<Ui, B>;
}

/**
 * Phantom encoding.
 *
 * Ui is the hidden representation family.
 * Event is the type of values this UI may emit.
 */
export type UiOf<Ui, Event> = Ui & {
  readonly __event?: Event;
};

export type Dispatch<Event> = (event: Event) => void;

/**
 * A platform interpreter for a UI denotation.
 *
 * Mounted is abstract. DOM renderers can store DOM nodes; native renderers can
 * store native handles; test renderers can store snapshots.
 */
export interface Renderer<Ui, Target, Mounted> {
  mount<Event>(
    target: Target,
    ui: UiOf<Ui, Event>,
    dispatch: Dispatch<Event>
  ): Mounted;

  patch<Event>(
    mounted: Mounted,
    next: UiOf<Ui, Event>,
    dispatch: Dispatch<Event>
  ): Mounted;

  unmount(mounted: Mounted): void;
}
