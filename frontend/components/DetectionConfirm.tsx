"use client";

import { useState } from "react";

interface DetectionData {
  object: string;
  brand?: string;
  model?: string;
  condition: string;
  issues: string[];
  description: string;
}

interface DetectionConfirmProps {
  data: DetectionData;
  imageUrl?: string;
  onConfirm: (data: DetectionData) => void;
  onCancel: () => void;
}

export default function DetectionConfirm({
  data,
  imageUrl,
  onConfirm,
  onCancel,
}: DetectionConfirmProps) {
  const [formData, setFormData] = useState<DetectionData>({
    object: data.object || "",
    brand: data.brand || "",
    model: data.model || "",
    condition: data.condition || "unknown",
    issues: data.issues || [],
    description: data.description || "",
  });
  const [newIssue, setNewIssue] = useState("");

  const handleAddIssue = () => {
    if (newIssue.trim()) {
      setFormData((prev) => ({
        ...prev,
        issues: [...prev.issues, newIssue.trim()],
      }));
      setNewIssue("");
    }
  };

  const handleRemoveIssue = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      issues: prev.issues.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="flex gap-4 md:gap-6 items-start justify-end animate-fade-in-up">
      <div className="flex-1 max-w-4xl">
        <div className="backdrop-blur-xl bg-white/80 dark:bg-[var(--warm-beige)]/90 border-2 border-[var(--terracotta)]/30 shadow-[0_12px_40px_-8px_rgba(217,125,84,0.15)] rounded-3xl p-6 md:p-8 overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[var(--delicate-gold)]/30">
            <div className="w-10 h-10 rounded-full bg-[var(--terracotta)]/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-[var(--terracotta)]">edit_note</span>
            </div>
            <div>
              <h3 className="font-serif text-xl md:text-2xl text-[var(--earth-dark)] font-semibold">
                Confirm Detection
              </h3>
              <p className="text-sm text-[var(--earth-muted)]">
                Review and add details for better repair search results
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            {/* Image Preview */}
            {imageUrl && (
              <div className="w-full md:w-1/3 flex-shrink-0">
                <div className="relative aspect-square rounded-xl overflow-hidden shadow-md border border-[var(--delicate-gold)]/30">
                  <img
                    src={imageUrl}
                    alt="Detected item"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            {/* Form */}
            <div className="flex-1 space-y-4">
              {/* Object Type */}
              <div>
                <label className="block text-sm font-medium text-[var(--earth-dark)] mb-1.5">
                  Item Type <span className="text-[var(--terracotta)]">*</span>
                </label>
                <input
                  type="text"
                  value={formData.object}
                  onChange={(e) => setFormData({ ...formData, object: e.target.value })}
                  placeholder="e.g., Laptop, Headphones, Washing Machine"
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--delicate-gold)]/50 bg-white/50 text-[var(--earth-dark)] placeholder-[var(--earth-muted)]/50 focus:outline-none focus:border-[var(--terracotta)] focus:ring-2 focus:ring-[var(--terracotta)]/20 transition-all"
                />
              </div>

              {/* Brand & Model Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--earth-dark)] mb-1.5">
                    Brand
                  </label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="e.g., Sony, Dell, LG"
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--delicate-gold)]/50 bg-white/50 text-[var(--earth-dark)] placeholder-[var(--earth-muted)]/50 focus:outline-none focus:border-[var(--terracotta)] focus:ring-2 focus:ring-[var(--terracotta)]/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--earth-dark)] mb-1.5">
                    Model
                  </label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="e.g., WH-1000XM4"
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--delicate-gold)]/50 bg-white/50 text-[var(--earth-dark)] placeholder-[var(--earth-muted)]/50 focus:outline-none focus:border-[var(--terracotta)] focus:ring-2 focus:ring-[var(--terracotta)]/20 transition-all"
                  />
                </div>
              </div>

              {/* Condition */}
              <div>
                <label className="block text-sm font-medium text-[var(--earth-dark)] mb-1.5">
                  Condition
                </label>
                <div className="flex flex-wrap gap-2">
                  {["broken", "damaged", "worn", "good"].map((cond) => (
                    <button
                      key={cond}
                      type="button"
                      onClick={() => setFormData({ ...formData, condition: cond })}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        formData.condition === cond
                          ? "bg-[var(--terracotta)] text-white shadow-md"
                          : "bg-white/50 border border-[var(--delicate-gold)]/50 text-[var(--earth-dark)] hover:bg-[var(--terracotta)]/10"
                      }`}
                    >
                      {cond.charAt(0).toUpperCase() + cond.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Issues */}
              <div>
                <label className="block text-sm font-medium text-[var(--earth-dark)] mb-1.5">
                  Issues / Problems
                </label>
                <div className="space-y-2">
                  {/* Existing issues */}
                  {formData.issues.map((issue, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--terracotta)]/10 border border-[var(--terracotta)]/20"
                    >
                      <span className="material-symbols-outlined text-sm text-[var(--terracotta)]">
                        error
                      </span>
                      <span className="flex-1 text-sm text-[var(--earth-dark)]">{issue}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveIssue(index)}
                        className="text-[var(--earth-muted)] hover:text-red-500 transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </div>
                  ))}
                  
                  {/* Add new issue */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newIssue}
                      onChange={(e) => setNewIssue(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddIssue())}
                      placeholder="Describe an issue (e.g., Screen cracked, Won't turn on)"
                      className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--delicate-gold)]/50 bg-white/50 text-[var(--earth-dark)] placeholder-[var(--earth-muted)]/50 focus:outline-none focus:border-[var(--terracotta)] focus:ring-2 focus:ring-[var(--terracotta)]/20 transition-all text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleAddIssue}
                      className="px-4 py-2.5 rounded-xl bg-[var(--soft-sage)] text-[var(--earth-dark)] hover:bg-[var(--terracotta)] hover:text-white transition-all"
                    >
                      <span className="material-symbols-outlined text-sm">add</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Additional Details */}
              <div>
                <label className="block text-sm font-medium text-[var(--earth-dark)] mb-1.5">
                  Additional Details <span className="text-[var(--earth-muted)] font-normal">(optional)</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Any other details that might help find repair solutions..."
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--delicate-gold)]/50 bg-white/50 text-[var(--earth-dark)] placeholder-[var(--earth-muted)]/50 focus:outline-none focus:border-[var(--terracotta)] focus:ring-2 focus:ring-[var(--terracotta)]/20 transition-all resize-none text-sm"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-[var(--delicate-gold)]/30">
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 rounded-full text-[var(--earth-muted)] hover:text-[var(--earth-dark)] hover:bg-black/5 transition-all text-sm font-medium"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={() => onConfirm(formData)}
              disabled={!formData.object.trim()}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[var(--terracotta)] text-white hover:brightness-110 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              <span className="material-symbols-outlined text-lg">search</span>
              Find Repair Solutions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
