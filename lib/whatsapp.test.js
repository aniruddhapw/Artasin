import assert from "node:assert/strict";
import crypto from "node:crypto";
import { describe, it } from "node:test";

const { extractCode, incomingTextMessages, isValidSignature, verificationLink } = await import("./whatsapp.js");

describe("extractCode", () => {
  it("reads the message as we write it, and as people retype it", () => {
    assert.equal(extractCode("ARTASIN 482913"), "482913");
    assert.equal(extractCode("artasin-482913"), "482913");
    assert.equal(extractCode("Hi, ARTASIN: 004211 thanks"), "004211");
    assert.equal(extractCode(" 482913 "), "482913");
  });

  it("finds nothing in other messages", () => {
    assert.equal(extractCode("Hello, is this Artasin?"), null);
    assert.equal(extractCode("my number is 9876543210"), null);
    assert.equal(extractCode("ARTASIN 12345"), null);
    assert.equal(extractCode(undefined), null);
  });
});

describe("isValidSignature", () => {
  const secret = crypto.randomBytes(16).toString("hex");
  const body = JSON.stringify({ entry: [] });
  const signed = `sha256=${crypto.createHmac("sha256", secret).update(body).digest("hex")}`;

  it("accepts Meta's signature", () => {
    assert.equal(isValidSignature(body, signed, secret), true);
  });

  it("refuses a missing, wrong or tampered signature", () => {
    assert.equal(isValidSignature(body, null, secret), false);
    assert.equal(isValidSignature(body, "sha256=deadbeef", secret), false);
    assert.equal(isValidSignature(`${body} `, signed, secret), false);
    assert.equal(isValidSignature(body, signed, undefined), false);
  });
});

describe("incomingTextMessages", () => {
  it("pulls out text messages with the sender in E.164, and skips the rest", () => {
    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  { id: "a", from: "919876543210", type: "text", text: { body: "ARTASIN 482913" } },
                  { id: "b", from: "919876543210", type: "image" }
                ],
                statuses: [{ id: "c", status: "delivered" }]
              }
            }
          ]
        }
      ]
    };
    assert.deepEqual(incomingTextMessages(payload), [{ id: "a", from: "+919876543210", text: "ARTASIN 482913" }]);
    assert.deepEqual(incomingTextMessages({}), []);
  });
});

describe("verificationLink", () => {
  it("opens WhatsApp with the code typed out", () => {
    assert.equal(verificationLink("482913", "919000000000"), "https://wa.me/919000000000?text=ARTASIN%20482913");
  });
});
