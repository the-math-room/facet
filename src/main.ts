import { runWorkbenchApp } from "./examples/workbench";
import "./style.css";

const root = document.querySelector<HTMLDivElement>("#app");

if (root === null) {
  throw new Error("Missing #app element.");
}

runWorkbenchApp(root);
