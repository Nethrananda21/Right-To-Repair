"use client";

import { useState } from "react";
import { YouTubeResult, WebResult, getVideoSummary, extractGuide } from "@/lib/api";

interface RepairResultsProps {
  youtube: YouTubeResult[];
  web: WebResult[];
  ifixit: WebResult[];
  parts: WebResult[];
  queryUsed: string;
}

type Tab = "youtube" | "web" | "ifixit" | "parts";

export default function RepairResults({
  youtube,
  web,
  ifixit,
  parts,
  queryUsed,
}: RepairResultsProps) {
  const [activeTab, setActiveTab] = useState<Tab>("youtube");
  const [loadingSummary, setLoadingSummary] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<Record<string, string>>({});

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "youtube", label: "YouTube", count: youtube.length },
    { id: "web", label: "Web Guides", count: web.length },
    { id: "ifixit", label: "iFixit", count: ifixit.length },
    { id: "parts", label: "Spare Parts", count: parts.length },
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
      <div className="flex gap-2 mb-6">
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
            {tab.id === "youtube" && (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
              </svg>
            )}
            {tab.label}
            <span className="bg-black/20 px-2 py-0.5 rounded text-xs">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

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

      {/* iFixit Tab */}
      {activeTab === "ifixit" && (
        <div className="space-y-3">
          {ifixit.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No iFixit guides found</p>
          ) : (
            ifixit.map((result, index) => (
              <a
                key={index}
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-gray-900/50 rounded-xl p-4 hover:bg-gray-900/70 transition-colors border border-green-500/20"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded text-xs font-medium">
                    iFixit
                  </span>
                </div>
                <h3 className="text-white font-medium line-clamp-2">{result.title}</h3>
                <p className="text-sm text-gray-400 mt-2 line-clamp-2">{result.snippet}</p>
              </a>
            ))
          )}
        </div>
      )}

      {/* Spare Parts Tab */}
      {activeTab === "parts" && (
        <div className="space-y-3">
          {parts.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No spare parts found</p>
          ) : (
            parts.map((result, index) => (
              <a
                key={index}
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-gray-900/50 rounded-xl p-4 hover:bg-gray-900/70 transition-colors border border-orange-500/20"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded text-xs font-medium">
                    🛒 Parts
                  </span>
                  <span className="text-xs text-gray-500">{result.source}</span>
                </div>
                <h3 className="text-white font-medium line-clamp-2">{result.title}</h3>
                <p className="text-sm text-gray-400 mt-2 line-clamp-2">{result.snippet}</p>
              </a>
            ))
          )}
        </div>
      )}
    </div>
  );
}
