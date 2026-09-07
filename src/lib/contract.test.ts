import assert from "node:assert/strict";
import {
  buildContractContext,
  buildSampleInputs,
  emptyInputs,
  formatQuantityPhrase,
  getConsumableKind,
  isQtyCompatibleWithKind,
  missingRequiredFields,
  normalizeContractNo,
  normalizeStaffRoles,
} from "./contract";
import {
  bahtText,
  endDateFromStart,
  formatThaiDate,
  monthsFromRange,
  num2wordsTh,
  round2,
} from "./thai";

assert.equal(num2wordsTh(0), "ศูนย์");
assert.equal(num2wordsTh(1), "หนึ่ง");
assert.equal(num2wordsTh(10), "สิบ");
assert.equal(num2wordsTh(11), "สิบเอ็ด");
assert.equal(num2wordsTh(21), "ยี่สิบเอ็ด");
assert.equal(num2wordsTh(100), "หนึ่งร้อย");
assert.equal(num2wordsTh(101), "หนึ่งร้อยเอ็ด");
assert.equal(num2wordsTh(1000), "หนึ่งพัน");
assert.equal(bahtText(360000), "สามแสนหกหมื่นบาทถ้วน");
assert.equal(bahtText(15000.99), "หนึ่งหมื่นห้าพันบาทเก้าสิบเก้าสตางค์");
assert.equal(round2(25200.840000000004), 25200.84);

assert.equal(formatThaiDate("2026-09-07"), "7 กันยายน 2569");
assert.equal(endDateFromStart("2026-10-01", 12), "2027-09-30");
assert.equal(endDateFromStart("2026-01-31", 1), "2026-02-27");
assert.equal(endDateFromStart("2024-01-31", 1), "2024-02-28");
assert.equal(endDateFromStart("2026-01-01", 1), "2026-01-31");
assert.equal(monthsFromRange("2026-10-01", "2027-09-30"), 12);
assert.equal(monthsFromRange("2026-10-01", "2026-09-01"), null);

assert.equal(normalizeContractNo("SC-2569-003", "2026-09-07"), "SC-2569-09-003");
assert.equal(normalizeContractNo("SC-2569-09-001", "2026-09-07"), "SC-2569-09-001");
assert.equal(normalizeContractNo("SC-2569-12", "2026-03-01"), "SC-2569-03-012");

const sample = emptyInputs({
  contract_no: "SC-2569-003",
  contract_date: "2026-09-07",
  client_name: "บริษัท ตัวอย่าง พลาซ่า จำกัด",
  client_address: "กรุงเทพฯ",
  client_authorized: "สมชาย",
  start_date: "2026-10-01",
  end_date: "2027-09-30",
  contract_months: "12",
  staff_roles: [
    {
      id: "cleaner",
      title: "พนักงานรักษาความสะอาด",
      count: "2",
      price_per_head: "15000",
    },
  ],
});
assert.equal(sample.contract_no, "SC-2569-09-003");

const sampleFilled = buildSampleInputs("SC-2569-09-099");
assert.equal(missingRequiredFields(sampleFilled).length, 0);
assert.ok(sampleFilled.client_address.trim());
assert.ok(sampleFilled.client_authorized.trim());
assert.ok(sampleFilled.staff_roles.some((r) => Number(r.price_per_head) > 0));

const ctx = buildContractContext(sample);
assert.equal(ctx.staff_count, 2);
assert.equal(ctx.monthly_total, "30,000.00");
assert.equal(ctx.total_contract_price, "360,000.00");
assert.equal(ctx.total_price_text, "สามแสนหกหมื่นบาทถ้วน");
assert.equal(ctx.vat_amount, 25200);
assert.equal(missingRequiredFields(sample).length, 0);
assert.ok(!ctx.equipment_clause.includes("ถุงขยะ"));
assert.ok(!ctx.equipment_clause.includes("กระดาษชำระ"));
assert.equal(ctx.consumable_lines.length, 2);
assert.match(ctx.consumable_lines[0]!, /ถุงขยะ/);
assert.match(ctx.consumable_lines[1]!, /กระดาษชำระ/);

