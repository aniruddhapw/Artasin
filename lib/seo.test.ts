import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_SHARE_IMAGE, SITE_URL, absoluteUrl, breadcrumbList, jsonLd, metaDescription, pageMetadata } from "./seo";

describe("metaDescription", () => {
  it("flattens newlines, which would make Next.js drop the tag", () => {
    assert.equal(metaDescription("First line.\n\nSecond  line."), "First line. Second line.");
  });

  it("cuts long text on a whole word", () => {
    const text = "word ".repeat(60);
    const result = metaDescription(text);
    assert.ok(result.length <= 160);
    assert.ok(result.endsWith("word…"));
  });
});

describe("jsonLd", () => {
  it("escapes < so database text cannot close the script tag", () => {
    const out = jsonLd({ name: "</script><script>alert(1)</script>" });
    assert.ok(!out.includes("<"));
    assert.equal(JSON.parse(out).name, "</script><script>alert(1)</script>");
  });
});

describe("breadcrumbList", () => {
  it("numbers the trail and makes every URL absolute", () => {
    const list = breadcrumbList([
      { name: "Home", path: "/" },
      { name: "Collection", path: "/gallery" }
    ]);
    assert.deepEqual(
      list.itemListElement.map((item) => [item.position, item.item]),
      [
        [1, `${SITE_URL}/`],
        [2, `${SITE_URL}/gallery`]
      ]
    );
  });
});

describe("pageMetadata", () => {
  it("fills title, canonical and both cards, with the default image", () => {
    const meta = pageMetadata({ title: "Artists", description: "Every artist.", path: "/artists" });
    assert.equal(meta.title, "Artists");
    assert.deepEqual(meta.alternates, { canonical: "/artists" });
    assert.equal((meta.openGraph as { title: string }).title, "Artists | ARTASIN");
    assert.deepEqual((meta.openGraph as { images: unknown[] }).images, [DEFAULT_SHARE_IMAGE]);
    assert.equal(meta.robots, undefined);
  });

  it("keeps an absolute title as given and can keep a page out of search", () => {
    const meta = pageMetadata({ title: "Home | ARTASIN", absoluteTitle: true, description: "x", path: "/", noIndex: true });
    assert.deepEqual(meta.title, { absolute: "Home | ARTASIN" });
    assert.equal((meta.openGraph as { title: string }).title, "Home | ARTASIN");
    assert.deepEqual(meta.robots, { index: false, follow: true });
  });
});

describe("absoluteUrl", () => {
  it("leaves full URLs alone and prefixes paths", () => {
    assert.equal(absoluteUrl("https://res.cloudinary.com/x.jpg"), "https://res.cloudinary.com/x.jpg");
    assert.equal(absoluteUrl("/og/gallery-walk.jpg"), `${SITE_URL}/og/gallery-walk.jpg`);
  });
});
