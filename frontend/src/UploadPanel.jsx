import React, { useCallback, useState } from "react";
import { Upload, FileSpreadsheet, CheckCircle, Loader } from "lucide-react";
import toast from "react-hot-toast";
import { uploadFile } from "./api";
import styles from "./UploadPanel.module.css";

export default function UploadPanel({ onUploaded }) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);

  const processFile = useCallback(async (file) => {
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["csv", "xlsx", "xls"].includes(ext)) {
      toast.error("Only CSV and XLSX files are supported");
      return;
    }
    setLoading(true);
    try {
      const result = await uploadFile(file);
      toast.success(`Loaded ${result.rowCount.toLocaleString()} rows from "${file.name}"`);
      onUploaded(result);
    } catch (err) {
      toast.error(err.response?.data?.error || "Upload failed");
    } finally {
      setLoading(false);
    }
  }, [onUploaded]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  return (
    <div className={styles.wrap}>
      <div
        className={`${styles.zone} ${dragging ? styles.over : ""} ${loading ? styles.loading : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !loading && document.getElementById("fileInput").click()}
      >
        <input
          id="fileInput"
          type="file"
          accept=".csv,.xlsx,.xls"
          style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files[0]; if (f) processFile(f); e.target.value = ""; }}
        />
        {loading ? (
          <>
            <Loader size={36} className={styles.spin} color="var(--accent)" />
            <p className={styles.primary}>Parsing file…</p>
            <p className={styles.secondary}>Detecting schema and loading rows</p>
          </>
        ) : (
          <>
            <div className={styles.iconRow}>
              <FileSpreadsheet size={20} color="var(--accent)" />
              <Upload size={20} color="var(--text2)" />
            </div>
            <p className={styles.primary}>Drop your CSV or XLSX file here</p>
            <p className={styles.secondary}>or click to browse · up to 20 MB</p>
          </>
        )}
      </div>

      <div className={styles.steps}>
        {[
          ["1", "Upload", "Drop a CSV or XLSX file — schema is auto-detected"],
          ["2", "Ask", "Type your question in plain English on the Query tab"],
          ["3", "Generate", "The AI agent writes SQL or MongoDB for you"],
          ["4", "Results", "Query executes instantly and results appear below"],
        ].map(([n, title, desc]) => (
          <div className={styles.step} key={n}>
            <div className={styles.stepNum}>{n}</div>
            <div>
              <div className={styles.stepTitle}>{title}</div>
              <div className={styles.stepDesc}>{desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
