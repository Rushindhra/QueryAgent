const express = require("express");
const multer = require("multer");
const { randomUUID } = require("crypto");
const { parseCSV, parseXLSX } = require("../utils/fileParser");
const { setSession } = require("../utils/sessionStore");

const router = express.Router();

const MAX_MB = parseInt(process.env.MAX_FILE_SIZE_MB || "20");
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    const extOk = /\.(csv|xlsx|xls)$/i.test(file.originalname);
    if (allowed.includes(file.mimetype) || extOk) cb(null, true);
    else cb(new Error("Only CSV and XLSX files are supported"));
  },
});

/**
 * POST /api/upload
 * Body: multipart/form-data with field "file"
 * Returns: { sessionId, tableName, headers, schema, rowCount, preview }
 */
router.post("/", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const { originalname, buffer, mimetype } = req.file;
    const isCSV =
      mimetype === "text/csv" || originalname.toLowerCase().endsWith(".csv");

    const parsed = isCSV ? parseCSV(buffer) : parseXLSX(buffer);
    const { headers, rows, schema } = parsed;

    if (!rows.length) return res.status(400).json({ error: "File has no data rows" });

    const sessionId = randomUUID();
    const tableName = originalname
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-zA-Z0-9]/g, "_")
      .replace(/^_+|_+$/g, "")
      .toLowerCase() || "data";

    setSession(sessionId, { tableName, headers, schema, rows, history: [] });

    res.json({
      sessionId,
      tableName,
      headers,
      schema,
      rowCount: rows.length,
      preview: rows.slice(0, 10),
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
