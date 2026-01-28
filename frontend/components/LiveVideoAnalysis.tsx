'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useVideoStream, useVisionWebSocket } from '@/lib/useVideoHooks';
import { getQualityFeedback, FrameMetrics } from '@/lib/frameQuality';

interface LiveVideoAnalysisProps {
  sessionId?: string;
  onDetectionComplete?: (result: any) => void;
}

export default function LiveVideoAnalysis({
  sessionId,
  onDetectionComplete
}: LiveVideoAnalysisProps) {
  const [mode, setMode] = useState<'setup' | 'streaming' | 'result'>('setup');
  const [detectionResult, setDetectionResult] = useState<any>(null);

  const {
    isConnected,
    currentResult,
    isProcessing,
    connect: connectWs,
    disconnect: disconnectWs,
    sendFrame
  } = useVisionWebSocket(
    'ws://localhost:8000/ws/vision',
    {
      sessionId,
      onResult: (result) => {
        console.log('🎯 onResult callback received:', result.type, result);
        if (result.type === 'complete') {
          console.log('✅ Detection complete! Setting result and mode...');
          console.log('📦 Result data:', result.result);
          setDetectionResult(result.result);
          setMode('result');
          // Camera will be stopped in the effect below when mode changes to 'result'
        } else if (result.type === 'low_confidence') {
          console.log('⚠️ Low confidence detection:', result.confidence);
        } else if (result.type === 'error') {
          console.log('❌ Detection error:', result.message);
        }
      }
    }
  );

  // Use refs to avoid stale closure issues
  const isConnectedRef = useRef(isConnected);
  const isProcessingRef = useRef(isProcessing);
  const sendFrameRef = useRef(sendFrame);
  
  // Keep refs updated
  useEffect(() => {
    isConnectedRef.current = isConnected;
  }, [isConnected]);
  
  useEffect(() => {
    isProcessingRef.current = isProcessing;
  }, [isProcessing]);
  
  useEffect(() => {
    sendFrameRef.current = sendFrame;
  }, [sendFrame]);

  const handleFrame = useCallback(
    (frame: string, metrics: FrameMetrics) => {
      console.log('🎥 handleFrame called, isConnected:', isConnectedRef.current, 'isProcessing:', isProcessingRef.current);
      if (isConnectedRef.current && !isProcessingRef.current) {
        console.log('📤 Sending frame...');
        sendFrameRef.current(frame);
      } else {
        console.log('⏭️ Skipping frame - connected:', isConnectedRef.current, 'processing:', isProcessingRef.current);
      }
    },
    [] // No dependencies - uses refs
  );
  const {
    videoRef,
    canvasRef,
    isStreaming,
    error: cameraError,
    frameMetrics,
    startStream,
    stopStream
  } = useVideoStream({
    onFrame: handleFrame,
    frameInterval: 3000,
    minQuality: 40  // Lower threshold to allow more frames through
  });

  // Stop camera and websocket when detection completes
  useEffect(() => {
    if (mode === 'result') {
      stopStream();
      disconnectWs();
    }
  }, [mode, stopStream, disconnectWs]);
  
  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      stopStream();
      disconnectWs();
    };
  }, [stopStream, disconnectWs]);

  const handleStart = useCallback(() => {
    startStream();
    connectWs();
    setMode('streaming');
  }, [startStream, connectWs]);

  const handleStop = useCallback(() => {
    stopStream();
    disconnectWs();
    setMode('setup');
  }, [stopStream, disconnectWs]);

  const handleRetry = useCallback(() => {
    setDetectionResult(null);
    startStream();
    connectWs();
    setMode('streaming');
  }, [startStream, connectWs]);

  // Call onDetectionComplete when result is ready (after camera stopped)
  useEffect(() => {
    console.log('📍 Detection effect check - mode:', mode, 'hasResult:', !!detectionResult);
    if (mode === 'result' && detectionResult) {
      console.log('🚀 Calling onDetectionComplete with:', detectionResult);
      onDetectionComplete?.(detectionResult);
    }
  }, [mode, detectionResult, onDetectionComplete]);

  // Setup phase
  if (mode === 'setup') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-[var(--warm-beige)] to-[var(--soft-sage)]">
        <div className="max-w-md w-full mx-4">
          <div className="backdrop-blur-xl bg-white/60 border border-[var(--delicate-gold)] rounded-3xl p-8 shadow-lg">
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-[var(--terracotta)] to-orange-400 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-4xl text-white">
                  videocam
                </span>
              </div>
              <h2 className="text-2xl font-serif font-semibold text-[var(--earth-dark)] mb-2">
                Live Analysis
              </h2>
              <p className="text-sm text-[var(--earth-muted)]">
                Point your camera at the item for instant damage detection
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={handleStart}
                disabled={cameraError !== null}
                className="w-full px-6 py-3 bg-[var(--terracotta)] hover:bg-[var(--terracotta)]/90 disabled:bg-gray-400 text-white font-semibold rounded-full transition-all duration-300 shadow-md"
              >
                <span className="flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined">play_circle</span>
                  Start Live Analysis
                </span>
              </button>

              {cameraError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <span className="material-symbols-outlined text-sm align-middle mr-2">
                    error
                  </span>
                  Camera access denied: {cameraError}
                </div>
              )}

              <p className="text-xs text-[var(--earth-muted)] text-center">
                📱 Works on phones, tablets, and computers with a webcam
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Streaming phase
  if (mode === 'streaming') {
    const qualityFeedback = frameMetrics ? getQualityFeedback(frameMetrics) : '';
    const qualityColor =
      frameMetrics && frameMetrics.score >= 70
        ? 'text-green-600'
        : frameMetrics && frameMetrics.score >= 50
          ? 'text-amber-600'
          : 'text-red-600';

    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-[var(--warm-beige)] to-[var(--soft-sage)]">
        <div className="max-w-2xl w-full mx-4">
          <div className="backdrop-blur-xl bg-white/60 border border-[var(--delicate-gold)] rounded-3xl overflow-hidden shadow-lg">
            {/* Video Feed */}
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full aspect-video object-cover bg-black"
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Quality Indicator Overlay */}
              <div className="absolute inset-0 flex flex-col justify-between p-4 pointer-events-none">
                {/* Top - Status */}
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2 bg-black/50 backdrop-blur px-3 py-2 rounded-full">
                    <div className="w-3 h-3 bg-cyan-400 rounded-full animate-pulse" />
                    <span className="text-xs text-white font-medium">
                      {isConnected ? 'Connected' : 'Connecting...'}
                    </span>
                  </div>

                  {isProcessing && (
                    <div className="flex items-center gap-2 bg-black/50 backdrop-blur px-3 py-2 rounded-full">
                      <span className="animate-spin material-symbols-outlined text-sm text-cyan-400">
                        sync
                      </span>
                      <span className="text-xs text-white font-medium">
                        Analyzing...
                      </span>
                    </div>
                  )}
                </div>

                {/* Bottom - Quality Feedback */}
                <div className="flex flex-col gap-2">
                  {frameMetrics && (
                    <div className="bg-black/50 backdrop-blur rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-medium ${qualityColor}`}>
                          {qualityFeedback}
                        </span>
                        <span className={`text-sm font-bold ${qualityColor}`}>
                          {frameMetrics.score}%
                        </span>
                      </div>

                      {/* Quality bars */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-gray-300">Brightness</span>
                            <span className="text-gray-400">
                              {frameMetrics.brightness}
                            </span>
                          </div>
                          <div className="bg-gray-700 rounded-full h-1 overflow-hidden">
                            <div
                              className="bg-amber-400 h-full"
                              style={{
                                width: `${Math.min(
                                  100,
                                  (frameMetrics.brightness / 255) * 100
                                )}%`
                              }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-gray-300">Sharpness</span>
                            <span className="text-gray-400">
                              {frameMetrics.sharpness}
                            </span>
                          </div>
                          <div className="bg-gray-700 rounded-full h-1 overflow-hidden">
                            <div
                              className="bg-cyan-400 h-full"
                              style={{
                                width: `${Math.min(
                                  100,
                                  (frameMetrics.sharpness / 255) * 100
                                )}%`
                              }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-gray-300">Stability</span>
                            <span className="text-gray-400">
                              {frameMetrics.stability}%
                            </span>
                          </div>
                          <div className="bg-gray-700 rounded-full h-1 overflow-hidden">
                            <div
                              className="bg-green-400 h-full"
                              style={{ width: `${frameMetrics.stability}%` }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-gray-300">Contrast</span>
                            <span className="text-gray-400">
                              {frameMetrics.contrast}
                            </span>
                          </div>
                          <div className="bg-gray-700 rounded-full h-1 overflow-hidden">
                            <div
                              className="bg-purple-400 h-full"
                              style={{
                                width: `${Math.min(
                                  100,
                                  (frameMetrics.contrast / 128) * 100
                                )}%`
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Analysis result preview */}
                  {currentResult?.partial && (
                    <div className="bg-black/50 backdrop-blur rounded-lg p-3">
                      <p className="text-xs text-cyan-300">
                        {currentResult.partial}
                        <span className="animate-pulse">▊</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Capture flash effect */}
              {isProcessing && (
                <div className="absolute inset-0 border-4 border-cyan-400 animate-pulse rounded-xl" />
              )}
            </div>

            {/* Controls */}
            <div className="p-6 border-t border-[var(--delicate-gold)]/20">
              <button
                onClick={handleStop}
                className="w-full px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-full transition-all duration-300 shadow-md"
              >
                <span className="flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined">stop_circle</span>
                  Stop Streaming
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Result phase
  if (mode === 'result' && detectionResult) {
    const confidence = detectionResult.confidence || 0;

    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-[var(--warm-beige)] to-[var(--soft-sage)]">
        <div className="max-w-2xl w-full mx-4">
          <div className="backdrop-blur-xl bg-white/60 border border-[var(--delicate-gold)] rounded-3xl overflow-hidden shadow-lg p-8">
            {/* Result header */}
            <div className="text-center mb-6">
              <div
                className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                  confidence >= 70
                    ? 'bg-green-100'
                    : 'bg-amber-100'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-4xl ${
                    confidence >= 70 ? 'text-green-600' : 'text-amber-600'
                  }`}
                >
                  {confidence >= 70 ? 'check_circle' : 'info'}
                </span>
              </div>

              <h2 className="text-2xl font-serif font-semibold text-[var(--earth-dark)] mb-2">
                Analysis Complete
              </h2>
              <p className="text-sm text-[var(--earth-muted)]">
                Confidence: {Math.round(confidence * 100)}%
              </p>
            </div>

            {/* Detection results */}
            <div className="space-y-4 mb-6">
              <div className="p-4 bg-[var(--soft-sage)]/30 rounded-lg">
                <p className="text-xs text-[var(--earth-muted)] mb-1">Item</p>
                <p className="text-lg font-semibold text-[var(--earth-dark)]">
                  {detectionResult.brand && `${detectionResult.brand} `}
                  {detectionResult.object}
                </p>
              </div>

              <div className="p-4 bg-[var(--soft-sage)]/30 rounded-lg">
                <p className="text-xs text-[var(--earth-muted)] mb-1">Condition</p>
                <p className="text-lg font-semibold text-[var(--terracotta)] capitalize">
                  {detectionResult.condition}
                </p>
              </div>

              {detectionResult.issues && detectionResult.issues.length > 0 && (
                <div className="p-4 bg-[var(--soft-sage)]/30 rounded-lg">
                  <p className="text-xs text-[var(--earth-muted)] mb-2">Issues</p>
                  <ul className="space-y-1">
                    {detectionResult.issues.map((issue: string, idx: number) => (
                      <li key={idx} className="text-sm text-[var(--earth-dark)]">
                        • {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-3">
              {/* Primary action - Continue to edit/confirm and search */}
              <button
                onClick={() => onDetectionComplete?.(detectionResult)}
                className="w-full px-6 py-3 bg-[var(--terracotta)] hover:bg-[var(--terracotta)]/90 text-white font-semibold rounded-full transition-all duration-300 shadow-md"
              >
                <span className="flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-lg">
                    edit_note
                  </span>
                  Continue to Edit & Find Repairs
                </span>
              </button>
              
              {/* Secondary actions */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleRetry}
                  className="px-4 py-2 bg-[var(--soft-sage)] hover:bg-[var(--soft-sage)]/80 text-[var(--earth-dark)] font-medium rounded-full transition-all"
                >
                  <span className="flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-lg">
                      restart_alt
                    </span>
                    Retry
                  </span>
                </button>

                <button
                  onClick={() => setMode('setup')}
                  className="px-4 py-2 bg-[var(--delicate-gold)]/30 hover:bg-[var(--delicate-gold)]/50 text-[var(--earth-dark)] font-medium rounded-full transition-all"
                >
                  <span className="flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-lg">close</span>
                    Cancel
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
