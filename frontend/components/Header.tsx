"use client";

interface HeaderProps {
  onMenuClick: () => void;
  isDark: boolean;
  onToggleDark: () => void;
}

export default function Header({ onMenuClick, isDark, onToggleDark }: HeaderProps) {
  return (
    <header className="h-20 bg-[var(--soft-sage)]/80 backdrop-blur-sm border-b border-[var(--delicate-gold)]/20 flex items-center justify-between px-4 md:px-10 z-20">
      {/* Mobile Menu Button */}
      <button
        className="md:hidden p-2 hover:bg-black/5 rounded-lg transition-colors"
        onClick={onMenuClick}
      >
        <span className="material-symbols-outlined text-[var(--earth-dark)]">menu</span>
      </button>

      {/* Title */}
      <h2 className="font-display text-xl md:text-2xl font-bold tracking-tight text-[var(--earth-dark)]">
        Repair Canvas{" "}
        <span className="text-[10px] align-top bg-[var(--terracotta)] text-white px-1.5 py-0.5 rounded-full ml-1">
          2.0
        </span>
      </h2>

      {/* Right Side */}
      <div className="flex items-center gap-3">
        {/* Status Badge */}
        <div className="hidden md:flex items-center px-4 py-1.5 rounded-full border border-[var(--delicate-gold)]/30 bg-white/40 backdrop-blur-sm shadow-sm">
          <span className="font-medium text-[10px] mr-2 uppercase tracking-widest text-[var(--earth-muted)]">
            Status
          </span>
          <span className="font-bold text-[10px] bg-emerald-600/90 text-white px-2 py-0.5 rounded-full shadow-sm">
            ONLINE
          </span>
        </div>

        {/* Dark Mode Toggle */}
        <button
          onClick={onToggleDark}
          className="bg-[var(--earth-dark)] text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
        >
          <span className="material-symbols-outlined">
            {isDark ? "dark_mode" : "light_mode"}
          </span>
        </button>
      </div>
    </header>
  );
}
