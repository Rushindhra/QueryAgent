import React, { useState, useRef } from "react";
import { Send, Zap, ChevronDown, ChevronUp, Cpu } from "lucide-react";
import toast from "react-hot-toast";
import { runQuery } from "./api";
import ResultsTable from "./ResultsTable";
import styles from "./QueryPanel.module.css";

function buildExamples(tableName, headers, schema) {
  const numCols = headers.filter((h) => schema[h] === "number");
  const strCols = headers.filter((h) => schema[h] === "text");
  const examples = [
    `Show all rows from ${tableName}`,
    `Show the first 10 records`,
    `Count total number of rows`,
  ];
  if (numCols[0]) examples.push(`Show rows where ${numCols[0]} is greater than 100`);
  if (numCols[0]) examples.push(`What is the average ${numCols[0]}?`);
  if (numCols[0]) examples.push(`Sort by ${numCols[0]} in descending order`);
  if (strCols[0] && numCols[0]) examples.push(`Group by ${strCols[0]} and show average ${numCols[0]}`);
  if (numCols[0]) examples.push(`Find the top 5 records by ${numCols[0]}`);
  return examples.slice(0, 8);
}

export default function QueryPanel({ session }) {
  const { sessionId, tableName, headers, schema } = session;
  const [nl, setNl] = useState("");
  const [mode, setMode] = useState("sql");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [showSteps, setShowSteps] = useState(false);
  const textareaRef = useRef();

  const examples = buildExamples(tableName, headers, schema);

  async function submit() {
    if (!nl.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await runQuery({ sessionId, naturalLanguage: nl.trim(), mode });
      setResult(res);
    } catch (err) {
      toast.error(err.response?.data?.error || "Query failed");
    } finally {
      setLoading(false);
    }
  }

  function onKey(e) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
  }

  return (
    <div className={styles.wrap}>
      {/* Examples */}
      <div className={styles.examplesLabel}>Try an example</div>
      <div className={styles.chips}>
        {examples.map((ex) => (
          <button key={ex} className={styles.chip} onClick={() => { setNl(ex); textareaRef.current?.focus(); }}>
            {ex}
          </button>
        ))}
      </div>

      {/* Input row */}
      <div className={styles.inputCard}>
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          value={nl}
          onChange={(e) => setNl(e.target.value)}
          onKeyDown={onKey}
          placeholder={`Ask anything about "${tableName}"…\ne.g. "Show employees with salary greater than 60000"`}
          rows={3}
        />
        <div className={styles.inputFooter}>
          <div className={styles.modeWrap}>
            <span className={styles.modeLabel}>Mode:</span>
            <label className={`${styles.modeBtn} ${mode === "sql" ? styles.modeBtnActive : ""}`}>
              <input type="radio" name="mode" value="sql" checked={mode === "sql"} onChange={() => setMode("sql")} style={{ display: "none" }} />
              SQL
            </label>
            <label className={`${styles.modeBtn} ${mode === "mongo" ? styles.modeBtnActive : ""}`}>
              <input type="radio" name="mode" value="mongo" checked={mode === "mongo"} onChange={() => setMode("mongo")} style={{ display: "none" }} />
              MongoDB
            </label>
          </div>
          <span className={styles.hint}>⌘ + Enter to run</span>
          <button className={styles.runBtn} onClick={submit} disabled={loading || !nl.trim()}>
            {loading ? <span className={styles.spinner} /> : <Send size={14} />}
            {loading ? "Running…" : "Run query"}
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className={styles.agentWorking}>
          <Cpu size={14} className={styles.pulse} color="var(--accent)" />
          <span>Agent is thinking — generating query and executing…</span>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className={styles.resultsWrap}>
          {/* Generated query */}
          <div className={styles.queryBox}>
            <div className={styles.queryBoxHeader}>
              <Zap size={13} color="var(--warning)" />
              <span>Generated {mode === "sql" ? "SQL" : "MongoDB"} query</span>
              <span className={styles.queryMeta}>{result.rowCount.toLocaleString()} rows</span>
            </div>
            <pre className={styles.queryCode}>{result.generatedQuery}</pre>
            {result.explanation && (
              <div className={styles.explanation}>{result.explanation}</div>
            )}
          </div>

          {/* AI Summary */}
          {result.summary && (
            <div className={styles.summaryBox}>
              <div className={styles.summaryLabel}>AI summary</div>
              <p className={styles.summaryText}>{result.summary}</p>
              {result.insight && <p className={styles.insightText}>💡 {result.insight}</p>}
            </div>
          )}

          {/* Agent steps toggle */}
          {result.agentSteps?.length > 0 && (
            <button className={styles.stepsToggle} onClick={() => setShowSteps((v) => !v)}>
              {showSteps ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              {showSteps ? "Hide" : "Show"} agent steps ({result.agentSteps.length})
            </button>
          )}
          {showSteps && (
            <div className={styles.stepsBox}>
              {result.agentSteps.map((s, i) => (
                <div key={i} className={styles.stepItem}>
                  <span className={styles.stepTool}>{s.tool}</span>
                  <pre className={styles.stepInput}>{JSON.stringify(s.input, null, 2)}</pre>
                </div>
              ))}
            </div>
          )}

          {/* Results table */}
          <ResultsTable columns={result.columns} rows={result.rows} total={result.rowCount} />
        </div>
      )}
    </div>
  );
}
