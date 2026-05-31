import type { UiOf } from "../core";
import type { HtmlAttribute } from "../html";
import type { Tree, TreeUi } from "../tree/tree-ui";
import { exposeTree } from "../tree/tree-ui";

const voidTags = new Set<string>([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "source",
  "track",
  "wbr"
]);

const booleanAttributes = new Set<string>([
  "autofocus",
  "checked",
  "controls",
  "defer",
  "disabled",
  "hidden",
  "loop",
  "multiple",
  "muted",
  "open",
  "readonly",
  "required",
  "selected"
]);

const propertyAttributeNames = new Map<string, string>([
  ["className", "class"],
  ["htmlFor", "for"],
  ["readOnly", "readonly"],
  ["tabIndex", "tabindex"],
  ["defaultValue", "value"],
  ["defaultChecked", "checked"]
]);

/**
 * Interpret a Facet tree UI as static HTML.
 *
 * This interpreter intentionally erases event handlers, mapped-event nodes,
 * memo nodes, and keyed identity wrappers. It produces static markup only; it
 * does not attempt hydration, event replay, client bootstrapping, or effects.
 */
export function renderToHtml<Event>(
  ui: UiOf<TreeUi, Event>
): string {
  return renderTreeToHtml(exposeTree(ui) as Tree<unknown>);
}

export function renderTreeToHtml(
  tree: Tree<unknown>
): string {
  switch (tree.kind) {
    case "empty":
      return "";

    case "text":
      return escapeText(tree.value);

    case "mapped":
      return renderTreeToHtml(tree.child);

    case "memo":
      return renderTreeToHtml(tree.child as Tree<unknown>);

    case "keyed":
      return renderTreeToHtml(tree.child as Tree<unknown>);

    case "concat":
      return tree.children.map(renderTreeToHtml).join("");

    case "node":
      return renderElementToHtml(
        tree.tag,
        tree.attributes as readonly HtmlAttribute<unknown>[],
        tree.children
      );
  }
}

function renderElementToHtml(
  tag: string,
  attributes: readonly HtmlAttribute<unknown>[],
  children: readonly Tree<unknown>[]
): string {
  const renderedAttributes = renderAttributes(attributes);
  const open = renderedAttributes.length === 0
    ? `<${tag}>`
    : `<${tag} ${renderedAttributes}>`;

  if (voidTags.has(tag)) {
    return open;
  }

  return `${open}${children.map(renderTreeToHtml).join("")}</${tag}>`;
}

function renderAttributes(
  attributes: readonly HtmlAttribute<unknown>[]
): string {
  const rendered: string[] = [];
  const classes: string[] = [];

  for (const attribute of attributes) {
    switch (attribute.kind) {
      case "attribute":
        if (attribute.value.length > 0) {
          rendered.push(
            `${attribute.name}="${escapeAttribute(attribute.value)}"`
          );
        }
        break;

      case "class":
        classes.push(attribute.value);
        break;

      case "property": {
        const renderedProperty = renderPropertyAttribute(
          attribute.name,
          attribute.value
        );

        if (renderedProperty !== null) {
          rendered.push(renderedProperty);
        }

        break;
      }

      case "event":
        break;
    }
  }

  const classValue = classes
    .flatMap((value) => value.split(/\s+/))
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .join(" ");

  if (classValue.length > 0) {
    rendered.unshift(`class="${escapeAttribute(classValue)}"`);
  }

  return rendered.join(" ");
}

function renderPropertyAttribute(
  name: string,
  value: unknown
): string | null {
  if (
    value === null ||
    value === undefined ||
    value === false
  ) {
    return null;
  }

  const htmlName = propertyAttributeNames.get(name) ?? name.toLowerCase();

  if (booleanAttributes.has(htmlName)) {
    return value === true ? htmlName : null;
  }

  return `${htmlName}="${escapeAttribute(String(value))}"`;
}

function escapeText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttribute(value: string): string {
  return escapeText(value)
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
