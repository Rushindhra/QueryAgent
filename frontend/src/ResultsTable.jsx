import React, { useState } from "react";
import styles from "./ResultsTable.module.css";

const PAGE_SIZE = 25;

export default function ResultsTable({ columns, rows, total }) {
  const [page, setPage] = useState(0);
  if (!rows?.length) return <div className={styles.empty}>No rows returned</div>;

  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const pageRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.label}>Results</span>
        <span className={styles.count}>
          {rows.length.toLocaleString()} rows
          {total > rows.length ? ` (showing first ${rows.length.toLocaleString()} of ${total.toLocaleString()})` : ""}
        </span>
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map((col) => <th key={col}>{col}</th>)}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => (
              <tr key={i}>
                {columns.map((col) => (
                  <td key={col} title={String(row[col] ?? "")}>
                    {row[col] === null || row[col] === undefined
                      ? <span className={styles.null}>null</span>
                      : String(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button onClick={() => setPage(0)} disabled={page === 0}>«</button>
          <button onClick={() => setPage((p) => p - 1)} disabled={page === 0}>‹</button>
          <span className={styles.pageInfo}>Page {page + 1} of {totalPages}</span>
          <button onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages - 1}>›</button>
          <button onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}>»</button>
        </div>
      )}
    </div>
  );
}
