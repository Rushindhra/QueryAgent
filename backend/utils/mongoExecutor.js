/**
 * mongoExecutor.js
 * Executes MongoDB-style queries (filter, sort, projection, limit)
 * against in-memory JavaScript arrays.
 */

function executeMongo(rows, queryObj) {
  let result = [...rows];

  // ── filter ────────────────────────────────────────────────
  if (queryObj.filter && Object.keys(queryObj.filter).length) {
    result = result.filter((row) => matchFilter(row, queryObj.filter));
  }

  // ── sort ──────────────────────────────────────────────────
  if (queryObj.sort && Object.keys(queryObj.sort).length) {
    const [sortKey, sortDir] = Object.entries(queryObj.sort)[0];
    result.sort((a, b) => {
      const va = a[sortKey], vb = b[sortKey];
      const na = parseFloat(va), nb = parseFloat(vb);
      if (!isNaN(na) && !isNaN(nb)) return sortDir === 1 ? na - nb : nb - na;
      return sortDir === 1
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });
  }

  // ── limit ─────────────────────────────────────────────────
  if (queryObj.limit) {
    result = result.slice(0, parseInt(queryObj.limit));
  }

  // ── projection ────────────────────────────────────────────
  if (queryObj.projection && Object.keys(queryObj.projection).length) {
    const proj = queryObj.projection;
    const include = Object.entries(proj).filter(([, v]) => v === 1).map(([k]) => k);
    const exclude = Object.entries(proj).filter(([, v]) => v === 0).map(([k]) => k);
    if (include.length) {
      result = result.map((row) => {
        const out = {};
        include.forEach((k) => { if (row[k] !== undefined) out[k] = row[k]; });
        return out;
      });
    } else if (exclude.length) {
      result = result.map((row) => {
        const out = { ...row };
        exclude.forEach((k) => delete out[k]);
        return out;
      });
    }
  }

  const columns = result.length ? Object.keys(result[0]) : [];
  return { rows: result, columns, rowsAffected: result.length };
}

function matchFilter(row, filter) {
  return Object.entries(filter).every(([key, cond]) => {
    const val = row[key];
    if (typeof cond !== "object" || cond === null) {
      return String(val) === String(cond);
    }
    return Object.entries(cond).every(([op, operand]) => {
      const n = parseFloat(val), no = parseFloat(operand);
      switch (op) {
        case "$eq":  return String(val) === String(operand);
        case "$ne":  return String(val) !== String(operand);
        case "$gt":  return !isNaN(n) ? n > no  : String(val) > String(operand);
        case "$gte": return !isNaN(n) ? n >= no : String(val) >= String(operand);
        case "$lt":  return !isNaN(n) ? n < no  : String(val) < String(operand);
        case "$lte": return !isNaN(n) ? n <= no : String(val) <= String(operand);
        case "$regex":
          return new RegExp(operand, "i").test(String(val));
        case "$in":
          return Array.isArray(operand) && operand.map(String).includes(String(val));
        case "$nin":
          return Array.isArray(operand) && !operand.map(String).includes(String(val));
        default: return true;
      }
    });
  });
}

module.exports = { executeMongo };
