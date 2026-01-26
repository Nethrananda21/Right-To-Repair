"use client";

import { useState, useRef } from "react";
import { useDropzone } from "react-dropzone";

interface ChatInputProps {
  onSendMessage: (message: string, image?: File) => void;
  isLoading: boolean;
}

export default function ChatInput({ onSendMessage, isLoading }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showMediaPopup, setShowMediaPopup] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { getRootProps, getInputProps, open } = useDropzone({
    accept: { "image/*": [] },
    noClick: true,
    noKeyboard: true,
    maxFiles: 1,
    onDrop: (files) => {
      if (files[0]) {
        setSelectedImage(files[0]);
        setPreviewUrl(URL.createObjectURL(files[0]));
      }
    },
  });

  const handleSubmit = () => {
    if ((!message.trim() && !selectedImage) || isLoading) return;
    onSendMessage(message, selectedImage || undefined);
    setMessage("");
    setSelectedImage(null);
    setPreviewUrl(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  return (
    <footer className="absolute bottom-6 md:bottom-8 left-0 w-full px-4 z-40 pointer-events-none">
      <div className="max-w-2xl mx-auto pointer-events-auto" {...getRootProps()}>
        <input {...getInputProps()} />
        
        {/* Image Preview */}
        {previewUrl && (
          <div className="mb-3 flex justify-start">
            <div className="relative inline-block">
              <img
                src={previewUrl}
                alt="Preview"
                className="h-20 w-auto rounded-xl border border-[var(--delicate-gold)]/30 shadow-md object-cover"
              />
              <button
                onClick={clearImage}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md transition-colors"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="relative flex items-center gap-4 p-2 pl-4 rounded-full glass-panel border border-[var(--soft-sage)] shadow-xl transition-all duration-300 hover:shadow-2xl bg-white/60 dark:bg-[var(--warm-beige)]/80">
          {/* Media Button */}
          <div className="relative media-trigger">
            <button 
              className="flex items-center justify-center w-10 h-10 rounded-full text-[var(--earth-muted)] hover:text-[var(--terracotta)] hover:bg-white/50 transition-all"
              onClick={() => setShowMediaPopup(!showMediaPopup)}
            >
              <span className="material-symbols-outlined">add_circle</span>
            </button>
            
            {/* Media Popup */}
            {showMediaPopup && (
              <div className="media-popup absolute bottom-full left-0 mb-4 flex flex-col gap-2 p-2 bg-white/90 dark:bg-[var(--warm-beige)] backdrop-blur-md rounded-2xl border border-black/5 dark:border-white/10 shadow-xl">
                <button 
                  onClick={() => { open(); setShowMediaPopup(false); }}
                  className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[var(--terracotta)] hover:text-white text-[var(--earth-dark)] transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">photo_camera</span>
                </button>
                <button 
                  onClick={() => { open(); setShowMediaPopup(false); }}
                  className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[var(--terracotta)] hover:text-white text-[var(--earth-dark)] transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">upload_file</span>
                </button>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-black/10 dark:bg-white/10" />

          {/* Text Input */}
          <div className="flex-1">
            <input
              ref={inputRef}
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Diagnose issue..."
              disabled={isLoading}
              className="w-full bg-transparent border-none p-0 text-[var(--earth-dark)] font-medium text-lg placeholder-[var(--earth-muted)]/50 focus:ring-0 focus:outline-none disabled:opacity-50"
            />
          </div>

          {/* Send Button */}
          <button
            onClick={handleSubmit}
            disabled={isLoading || (!message.trim() && !selectedImage)}
            className="flex items-center justify-center w-11 h-11 rounded-full bg-[var(--terracotta)] hover:brightness-110 text-white shadow-lg active:scale-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="material-symbols-outlined text-xl animate-spin">sync</span>
            ) : (
              <span className="material-symbols-outlined text-xl font-bold">arrow_upward</span>
            )}
          </button>
        </div>
      </div>
    </footer>
  );
}
