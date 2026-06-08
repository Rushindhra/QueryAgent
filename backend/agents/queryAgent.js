/**
 * queryAgent.js
 * Agentic pipeline: NL -> Gemini Flash function calls -> SQL/MongoDB -> execute -> summarize
 */

const { executeSQL } = require("../utils/sqlExecutor");
const { executeMongo } = require("../utils/mongoExecutor");

require("dotenv").config({ path: require("path").resolve(__dirname, "..", "..", ".env") });
require("dotenv").config({ path: require("path").resolve(__dirname, "..", ".env") });

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_API_BASE =
  process.env.GEMINI_API_BASE || "https://generativelanguage.googleapis.com/v1beta";

const TOOLS = [
  {
    name: "generate_sql_query",
    description:
      "Generate a valid SQLite SQL SELECT query to answer the user's question about the data table.",
    parameters: {
      type: "OBJECT",
      properties: {
        sql: {
          type: "STRING",
          description:
            "The complete SQLite SQL query. Use only the exact table name and column names provided in the schema. Always use SELECT; never use DROP/DELETE/INSERT/UPDATE.",
        },
        explanation: {
          type: "STRING",
          description: "One sentence explaining what this query does.",
        },
      },
      required: ["sql", "explanation"],
    },
  },
  {
    name: "generate_mongo_query",
    description:
      "Generate a MongoDB-style query object to answer the user's question.",
    parameters: {
      type: "OBJECT",
      properties: {
        filter: {
          type: "OBJECT",
          description:
            "MongoDB filter object using $eq, $ne, $gt, $gte, $lt, $lte, $regex, and $in operators.",
        },
        sort: {
          type: "OBJECT",
          description: 'Sort object, for example {"salary": -1} for descending.',
        },
        projection: {
          type: "OBJECT",
          description: "Fields to include with 1 or exclude with 0.",
        },
        limit: {
          type: "NUMBER",
          description: "Max number of documents to return.",
        },
        explanation: {
          type: "STRING",
          description: "One sentence explaining what this query does.",
        },
      },
      required: ["filter", "explanation"],
    },
  },
  {
    name: "summarize_results",
    description:
      "After the query has been executed, produce a concise natural-language summary of the results for the user.",
    parameters: {
      type: "OBJECT",
      properties: {
        summary: {
          type: "STRING",
          description:
            "2-4 sentence summary of the query results, highlighting key findings.",
        },
        insight: {
          type: "STRING",
          description:
            "Optional analytical insight about the data, such as trends, outliers, or notable values.",
        },
      },
      required: ["summary"],
    },
  },
];

async function callGemini({ systemPrompt, contents }) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is required to run the query agent. Put it in backend/.env or the project root .env, then restart the backend server."
    );
  }

  const endpoint = `${GEMINI_API_BASE}/models/${encodeURIComponent(
    GEMINI_MODEL
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: { maxOutputTokens: 1500 },
      tools: [{ functionDeclarations: TOOLS }],
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data.error?.message || response.statusText || "Gemini request failed";
    throw new Error(`Gemini API error: ${message}`);
  }

  return data;
}

function getModelContent(response) {
  return response.candidates?.[0]?.content || { role: "model", parts: [] };
}

function getFunctionCalls(content) {
  return (content.parts || [])
    .map((part) => part.functionCall)
    .filter(Boolean);
}

function buildFunctionResponse(name, response) {
  return {
    role: "tool",
    parts: [
      {
        functionResponse: {
          name,
          response,
        },
      },
    ],
  };
}

/**
 * Main agentic entrypoint.
 * @param {string} naturalLanguage - user's English query
 * @param {string} tableName - name of the table
 * @param {string[]} headers - column names
 * @param {object} schema - { col: "number"|"text"|"date"|"boolean" }
 * @param {object[]} rows - actual data rows
 * @param {"sql"|"mongo"} mode - query mode
 * @returns {AgentResult}
 */
async function runQueryAgent({
  naturalLanguage,
  tableName,
  headers,
  schema,
  rows,
  mode = "sql",
}) {
  const schemaText = headers
    .map((h) => `  ${h} (${schema[h] || "text"})`)
    .join("\n");
  const sampleRows = JSON.stringify(rows.slice(0, 5), null, 2);

  const systemPrompt = `You are QueryAgent, an expert data analyst AI.
