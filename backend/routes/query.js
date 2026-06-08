const express = require("express");
const { getSession, appendHistory } = require("../utils/sessionStore");
const { runQueryAgent } = require("../agents/queryAgent");

const router = express.Router();

/**
 * POST /api/query
 * Body: { sessionId, naturalLanguage, mode: "sql"|"mongo" }
 * Returns: { generatedQuery, explanation, columns, rows, rowCount, summary, insight, agentSteps }
 */
router.post("/", async (req, res) => {
  const { sessionId, naturalLanguage, mode = "sql" } = req.body;

  if (!sessionId) return res.status(400).json({ error: "sessionId is required" });
  if (!naturalLanguage?.trim()) return res.status(400).json({ error: "naturalLanguage is required" });

  const session = getSession(sessionId);
  if (!session) return res.status(404).json({ error: "Session not found. Please upload a file first." });

  const { tableName, headers, schema, rows } = session;

  try {
    const result = await runQueryAgent({
      naturalLanguage: naturalLanguage.trim(),
      tableName,
      headers,
      schema,
      rows,
      mode,
    });

    const { generatedQuery, explanation, executionResult, summary, insight, agentSteps } = result;

    if (!executionResult) {
      return res.status(500).json({ error: "Agent failed to produce a query result" });
    }

    const responsePayload = {
      generatedQuery,
      explanation,
      columns: executionResult.columns,
      rows: executionResult.rows.slice(0, 500), // cap at 500 rows for API response
      rowCount: executionResult.rowsAffected,
      summary,
      insight,
      agentSteps,
      mode,
    };

    // Save to history
    appendHistory(sessionId, {
      naturalLanguage: naturalLanguage.trim(),
      generatedQuery,
      explanation,
      rowCount: executionResult.rowsAffected,
      mode,
      summary,
    });

    res.json(responsePayload);
  } catch (err) {
    console.error("Query agent error:", err);
    res.status(500).json({ error: err.message || "Query failed" });
  }
});

module.exports = router;
