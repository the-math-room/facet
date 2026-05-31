import type { UiAlgebra, UiOf } from "./ui";

export type Eq<Ui> = <Event>(
  left: UiOf<Ui, Event>,
  right: UiOf<Ui, Event>
) => boolean;

export function concatEmptyLaw<Ui, Tag, Attribute>(
  A: UiAlgebra<Ui, Tag, Attribute>,
  eq: Eq<Ui>
): boolean {
  return eq(A.concat([]), A.empty());
}

export function concatLeftIdentityLaw<Ui, Tag, Attribute>(
  A: UiAlgebra<Ui, Tag, Attribute>,
  eq: Eq<Ui>
): boolean {
  const ui = A.text("x");

  return eq(
    A.concat([A.empty(), ui]),
    ui
  );
}

export function concatRightIdentityLaw<Ui, Tag, Attribute>(
  A: UiAlgebra<Ui, Tag, Attribute>,
  eq: Eq<Ui>
): boolean {
  const ui = A.text("x");

  return eq(
    A.concat([ui, A.empty()]),
    ui
  );
}

export function concatAssociativityLaw<Ui, Tag, Attribute>(
  A: UiAlgebra<Ui, Tag, Attribute>,
  eq: Eq<Ui>
): boolean {
  const a = A.text("a");
  const b = A.text("b");
  const c = A.text("c");

  const left = A.concat([
    a,
    A.concat([b, c])
  ]);

  const right = A.concat([
    A.concat([a, b]),
    c
  ]);

  return eq(left, right);
}

export function mapEventIdentityLaw<Ui, Tag, Attribute>(
  A: UiAlgebra<Ui, Tag, Attribute>,
  tag: Tag,
  eq: Eq<Ui>
): boolean {
  const ui = A.node(
    tag,
    [],
    [A.text("Save")]
  );

  return eq(
    A.mapEvent(ui, (x) => x),
    ui
  );
}

export function mapEventCompositionLaw<Ui, Tag, Attribute>(
  A: UiAlgebra<Ui, Tag, Attribute>,
  tag: Tag,
  eq: Eq<Ui>
): boolean {
  const ui = A.node<number>(
    tag,
    [],
    [A.text("Save")]
  );

  const f = (n: number): string => String(n);
  const g = (s: string): { readonly value: string } => ({ value: s });

  const left = A.mapEvent(A.mapEvent(ui, f), g);
  const right = A.mapEvent(ui, (x) => g(f(x)));

  return eq(left, right);
}

export function mapEventPreservesConcatLaw<Ui, Tag, Attribute>(
  A: UiAlgebra<Ui, Tag, Attribute>,
  eq: Eq<Ui>
): boolean {
  const children = A.concat<number>([
    A.text("a"),
    A.text("b")
  ]);

  const f = (n: number): string => String(n);

  return eq(
    A.mapEvent(children, f),
    A.concat([
      A.mapEvent(A.text<number>("a"), f),
      A.mapEvent(A.text<number>("b"), f)
    ])
  );
}

export function mapEventPreservesKeyedLaw<Ui, Tag, Attribute>(
  A: UiAlgebra<Ui, Tag, Attribute>,
  eq: Eq<Ui>
): boolean {
  const child = A.text<number>("child");
  const f = (n: number): string => String(n);

  return eq(
    A.mapEvent(A.keyed("k", child), f),
    A.keyed("k", A.mapEvent(child, f))
  );
}

export function memoErasureLaw<Ui, Tag, Attribute>(
  A: UiAlgebra<Ui, Tag, Attribute>,
  eq: Eq<Ui>
): boolean {
  const child = A.text("memo child");

  return eq(
    A.memo("token", child),
    child
  );
}

/**
 * Backwards-compatible aliases while the project is young.
 */
export const fragmentIdentityLaw = concatEmptyLaw;
export const fragmentAssociativityLaw = concatAssociativityLaw;
