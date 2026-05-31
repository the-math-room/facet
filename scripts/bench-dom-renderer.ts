import { JSDOM } from "jsdom";
import { performance } from "node:perf_hooks";
import { DomRenderer } from "../src/dom/render";
import { html, on, prop } from "../src/html";
import { TreeAlgebra } from "../src/tree/tree-ui";
import type { UiOf } from "../src/core";
import type { TreeUi } from "../src/tree/tree-ui";

type BenchResult = {
  readonly name: string;
  readonly iterations: number;
  readonly totalMs: number;
  readonly meanMs: number;
  readonly minMs: number;
  readonly maxMs: number;
};

type ListEvent =
  | { readonly type: "Clicked"; readonly id: number }
  | { readonly type: "Input"; readonly id: number };

type BenchCase = {
  readonly name: string;
  readonly iterations: number;
  readonly run: () => void;
};

type StatefulBenchCase = {
  readonly name: string;
  readonly iterations: number;
  readonly setup: () => () => void;
};

type DomGlobals = {
  readonly previousWindow: unknown;
  readonly previousDocument: unknown;
  readonly previousNode: unknown;
  readonly previousElement: unknown;
  readonly previousEvent: unknown;
  readonly previousMouseEvent: unknown;
  readonly dom: JSDOM;
};

const H = html(TreeAlgebra);

const LIST_SIZE = Number(process.env.FACET_BENCH_LIST_SIZE ?? 1000);
const MOUNT_ITERATIONS = Number(process.env.FACET_BENCH_MOUNT_ITERATIONS ?? 25);
const PATCH_ITERATIONS = Number(process.env.FACET_BENCH_PATCH_ITERATIONS ?? 50);
const DISPATCH_ITERATIONS = Number(process.env.FACET_BENCH_DISPATCH_ITERATIONS ?? 5000);

main();

function main(): void {
  console.log("Facet DOM renderer benchmark");
  console.log();
  console.log(`list size: ${LIST_SIZE}`);
  console.log(`mount iterations: ${MOUNT_ITERATIONS}`);
  console.log(`patch iterations: ${PATCH_ITERATIONS}`);
  console.log(`dispatch iterations: ${DISPATCH_ITERATIONS}`);
  console.log();

  const ids = range(LIST_SIZE);

  const results = [
    runBench({
      name: `mount ${LIST_SIZE} keyed rows`,
      iterations: MOUNT_ITERATIONS,
      run: () => {
        const root = document.createElement("div");

        const mounted = DomRenderer.mount(
          root,
          viewList(ids, 0),
          noop
        );

        DomRenderer.unmount(mounted);
      }
    }),

    runBench({
      name: `patch one text value in ${LIST_SIZE} keyed rows`,
      iterations: PATCH_ITERATIONS,
      run: () => {
        const root = document.createElement("div");

        const mounted = DomRenderer.mount(
          root,
          viewList(ids, 0),
          noop
        );

        DomRenderer.patch(
          mounted,
          viewList(ids, 1),
          noop
        );

        DomRenderer.unmount(mounted);
      }
    }),

    runBench({
      name: `append one keyed row to ${LIST_SIZE} rows`,
      iterations: PATCH_ITERATIONS,
      run: () => {
        const root = document.createElement("div");

        const mounted = DomRenderer.mount(
          root,
          viewList(ids, 0),
          noop
        );

        DomRenderer.patch(
          mounted,
          viewList([...ids, LIST_SIZE], 0),
          noop
        );

        DomRenderer.unmount(mounted);
      }
    }),

    runBench({
      name: `move last keyed row to front in ${LIST_SIZE} rows`,
      iterations: PATCH_ITERATIONS,
      run: () => {
        const root = document.createElement("div");
        const moved = [ids[ids.length - 1]!, ...ids.slice(0, -1)];

        const mounted = DomRenderer.mount(
          root,
          viewList(ids, 0),
          noop
        );

        DomRenderer.patch(
          mounted,
          viewList(moved, 0),
          noop
        );

        DomRenderer.unmount(mounted);
      }
    }),

    runBench({
      name: `reverse ${LIST_SIZE} keyed rows`,
      iterations: PATCH_ITERATIONS,
      run: () => {
        const root = document.createElement("div");

        const mounted = DomRenderer.mount(
          root,
          viewList(ids, 0),
          noop
        );

        DomRenderer.patch(
          mounted,
          viewList([...ids].reverse(), 0),
          noop
        );

        DomRenderer.unmount(mounted);
      }
    }),

    runStatefulBench({
      name: `delegated click dispatch on mounted ${LIST_SIZE} rows`,
      iterations: DISPATCH_ITERATIONS,
      setup: () => {
        const root = document.createElement("div");
        let count = 0;

        const mounted = DomRenderer.mount(
          root,
          viewList(ids, 0),
          () => {
            count += 1;
          }
        );

        const button = root.querySelector("button");

        if (button === null) {
          throw new Error("Expected benchmark button.");
        }

        return () => {
          button.dispatchEvent(
            new window.MouseEvent("click", {
              bubbles: true,
              composed: true
            })
          );

          if (count < 0) {
            throw new Error("Impossible count.");
          }

          if (count === Number.MAX_SAFE_INTEGER) {
            count = 0;
          }
        };
      }
    })
  ];

  printResults(results);
}

