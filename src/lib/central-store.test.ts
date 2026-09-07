import assert from "node:assert/strict";
import {
  deleteContract,
  emptySnapshot,
  formatUpdatedAt,
  mergeContracts,
  parseImport,
  upsertContract,
  type CentralContract,
} from "./central-store";

const a: CentralContract = {
  id: "a",
  inputs: { contract_no: "SC-2569-09-001", client_name: "เก่า" },
  createdAt: 1_800_000_000_000,
  updatedAt: 1_800_000_000_000,
  notes: "",
};
const a2: CentralContract = {
  ...a,
  inputs: { contract_no: "SC-2569-09-001", client_name: "ใหม่" },
  updatedAt: 1_800_000_000_500,
};

assert.equal(mergeContracts([a], [a2])[0]?.inputs.client_name, "ใหม่");
assert.equal(formatUpdatedAt(0), "—");
assert.equal(formatUpdatedAt(undefined), "—");

const imported = parseImport({
  version: 1,
  contracts: [{ id: "x", inputs: { client_name: "นำเข้า" }, updatedAt: 0 }],
});
assert.equal(imported.length, 1);
assert.ok((imported[0]?.updatedAt || 0) > 86_400_000);

const snap = upsertContract(emptySnapshot(), {
  inputs: { contract_no: "SC-2569-09-002", client_name: "ทดสอบ" },
});
assert.equal(snap.contracts.length, 1);
assert.equal(snap.contracts[0]?.inputs.client_name, "ทดสอบ");

const removed = deleteContract(snap, snap.contracts[0]!.id);
assert.equal(removed.contracts.length, 0);

assert.throws(() => parseImport({ hello: true }));

console.log("central-store.test.ts: all assertions passed");
