import { test } from "node:test";
import assert from "node:assert/strict";
import { canTransition, customerCanCancel, HAPPY_PATH, restocks, TRANSITIONS } from "./orderStatus.ts";

test("happy path is a legal chain", () => {
  for (let i = 0; i < HAPPY_PATH.length - 1; i++) assert.ok(canTransition(HAPPY_PATH[i], HAPPY_PATH[i + 1]));
});

test("illegal transitions are rejected", () => {
  assert.equal(canTransition("pending", "delivered"), false);
  assert.equal(canTransition("shipped", "cancelled"), false);
  assert.equal(canTransition("cancelled", "confirmed"), false);
});

test("terminal states have no exits", () => {
  assert.deepEqual(TRANSITIONS.cancelled, []);
  assert.deepEqual(TRANSITIONS.refunded, []);
});

test("cancellation and restock rules", () => {
  assert.ok(customerCanCancel("pending"));
  assert.equal(customerCanCancel("shipped"), false);
  assert.ok(restocks("cancelled"));
  assert.ok(restocks("returned"));
  assert.equal(restocks("delivered"), false);
});