function runBench(bench: BenchCase): BenchResult {
  return withDom(() => {
    const samples: number[] = [];

    bench.run();

    for (let index = 0; index < bench.iterations; index += 1) {
      const start = performance.now();
      bench.run();
      const end = performance.now();

      samples.push(end - start);
    }

    return summarize(bench.name, bench.iterations, samples);
  });
}

function runStatefulBench(bench: StatefulBenchCase): BenchResult {
  return withDom(() => {
    const run = bench.setup();
    const samples: number[] = [];

    run();

    for (let index = 0; index < bench.iterations; index += 1) {
      const start = performance.now();
      run();
      const end = performance.now();

      samples.push(end - start);
    }

    return summarize(bench.name, bench.iterations, samples);
  });
}

function summarize(
  name: string,
  iterations: number,
  samples: readonly number[]
): BenchResult {
  const totalMs = samples.reduce((sum, sample) => sum + sample, 0);
  const meanMs = totalMs / samples.length;
  const minMs = Math.min(...samples);
  const maxMs = Math.max(...samples);

  return {
    name,
    iterations,
    totalMs,
    meanMs,
    minMs,
    maxMs
  };
}

function withDom<T>(run: () => T): T {
  const globals = installDom();

  try {
    return run();
  } finally {
    restoreDom(globals);
  }
}

function installDom(): DomGlobals {
  const dom = new JSDOM("<!doctype html><html><body></body></html>");
  const globalObject = globalThis as typeof globalThis & {
    window?: Window & typeof globalThis;
    document?: Document;
    Node?: typeof Node;
    Element?: typeof Element;
    Event?: typeof Event;
    MouseEvent?: typeof MouseEvent;
  };

  const previousWindow = globalObject.window;
  const previousDocument = globalObject.document;
  const previousNode = globalObject.Node;
  const previousElement = globalObject.Element;
  const previousEvent = globalObject.Event;
  const previousMouseEvent = globalObject.MouseEvent;

  globalObject.window = dom.window as unknown as Window & typeof globalThis;
  globalObject.document = dom.window.document;
  globalObject.Node = dom.window.Node as unknown as typeof Node;
  globalObject.Element = dom.window.Element as unknown as typeof Element;
  globalObject.Event = dom.window.Event as unknown as typeof Event;
  globalObject.MouseEvent = dom.window.MouseEvent as unknown as typeof MouseEvent;

  return {
    previousWindow,
    previousDocument,
    previousNode,
    previousElement,
    previousEvent,
    previousMouseEvent,
    dom
  };
}

function restoreDom(globals: DomGlobals): void {
  const globalObject = globalThis as typeof globalThis & {
    window?: Window & typeof globalThis;
    document?: Document;
    Node?: typeof Node;
    Element?: typeof Element;
    Event?: typeof Event;
    MouseEvent?: typeof MouseEvent;
  };

  globalObject.window = globals.previousWindow as Window & typeof globalThis;
  globalObject.document = globals.previousDocument as Document;
  globalObject.Node = globals.previousNode as typeof Node;
  globalObject.Element = globals.previousElement as typeof Element;
  globalObject.Event = globals.previousEvent as typeof Event;
  globalObject.MouseEvent = globals.previousMouseEvent as typeof MouseEvent;

  globals.dom.window.close();
}

function viewList(
  ids: readonly number[],
  revision: number
): UiOf<TreeUi, ListEvent> {
  return H.ul(
    [],
    ids.map((id) =>
      H.keyed(
        id,
        H.li(
          [],
          [
            H.button(
              [
                prop<ListEvent>("type", "button"),
                on<ListEvent>("click", () => ({ type: "Clicked", id }))
              ],
              [H.text(`Row ${id} rev ${revision}`)]
            )
          ]
        )
      )
    )
  );
}

function range(size: number): readonly number[] {
  return Array.from({ length: size }, (_, index) => index);
}

function noop(): void {}

function printResults(results: readonly BenchResult[]): void {
  const rows = results.map((result) => ({
    name: result.name,
    iterations: result.iterations,
    totalMs: round(result.totalMs),
    meanMs: round(result.meanMs),
    minMs: round(result.minMs),
    maxMs: round(result.maxMs)
  }));

  console.table(rows);
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
