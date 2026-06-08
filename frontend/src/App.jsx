import React, { useState, useCallback, useRef } from "react";
import { Database, Upload, Search, Grid, Clock, RefreshCw } from "lucide-react";
import UploadPanel from "./UploadPanel";
import QueryPanel from "./QueryPanel";
import SchemaPanel from "./SchemaPanel";
import HistoryPanel from "./HistoryPanel";
import styles from "./App.module.css";

const TABS = [
  { id: "upload", label: "Upload", icon: Upload },
  { id: "query",  label: "Query",  icon: Search },
  { id: "schema", label: "Schema", icon: Grid },
  { id: "history", label: "History", icon: Clock },
];

export default function App() {
  const [session, setSession] = useState(null);
  const [activeTab, setActiveTab] = useState("upload");
  // ref to re-run from history
  const queryPanelRerunRef = useRef(null);

  const onUploaded = useCallback((data) => {
    setSession(data);
    setActiveTab("query");
  }, []);

  const onRerun = useCallback((nl, mode) => {
    setActiveTab("query");
    // slight delay so QueryPanel has mounted
    setTimeout(() => queryPanelRerunRef.current?.(nl, mode), 100);
  }, []);

  const reset = () => { setSession(null); setActiveTab("upload"); };

  return (
    <div className={styles.layout}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <Database size={20} color="var(--accent)" />
          <span>QueryAgent</span>
        </div>

        {session && (
          <div className={styles.sessionCard}>
            <div className={styles.sessionFile}>{session.tableName}</div>
            <div className={styles.sessionMeta}>
              {session.rowCount?.toLocaleString()} rows · {session.headers?.length} cols
            </div>
            <button className={styles.resetBtn} onClick={reset}>
              <RefreshCw size={11} /> New file
            </button>
          </div>
        )}

        <nav className={styles.nav}>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`${styles.navBtn} ${activeTab === id ? styles.navBtnActive : ""}`}
              onClick={() => setActiveTab(id)}
              disabled={id !== "upload" && !session}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </nav>

        <div className={styles.sideFooter}>
          <p className={styles.footerText}>Powered by Gemini Flash</p>
          <p className={styles.footerText}>SQLite · MongoDB in-memory</p>
        </div>
      </aside>

      {/* Main */}
      <main className={styles.main}>
        <div className={styles.mainHeader}>
          <h1 className={styles.mainTitle}>
            {activeTab === "upload" && "Load your data"}
            {activeTab === "query" && "Ask in plain English"}
            {activeTab === "schema" && "Data schema"}
            {activeTab === "history" && "Query history"}
          </h1>
          <p className={styles.mainSub}>
            {activeTab === "upload" && "Upload a CSV or XLSX file — schema is auto-detected and data is stored in memory"}
            {activeTab === "query" && "Type any question and the AI agent will generate and run the correct query"}
            {activeTab === "schema" && "Column names, inferred types, and sample values from your dataset"}
            {activeTab === "history" && "All your past queries for this session"}
          </p>
        </div>

        <div className={styles.content}>
          {activeTab === "upload" && <UploadPanel onUploaded={onUploaded} />}
          {activeTab === "query" && session && (
            <QueryPanel
              session={session}
              rerunRef={queryPanelRerunRef}
            />
          )}
          {activeTab === "schema" && session && <SchemaPanel session={session} />}
          {activeTab === "history" && session && (
            <HistoryPanel session={session} onRerun={onRerun} />
          )}
        </div>

        <footer className={styles.mainFooter}>
          <span>Copyright (c) 2026 QueryAgent. All rights reserved.</span>
          <span className={styles.footerDivider} />
          <span>Made with ❤️ by Rushindhra</span>
        </footer>
      </main>
    </div>
  );
}
