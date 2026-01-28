const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ============== Types ==============

export interface Session {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: number;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  images_count: number;
  image_data?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface DetectionData {
  object: string;
  brand?: string;
  model?: string;
  condition: string;
  issues: string[];
  description: string;
}

export interface YouTubeResult {
  video_id: string;
  title: string;
  channel: string;
  duration: string;
  views: string;
  thumbnail: string;
  url: string;
  transcript?: string;
  relevance?: number;
}

export interface WebResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  relevance?: number;
}

export interface RedditResult {
  title: string;
  url: string;
  content: string;
  subreddit: string;
  score: number;
  num_comments: number;
  author?: string;
  created_utc?: number;
  relevance?: number;
}

export interface ChatResponse {
  session_id: string;
  message: string;
  response_type: "text" | "detection" | "repair_results" | "clarification";
  data?: {
    object?: string;
    brand?: string;
    model?: string;
    condition?: string;
    issues?: string[];
    description?: string;
    youtube?: YouTubeResult[];
    web?: WebResult[];
    reddit?: RedditResult[];
    search_time_ms?: number;
  };
  cards?: Array<{
    type: string;
    data: unknown;
  }>;
}

// ============== Session API ==============

export async function getSessions(): Promise<Session[]> {
  const response = await fetch(`${API_BASE}/api/chat/sessions`);
  if (!response.ok) throw new Error("Failed to fetch sessions");
  const data = await response.json();
  return data.sessions || [];
}

export async function createSession(): Promise<Session> {
  const response = await fetch(`${API_BASE}/api/chat/sessions`, {
    method: "POST",
  });
  if (!response.ok) throw new Error("Failed to create session");
  return response.json();
}

export async function getSessionDetails(sessionId: string): Promise<{
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: Message[];
  detected_item?: DetectionData;
}> {
  const response = await fetch(`${API_BASE}/api/chat/sessions/${sessionId}`);
  if (!response.ok) throw new Error("Failed to fetch session");
  return response.json();
}

export async function deleteSession(sessionId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/chat/sessions/${sessionId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete session");
}

// Update detected item with user corrections
export async function updateDetectedItem(
  sessionId: string,
  data: DetectionData
): Promise<void> {
  const response = await fetch(`${API_BASE}/api/chat/sessions/${sessionId}/detected-item`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to update detected item");
}

// Save a message to a session (for live video detection)
export async function saveMessage(
  sessionId: string,
  role: "user" | "assistant",
  content: string,
  metadata?: { response_type?: string; data?: unknown }
): Promise<void> {
  const response = await fetch(`${API_BASE}/api/chat/sessions/${sessionId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ role, content, metadata }),
  });
  if (!response.ok) throw new Error("Failed to save message");
}

// ============== Chat API ==============

export async function sendMessage(
  message: string,
  sessionId?: string,
  image?: File
): Promise<ChatResponse> {
  const formData = new FormData();
  formData.append("message", message);
  
  if (sessionId) {
    formData.append("session_id", sessionId);
  }
  
  if (image) {
    formData.append("image", image);
  }

  const response = await fetch(`${API_BASE}/api/chat/message`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || "Failed to send message");
  }

  return response.json();
}

// ============== Legacy API (for backward compatibility) ==============

export interface DetectionResult {
  object: string;
  brand: string;
  model: string;
  serial_number: string;
  manufacturer: string;
  condition: string;
  issues: string[];
  description: string;
  other_codes: string[];
  confidence_note: string;
}

export interface RepairSearchResponse {
  youtube: YouTubeResult[];
  web: WebResult[];
  ifixit: WebResult[];
  parts: WebResult[];
  query_used: string;
}

export async function detectFull(
  itemImage: File,
  serialImage?: File | null
): Promise<DetectionResult> {
  const formData = new FormData();
  formData.append("item_image", itemImage);
  
  if (serialImage) {
    formData.append("serial_image", serialImage);
  }

  const response = await fetch(`${API_BASE}/api/detect/full`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Detection failed");
  }

  return response.json();
}

export async function searchRepairs(
  detection: DetectionResult
): Promise<RepairSearchResponse> {
  const response = await fetch(`${API_BASE}/api/repair/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      object: detection.object,
      brand: detection.brand,
      model: detection.model,
      issues: detection.issues,
    }),
  });

  if (!response.ok) {
    throw new Error("Repair search failed");
  }

  return response.json();
}
