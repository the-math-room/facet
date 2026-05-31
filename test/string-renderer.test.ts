import { describe, expect, it } from "vitest";
import { htmlDsl } from "../src/html";
import { renderToHtml } from "../src/string";
import { TreeAlgebra } from "../src/tree/tree-ui";

describe("renderToHtml", () => {
  it("renders static HTML from a UI denotation", () => {
    const H = htmlDsl(TreeAlgebra);

    const ui = H.main(
      H.cls("shell"),
      H.section(
        H.id("intro"),
        H.cls("card"),
        H.h1("Facet"),
        H.p("Meaning outside. Interpretation explicit.")
      )
    );

    expect(renderToHtml(ui)).toBe(
      '<main class="shell"><section class="card" id="intro"><h1>Facet</h1><p>Meaning outside. Interpretation explicit.</p></section></main>'
    );
  });

  it("escapes text and attributes", () => {
    const H = htmlDsl(TreeAlgebra);

    const ui = H.a(
      H.href('/search?q="facet"&tag=<ui>'),
      H.title("A 'quoted' title"),
      'Search for <Facet> & "UI"'
    );

    expect(renderToHtml(ui)).toBe(
      '<a href="/search?q=&quot;facet&quot;&amp;tag=&lt;ui&gt;" title="A &#39;quoted&#39; title">Search for &lt;Facet&gt; &amp; "UI"</a>'
    );
  });

  it("erases events, mapped events, memo, and keyed wrappers", () => {
    const H = htmlDsl(TreeAlgebra);

    const child = H.button<{ readonly type: "Clicked" }>(
      H.onClick(() => ({ type: "Clicked" })),
      H.cls("button"),
      "Click"
    );

    const ui = H.mapEvents<
      { readonly type: "Clicked" },
      { readonly type: "Parent" }
    >(() => ({ type: "Parent" }))(
      H.memo("stable", H.keyed("button", child))
    );

    expect(renderToHtml(ui)).toBe(
      '<button class="button">Click</button>'
    );
  });

  it("renders boolean and regular properties as HTML attributes", () => {
    const H = htmlDsl(TreeAlgebra);

    const ui = H.form(
      H.input(
        H.type("checkbox"),
        H.name("done"),
        H.checked(true),
        H.disabled(false),
        H.value("yes")
      ),
      H.button(
        H.type("submit"),
        H.disabled(true),
        "Save"
      )
    );

    expect(renderToHtml(ui)).toBe(
      '<form><input type="checkbox" name="done" checked value="yes"><button type="submit" disabled>Save</button></form>'
    );
  });

  it("renders void tags without closing tags", () => {
    const H = htmlDsl(TreeAlgebra);

    const ui = H.div(
      H.img(H.src("/logo.png"), H.alt("Logo")),
      H.br(),
      H.hr()
    );

    expect(renderToHtml(ui)).toBe(
      '<div><img src="/logo.png" alt="Logo"><br><hr></div>'
    );
  });

  it("renders concat and empty as static fragments", () => {
    const H = htmlDsl(TreeAlgebra);

    const ui = H.fragment(
      H.empty(),
      H.span("A"),
      H.span("B")
    );

    expect(renderToHtml(ui)).toBe(
      "<span>A</span><span>B</span>"
    );
  });
});
