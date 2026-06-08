const express = require("express");
const { getHistory } = require("../utils/sessionStore");
const router = express.Router();

/**
 * GET /api/history/:sessionId
 */
router.get("/:sessionId", (req, res) => {
  const history = getHistory(req.params.sessionId);
  res.json({ history });
});

module.exports = router;
