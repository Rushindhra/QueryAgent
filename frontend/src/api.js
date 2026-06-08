import axios from "axios";

const api = axios.create({ baseURL: "/api" });

export async function uploadFile(file) {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post("/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function runQuery({ sessionId, naturalLanguage, mode }) {
  const { data } = await api.post("/query", { sessionId, naturalLanguage, mode });
  return data;
}

export async function fetchSchema(sessionId) {
  const { data } = await api.get(`/schema/${sessionId}`);
  return data;
}

export async function fetchHistory(sessionId) {
  const { data } = await api.get(`/history/${sessionId}`);
  return data;
}

export async function healthCheck() {
  const { data } = await api.get("/health");
  return data;
}
