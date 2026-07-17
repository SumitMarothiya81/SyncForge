const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

async function request(path: string, options: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error?.message || data.error || `Request failed: ${res.status}`);
  }
  return data;
}

export const api = {
  signup: (name: string, email: string, password: string) =>
    request("/api/auth/signup", { method: "POST", body: JSON.stringify({ name, email, password }) }),
  login: (email: string, password: string) =>
    request("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  me: () => request("/api/auth/me"),

  listWorkspaces: () => request("/api/workspaces"),

  listDocuments: (workspaceId: string) => request(`/api/documents?workspaceId=${workspaceId}`),
  createDocument: (workspaceId: string, title?: string) =>
    request("/api/documents", { method: "POST", body: JSON.stringify({ workspaceId, title }) }),
  getDocument: (id: string) => request(`/api/documents/${id}`),
  updateDocument: (id: string, data: { title?: string; content?: string }) =>
    request(`/api/documents/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  indexDocument: (documentId: string) =>
    request(`/api/ai/index/${documentId}`, { method: "POST" }),

  streamChat: async (
    documentId: string,
    question: string,
    onToken: (token: string) => void
  ) => {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_BASE}/api/ai/chat/${documentId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ question }),
    });

    if (!res.ok || !res.body) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Chat request failed: ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      onToken(decoder.decode(value, { stream: true }));
    }
  },

getActionItems: (documentId: string) =>
    request(`/api/ai/action-items/${documentId}`, { method: "POST" }),

  generateDiagram: (documentId: string, instruction?: string) =>
    request(`/api/ai/diagram/${documentId}`, {
      method: "POST",
      body: JSON.stringify({ instruction }),
    }),

};
 
export function saveToken(token: string) {
  localStorage.setItem("token", token);
}