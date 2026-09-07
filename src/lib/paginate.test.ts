import assert from "node:assert/strict";
import { packBlocks } from "./paginate";

assert.deepEqual(
  packBlocks([{ height: 40 }, { height: 40 }, { height: 40 }], 100),
  [[0, 1], [2]]
);

assert.deepEqual(packBlocks([{ height: 10 }, { height: 10 }], 100), [[0, 1]]);

assert.deepEqual(packBlocks([], 100), [[]]);

assert.deepEqual(packBlocks([{ height: 200 }], 100), [[0]]);

const withHead = packBlocks(
  [{ height: 80 }, { height: 20, keepWithNext: true }, { height: 80 }],
  100
);
assert.deepEqual(withHead, [[0], [1, 2]]);

const pairTooTall = packBlocks(
  [{ height: 80, keepWithNext: true }, { height: 80 }],
  100
);
assert.deepEqual(pairTooTall, [[0], [1]]);

const keepOnSamePage = packBlocks(
  [{ height: 20, keepWithNext: true }, { height: 20 }, { height: 90 }],
  100
);
assert.deepEqual(keepOnSamePage, [[0, 1], [2]]);

const closingCluster = packBlocks(
  [
    { height: 70 },
    { height: 20, keepWithNext: true },
    { height: 25, keepWithNext: true },
    { height: 40 },
  ],
  100
);
assert.deepEqual(closingCluster, [[0], [1, 2, 3]]);

const shortList = packBlocks(
  [
    { height: 70 },
    { height: 15, keepWithNext: true },
    { height: 15, keepWithNext: true },
    { height: 15 },
  ],
  100
);
assert.deepEqual(shortList, [[0], [1, 2, 3]]);

console.log("paginate.test.ts: all assertions passed");
