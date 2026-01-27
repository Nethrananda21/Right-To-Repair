/**
 * React hooks for live video streaming
 */
import { useRef, useState, useCallback, useEffect } from 'react';
import { FrameMetrics, assessFrameQuality, isFrameGoodQuality } from './frameQuality';

interface VideoStreamOptions {
  onFrame?: (frame: string, metrics: FrameMetrics) => void;
  frameInterval?: number; // ms between frame captures
  minQuality?: number; // threshold 0-100
}

/**
 * Hook for accessing webcam and capturing frames
 */
export function useVideoStream(options: VideoStreamOptions = {}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const prevImageDataRef = useRef<ImageData | null>(null);
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [frameMetrics, setFrameMetrics] = useState<FrameMetrics | null>(null);
  
  const { onFrame, frameInterval = 3000, minQuality = 70 } = options;

  const startStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment', // Rear camera on mobile
          frameRate: { ideal: 15, max: 30 }
        },
        audio: false
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsStreaming(true);
        setError(null);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Camera access denied';
      setError(message);
      setIsStreaming(false);
    }
  }, []);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setIsStreaming(false);
    }
  }, []);

  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return null;
    
    // Set canvas to video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw current frame
    ctx.drawImage(video, 0, 0);
    
    // Return as base64 JPEG
    return canvas.toDataURL('image/jpeg', 0.85);
  }, []);

  const captureFrameWithQuality = useCallback((): {
    frame: string;
    metrics: FrameMetrics;
  } | null => {
    if (!videoRef.current || !canvasRef.current) return null;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return null;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    
    // Get image data for quality assessment
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const metrics = assessFrameQuality(imageData, prevImageDataRef.current);
    prevImageDataRef.current = imageData;
    
    // Return frame only if quality meets threshold
    if (isFrameGoodQuality(metrics, minQuality)) {
      return {
        frame: canvas.toDataURL('image/jpeg', 0.85),
        metrics
      };
    }
    
    return null;
  }, [minQuality]);

  // Auto-capture frames at interval
  useEffect(() => {
    if (!isStreaming || !onFrame) return;
    
    console.log('📷 Starting frame capture interval:', frameInterval, 'ms');
    
    const interval = setInterval(() => {
      const result = captureFrameWithQuality();
      if (result) {
        console.log('📷 Frame captured, quality:', result.metrics.score);
        setFrameMetrics(result.metrics);
        onFrame(result.frame, result.metrics);
      } else {
        // Fallback: capture anyway if quality check fails
        const fallbackFrame = captureFrame();
        if (fallbackFrame) {
          console.log('📷 Fallback frame captured');
          onFrame(fallbackFrame, { brightness: 0, contrast: 0, sharpness: 0, stability: 100, score: 50 });
        }
      }
    }, frameInterval);
    
    return () => clearInterval(interval);
  }, [isStreaming, onFrame, frameInterval, captureFrameWithQuality, captureFrame]);

  // Cleanup on unmount - ensure camera is stopped
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        console.log('📷 Cleanup: stopping camera stream');
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  return {
    videoRef,
    canvasRef,
    isStreaming,
    error,
    frameMetrics,
    startStream,
    stopStream,
    captureFrame,
    captureFrameWithQuality
  };
}

/**
 * Hook for WebSocket connection to vision backend
 */
interface VisionResult {
  type:
    | 'token'
    | 'complete'
    | 'error'
    | 'dropped'
    | 'low_confidence'
    | 'quality_warning'
    | 'processing_started';
  token?: string;
  partial?: string;
  result?: any;
  confidence?: number;
  message?: string;
  metrics?: any;
  timestamp?: number;
}

interface UseVisionWebSocketOptions {
  sessionId?: string;
  onResult?: (result: VisionResult) => void;
}

export function useVisionWebSocket(
  url: string,
  options: UseVisionWebSocketOptions = {}
) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentResult, setCurrentResult] = useState<VisionResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { sessionId, onResult } = options;

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(url);
      
      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
        console.log('📹 WebSocket connected');
      };
      
      ws.onclose = () => {
        setIsConnected(false);
        setIsProcessing(false);
      };
      
      ws.onerror = (event) => {
        const message = 'WebSocket error';
        setError(message);
        console.error(message, event);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as VisionResult;
          
          if (data.type === 'processing_started') {
            setIsProcessing(true);
          } else if (data.type === 'token' || data.type === 'partial') {
            setCurrentResult(data);
          } else if (data.type === 'complete') {
            setCurrentResult(data);
            setIsProcessing(false);
          } else if (data.type === 'error' || data.type === 'dropped') {
            setCurrentResult(data);
            setIsProcessing(false);
          } else if (data.type === 'low_confidence' || data.type === 'quality_warning') {
            setCurrentResult(data);
          }
          
          onResult?.(data);
        } catch (e) {
          console.error('Message parse error:', e);
        }
      };
      
      wsRef.current = ws;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Connection failed';
      setError(message);
    }
  }, [url, onResult]);

  const disconnect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }
    wsRef.current = null;
    setIsConnected(false);
    setIsProcessing(false);
  }, []);

  const sendFrame = useCallback(
    (base64Frame: string) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        // Remove data:image/jpeg;base64, prefix
        const frameData = base64Frame.includes(',')
          ? base64Frame.split(',')[1]
          : base64Frame;
        
        console.log('📤 Sending frame to WebSocket, size:', Math.round(frameData.length / 1024), 'KB');
        
        wsRef.current.send(
          JSON.stringify({
            type: 'frame',
            data: frameData,
            session_id: sessionId
          })
        );
      } else {
        console.log('⚠️ WebSocket not open, cannot send frame. State:', wsRef.current?.readyState);
      }
    },
    [sessionId]
  );

  const sendPing = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'ping' }));
    }
  }, []);

  // Keep-alive ping every 30 seconds
  useEffect(() => {
    if (!isConnected) return;
    
    const interval = setInterval(sendPing, 30000);
    return () => clearInterval(interval);
  }, [isConnected, sendPing]);

  return {
    connect,
    disconnect,
    sendFrame,
    isConnected,
    currentResult,
    isProcessing,
    error
  };
}
