import assert from "node:assert/strict";
import {
  applyPendingOps,
  enqueuePendingOp,
  type PendingContract,
  type PendingOp,
} from "./pending-sync";

const remote: PendingContract[] = [
  {
    id: "keep",
    inputs: { contract_no: "SC-2569-09-001", client_name: "บนชีต" },
    createdAt: 1_800_000_000_000,
    updatedAt: 1_800_000_000_000,
    notes: "",
  },
  {
    id: "gone",
    inputs: { contract_no: "SC-2569-09-002", client_name: "จะถูกลบ" },
    createdAt: 1_800_000_000_100,
    updatedAt: 1_800_000_000_100,
    notes: "",
  },
];

const localSave: PendingContract = {
  id: "new",
  inputs: { contract_no: "SC-2569-09-003", client_name: "เพิ่งเซฟ" },
  createdAt: 1_800_000_000_200,
  updatedAt: 1_800_000_000_200,
  notes: "",
};

const afterSave = applyPendingOps(remote, [
  { type: "save", row: localSave },
]);
assert.equal(afterSave.length, 3);
assert.ok(afterSave.some((row) => row.id === "new"));

const afterDelete = applyPendingOps(remote, [{ type: "delete", id: "gone" }]);
assert.equal(afterDelete.length, 1);
assert.equal(afterDelete[0]?.id, "keep");
assert.ok(!afterDelete.some((row) => row.id === "gone"));

const dupSave: PendingContract = {
  id: "keep-new",
  inputs: { contract_no: "SC-2569-09-001", client_name: "เลขซ้ำที่เครื่อง" },
  createdAt: 1_800_000_000_300,
  updatedAt: 1_800_000_000_300,
  notes: "",
};
const afterDup = applyPendingOps(remote, [
  { type: "save", row: dupSave, removeIds: ["keep"] },
]);
assert.equal(afterDup.length, 2);
assert.ok(afterDup.some((row) => row.id === "keep-new"));
assert.ok(!afterDup.some((row) => row.id === "keep"));

const replaceRows: PendingContract[] = [localSave];
const afterReplace = applyPendingOps(remote, [
  { type: "replace", rows: replaceRows },
]);
assert.equal(afterReplace.length, 1);
assert.equal(afterReplace[0]?.id, "new");

let ops: PendingOp[] = [];
ops = enqueuePendingOp(ops, { type: "save", row: localSave });
ops = enqueuePendingOp(ops, { type: "save", row: { ...localSave, notes: "สอง" } });
assert.equal(ops.length, 1);
assert.equal(ops[0]?.type, "save");
if (ops[0]?.type === "save") assert.equal(ops[0].row.notes, "สอง");

ops = enqueuePendingOp(ops, { type: "delete", id: "new" });
assert.equal(ops.length, 1);
assert.equal(ops[0]?.type, "delete");

console.log("pending-sync.test.ts: all assertions passed");
