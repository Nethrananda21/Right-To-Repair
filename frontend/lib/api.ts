const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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

export interface YouTubeResult {
  video_id: string;
  title: string;
  channel: string;
  duration: string;
  views: string;
  thumbnail: string;
  url: string;
}

export interface WebResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
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

export async function getVideoSummary(
  videoId: string
): Promise<{ title: string; description: string; summary: string }> {
  const response = await fetch(`${API_BASE}/api/repair/transcript`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ video_id: videoId }),
  });

  if (!response.ok) {
    throw new Error("Failed to get video summary");
  }

  return response.json();
}

export async function extractGuide(url: string): Promise<any> {
  const response = await fetch(`${API_BASE}/api/repair/extract`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    throw new Error("Failed to extract guide");
  }

  return response.json();
}
