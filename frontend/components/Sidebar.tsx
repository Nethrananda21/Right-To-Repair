"use client";

import { useState, useEffect, useRef } from "react";

interface Session {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface SidebarProps {
  sessions: Session[];
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export default function Sidebar({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  isMobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setDeleteConfirmId(null);
      }
    };

    if (deleteConfirmId) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [deleteConfirmId]);

  const handleDeleteClick = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    setDeleteConfirmId(sessionId);
  };

  const handleConfirmDelete = (sessionId: string) => {
    onDeleteSession(sessionId);
    setDeleteConfirmId(null);
  };

  const handleCancelDelete = () => {
    setDeleteConfirmId(null);
  };

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`
          fixed md:relative z-40
          w-full md:w-64 flex-shrink-0 flex flex-col
          border-r border-[var(--delicate-gold)]/20
          bg-[var(--warm-beige)] p-4 md:p-6 gap-6
          md:h-full shadow-sm
          transition-transform duration-300 ease-in-out
          ${isMobileOpen ? "translate-y-0" : "-translate-y-full md:translate-y-0"}
        `}
      >
        {/* Logo */}
        <div 
          className="flex items-center gap-2 mb-2 group cursor-pointer" 
          onClick={onNewSession}
        >
          <div className="relative">
            <span className="material-symbols-outlined text-4xl text-[var(--terracotta)] group-hover:rotate-12 transition-transform duration-300">
              build_circle
            </span>
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--earth-dark)]">
            Repair.AI
          </h1>
        </div>

        {/* Workbench Section */}
        <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
          <h2 className="font-display text-xs font-bold tracking-wider uppercase text-[var(--earth-muted)]">
            Workbench
          </h2>
          <nav className="flex flex-col gap-2">
            {/* New Chat Button */}
            <button
              onClick={() => {
                onNewSession();
                onCloseMobile();
              }}
              className="flex items-center gap-3 px-4 py-3 border-2 border-dashed border-[var(--terracotta)]/40 hover:border-[var(--terracotta)] hover:bg-[var(--terracotta)]/5 text-[var(--terracotta)] rounded-xl font-semibold group relative overflow-hidden transition-all"
            >
              <span className="material-symbols-outlined group-hover:rotate-90 transition-transform duration-300">add</span>
              <span className="relative z-10">New Chat</span>
            </button>

            {/* Project History Header */}
            <div
              className="flex items-center gap-3 px-4 py-3 bg-[var(--terracotta)] text-white rounded-xl shadow-md font-semibold group relative overflow-hidden"
            >
              <span className="material-symbols-outlined">history</span>
              <span className="relative z-10">Project History</span>
            </div>

            {/* Session List */}
            <div className="flex flex-col gap-1 max-h-48 overflow-y-auto mt-2">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`
                    group relative flex items-center gap-2 px-3 py-2 rounded-lg transition-all font-medium text-sm
                    ${currentSessionId === session.id
                      ? "bg-[var(--terracotta)]/10 border border-[var(--terracotta)]/30"
                      : "hover:bg-black/5 border border-transparent"
                    }
                  `}
                >
                  <button
                    onClick={() => {
                      onSelectSession(session.id);
                      onCloseMobile();
                    }}
                    className="flex-1 flex items-center gap-3 text-left min-w-0 text-[var(--earth-dark)]"
                  >
                    <span className="material-symbols-outlined text-sm text-[var(--earth-muted)] flex-shrink-0">
                      handyman
                    </span>
                    <span className="truncate">{session.title || "New Repair"}</span>
                  </button>
                  
                  {/* Delete Button */}
                  <button
                    onClick={(e) => handleDeleteClick(e, session.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 hover:text-red-600 rounded transition-all flex-shrink-0 text-[var(--earth-muted)]"
                    title="Delete chat"
                  >
                    <span className="material-symbols-outlined text-sm">
                      delete
                    </span>
                  </button>
                </div>
              ))}
            </div>

            {/* My Tools */}
            <button className="flex items-center gap-3 px-4 py-3 text-[var(--earth-dark)] hover:bg-black/5 rounded-xl transition-all font-medium group">
              <span className="material-symbols-outlined text-[var(--earth-muted)] group-hover:scale-110 transition-transform">
                inventory_2
              </span>
              My Tools
            </button>

            {/* Settings */}
            <button className="flex items-center gap-3 px-4 py-3 text-[var(--earth-dark)] hover:bg-black/5 rounded-xl transition-all font-medium group">
              <span className="material-symbols-outlined text-[var(--earth-muted)] group-hover:rotate-90 transition-transform duration-500">
                settings
              </span>
              Settings
            </button>
          </nav>
        </div>

        {/* Delete Confirmation Popup */}
        {deleteConfirmId && (
          <div 
            ref={popupRef}
            className="fixed z-[100] bg-white dark:bg-[#2A2A26] border border-[var(--delicate-gold)]/30 rounded-xl p-4 shadow-2xl min-w-[200px]"
            style={{
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              animation: "popupIn 0.2s ease-out forwards"
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-red-500">delete</span>
              </div>
              <div>
                <p className="text-[var(--earth-dark)] font-semibold text-sm">Delete Chat?</p>
                <p className="text-[var(--earth-muted)] text-xs">This cannot be undone</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCancelDelete}
                className="flex-1 px-4 py-2 text-sm font-medium text-[var(--earth-muted)] hover:text-[var(--earth-dark)] hover:bg-black/5 rounded-lg transition-all border border-[var(--delicate-gold)]/30"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirmDelete(deleteConfirmId)}
                className="flex-1 px-4 py-2 text-sm font-bold bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all shadow-md"
              >
                Delete
              </button>
            </div>
          </div>
        )}

        {/* Backdrop for popup */}
        {deleteConfirmId && (
          <div 
            className="fixed inset-0 bg-black/20 z-[99]"
            onClick={handleCancelDelete}
          />
        )}

        {/* Log Out - Desktop only */}
        <div className="mt-auto hidden md:flex flex-col gap-3">
          <button className="flex items-center gap-3 px-4 py-2 hover:bg-red-50 text-[var(--earth-muted)] hover:text-red-600 rounded-lg transition-colors font-medium">
            <span className="material-symbols-outlined">logout</span>
            Log Out
          </button>
        </div>
      </aside>
    </>
  );
}
