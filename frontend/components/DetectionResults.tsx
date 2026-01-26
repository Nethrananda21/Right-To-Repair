"use client";

import { useState } from "react";

interface DetectionResult {
  object: string;
  brand: string;
  model: string;
  serial_number: string;
  manufacturer: string;
  condition: string;
  issues: string[];
  description: string;
  other_codes: string[];
  confidence_note: string;
}

interface DetectionResultsProps {
  result: DetectionResult;
  onConfirm: (editedResult: DetectionResult) => void;
  onEdit: () => void;
  isConfirmed: boolean;
}

export default function DetectionResults({
  result,
  onConfirm,
  onEdit,
  isConfirmed,
}: DetectionResultsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedResult, setEditedResult] = useState<DetectionResult>(result);
  const [newIssue, setNewIssue] = useState("");

  const conditionColors: Record<string, string> = {
    new: "bg-green-500",
    good: "bg-green-400",
    used: "bg-yellow-500",
    damaged: "bg-orange-500",
    broken: "bg-red-500",
    unknown: "bg-gray-500",
  };

  const conditionColor =
    conditionColors[editedResult.condition.toLowerCase()] || conditionColors.unknown;

  const handleFieldChange = (field: keyof DetectionResult, value: string) => {
    setEditedResult((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddIssue = () => {
    if (newIssue.trim()) {
      setEditedResult((prev) => ({
        ...prev,
        issues: [...prev.issues, newIssue.trim()],
      }));
      setNewIssue("");
    }
  };

  const handleRemoveIssue = (index: number) => {
    setEditedResult((prev) => ({
      ...prev,
      issues: prev.issues.filter((_, i) => i !== index),
    }));
  };

  const handleSaveEdit = () => {
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedResult(result);
    setIsEditing(false);
  };

  const handleConfirm = () => {
    onConfirm(editedResult);
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">
          {isEditing ? "Edit Detection Results" : "Detection Results"}
        </h2>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium text-white ${conditionColor}`}
        >
          {editedResult.condition}
        </span>
      </div>

      {/* Warning Banner */}
      {!isEditing && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="text-amber-200 text-sm font-medium">
                Please verify these details
              </p>
              <p className="text-amber-300/70 text-xs mt-1">
                {result.confidence_note}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Edit Mode Info */}
      {isEditing && (
        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
            <div>
              <p className="text-cyan-200 text-sm font-medium">
                Edit Mode Active
              </p>
              <p className="text-cyan-300/70 text-xs mt-1">
                Correct any fields that were incorrectly detected by the AI
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Details Grid - View or Edit Mode */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <EditableField
          label="Object"
          value={editedResult.object}
          isEditing={isEditing}
          onChange={(v) => handleFieldChange("object", v)}
          highlight
        />
        <EditableField
          label="Brand"
          value={editedResult.brand}
          isEditing={isEditing}
          onChange={(v) => handleFieldChange("brand", v)}
          highlight
        />
        <EditableField
          label="Model"
          value={editedResult.model}
          isEditing={isEditing}
          onChange={(v) => handleFieldChange("model", v)}
        />
        <EditableField
          label="Serial Number"
          value={editedResult.serial_number}
          isEditing={isEditing}
          onChange={(v) => handleFieldChange("serial_number", v)}
        />
        <EditableField
          label="Manufacturer"
          value={editedResult.manufacturer}
          isEditing={isEditing}
          onChange={(v) => handleFieldChange("manufacturer", v)}
        />
        {isEditing ? (
          <div className="bg-gray-900/50 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-2">Condition</p>
            <select
              value={editedResult.condition}
              onChange={(e) => handleFieldChange("condition", e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-gray-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="new">New</option>
              <option value="good">Good</option>
              <option value="used">Used</option>
              <option value="damaged">Damaged</option>
              <option value="broken">Broken</option>
            </select>
          </div>
        ) : (
          <DetailItem label="Condition" value={editedResult.condition} />
        )}
      </div>

      {/* Issues */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-400 mb-2">
          Detected Issues
        </h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {editedResult.issues.length > 0 ? (
            editedResult.issues.map((issue, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-red-500/20 border border-red-500/30 text-red-300 rounded-lg text-sm flex items-center gap-2"
              >
                {issue}
                {isEditing && (
                  <button
                    onClick={() => handleRemoveIssue(index)}
                    className="hover:text-red-100 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                )}
              </span>
            ))
          ) : (
            <span className="text-gray-500 text-sm">No issues detected</span>
          )}
        </div>
        {isEditing && (
          <div className="flex gap-2">
            <input
              type="text"
              value={newIssue}
              onChange={(e) => setNewIssue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddIssue()}
              placeholder="Add an issue..."
              className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-gray-200 text-sm focus:outline-none focus:border-cyan-500"
            />
            <button
              onClick={handleAddIssue}
              className="px-4 py-2 bg-red-500/20 border border-red-500/30 text-red-300 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
            >
              + Add
            </button>
          </div>
        )}
      </div>

      {/* Description */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-400 mb-2">
          Description
        </h3>
        {isEditing ? (
          <textarea
            value={editedResult.description}
            onChange={(e) => handleFieldChange("description", e.target.value)}
            rows={3}
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-gray-200 text-sm focus:outline-none focus:border-cyan-500 resize-none"
          />
        ) : (
          <p className="text-gray-300 text-sm">
            {editedResult.description || "No description provided"}
          </p>
        )}
      </div>

      {/* Action Buttons */}
      {!isConfirmed ? (
        isEditing ? (
          <div className="flex gap-3">
            <button
              onClick={handleSaveEdit}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-semibold rounded-xl transition-all duration-300"
            >
              ✓ Save Changes
            </button>
            <button
              onClick={handleCancelEdit}
              className="py-3 px-6 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-xl transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={handleConfirm}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-[1.02]"
            >
              ✓ Confirm & Search for Repairs
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className="py-3 px-6 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-xl transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
              Edit
            </button>
          </div>
        )
      ) : (
        <div className="flex items-center gap-2 text-green-400">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <span className="font-medium">Confirmed! Searching for repairs...</span>
        </div>
      )}
    </div>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="bg-gray-900/50 rounded-xl p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="font-medium text-gray-200 truncate">
        {value || "Unknown"}
      </p>
    </div>
  );
}

function EditableField({
  label,
  value,
  isEditing,
  onChange,
  highlight = false,
}: {
  label: string;
  value: string;
  isEditing: boolean;
  onChange: (value: string) => void;
  highlight?: boolean;
}) {
  if (!isEditing) {
    return (
      <div className="bg-gray-900/50 rounded-xl p-4">
        <p className="text-xs text-gray-500 mb-1">{label}</p>
        <p
          className={`font-medium truncate ${
            highlight ? "text-cyan-400" : "text-gray-200"
          }`}
        >
          {value || "Unknown"}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/50 rounded-xl p-4">
      <p className="text-xs text-gray-500 mb-2">{label}</p>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 ${
          highlight ? "text-cyan-400" : "text-gray-200"
        }`}
      />
    </div>
  );
}
