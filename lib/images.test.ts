import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CARD_WIDTHS, stripSources, widthSrcSet } from "./images";

const upload = "https://res.cloudinary.com/demo/image/upload/v123/artisan-exchange/abc.jpg";

describe("stripSources", () => {
  it("gives phones their 210px tiles and larger screens 320px, each at 1x and 2x", () => {
    const { phone, wide } = stripSources(upload);
    assert.equal(
      phone,
      [210, 420].map((h, i) => `https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,h_${h},c_limit/v123/artisan-exchange/abc.jpg ${i + 1}x`).join(", ")
    );
    assert.match(wide, /h_320,c_limit\/v123\/artisan-exchange\/abc\.jpg 1x, .*h_640,c_limit\/v123\/artisan-exchange\/abc\.jpg 2x$/);
  });
});

describe("widthSrcSet", () => {
  it("lists the image at each width", () => {
    assert.equal(
      widthSrcSet(upload, CARD_WIDTHS),
      CARD_WIDTHS.map((w) => `https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_${w},c_limit/v123/artisan-exchange/abc.jpg ${w}w`).join(", ")
    );
  });

  it("leaves an image that is not on Cloudinary as it is", () => {
    assert.equal(widthSrcSet("/artisan/artwork-placeholder.svg", CARD_WIDTHS), "/artisan/artwork-placeholder.svg");
  });
});
