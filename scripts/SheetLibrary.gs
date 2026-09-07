/**
 * คลังสัญญา สั่งการ คลีน — วางใน Extensions > Apps Script ของชีต
 * Deploy เป็น Web app: Execute as Me, Who has access = Anyone
 */
var SHEET_ID = "1Os1IdvKUPhuzBS0o765T3W_vnllgr_x03lfgfta2Tow";
var SHEET_NAME = "สัญญา";
var HEADERS = [
  "id",
  "contract_no",
  "contract_date",
  "client_name",
  "client_address",
  "client_authorized",
  "client_position",
  "start_date",
  "end_date",
  "contract_months",
  "notes",
  "createdAt",
  "updatedAt",
  "json",
];

function getSheet_() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  var width = HEADERS.length;
  var first = sheet.getRange(1, 1, 1, width).getValues()[0];
  if (String(first[0]) !== "id") {
    if (sheet.getLastRow() > 0) {
      sheet.insertRowBefore(1);
    }
    sheet.getRange(1, 1, 1, width).setValues([HEADERS]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function rowFromContract_(contract) {
  var inputs = contract.inputs || {};
  return [
    contract.id || "",
    inputs.contract_no || "",
    inputs.contract_date || "",
    inputs.client_name || "",
    inputs.client_address || "",
    inputs.client_authorized || "",
    inputs.client_position || "",
    inputs.start_date || "",
    inputs.end_date || "",
    inputs.contract_months || "",
    contract.notes || "",
    contract.createdAt || "",
    contract.updatedAt || "",
    JSON.stringify(contract),
  ];
}

function findRow_(sheet, id) {
  var last = sheet.getLastRow();
  if (last < 2) return -1;
  var ids = sheet.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2;
  }
  return -1;
}

function listContracts_() {
  var sheet = getSheet_();
  var last = sheet.getLastRow();
  if (last < 2) {
    return { version: 1, updatedAt: Date.now(), contracts: [] };
  }
  var values = sheet.getRange(2, 1, last - 1, HEADERS.length).getValues();
  var contracts = [];
  for (var i = 0; i < values.length; i++) {
    var raw = values[i][13];
    if (!raw) continue;
    try {
      contracts.push(JSON.parse(String(raw)));
    } catch (error) {
      contracts.push({
        id: String(values[i][0] || ""),
        inputs: {
          contract_no: String(values[i][1] || ""),
          client_name: String(values[i][3] || ""),
        },
        createdAt: Number(values[i][11]) || Date.now(),
        updatedAt: Number(values[i][12]) || Date.now(),
        notes: String(values[i][10] || ""),
      });
    }
  }
  return { version: 1, updatedAt: Date.now(), contracts: contracts };
}

function upsert_(sheet, contract) {
  if (!contract || !contract.id) {
    throw new Error("ไม่มีรหัสสัญญา");
  }
  var row = rowFromContract_(contract);
  var found = findRow_(sheet, contract.id);
  if (found > 0) {
    sheet.getRange(found, 1, 1, HEADERS.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }
}

function delete_(sheet, id) {
  var found = findRow_(sheet, id);
  if (found > 0) sheet.deleteRow(found);
}

function replace_(sheet, contracts) {
  var last = sheet.getLastRow();
  if (last >= 2) sheet.deleteRows(2, last - 1);
  for (var i = 0; i < (contracts || []).length; i++) {
    sheet.appendRow(rowFromContract_(contracts[i]));
  }
}

function doGet(e) {
  try {
    getSheet_();
    return json_(listContracts_());
  } catch (error) {
    return json_({ error: String(error) });
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = getSheet_();
    var action = data.action;
    if (action === "list") return json_(listContracts_());
    if (action === "save") {
      upsert_(sheet, data.payload);
      return json_(listContracts_());
    }
    if (action === "delete") {
      delete_(sheet, data.id);
      return json_(listContracts_());
    }
    if (action === "replace") {
      replace_(sheet, data.payload || []);
      return json_(listContracts_());
    }
    return json_({ error: "คำสั่งไม่รู้จัก" });
  } catch (error) {
    return json_({ error: String(error) });
  } finally {
    lock.releaseLock();
  }
}