const multi = emptyInputs({
  ...sample,
  staff_roles: [
    {
      id: "supervisor",
      title: "หัวหน้าพนักงาน",
      count: "1",
      price_per_head: "18000",
    },
    {
      id: "shift",
      title: "พนักงานเป็นกะ",
      count: "2",
      price_per_head: "15000",
    },
  ],
});
const multiCtx = buildContractContext(multi);
assert.equal(multiCtx.staff_count, 3);
assert.equal(multiCtx.monthly_total_raw, 48000);
assert.equal(multiCtx.staff_roles.length, 2);

const legacy = normalizeStaffRoles(undefined, {
  staff_count: "3",
  price_per_head: "12000",
});
assert.equal(legacy.length, 1);
assert.equal(legacy[0]!.count, "3");

const withoutBags = emptyInputs({
  ...sample,
  consumables: [
    {
      id: "trash_bags",
      name: "ถุงขยะ",
      enabled: false,
      size: "",
      quantity: "",
      variants: [],
    },
    {
      id: "toilet_paper",
      name: "กระดาษชำระ",
      enabled: true,
      size: "ม้วนใหญ่",
      quantity: "ตามความเหมาะสม",
      variants: [],
    },
  ],
});
const withoutBagsCtx = buildContractContext(withoutBags);
assert.match(withoutBagsCtx.consumable_lines[0]!, /ไม่รวมถุงขยะ/);
assert.match(withoutBagsCtx.consumable_lines[1]!, /ผู้รับจ้างจัดหากระดาษชำระ/);

const multiBags = emptyInputs({
  ...sample,
  consumables: [
    {
      id: "trash_bags",
      name: "ถุงขยะ",
      enabled: true,
      size: "",
      quantity: "",
      variants: [
        { id: "a", size: "30x40 นิ้ว", quantity: "20 ใบ/เดือน" },
        { id: "b", size: "36x45 นิ้ว", quantity: "10 ใบ/เดือน" },
      ],
    },
    {
      id: "toilet_paper",
      name: "กระดาษชำระ",
      enabled: true,
      size: "ม้วนใหญ่",
      quantity: "ตามความเหมาะสม",
      variants: [],
    },
  ],
});
assert.match(
  buildContractContext(multiBags).consumable_lines[0]!,
  /30x40.*36x45/
);

assert.equal(getConsumableKind({ id: "trash_bags", name: "ถุงขยะ" }), "trash_bags");
assert.equal(
  getConsumableKind({ id: "toilet_paper", name: "กระดาษชำระ" }),
  "toilet_paper"
);
assert.equal(
  getConsumableKind({ id: "x", name: "น้ำยาฆ่าเชื้อ" }),
  "chemical"
);
assert.equal(isQtyCompatibleWithKind("20 ใบ/เดือน", "trash_bags"), true);
assert.equal(isQtyCompatibleWithKind("2 แพ็ค/เดือน", "toilet_paper"), true);
assert.equal(isQtyCompatibleWithKind("1 ม้วน/วัน", "trash_bags"), false);
assert.equal(isQtyCompatibleWithKind("10 ใบ/เดือน", "toilet_paper"), false);
assert.equal(formatQuantityPhrase("20", "trash_bags"), "20 ใบ/เดือน");
assert.equal(formatQuantityPhrase("2", "toilet_paper"), "2 แพ็ค/เดือน");
assert.equal(formatQuantityPhrase("1", "chemical"), "1 ขวด/เดือน");

const incomplete = emptyInputs({ client_name: "x" });
assert.ok(missingRequiredFields(incomplete).includes("เลขที่สัญญา"));

const inverted = emptyInputs({
  ...sample,
  start_date: "2026-10-01",
  end_date: "2026-09-01",
});
assert.ok(
  missingRequiredFields(inverted).includes("วันสิ้นสุดต้องไม่ก่อนวันเริ่ม")
);

console.log("contract helpers ok");
