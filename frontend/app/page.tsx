"use client";

import { useState } from "react";
import ImageUpload from "@/components/ImageUpload";
import DetectionResults from "@/components/DetectionResults";
import { detectFull, DetectionResult } from "@/lib/api";

export default function Home() {
  const [itemImage, setItemImage] = useState<File | null>(null);
  const [serialImage, setSerialImage] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [confirmedResult, setConfirmedResult] = useState<DetectionResult | null>(null);

  const handleDetect = async () => {
    if (!itemImage) {
      setError("Please upload an image of the item");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    setIsConfirmed(false);
    setConfirmedResult(null);

    try {
      const detectionResult = await detectFull(itemImage, serialImage);
      setResult(detectionResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Detection failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = (editedResult: DetectionResult) => {
    setConfirmedResult(editedResult);
    setIsConfirmed(true);
    // TODO: Trigger repair search with confirmedResult
    console.log("Confirmed result:", editedResult);
  };

  const handleEdit = () => {
    // This is now handled internally by DetectionResults component
  };

  const handleReset = () => {
    setItemImage(null);
    setSerialImage(null);
    setResult(null);
    setError(null);
    setIsConfirmed(false);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <header className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-xl flex items-center justify-center">
              <svg
                className="w-7 h-7 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white">Right to Repair</h1>
          </div>
          <p className="text-gray-400 max-w-xl mx-auto">
            Upload images of your broken item and we&apos;ll identify it, detect issues,
            and help you find repair solutions.
          </p>
        </header>

        {/* Main Content */}
        {!result ? (
          <div className="space-y-8">
            {/* Upload Section */}
            <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-cyan-500 text-white text-sm flex items-center justify-center">
                  1
                </span>
                Upload Images
              </h2>

              <div className="grid md:grid-cols-2 gap-6">
                <ImageUpload
                  label="Item Image *"
                  description="Clear photo of the broken/damaged item"
                  onImageSelect={setItemImage}
                  selectedImage={itemImage}
                />
                <ImageUpload
                  label="Serial Number Image (Optional)"
                  description="Close-up of serial number, label, or product info"
                  onImageSelect={setSerialImage}
                  selectedImage={serialImage}
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <svg
                    className="w-5 h-5 text-red-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="text-red-300">{error}</p>
                </div>
              </div>
            )}

            {/* Detect Button */}
            <button
              onClick={handleDetect}
              disabled={!itemImage || isLoading}
              className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-300 flex items-center justify-center gap-3 ${
                !itemImage || isLoading
                  ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white transform hover:scale-[1.02]"
              }`}
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Analyzing with AI...
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  Detect Item
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Results Section */}
            <DetectionResults
              result={result}
              onConfirm={handleConfirm}
              onEdit={handleEdit}
              isConfirmed={isConfirmed}
            />

            {/* Try Another Button */}
            <button
              onClick={handleReset}
              className="w-full py-3 px-6 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Try Another Item
            </button>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 text-center text-gray-500 text-sm">
          <p>
            Powered by Qwen3-VL AI • Right to Repair Movement
          </p>
        </footer>
      </div>
    </main>
  );
}
