import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const srcRoot = path.join(process.cwd(), "src");

describe("Facet layer philosophy", () => {
  it("keeps core free of platform, HTML, DOM, runtime, and testing concerns", () => {
    const coreFiles = readFiles(path.join(srcRoot, "core"));

    for (const file of coreFiles) {
      const source = fs.readFileSync(file, "utf8");

      expect(source).not.toMatch(/from\s+["']\.\.\/html/);
      expect(source).not.toMatch(/from\s+["']\.\.\/tree/);
      expect(source).not.toMatch(/from\s+["']\.\.\/dom/);
      expect(source).not.toMatch(/from\s+["']\.\.\/string/);
      expect(source).not.toMatch(/from\s+["']\.\.\/testing/);
      expect(source).not.toMatch(/from\s+["']\.\.\/runtime/);
      expect(source).not.toMatch(/\bHTMLElement\b|\bElement\b|\bNode\b|\bdocument\b|\bwindow\b/);
    }
  });

  it("keeps DSL as authoring convenience rather than runtime ownership", () => {
    const source = fs.readFileSync(path.join(srcRoot, "html", "dsl.ts"), "utf8");

    expect(source).not.toMatch(/\bmount\b/);
    expect(source).not.toMatch(/\bpatch\b/);
    expect(source).not.toMatch(/\bunmount\b/);
    expect(source).not.toMatch(/\bfetch\b/);
    expect(source).not.toMatch(/\blocalStorage\b/);
    expect(source).not.toMatch(/\bsessionStorage\b/);
    expect(source).not.toMatch(/\bsetTimeout\b/);
    expect(source).not.toMatch(/\bsetInterval\b/);
  });

  it("keeps runtime generic over renderers and targets", () => {
    const source = fs.readFileSync(path.join(srcRoot, "runtime", "app.ts"), "utf8");

    expect(source).toMatch(/Renderer<Ui, Target, Mounted>/);
    expect(source).not.toMatch(/TreeAlgebra|TreeUi|DomRenderer|HTMLElement|document|window/);
  });
});

function readFiles(directory: string): readonly string[] {
  const entries = fs.readdirSync(directory, {
    withFileTypes: true
  });

  return entries.flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return readFiles(fullPath);
    }

    if (entry.isFile() && fullPath.endsWith(".ts")) {
      return [fullPath];
    }

    return [];
  });
}
