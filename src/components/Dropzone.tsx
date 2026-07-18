"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { Upload } from "lucide-react";

interface DropzoneProps {
  onFileDrop: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  title?: string;
  subtitle?: string;
  className?: string;
}

export default function Dropzone({
  onFileDrop,
  accept = "application/pdf",
  multiple = false,
  title = "Klik untuk upload",
  subtitle = "atau drag and drop",
  className = "h-48",
}: DropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      const filteredFiles = droppedFiles.filter((file) => {
        if (!accept) return true;
        // Simple accept check (e.g., application/pdf or image/*)
        const acceptTypes = accept.split(",").map((t) => t.trim());
        return acceptTypes.some((type) => {
          if (type.endsWith("/*")) {
            return file.type.startsWith(type.replace("/*", ""));
          }
          return file.type === type || file.name.endsWith(type);
        });
      });

      if (filteredFiles.length > 0) {
        onFileDrop(multiple ? filteredFiles : [filteredFiles[0]]);
      }
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      onFileDrop(multiple ? selectedFiles : [selectedFiles[0]]);
    }
    // Reset input value so the same file can be selected again if removed
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`flex flex-col items-center justify-center w-full border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 group ${className} ${
        isDragging
          ? "border-blue-400 bg-blue-50/50 shadow-[0_0_20px_rgba(59,130,246,0.15)]"
          : "border-slate-300 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-400 hover:shadow-sm"
      }`}
    >
      <div className="flex flex-col items-center justify-center pt-5 pb-6 pointer-events-none">
        <div
          className={`p-3 rounded-full mb-3 transition-colors duration-300 ${
            isDragging ? "bg-blue-100 text-blue-600" : "bg-white text-slate-400 group-hover:text-slate-600 group-hover:bg-slate-100"
          }`}
        >
          <Upload
            className={`w-8 h-8 transition-transform duration-300 ${
              isDragging ? "scale-110" : "scale-100"
            }`}
            strokeWidth={1.5}
          />
        </div>
        <p className={`mb-2 text-sm transition-colors ${isDragging ? "text-blue-700" : "text-slate-600"}`}>
          <span className="font-semibold text-slate-900">{title}</span> {subtitle}
        </p>
        <p className="text-xs text-slate-400">
          {accept.includes("pdf") ? "Hanya file PDF" : "File didukung: " + accept}
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        multiple={multiple}
        accept={accept}
        onChange={handleChange}
      />
    </div>
  );
}
