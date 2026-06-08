const express = require("express");
const { getSession } = require("../utils/sessionStore");
const router = express.Router();

/**
 * GET /api/schema/:sessionId
 */
router.get("/:sessionId", (req, res) => {
  const session = getSession(req.params.sessionId);
  if (!session) return res.status(404).json({ error: "Session not found" });
  res.json({
    tableName: session.tableName,
    headers: session.headers,
    schema: session.schema,
    rowCount: session.rows.length,
  });
});

module.exports = router;
