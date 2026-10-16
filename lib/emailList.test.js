import assert from "node:assert/strict";
import { describe, it } from "node:test";

const { parseEmailList } = await import("./emailList.js");

describe("parseEmailList", () => {
  it("splits on commas, semicolons and spaces, and trims", () => {
    assert.deepEqual(parseEmailList(" a@x.com, b@y.com;c@z.com  d@w.com "), ["a@x.com", "b@y.com", "c@z.com", "d@w.com"]);
  });

  it("returns nothing for empty or unset values, and drops non-addresses", () => {
    assert.deepEqual(parseEmailList(""), []);
    assert.deepEqual(parseEmailList(undefined), []);
    assert.deepEqual(parseEmailList("nope, a@x.com"), ["a@x.com"]);
  });
});
