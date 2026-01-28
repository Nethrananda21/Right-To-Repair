"use client";

import ReactMarkdown from "react-markdown";
import type { YouTubeResult, WebResult, RedditResult } from "@/lib/chatApi";

interface DetectionData {
  object: string;
  brand?: string;
  model?: string;
  condition: string;
  issues: string[];
  description: string;
}

interface YouTubeVideo {
  video_id: string;
  title: string;
  channel: string;
  duration: string;
  views: string;
  thumbnail: string;
  url: string;
}

interface AIMessageProps {
  content: string;
  responseType: "text" | "detection" | "repair_results" | "clarification";
  data?: {
    object?: string;
    brand?: string;
    model?: string;
    condition?: string;
    issues?: string[];
    description?: string;
    youtube?: YouTubeVideo[];
    web?: WebResult[];
    reddit?: RedditResult[];
  };
  imageUrl?: string;
  isLoading?: boolean;
  onAction?: (action: "parts" | "guide" | "video") => void;
}

export default function AIMessage({
  content,
  responseType,
  data,
  imageUrl,
  isLoading,
  onAction,
}: AIMessageProps) {
  if (isLoading) {
    return (
      <div className="flex gap-4 md:gap-6 items-start justify-end animate-fade-in-up">
        <div className="flex-1 max-w-3xl">
          <div className="backdrop-blur-xl bg-white/60 dark:bg-[var(--warm-beige)]/80 border border-[var(--delicate-gold)] shadow-lg rounded-3xl p-6 md:p-8">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[var(--terracotta)] animate-spin">
                sync
              </span>
              <span className="text-[var(--earth-dark)] font-medium">Analyzing...</span>
              <div className="flex gap-1 ml-2">
                <div className="w-2 h-2 bg-[var(--terracotta)] rounded-full typing-dot" />
                <div className="w-2 h-2 bg-[var(--terracotta)] rounded-full typing-dot" />
                <div className="w-2 h-2 bg-[var(--terracotta)] rounded-full typing-dot" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Simple text or clarification response
  if (responseType === "text" || responseType === "clarification") {
    return (
      <div className="flex gap-4 md:gap-6 items-start justify-end animate-fade-in-up">
        <div className="flex-1 max-w-3xl">
          <div className="backdrop-blur-xl bg-white/60 dark:bg-[var(--warm-beige)]/80 border border-[var(--delicate-gold)] shadow-lg rounded-3xl p-6 md:p-8">
            <div className="prose prose-sm md:prose-base max-w-none text-[var(--earth-dark)]">
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
                  strong: ({ children }) => <strong className="font-semibold text-[var(--terracotta)]">{children}</strong>,
                  em: ({ children }) => <em className="italic">{children}</em>,
                  ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-3 ml-2">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-3 ml-2">{children}</ol>,
                  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                  h1: ({ children }) => <h1 className="text-xl font-bold mb-3 mt-4 font-display">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-lg font-bold mb-2 mt-3 font-display">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-base font-bold mb-2 mt-2 font-display">{children}</h3>,
                  a: ({ href, children }) => (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-[var(--terracotta)] hover:underline">
                      {children}
                    </a>
                  ),
                  code: ({ children }) => (
                    <code className="bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-2 border-[var(--terracotta)] pl-4 italic text-[var(--earth-muted)] my-3">{children}</blockquote>
                  ),
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Detection response with diagnosis
  if (responseType === "detection" && data) {
    return (
      <div className="flex gap-4 md:gap-6 items-start justify-end animate-fade-in-up">
        <div className="flex-1 max-w-4xl">
          <div className="backdrop-blur-xl bg-white/60 dark:bg-[var(--warm-beige)]/80 border border-[var(--delicate-gold)] shadow-[0_12px_40px_-8px_rgba(74,74,67,0.1)] rounded-3xl p-6 md:p-10 overflow-hidden">
            <div className="flex flex-col md:flex-row gap-6 lg:gap-10">
              {/* Image Preview */}
              {imageUrl && (
                <div className="w-full md:w-5/12 relative flex-shrink-0">
                  <div className="relative aspect-[4/3] rounded-xl overflow-hidden shadow-md border border-[var(--delicate-gold)]/30">
                    <img
                      src={imageUrl}
                      alt="Scanning Preview"
                      className="w-full h-full object-cover opacity-95"
                    />
                    
                    {/* Hotspot Marker */}
                    {data.issues && data.issues.length > 0 && (
                      <div className="hotspot-marker" style={{ top: '40%', right: '25%' }} />
                    )}
                    
                    {/* Warm overlay */}
                    <div className="absolute inset-0 bg-[var(--warm-beige)]/10 pointer-events-none" />
                  </div>
                </div>
              )}

              {/* Diagnosis Text */}
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-serif text-2xl md:text-3xl text-[var(--earth-dark)] mb-4 md:mb-5 font-semibold leading-tight tracking-wide border-b border-[var(--delicate-gold)]/20 pb-4">
                    Diagnosis & Fix
                  </h3>
                  
                  <div className="text-[var(--earth-dark)] space-y-3 md:space-y-4 font-normal text-sm md:text-lg leading-relaxed opacity-90">
                    {data.object && (
                      <p>
                        I&apos;ve analyzed the scan data. The{" "}
                        <span className="text-[var(--terracotta)] font-medium">
                          {data.brand ? `${data.brand} ` : ""}{data.object}
                        </span>{" "}
                        has been identified.
                      </p>
                    )}
                    
                    {data.issues && data.issues.length > 0 && (
                      <div>
                        <p className="mb-2">Issues detected:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          {data.issues.map((issue, idx) => (
                            <li key={idx}>
                              <span className="text-[var(--terracotta)] font-medium">{issue}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {data.condition && (
                      <p>
                        Condition: <span className="font-medium capitalize">{data.condition}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-6 md:mt-8">
                  <button 
                    onClick={() => onAction?.("parts")}
                    className="group flex items-center gap-2 px-4 md:px-5 py-2 md:py-2.5 rounded-full border border-[var(--delicate-gold)] bg-white/40 hover:bg-[var(--terracotta)] hover:border-[var(--terracotta)] hover:text-white transition-all duration-300 shadow-sm text-[var(--earth-dark)] text-xs md:text-sm font-medium tracking-wide"
                  >
                    <span className="material-symbols-outlined text-base md:text-[18px] group-hover:text-white transition-colors">shopping_cart</span>
                    Order Part
                  </button>
                  <button 
                    onClick={() => onAction?.("guide")}
                    className="group flex items-center gap-2 px-4 md:px-5 py-2 md:py-2.5 rounded-full border border-[var(--delicate-gold)] bg-white/40 hover:bg-[var(--terracotta)] hover:border-[var(--terracotta)] hover:text-white transition-all duration-300 shadow-sm text-[var(--earth-dark)] text-xs md:text-sm font-medium tracking-wide"
                  >
                    <span className="material-symbols-outlined text-base md:text-[18px] group-hover:text-white transition-colors">menu_book</span>
                    FixIt Guide
                  </button>
                  <button 
                    onClick={() => onAction?.("video")}
                    className="group flex items-center gap-2 px-4 md:px-5 py-2 md:py-2.5 rounded-full border border-[var(--delicate-gold)] bg-white/40 hover:bg-[var(--terracotta)] hover:border-[var(--terracotta)] hover:text-white transition-all duration-300 shadow-sm text-[var(--earth-dark)] text-xs md:text-sm font-medium tracking-wide"
                  >
                    <span className="material-symbols-outlined text-base md:text-[18px] group-hover:text-white transition-colors">play_circle</span>
                    Video Tutorial
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Repair results with resources
  if (responseType === "repair_results" && data) {
    return (
      <div className="flex gap-4 md:gap-6 items-start justify-end animate-fade-in-up">
        <div className="flex-1 max-w-4xl">
          <div className="backdrop-blur-xl bg-white/60 dark:bg-[var(--warm-beige)]/80 border border-[var(--delicate-gold)] shadow-[0_12px_40px_-8px_rgba(74,74,67,0.1)] rounded-3xl p-6 md:p-10 overflow-hidden">
            {/* Summary */}
            <div className="prose prose-sm md:prose-base max-w-none text-[var(--earth-dark)] mb-6">
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                  strong: ({ children }) => <strong className="font-semibold text-[var(--terracotta)]">{children}</strong>,
                }}
              >
                {content}
              </ReactMarkdown>
            </div>

            {/* Video Tutorials Section */}
            {data.youtube && data.youtube.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-red-500">play_circle</span>
                  <h4 className="font-semibold text-[var(--earth-dark)]">Video Tutorials ({data.youtube.length})</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {data.youtube.map((video, idx) => (
                    <a
                      key={idx}
                      href={video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex gap-3 p-3 rounded-xl border border-[var(--delicate-gold)]/30 bg-white/50 hover:bg-red-50 hover:border-red-200 transition-all duration-300"
                    >
                      {video.thumbnail && (
                        <img 
                          src={video.thumbnail} 
                          alt={video.title}
                          className="w-24 h-16 object-cover rounded-lg flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-[var(--earth-dark)] group-hover:text-red-600 line-clamp-2 transition-colors">
                          {video.title}
                        </p>
                        <p className="text-xs text-[var(--earth-muted)] mt-1">
                          {video.channel} • {video.duration}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Repair Guides Section */}
            {data.web && data.web.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-amber-600">menu_book</span>
                  <h4 className="font-semibold text-[var(--earth-dark)]">Repair Guides ({data.web.length})</h4>
                </div>
                <div className="space-y-2">
                  {data.web.map((guide, idx) => (
                    <a
                      key={idx}
                      href={guide.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block p-3 rounded-xl border border-[var(--delicate-gold)]/30 bg-white/50 hover:bg-amber-50 hover:border-amber-200 transition-all duration-300"
                    >
                      <p className="font-medium text-sm text-[var(--earth-dark)] group-hover:text-amber-700 line-clamp-1 transition-colors">
                        {guide.title}
                      </p>
                      <p className="text-xs text-[var(--earth-muted)] line-clamp-2 mt-1">
                        {guide.snippet}
                      </p>
                      <p className="text-xs text-[var(--terracotta)] mt-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">link</span>
                        {guide.source}
                      </p>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Reddit Discussions Section */}
            {data.reddit && data.reddit.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-orange-500">forum</span>
                  <h4 className="font-semibold text-[var(--earth-dark)]">Reddit Discussions ({data.reddit.length})</h4>
                </div>
                <div className="space-y-2">
                  {data.reddit.map((post, idx) => (
                    <a
                      key={idx}
                      href={post.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block p-3 rounded-xl border border-[var(--delicate-gold)]/30 bg-white/50 hover:bg-orange-50 hover:border-orange-200 transition-all duration-300"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded text-xs font-medium">
                          r/{post.subreddit}
                        </span>
                        <span className="text-xs text-[var(--earth-muted)] flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">thumb_up</span>
                          {post.score}
                        </span>
                        <span className="text-xs text-[var(--earth-muted)] flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">chat_bubble</span>
                          {post.num_comments}
                        </span>
                      </div>
                      <p className="font-medium text-sm text-[var(--earth-dark)] group-hover:text-orange-600 line-clamp-1 transition-colors">
                        {post.title}
                      </p>
                      <p className="text-xs text-[var(--earth-muted)] line-clamp-2 mt-1">
                        {post.content}
                      </p>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Fallback
  return null;
}
