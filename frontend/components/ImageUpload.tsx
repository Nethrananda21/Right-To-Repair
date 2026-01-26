"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";

interface ImageUploadProps {
  label: string;
  description: string;
  onImageSelect: (file: File | null) => void;
  selectedImage: File | null;
}

export default function ImageUpload({
  label,
  description,
  onImageSelect,
  selectedImage,
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) {
        onImageSelect(file);
        const reader = new FileReader();
        reader.onload = () => {
          setPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    },
    [onImageSelect],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp"],
    },
    maxFiles: 1,
  });

  const clearImage = () => {
    setPreview(null);
    onImageSelect(null);
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-semibold text-gray-200 mb-2">
        {label}
      </label>
      <p className="text-xs text-gray-400 mb-3">{description}</p>

      {!preview ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${
            isDragActive
              ? "border-cyan-400 bg-cyan-900/20"
              : "border-gray-600 hover:border-cyan-500 hover:bg-gray-800/50"
          }`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <p className="text-gray-300 font-medium">
                {isDragActive
                  ? "Drop the image here"
                  : "Drag & drop or click to upload"}
              </p>
              <p className="text-gray-500 text-sm mt-1">
                JPG, PNG, WebP supported
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative rounded-xl overflow-hidden border border-gray-700">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-48 object-cover"
          />
          <button
            onClick={clearImage}
            className="absolute top-2 right-2 w-8 h-8 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors"
          >
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
          <div className="absolute bottom-2 left-2 px-3 py-1 bg-black/60 rounded-lg">
            <p className="text-xs text-white truncate max-w-[200px]">
              {selectedImage?.name}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
