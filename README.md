# QueryAgent 🔍

**Natural Language → SQL / MongoDB Query Engine**

Type a plain English question, and the AI agent generates and executes the correct query against your uploaded CSV or XLSX file — instantly.

---

## Features

- **Upload CSV or XLSX** — auto-detects schema, column types, and previews data
- **Natural Language queries** — powered by Gemini Flash (agentic function-calling loop)
- **Two query modes** — SQLite SQL and MongoDB-style filters
- **Agentic pipeline** — Gemini plans, generates a query, executes it, and summarizes results
- **Query history** — all past queries saved per session with re-run support
- **Schema explorer** — visualize column types and sample values

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND (React + Vite)           PORT 3000                │
│  UploadPanel → QueryPanel → ResultsTable → SchemaPanel      │
└────────────────────────┬────────────────────────────────────┘
                         │  HTTP / REST
┌────────────────────────▼────────────────────────────────────┐
│  BACKEND (Express.js)              PORT 4000                │
│                                                             │
│  POST /api/upload   → parse CSV/XLSX, store in session      │
│  POST /api/query    → run AI agent → execute → return       │
│  GET  /api/schema/:id → return schema info                  │
│  GET  /api/history/:id → return query history               │
└────────────────────────┬────────────────────────────────────┘
                         │  Gemini API
┌────────────────────────▼────────────────────────────────────┐
│  QUERY AGENT (agents/queryAgent.js)                         │
│                                                             │
│  Step 1 PLAN     Gemini reads schema + sample rows          │
│  Step 2 GENERATE Gemini calls generate_sql_query function   │
│  Step 3 EXECUTE  Backend runs query on in-memory data       │
│  Step 4 RESULT   Function result sent back to Gemini        │
│  Step 5 SUMMARIZE Gemini calls summarize_results function   │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### 1. Clone and install

```bash
git clone <your-repo>
cd queryagent
npm run install:all
```

### 2. Set up API key

```bash
cd backend
cp .env.example .env
# Edit .env and set GEMINI_API_KEY=your_gemini_api_key_here
```

Get your API key at: https://aistudio.google.com/app/apikey

### 3. Run (two terminals)

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
# → http://localhost:4000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# → http://localhost:3000
```

Open http://localhost:3000 in your browser.

---

## Project Structure

```
queryagent/
├── backend/
│   ├── server.js              # Express entry point
│   ├── .env.example           # Environment variables template
│   ├── package.json
│   ├── agents/
│   │   └── queryAgent.js      # Core AI agentic loop (Gemini function calling)
│   ├── routes/
│   │   ├── upload.js          # POST /api/upload
│   │   ├── query.js           # POST /api/query
│   │   ├── schema.js          # GET  /api/schema/:id
│   │   └── history.js         # GET  /api/history/:id
│   └── utils/
│       ├── fileParser.js      # CSV + XLSX parsing
│       ├── sqlExecutor.js     # In-memory SQLite execution
│       ├── mongoExecutor.js   # In-memory MongoDB-style execution
│       └── sessionStore.js    # In-memory session management
│
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── main.jsx           # React entry point
        ├── App.jsx            # Root layout + tabs
        ├── api.js             # Axios API client
        ├── index.css          # Global styles
        ├── UploadPanel.jsx    # File upload with drag & drop
        ├── QueryPanel.jsx     # NL input + results display
        ├── ResultsTable.jsx   # Paginated data table
        ├── SchemaPanel.jsx    # Column type explorer
        └── HistoryPanel.jsx   # Past queries list
```

---

## Example Queries

| English | Generated SQL |
|---|---|
| Show employee with ID 401 | `SELECT * FROM employees WHERE id = '401'` |
| Average salary by department | `SELECT department, AVG(CAST(salary AS REAL)) FROM employees GROUP BY department` |
| Top 10 highest paid | `SELECT * FROM employees ORDER BY CAST(salary AS REAL) DESC LIMIT 10` |
| Count rows where age > 30 | `SELECT COUNT(*) FROM employees WHERE CAST(age AS REAL) > 30` |

---

## API Reference

### `POST /api/upload`
Upload a CSV or XLSX file.
- Body: `multipart/form-data` with field `file`
- Returns: `{ sessionId, tableName, headers, schema, rowCount, preview }`

### `POST /api/query`
Run a natural language query.
- Body: `{ sessionId, naturalLanguage, mode: "sql" | "mongo" }`
- Returns: `{ generatedQuery, explanation, columns, rows, rowCount, summary, insight, agentSteps }`

### `GET /api/schema/:sessionId`
Get schema info for a session.

### `GET /api/history/:sessionId`
Get query history for a session.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `GEMINI_API_KEY` | — | **Required.** Your Gemini API key |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Gemini model used by the query agent |
| `PORT` | `4000` | Backend server port |
| `MAX_FILE_SIZE_MB` | `20` | Max upload size in MB |
| `NODE_ENV` | `development` | Environment |

---

## Tech Stack

| Layer | Technology |
|---|---|
| AI Agent | Gemini Flash function calling |
| Backend | Node.js, Express.js |
| SQL Engine | better-sqlite3 (in-memory) |
| MongoDB Engine | Custom JS filter/sort/project executor |
| File Parsing | papaparse (CSV), xlsx (XLSX) |
| Frontend | React 18, Vite |
| HTTP Client | Axios |
| Notifications | react-hot-toast |

---

## Production Deployment

For production, consider:
1. **Session storage** — swap `sessionStore.js` for Redis or PostgreSQL
2. **File storage** — store uploaded files on S3 instead of memory
3. **Auth** — add user authentication (JWT/session)
4. **Rate limiting** — add express-rate-limit on `/api/query`
5. **HTTPS** — deploy behind nginx with SSL

---


