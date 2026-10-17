import { test } from "node:test";
import assert from "node:assert/strict";
import { allocate, splitBill, type Receipt } from "./split.ts";

test("allocate always sums exactly", () => {
  assert.deepEqual(allocate(100, [1, 1, 1]), [34, 33, 33]);
  assert.deepEqual(allocate(-10, [1, 1, 1]), [-4, -3, -3]);
  assert.deepEqual(allocate(5, [0, 0]), [3, 2]);
});

test("splitBill matches the receipt total to the cent", () => {
  const receipt: Receipt = {
    merchant: "Diner", currency: "USD", tax: 3.17, tip: 6.0, total: 45.18,
    items: [
      { name: "Burger", price: 14.5 },
      { name: "Nachos", price: 11.0 },
      { name: "Beer", price: 7.0 },
      { name: "Fries", price: 3.51 },
    ],
  };
  const people = [{ name: "Me", email: "" }, { name: "Sam", email: "s@x.com" }, { name: "Priya", email: "p@x.com" }];
  const shares = splitBill(receipt, [["Me"], ["Sam", "Priya"], ["Sam"], []], people);

  assert.equal(shares.reduce((a, s) => a + s.totalCents, 0), 4518);
  assert.equal(shares[0].lines[0].cents, 1450); // Me: burger alone
  assert.deepEqual(shares[1].lines.slice(0, 2).map((l) => l.cents), [550, 700]); // Sam: half nachos + beer
  assert.ok(shares.every((s) => s.lines.every((l) => Number.isInteger(l.cents))));
});

test("extra tip percent and unknown names", () => {
  const receipt: Receipt = { merchant: "", currency: "USD", tax: 0, tip: 0, total: 0, items: [{ name: "Pizza", price: 20 }] };
  const shares = splitBill(receipt, [["Ghost"]], [{ name: "A", email: "" }, { name: "B", email: "" }], 20);
  assert.deepEqual(shares.map((s) => s.totalCents), [1200, 1200]);
});
