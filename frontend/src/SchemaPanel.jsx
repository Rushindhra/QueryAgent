import React from "react";
import styles from "./SchemaPanel.module.css";

const TYPE_COLORS = {
  number: { bg: "var(--accent-dim)", color: "var(--accent)", label: "NUM" },
  text: { bg: "var(--success-dim)", color: "var(--success)", label: "TEXT" },
  date: { bg: "var(--warning-dim)", color: "var(--warning)", label: "DATE" },
  boolean: { bg: "rgba(168,85,247,0.1)", color: "#c084fc", label: "BOOL" },
};

export default function SchemaPanel({ session }) {
  const { tableName, headers, schema, rowCount, preview } = session;

  return (
    <div className={styles.wrap}>
      <div className={styles.meta}>
        <span className={styles.table}>⬡ {tableName}</span>
        <span className={styles.rows}>{rowCount?.toLocaleString()} rows</span>
        <span className={styles.cols}>{headers.length} columns</span>
      </div>

      <div className={styles.grid}>
        {headers.map((col) => {
          const type = schema[col] || "text";
          const style = TYPE_COLORS[type] || TYPE_COLORS.text;
          const samples = preview?.map((r) => r[col]).filter((v) => v !== "" && v != null).slice(0, 3);
          return (
            <div className={styles.card} key={col}>
              <div className={styles.cardTop}>
                <span className={styles.colName}>{col}</span>
                <span className={styles.typeBadge} style={{ background: style.bg, color: style.color }}>
                  {style.label}
                </span>
              </div>
              {samples?.length > 0 && (
                <div className={styles.samples}>
                  {samples.map((s, i) => <span key={i} className={styles.sample}>{String(s)}</span>)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {preview?.length > 0 && (
        <>
          <div className={styles.sectionTitle}>Data preview (first {preview.length} rows)</div>
          <div className={styles.previewWrap}>
            <table className={styles.previewTable}>
              <thead>
                <tr>{headers.slice(0, 10).map((h) => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {preview.slice(0, 8).map((row, i) => (
                  <tr key={i}>
                    {headers.slice(0, 10).map((h) => (
                      <td key={h}>{row[h] === null || row[h] === undefined ? "—" : String(row[h])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
