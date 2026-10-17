import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GALLERY_ANNOUNCEMENT, fillMergeTags } from "./announcements";

describe("fillMergeTags", () => {
  it("fills the first name, falling back to Resend's default when there is none", () => {
    const html = "<p>Hello {{{contact.first_name|there}}},</p>";
    assert.equal(fillMergeTags(html, { firstName: "Asha", unsubscribeUrl: "#" }), "<p>Hello Asha,</p>");
    assert.equal(fillMergeTags(html, { firstName: " ", unsubscribeUrl: "#" }), "<p>Hello there,</p>");
  });

  it("escapes the name, since it is put into HTML", () => {
    assert.equal(
      fillMergeTags("{{{contact.first_name|there}}}", { firstName: "<b>Ravi</b>", unsubscribeUrl: "#" }),
      "&#60;b&#62;Ravi&#60;/b&#62;"
    );
  });

  it("replaces the unsubscribe link", () => {
    assert.equal(fillMergeTags('<a href="{{{RESEND_UNSUBSCRIBE_URL}}}">x</a>', { firstName: "", unsubscribeUrl: "/account" }), '<a href="/account">x</a>');
  });
});

describe("the 3D gallery announcement", () => {
  const { subject, html } = GALLERY_ANNOUNCEMENT.content();

  it("links to the gallery and carries an unsubscribe link, as marketing mail must", () => {
    assert.match(subject, /3D gallery/);
    assert.match(html, /\/gallery\/walk/);
    assert.match(html, /\{\{\{RESEND_UNSUBSCRIBE_URL\}\}\}/);
  });

  it("has a Broadcast name Resend will accept", () => {
    assert.ok(GALLERY_ANNOUNCEMENT.name.length <= 70);
  });
});
