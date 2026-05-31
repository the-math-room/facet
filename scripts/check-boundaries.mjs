import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const srcRoot = path.join(projectRoot, "src");

const allowedImportsByLayer = {
  core: new Set(["core"]),
  html: new Set(["core", "html"]),
  tree: new Set(["core", "html", "tree"]),
  dom: new Set(["core", "html", "tree", "dom"]),
  string: new Set(["core", "html", "tree", "string"]),
  testing: new Set(["core", "html", "tree", "testing"]),
  "test-renderer": new Set(["core", "html", "tree", "test-renderer"]),
  runtime: new Set(["core", "runtime"]),
  examples: new Set([
    "core",
    "html",
    "tree",
    "dom",
    "string",
    "testing",
    "test-renderer",
    "runtime",
    "examples"
  ]),
  public: new Set([
    "core",
    "html",
    "tree",
    "dom",
    "string",
    "testing",
    "test-renderer",
    "runtime"
  ]),
  app: new Set([
    "core",
    "html",
    "tree",
    "dom",
    "string",
    "testing",
    "test-renderer",
    "runtime",
    "examples",
    "app"
  ])
};

const importPatterns = [
  /import\s+(?:type\s+)?[^'"]*?from\s+["']([^"']+)["']/g,
  /export\s+(?:type\s+)?[^'"]*?from\s+["']([^"']+)["']/g,
  /import\s+["']([^"']+)["']/g
];

const files = walk(srcRoot)
  .filter((file) => file.endsWith(".ts") || file.endsWith(".tsx"));

const violations = [];

for (const file of files) {
  const importerLayer = layerOf(file);

  if (importerLayer === null) {
    continue;
  }

  const source = fs.readFileSync(file, "utf8");

  for (const specifier of importSpecifiers(source)) {
    if (!specifier.startsWith(".")) {
      continue;
    }

    const resolved = resolveRelativeImport(file, specifier);

    if (resolved === null) {
      continue;
    }

    if (!isInside(resolved, srcRoot)) {
      continue;
    }

    const importedLayer = layerOf(resolved);

    if (importedLayer === null) {
      continue;
    }

    const allowed = allowedImportsByLayer[importerLayer];

    if (!allowed.has(importedLayer)) {
      violations.push({
        file: relative(file),
        imports: specifier,
        importerLayer,
        importedLayer,
        resolved: relative(resolved)
      });
    }
  }
}

if (violations.length > 0) {
  console.error("Facet boundary violations found:");
  console.error("");

  for (const violation of violations) {
    console.error(
      `- ${violation.file} (${violation.importerLayer}) imports ${violation.imports} -> ${violation.resolved} (${violation.importedLayer})`
    );
  }

  console.error("");
  console.error("Allowed layer imports:");
  console.error("  core -> core");
  console.error("  html -> core, html");
  console.error("  tree -> core, html, tree");
  console.error("  dom -> core, html, tree, dom");
  console.error("  string -> core, html, tree, string");
  console.error("  testing -> core, html, tree, testing");
  console.error("  test-renderer -> core, html, tree, test-renderer");
  console.error("  runtime -> core, runtime");
  console.error("  app -> core, html, tree, dom, string, testing, test-renderer, runtime, examples, app");
  console.error("");
  process.exit(1);
}

console.log("Boundary check passed.");

function walk(directory) {
  const entries = fs.readdirSync(directory, {
    withFileTypes: true
  });

  const result = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      result.push(...walk(fullPath));
    } else {
      result.push(fullPath);
    }
  }

  return result;
}

function importSpecifiers(source) {
  const result = [];

  for (const pattern of importPatterns) {
    pattern.lastIndex = 0;

    let match = pattern.exec(source);

    while (match !== null) {
      const specifier = match[1];

      if (specifier !== undefined) {
        result.push(specifier);
      }

      match = pattern.exec(source);
    }
  }

  return result;
}

function resolveRelativeImport(importer, specifier) {
  const importerDirectory = path.dirname(importer);
  const base = path.resolve(importerDirectory, specifier);

  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx")
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  return null;
}

function layerOf(file) {
  const relativePath = path.relative(srcRoot, file);
  const parts = relativePath.split(path.sep);

  if (relativePath === "index.ts") {
    return "public";
  }

  if (relativePath === "main.ts" || relativePath === "style.css" || relativePath === "vite-env.d.ts") {
    return "app";
  }

  const first = parts[0];

  if (first === undefined) {
    return null;
  }

  if (Object.hasOwn(allowedImportsByLayer, first)) {
    return first;
  }

  return null;
}

function isInside(child, parent) {
  const relativePath = path.relative(parent, child);

  return (
    relativePath.length > 0 &&
    !relativePath.startsWith("..") &&
    !path.isAbsolute(relativePath)
  );
}

function relative(file) {
  return path.relative(projectRoot, file);
}
