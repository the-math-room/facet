import { DomRenderer } from "./dom/render";
import { TreeAlgebra } from "./tree/tree-ui";
import { runReferenceApp } from "./examples/reference";
import "./style.css";

const root = document.querySelector<HTMLDivElement>("#app");

if (root === null) {
  throw new Error("Missing #app element.");
}

runReferenceApp(TreeAlgebra, DomRenderer, root);
