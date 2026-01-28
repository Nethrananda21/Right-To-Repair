"use client";

import { useState } from "react";
import { YouTubeResult, WebResult, RedditResult, getVideoSummary, extractGuide } from "@/lib/api";

interface RepairResultsProps {
  youtube: YouTubeResult[];
  web: WebResult[];
  reddit?: RedditResult[];
  queryUsed: string;
  searchTimeMs?: number;
}

type Tab = "youtube" | "web" | "reddit";

export default function RepairResults({
  youtube,
  web,
  reddit = [],
  queryUsed,
  searchTimeMs,
}: RepairResultsProps) {
  const [activeTab, setActiveTab] = useState<Tab>("youtube");
  const [loadingSummary, setLoadingSummary] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<Record<string, string>>({});

  const tabs: { id: Tab; label: string; count: number; icon: string }[] = [
    { id: "youtube", label: "Videos", count: youtube.length, icon: "📺" },
    { id: "web", label: "Guides", count: web.length, icon: "📖" },
    { id: "reddit", label: "Reddit", count: reddit.length, icon: "💬" },
  ];

  const handleGetSummary = async (videoId: string) => {
    if (summaries[videoId]) return;
    
    setLoadingSummary(videoId);
    try {
      const result = await getVideoSummary(videoId);
      setSummaries((prev) => ({ ...prev, [videoId]: result.summary }));
    } catch (error) {
      setSummaries((prev) => ({ ...prev, [videoId]: "Failed to get summary" }));
    } finally {
      setLoadingSummary(null);
    }
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Repair Solutions</h2>
        <span className="text-xs text-gray-500">
          Search: &quot;{queryUsed}&quot;
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
              activeTab === tab.id
                ? "bg-gradient-to-r from-cyan-500 to-purple-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
            <span className="bg-black/20 px-2 py-0.5 rounded text-xs">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search Info */}
      {searchTimeMs && (
        <div className="text-xs text-gray-500 mb-4">
          Search completed in {searchTimeMs}ms
        </div>
      )}

      {/* YouTube Tab */}
      {activeTab === "youtube" && (
        <div className="space-y-4">
          {youtube.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No YouTube tutorials found</p>
          ) : (
            youtube.map((video) => (
              <div
                key={video.video_id}
                className="bg-gray-900/50 rounded-xl p-4 flex gap-4"
              >
                <a
                  href={video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0"
                >
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-40 h-24 object-cover rounded-lg"
                  />
                </a>
                <div className="flex-1 min-w-0">
                  <a
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white font-medium hover:text-cyan-400 transition-colors line-clamp-2"
                  >
                    {video.title}
                  </a>
                  <div className="flex items-center gap-3 mt-2 text-sm text-gray-400">
                    <span>{video.channel}</span>
                    <span>•</span>
                    <span>{video.duration}</span>
                    <span>•</span>
                    <span>{video.views} views</span>
                  </div>
                  
                  {/* Summary section */}
                  <div className="mt-3">
                    {summaries[video.video_id] ? (
                      <div className="bg-gray-800 rounded-lg p-3 text-sm text-gray-300">
                        <p className="text-xs text-cyan-400 mb-1 font-medium">AI Summary:</p>
                        <p className="whitespace-pre-wrap">{summaries[video.video_id]}</p>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleGetSummary(video.video_id)}
                        disabled={loadingSummary === video.video_id}
                        className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
                      >
                        {loadingSummary === video.video_id ? (
                          <>
                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Generating summary...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Get AI Summary
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Web Tab */}
      {activeTab === "web" && (
        <div className="space-y-3">
          {web.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No web guides found</p>
          ) : (
            web.map((result, index) => (
              <a
                key={index}
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-gray-900/50 rounded-xl p-4 hover:bg-gray-900/70 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-white font-medium line-clamp-2">{result.title}</h3>
                  <span className="text-xs text-gray-500 flex-shrink-0">{result.source}</span>
                </div>
                <p className="text-sm text-gray-400 mt-2 line-clamp-2">{result.snippet}</p>
              </a>
            ))
          )}
        </div>
      )}

      {/* iFixit Tab - Replaced with Reddit */}
      {activeTab === "reddit" && (
        <div className="space-y-3">
          {reddit.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No Reddit discussions found</p>
          ) : (
            reddit.map((result, index) => (
              <a
                key={index}
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-gray-900/50 rounded-xl p-4 hover:bg-gray-900/70 transition-colors border border-orange-500/20"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded text-xs font-medium">
                    r/{result.subreddit}
                  </span>
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                    </svg>
                    {result.score}
                  </span>
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
                    </svg>
                    {result.num_comments} comments
                  </span>
                </div>
                <h3 className="text-white font-medium line-clamp-2">{result.title}</h3>
                <p className="text-sm text-gray-400 mt-2 line-clamp-3">{result.content}</p>
                {result.relevance && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 flex-1 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full"
                        style={{ width: `${result.relevance * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">
                      {Math.round(result.relevance * 100)}% relevant
                    </span>
                  </div>
                )}
              </a>
            ))
          )}
        </div>
      )}
    </div>
  );
}
