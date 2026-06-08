const XLSX = require("xlsx");
const Papa = require("papaparse");

/**
 * Parse a CSV buffer → { headers, rows, schema }
 */
function parseCSV(buffer) {
  const text = buffer.toString("utf8");
  const result = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });
  if (result.errors.length && !result.data.length) {
    throw new Error("CSV parse error: " + result.errors[0].message);
  }
  const headers = result.meta.fields || [];
  const rows = result.data;
  return { headers, rows, schema: inferSchema(headers, rows) };
}

/**
 * Parse an XLSX buffer → { headers, rows, schema }
 */
function parseXLSX(buffer) {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json(ws, { defval: "" });
  if (!rawRows.length) throw new Error("XLSX file appears empty");
  const headers = Object.keys(rawRows[0]);
  return { headers, rows: rawRows, schema: inferSchema(headers, rawRows) };
}

/**
 * Infer column types from sampled values.
 * Returns { colName: "number" | "date" | "boolean" | "text" }
 */
function inferSchema(headers, rows) {
  const schema = {};
  const sample = rows.slice(0, 100);
  headers.forEach((col) => {
    const values = sample.map((r) => r[col]).filter((v) => v !== "" && v != null);
    if (!values.length) { schema[col] = "text"; return; }

    const allNum = values.every((v) => !isNaN(parseFloat(v)) && isFinite(v));
    if (allNum) { schema[col] = "number"; return; }

    const dateRx = /^\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/;
    const allDate = values.every((v) => dateRx.test(String(v)));
    if (allDate) { schema[col] = "date"; return; }

    const boolVals = new Set(["true", "false", "yes", "no", "1", "0"]);
    const allBool = values.every((v) => boolVals.has(String(v).toLowerCase()));
    if (allBool) { schema[col] = "boolean"; return; }

    schema[col] = "text";
  });
  return schema;
}

module.exports = { parseCSV, parseXLSX };
