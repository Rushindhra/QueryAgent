import React, { useEffect, useState } from "react";
import { Clock, RotateCcw } from "lucide-react";
import { fetchHistory } from "./api";
import styles from "./HistoryPanel.module.css";

export default function HistoryPanel({ session, onRerun }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory(session.sessionId)
      .then((d) => setHistory(d.history || []))
      .finally(() => setLoading(false));
  }, [session.sessionId]);

  if (loading) return <div className={styles.empty}>Loading…</div>;
  if (!history.length) return (
    <div className={styles.empty}>
      <Clock size={28} color="var(--text3)" />
      <p>No queries yet — ask something on the Query tab!</p>
    </div>
  );

  return (
    <div className={styles.wrap}>
      {history.map((h, i) => (
        <div className={styles.item} key={i}>
          <div className={styles.top}>
            <div className={styles.nl}>{h.naturalLanguage}</div>
            <div className={styles.badges}>
              <span className={`${styles.badge} ${styles[h.mode]}`}>{h.mode?.toUpperCase()}</span>
              <span className={styles.count}>{h.rowCount?.toLocaleString()} rows</span>
            </div>
          </div>
          <pre className={styles.sql}>{h.generatedQuery}</pre>
          {h.summary && <p className={styles.summary}>{h.summary}</p>}
          <div className={styles.footer}>
            <span className={styles.time}>{new Date(h.timestamp).toLocaleTimeString()}</span>
            <button className={styles.rerunBtn} onClick={() => onRerun(h.naturalLanguage, h.mode)}>
              <RotateCcw size={11} /> Re-run
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
