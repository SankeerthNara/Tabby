import { test } from "node:test";
import assert from "node:assert/strict";
import { joinTranscripts } from "./transcript.ts";

test("desktop: each result holds only new words", () => {
  assert.equal(joinTranscripts(["I had the burger", " Sam had the nachos"]), "I had the burger Sam had the nachos");
});

test("android: each result repeats everything so far", () => {
  assert.equal(joinTranscripts(["I had", "I had the burger", "i had the burger Sam had the nachos"]), "i had the burger Sam had the nachos");
});

test("empty results are ignored", () => {
  assert.equal(joinTranscripts(["", "hello", "  "]), "hello");
});
