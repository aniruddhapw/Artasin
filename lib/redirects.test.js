import assert from "node:assert/strict";
import { describe, it } from "node:test";

const { afterSignIn, safeRedirectPath } = await import("./redirects.js");

describe("safeRedirectPath", () => {
  it("keeps paths on this site", () => {
    assert.equal(safeRedirectPath("/studio/artworks?x=1"), "/studio/artworks?x=1");
  });

  it("refuses anything that leaves the site", () => {
    for (const value of ["//evil.com", "/\\evil.com", "https://evil.com", "evil.com", "", null, undefined]) {
      assert.equal(safeRedirectPath(value, "/home"), "/home");
    }
  });
});

describe("afterSignIn", () => {
  it("asks for a phone number first when there isn't one", () => {
    assert.equal(afterSignIn({ phone: null, role: "BUYER" }, "/gallery?a=b"), "/add-phone?redirect=%2Fgallery%3Fa%3Db");
    assert.equal(afterSignIn({ phone: "", role: "ARTIST" }, "/studio"), "/add-phone?redirect=%2Fstudio");
  });

  it("goes straight on when there is one, or for admins", () => {
    assert.equal(afterSignIn({ phone: "+919876543210", role: "BUYER" }, "/gallery"), "/gallery");
    assert.equal(afterSignIn({ phone: null, role: "ADMIN" }, "/admin"), "/admin");
  });
});
