/**
 * Frame quality assessment utilities for client-side filtering
 * Uses lightweight algorithms suitable for real-time processing
 */

export interface FrameMetrics {
  brightness: number;
  contrast: number;
  sharpness: number;
  stability: number;
  score: number; // 0-100
}

/**
 * Approximate image sharpness using gradient magnitude
 * Faster than Laplacian on client-side
 */
export function estimateSharpness(imageData: ImageData): number {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  
  let totalGradient = 0;
  let count = 0;
  
  // Sample every 4th pixel for speed
  for (let i = 0; i < height - 4; i += 4) {
    for (let j = 0; j < width - 4; j += 4) {
      const idx = (i * width + j) * 4;
      const idxRight = (i * width + j + 1) * 4;
      const idxDown = ((i + 1) * width + j) * 4;
      
      // Simple gradient: difference between neighbors
      const gradX = Math.abs(data[idx] - data[idxRight]);
      const gradY = Math.abs(data[idx] - data[idxDown]);
      totalGradient += Math.sqrt(gradX * gradX + gradY * gradY);
      count++;
    }
  }
  
  // Normalize to 0-255 scale
  return Math.min(255, (totalGradient / count) * 2);
}

/**
 * Calculate average brightness
 */
export function estimateBrightness(imageData: ImageData): number {
  const data = imageData.data;
  let sum = 0;
  
  // Sample every 4th pixel for speed
  for (let i = 0; i < data.length; i += 16) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Luminosity formula
    sum += 0.299 * r + 0.587 * g + 0.114 * b;
  }
  
  return sum / (data.length / 16);
}

/**
 * Calculate contrast (standard deviation of brightness)
 */
export function estimateContrast(imageData: ImageData): number {
  const data = imageData.data;
  const pixels: number[] = [];
  
  // Sample pixels
  for (let i = 0; i < data.length; i += 16) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
    pixels.push(brightness);
  }
  
  const mean = pixels.reduce((a, b) => a + b) / pixels.length;
  const variance =
    pixels.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / pixels.length;
  
  return Math.sqrt(variance);
}

/**
 * Detect motion/stability between frames
 */
export function estimateStability(
  prevImageData: ImageData | null,
  currImageData: ImageData
): number {
  if (!prevImageData) return 100; // First frame, assume stable
  
  const prev = prevImageData.data;
  const curr = currImageData.data;
  
  let totalDiff = 0;
  let count = 0;
  
  // Sample every 4th pixel
  for (let i = 0; i < prev.length; i += 16) {
    const diff = Math.abs(prev[i] - curr[i]);
    totalDiff += diff;
    count++;
  }
  
  const avgDiff = totalDiff / count;
  
  // Convert to stability score (0-100)
  // High diff = unstable, low diff = stable
  // avgDiff > 30 = very unstable, avgDiff < 5 = very stable
  return Math.max(0, 100 - (avgDiff / 30) * 100);
}

/**
 * Comprehensive frame quality assessment
 */
export function assessFrameQuality(
  imageData: ImageData,
  prevImageData: ImageData | null = null
): FrameMetrics {
  const brightness = estimateBrightness(imageData);
  const contrast = estimateContrast(imageData);
  const sharpness = estimateSharpness(imageData);
  const stability = estimateStability(prevImageData, imageData);
  
  // Quality scoring
  let score = 100;
  
  // Brightness check: optimal 50-200
  if (brightness < 30 || brightness > 240) {
    score -= 30;
  } else if (brightness < 50 || brightness > 200) {
    score -= 15;
  }
  
  // Contrast check: should have some contrast
  if (contrast < 20) {
    score -= 20;
  } else if (contrast < 40) {
    score -= 10;
  }
  
  // Sharpness check: should be reasonably sharp
  if (sharpness < 30) {
    score -= 40;
  } else if (sharpness < 60) {
    score -= 20;
  }
  
  // Stability check: camera should be still
  if (stability < 50) {
    score -= 20;
  } else if (stability < 75) {
    score -= 10;
  }
  
  return {
    brightness: Math.round(brightness),
    contrast: Math.round(contrast),
    sharpness: Math.round(sharpness),
    stability: Math.round(stability),
    score: Math.max(0, Math.round(score))
  };
}

/**
 * Check if frame meets quality threshold
 */
export function isFrameGoodQuality(metrics: FrameMetrics, threshold = 70): boolean {
  return metrics.score >= threshold;
}

/**
 * Get human-readable quality feedback
 */
export function getQualityFeedback(metrics: FrameMetrics): string {
  const { brightness, sharpness, stability } = metrics;
  
  if (brightness < 30) return "Too dark - add more light";
  if (brightness > 240) return "Too bright - reduce light";
  if (sharpness < 30) return "Too blurry - focus camera";
  if (stability < 50) return "Camera moving - hold steady";
  if (metrics.score >= 80) return "Perfect! ✓";
  if (metrics.score >= 70) return "Good quality";
  
  return "Adjust camera position and lighting";
}
