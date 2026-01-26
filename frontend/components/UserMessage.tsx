"use client";

import { useState } from "react";

interface UserMessageProps {
  content: string;
  imageUrl?: string;
}

export default function UserMessage({ content, imageUrl }: UserMessageProps) {
  const [xrayActive, setXrayActive] = useState(false);

  return (
    <div className="flex gap-4 md:gap-6 items-start animate-fade-in-up">
      {/* Avatar */}
      <div className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-white bg-[var(--terracotta)] flex items-center justify-center flex-shrink-0 shadow-sm z-10 text-white">
        <span className="material-symbols-outlined text-lg md:text-xl">person</span>
      </div>

      {/* Polaroid Card */}
      <div className={`polaroid bg-white p-3 md:p-4 pb-8 md:pb-10 shadow-lg rounded-sm max-w-xs md:max-w-sm relative group ${xrayActive ? 'xray-active' : ''}`}>
        {/* Tape Effect */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 md:w-20 h-6 md:h-7 bg-black/5 backdrop-blur-sm rotate-1 rounded-sm" />

        {/* Image */}
        {imageUrl && (
          <div className="relative bg-neutral-100 aspect-square mb-3 md:mb-4 overflow-hidden">
            <img
              src={imageUrl}
              alt="Uploaded"
              className="w-full h-full object-cover grayscale-[20%] sepia-[10%]"
            />
            
            {/* X-Ray Toggle */}
            <button
              onClick={() => setXrayActive(!xrayActive)}
              className={`absolute top-2 right-2 p-1.5 rounded-full cursor-pointer transition-colors z-20 ${
                xrayActive 
                  ? 'bg-[var(--terracotta)] text-white' 
                  : 'bg-white/80 text-[var(--earth-dark)] hover:bg-[var(--terracotta)] hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-sm">radiology</span>
            </button>

            {/* X-Ray Overlay */}
            <div 
              className="xray-overlay"
              style={{
                backgroundImage: `url(${imageUrl})`,
                filter: 'invert(1) hue-rotate(180deg)',
              }}
            />
          </div>
        )}

        {/* Message Text */}
        <p className="font-medium text-[var(--earth-dark)] leading-tight italic text-sm md:text-base">
          {content || "What's wrong with this?"}
        </p>
      </div>
    </div>
  );
}
