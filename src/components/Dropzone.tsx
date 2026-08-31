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
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      onFileDrop(multiple ? selectedFiles : [selectedFiles[0]]);
    }
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleFileDropInternal = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      const filteredFiles = droppedFiles.filter((file) => {
        if (!accept) return true;
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

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleFileDropInternal}
      onClick={() => inputRef.current?.click()}
      className={`flex flex-col items-center justify-center w-full border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 group ${className} ${
        isDragging
          ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 shadow-[0_0_25px_rgba(59,130,246,0.2)]"
          : "border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:border-slate-400 dark:hover:border-slate-500 hover:shadow-sm"
      }`}
    >
      <div className="flex flex-col items-center justify-center pt-5 pb-6 pointer-events-none px-4 text-center">
        <div
          className={`p-3.5 rounded-2xl mb-3 transition-colors duration-300 shadow-sm ${
            isDragging
              ? "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400"
              : "bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 group-hover:bg-slate-100 dark:group-hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700/60"
          }`}
        >
          <Upload
            className={`w-7 h-7 sm:w-8 sm:h-8 transition-transform duration-300 ${
              isDragging ? "scale-110" : "scale-100"
            }`}
            strokeWidth={1.5}
          />
        </div>
        <p className={`mb-1.5 text-sm transition-colors ${isDragging ? "text-blue-700 dark:text-blue-300" : "text-slate-600 dark:text-slate-300"}`}>
          <span className="font-semibold text-slate-900 dark:text-white">{title}</span> {subtitle}
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500">
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