You have access to a dataset loaded into memory. Your job is to:
1. Understand the user's natural language question
2. Generate a precise ${mode === "sql" ? "SQLite SQL" : "MongoDB"} query using the appropriate function
3. After the query result is returned, summarize the findings using the summarize_results function

Dataset info:
- Table name: "${tableName}"
- Mode: ${mode}
- Columns and types:
${schemaText}
- Total rows: ${rows.length}
- Sample (first 5 rows):
${sampleRows}

Rules:
- ${mode === "sql" ? `Always use the exact table name "${tableName}" in FROM clause. Column names are case-sensitive. Use TEXT comparison for string columns. Use CAST(col AS REAL) for math on text-stored numbers.` : `Use proper MongoDB operator syntax ($eq, $gt, $regex etc). The collection is "${tableName}".`}
- Never hallucinate column names - only use those listed above.
- If the question is ambiguous, make a reasonable assumption and note it.
- Always call summarize_results after seeing query results.`;

  const contents = [
    {
      role: "user",
      parts: [
        {
          text: `Question: "${naturalLanguage}"\n\nPlease generate the appropriate ${mode} query to answer this question, then I'll give you the results to summarize.`,
        },
      ],
    },
  ];

  let generatedQuery = null;
  let explanation = "";
  let executionResult = null;
  let summary = "";
  let insight = "";
  const agentSteps = [];

  for (let turn = 0; turn < 6; turn++) {
    const response = await callGemini({ systemPrompt, contents });
    const modelContent = getModelContent(response);
    contents.push(modelContent);

    const functionCalls = getFunctionCalls(modelContent);
    if (!functionCalls.length) break;

    for (const functionCall of functionCalls) {
      const { name, args = {} } = functionCall;
      agentSteps.push({ tool: name, input: args });

      if (name === "generate_sql_query") {
        generatedQuery = args.sql;
        explanation = args.explanation || "";
        try {
          executionResult = executeSQL(tableName, headers, rows, generatedQuery);
          contents.push(
            buildFunctionResponse(name, {
              ok: true,
              message: "Query executed successfully.",
              rowsReturned: executionResult.rowsAffected,
              columns: executionResult.columns,
              preview: executionResult.rows.slice(0, 10),
            })
          );
        } catch (err) {
          contents.push(
            buildFunctionResponse(name, {
              ok: false,
              error: `Query failed: ${err.message}. Please fix the SQL and try again.`,
            })
          );
        }
      } else if (name === "generate_mongo_query") {
        const { explanation: exp, ...mongoQuery } = args;
        generatedQuery = JSON.stringify(mongoQuery, null, 2);
        explanation = exp || "";
        try {
          executionResult = executeMongo(rows, mongoQuery);
          contents.push(
            buildFunctionResponse(name, {
              ok: true,
              message: "Query executed successfully.",
              documentsReturned: executionResult.rowsAffected,
              fields: executionResult.columns,
              preview: executionResult.rows.slice(0, 10),
            })
          );
        } catch (err) {
          contents.push(
            buildFunctionResponse(name, {
              ok: false,
              error: `Query failed: ${err.message}`,
            })
          );
        }
      } else if (name === "summarize_results") {
        summary = args.summary || "";
        insight = args.insight || "";
        contents.push(
          buildFunctionResponse(name, {
            ok: true,
            message: "Summary recorded. Task complete.",
          })
        );
      }
    }

    if (executionResult && summary) break;
  }

  return {
    naturalLanguage,
    mode,
    generatedQuery,
    explanation,
    executionResult,
    summary,
    insight,
    agentSteps,
  };
}

module.exports = { runQueryAgent };
