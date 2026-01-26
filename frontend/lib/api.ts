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

export async function detectObject(image: File) {
  const formData = new FormData();
  formData.append("image", image);

  const response = await fetch(`${API_BASE}/api/detect/object`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Object detection failed");
  }

  return response.json();
}

export async function extractSerial(image: File) {
  const formData = new FormData();
  formData.append("image", image);

  const response = await fetch(`${API_BASE}/api/detect/serial`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Serial extraction failed");
  }

  return response.json();
}
