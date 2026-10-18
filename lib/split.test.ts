import { test } from "node:test";
import assert from "node:assert/strict";
import { allocate, splitBill, type Portion, type Receipt } from "./split.ts";

const each = (...names: string[]): Portion[] => names.map((name) => ({ name, units: 1 }));

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
  const shares = splitBill(receipt, [each("Me"), each("Sam", "Priya"), each("Sam"), []], people);

  assert.equal(shares.reduce((a, s) => a + s.totalCents, 0), 4518);
  assert.equal(shares[0].lines[0].cents, 1450); // Me: burger alone
  assert.deepEqual(shares[1].lines.slice(0, 2).map((l) => l.cents), [550, 700]); // Sam: half nachos + beer
  assert.equal(shares[1].lines[0].name, "Nachos (1/2)");
  assert.ok(shares.every((s) => s.lines.every((l) => Number.isInteger(l.cents))));
});

test("shared lines split by units, not evenly", () => {
  const receipt: Receipt = { merchant: "", currency: "INR", tax: 0, tip: 0, total: 0, items: [{ name: "3 x Veg Biryani", price: 747 }] };
  const people = [{ name: "Me", email: "" }, { name: "Vattesh", email: "v@x.com" }];
  const shares = splitBill(receipt, [[{ name: "Me", units: 1 }, { name: "Vattesh", units: 2 }]], people);
  assert.deepEqual(shares.map((s) => s.totalCents), [24900, 49800]);
  assert.equal(shares[1].lines[0].name, "3 x Veg Biryani (2/3)");
});

test("extra tip percent and unknown names", () => {
  const receipt: Receipt = { merchant: "", currency: "USD", tax: 0, tip: 0, total: 0, items: [{ name: "Pizza", price: 20 }] };
  const shares = splitBill(receipt, [each("Ghost")], [{ name: "A", email: "" }, { name: "B", email: "" }], 20);
  assert.deepEqual(shares.map((s) => s.totalCents), [1200, 1200]);
});

test("review edits keep the total consistent", async () => {
  const { setItem, removeItem, addItem, setExtra } = await import("./split.ts");
  const r: Receipt = { merchant: "", currency: "USD", tax: 2, tip: 0, total: 25.5, items: [{ name: "A", price: 10 }, { name: "B", price: 13.5 }] }; // 0.00 unitemized
  const fixed = setItem(r, 1, { name: "B", price: 3.5 }); // AI misread 3.50 as 13.50
  assert.equal(fixed.total, 15.5);
  assert.equal(removeItem(fixed, 0).total, 5.5);
  assert.equal(addItem(fixed, { name: "C", price: 0.1 }).total, 15.6);
  assert.equal(setExtra(fixed, "tip", 3).total, 18.5);
  // a receipt with no printed total stays 0, so splitBill keeps summing the parts
  assert.equal(setItem({ ...r, total: 0 }, 0, { name: "A", price: 1 }).total, 0);
  // the split after a fix still adds up exactly
  const people = [{ name: "Me", email: "" }, { name: "Sam", email: "s@x.com" }];
  const shares = splitBill(fixed, [[{ name: "Me", units: 1 }], [{ name: "Sam", units: 1 }]], people);
  assert.equal(shares.reduce((a, s) => a + s.totalCents, 0), 1550);
});
