const Database = require("better-sqlite3");

/**
 * Load rows into an in-memory SQLite DB and run a query.
 * Returns { rows, columns, rowsAffected }
 */
function executeSQL(tableName, headers, rows, sql) {
  const db = new Database(":memory:");

  // Build CREATE TABLE with typed columns
  const colDefs = headers
    .map((h) => {
      const safe = sanitizeCol(h);
      return `"${safe}" TEXT`;
    })
    .join(", ");

  db.exec(`CREATE TABLE IF NOT EXISTS "${sanitizeCol(tableName)}" (${colDefs})`);

  // Bulk insert
  const safeName = sanitizeCol(tableName);
  const placeholders = headers.map(() => "?").join(", ");
  const colNames = headers.map((h) => `"${sanitizeCol(h)}"`).join(", ");
  const insert = db.prepare(
    `INSERT INTO "${safeName}" (${colNames}) VALUES (${placeholders})`
  );
  const insertAll = db.transaction((dataRows) => {
    for (const row of dataRows) {
      const vals = headers.map((h) => {
        const v = row[h];
        return v === null || v === undefined ? null : String(v);
      });
      insert.run(vals);
    }
  });
  insertAll(rows);

  // Execute the user's query
  let result;
  try {
    const stmt = db.prepare(sql);
    if (/^\s*(select|with|pragma)/i.test(sql)) {
      const resultRows = stmt.all();
      const columns = resultRows.length ? Object.keys(resultRows[0]) : [];
      result = { rows: resultRows, columns, rowsAffected: resultRows.length };
    } else {
      const info = stmt.run();
      result = { rows: [], columns: [], rowsAffected: info.changes };
    }
  } catch (err) {
    db.close();
    throw new Error("SQL execution error: " + err.message);
  }

  db.close();
  return result;
}

function sanitizeCol(name) {
  return String(name).replace(/['"]/g, "");
}

module.exports = { executeSQL };
