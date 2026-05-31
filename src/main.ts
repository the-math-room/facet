import { DomRenderer } from "./dom/render";
import { TreeAlgebra } from "./tree/tree-ui";
import { runCounterApp } from "./examples/app";
import "./style.css";

const root = document.querySelector<HTMLDivElement>("#app");

if (root === null) {
  throw new Error("Missing #app element.");
}

runCounterApp(TreeAlgebra, DomRenderer, root);
