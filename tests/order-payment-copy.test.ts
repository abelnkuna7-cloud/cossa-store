import test from "node:test";
import assert from "node:assert/strict";
import { orderPaymentMethod, unpaidDownloadMessage } from "../src/lib/order-payment-copy.ts";

test("EFT provider names show the same bank transfer label", () => {
  for (const provider of ["eft", "eft_manual"]) {
    assert.equal(orderPaymentMethod(provider), "EFT / Bank transfer");
  }
});

test("Yoco test orders do not imply EFT approval or download release", () => {
  assert.equal(orderPaymentMethod("yoco_test"), "Yoco — Test payment");
  assert.equal(
    unpaidDownloadMessage("yoco_test"),
    "Test payments do not unlock downloads. No real payment was made.",
  );
});

test("real payment guidance requires verification without manual approval claims", () => {
  for (const provider of ["yoco", "yoco_live", "eft", "eft_manual", null]) {
    assert.equal(
      unpaidDownloadMessage(provider),
      "Download available once payment has been verified.",
    );
  }
});

test("unknown providers are not invented or exposed", () => {
  assert.equal(orderPaymentMethod("internal-provider"), "Payment method not available");
  assert.equal(orderPaymentMethod(null), "Payment method not available");
});
