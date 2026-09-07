import assert from "node:assert/strict";
import { scaleToFit } from "./print";

assert.equal(scaleToFit(100, 100, 100, 100), 1);
assert.equal(scaleToFit(200, 100, 100, 100), 0.5);
assert.equal(scaleToFit(100, 200, 100, 100), 0.5);
assert.equal(scaleToFit(300, 400, 210, 297), Math.min(210 / 300, 297 / 400));
assert.equal(scaleToFit(0, 10, 100, 100), 1);

console.log("print.test.ts: all assertions passed");
