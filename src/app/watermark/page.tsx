"use client";

import { useState, useEffect, useRef } from "react";
import { PDFDocument, rgb, degrees, StandardFonts } from "pdf-lib";
import {
  Stamp,
  Trash2,
  Download,
  Loader2,
  CheckCircle2,
  Type,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Eye,
  Sliders,
} from "lucide-react";
import Dropzone from "@/components/Dropzone";

interface PageInfo {
  pageNumber: number;
  imageUrl: string;
  width: number;
  height: number;
}

export default function WatermarkPDF() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [isLoadingPages, setIsLoadingPages] = useState<boolean>(false);

  const [watermarkType, setWatermarkType] = useState<"text" | "image">("text");

  // Text Watermark Settings
  const [text, setText] = useState<string>("CONFIDENTIAL");
  const [fontSize, setFontSize] = useState<number>(44);
  const [textColor, setTextColor] = useState<string>("#ef4444"); // Hex color
  const [textOpacity, setTextOpacity] = useState<number>(0.35);
  const [rotation, setRotation] = useState<number>(45);
  const [pattern, setPattern] = useState<"center" | "tiled">("center");
  const [tiledSpacing, setTiledSpacing] = useState<number>(100); // pt

  // Image Watermark Settings
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageNaturalSize, setImageNaturalSize] = useState<{ width: number; height: number }>({ width: 100, height: 100 });
  const [imageScale, setImageScale] = useState<number>(0.45);
  const [imageOpacity, setImageOpacity] = useState<number>(0.35);

  // Page Target
  const [targetPages, setTargetPages] = useState<"all" | "custom">("all");
  const [customPageRange, setCustomPageRange] = useState<string>("");

  const [isProcessing, setIsProcessing] = useState(false);
  const [watermarkedPdfUrl, setWatermarkedPdfUrl] = useState<string | null>(null);
  const downloadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (watermarkedPdfUrl) {
      setTimeout(() => {
        downloadRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 150);
    }
  }, [watermarkedPdfUrl]);

  // Measure text width helper
  const measureTextWidth = (str: string, size: number): number => {
    if (typeof window === "undefined") return str.length * size * 0.6;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.font = `bold ${size}px Helvetica, Arial, sans-serif`;
      return ctx.measureText(str).width;
    }
    return str.length * size * 0.6;
  };

  // Handle Image File selection and dimensions
  useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setImagePreviewUrl(url);

      const img = new Image();
      img.onload = () => {
        setImageNaturalSize({ width: img.naturalWidth || 100, height: img.naturalHeight || 100 });
      };
      img.src = url;

      return () => URL.revokeObjectURL(url);
    } else {
      setImagePreviewUrl(null);
    }
  }, [imageFile]);

  const handleFileDrop = async (files: File[]) => {
    if (files && files[0] && files[0].type === "application/pdf") {
      const selected = files[0];
      setFile(selected);
      setWatermarkedPdfUrl(null);
      setPages([]);
      setIsLoadingPages(true);

      try {
        const buffer = await selected.arrayBuffer();
        const pdfjsLib = await import("pdfjs-dist");
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
        }
        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
        const total = pdf.numPages;

        const list: PageInfo[] = [];
        for (let i = 1; i <= total; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.25 });
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (ctx) {
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: ctx, viewport } as any).promise;
            list.push({
              pageNumber: i,
              imageUrl: canvas.toDataURL("image/jpeg", 0.85),
              width: page.view[2] - page.view[0] || viewport.width / 1.25,
              height: page.view[3] - page.view[1] || viewport.height / 1.25,
            });
          }
        }
        setPages(list);
        setActivePageIndex(0);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoadingPages(false);
      }
    }
  };

  const removeFile = () => {
    setFile(null);
    setPages([]);
    setWatermarkedPdfUrl(null);
    setImageFile(null);
    setImagePreviewUrl(null);
  };

  const hexToRgb = (hex: string) => {
    const cleanHex = hex.replace("#", "");
    const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
    const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
    const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
    return rgb(isNaN(r) ? 0 : r, isNaN(g) ? 0 : g, isNaN(b) ? 0 : b);
  };

  const isPageWatermarked = (pageIdx: number): boolean => {
    if (targetPages === "all") return true;
    const parts = customPageRange.split(",").map((p) => p.trim()).filter(Boolean);
    for (const part of parts) {
      if (part.includes("-")) {
        const [s, e] = part.split("-").map(Number);
        if (!isNaN(s) && !isNaN(e) && pageIdx + 1 >= s && pageIdx + 1 <= e) {
          return true;
        }
      } else {
        const p = Number(part);
        if (!isNaN(p) && pageIdx + 1 === p) return true;
      }
    }
    return false;
  };

  const getTiledSpacingLabel = (spacing: number) => {
    if (spacing <= 60) return "Sangat Rapat";
    if (spacing <= 90) return "Rapat";
    if (spacing <= 130) return "Sedang (Ideal)";
    if (spacing <= 170) return "Renggang";
    return "Sangat Renggang";
  };

  const applyWatermark = async () => {
    if (!file) return;
    setIsProcessing(true);

    try {
      const buffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buffer);
      const docPages = pdfDoc.getPages();
      const count = docPages.length;

      let pagesToApply: number[] = [];
      if (targetPages === "all") {
        pagesToApply = Array.from({ length: count }, (_, i) => i);
      } else {
        const parts = customPageRange.split(",").map((p) => p.trim()).filter(Boolean);
        const set = new Set<number>();
        for (const part of parts) {
          if (part.includes("-")) {
            const [s, e] = part.split("-").map(Number);
            if (!isNaN(s) && !isNaN(e)) {
              for (let p = Math.max(1, s); p <= Math.min(count, e); p++) set.add(p - 1);
            }
          } else {
            const p = Number(part);
            if (!isNaN(p) && p >= 1 && p <= count) set.add(p - 1);
          }
        }
        pagesToApply = Array.from(set);
        if (pagesToApply.length === 0) {
          alert("Rentang halaman tidak valid.");
          setIsProcessing(false);
          return;
        }
      }

      if (watermarkType === "text") {
        if (!text.trim()) {
          alert("Masukkan teks watermark terlebih dahulu.");
          setIsProcessing(false);
          return;
        }

        const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const color = hexToRgb(textColor);
        const rad = (rotation * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        for (const pageIdx of pagesToApply) {
          const page = docPages[pageIdx];
          const { width, height } = page.getSize();
          const textWidth = helveticaBold.widthOfTextAtSize(text, fontSize);
          const capHeight = helveticaBold.heightAtSize(fontSize) * 0.7; // approximate visual center

          const cx = width / 2;
          const cy = height / 2;

          if (pattern === "center") {
            // Place so that text center (textWidth/2, capHeight/2) rotated by rotation lands exactly at (cx, cy)
            const x = cx - (textWidth / 2) * cos + (capHeight / 2) * sin;
            const y = cy - (textWidth / 2) * sin - (capHeight / 2) * cos;

            page.drawText(text, {
              x,
              y,
              size: fontSize,
              font: helveticaBold,
              color,
              opacity: textOpacity,
              rotate: degrees(rotation),
            });
          } else {
            // Tiled Grid in exact rotated coordinate grid
            const stepX = Math.max(50, textWidth + tiledSpacing);
            const stepY = Math.max(40, fontSize * 1.3 + tiledSpacing * 0.75);
            const diag = Math.sqrt(width * width + height * height);

            for (let u = -diag; u <= diag; u += stepX) {
              for (let v = -diag; v <= diag; v += stepY) {
                // Rotated grid center point
                const centerTileX = cx + u * cos - v * sin;
                const centerTileY = cy + u * sin + v * cos;

                // Only render if within or near page boundaries
                if (
                  centerTileX >= -textWidth &&
                  centerTileX <= width + textWidth &&
                  centerTileY >= -textWidth &&
                  centerTileY <= height + textWidth
                ) {
                  const x = centerTileX - (textWidth / 2) * cos + (capHeight / 2) * sin;
                  const y = centerTileY - (textWidth / 2) * sin - (capHeight / 2) * cos;

                  page.drawText(text, {
                    x,
                    y,
                    size: fontSize,
                    font: helveticaBold,
                    color,
                    opacity: textOpacity,
                    rotate: degrees(rotation),
                  });
                }
              }
            }
          }
        }
      } else {
        // Image Watermark
        if (!imageFile) {
          alert("Pilih file gambar/logo watermark terlebih dahulu.");
          setIsProcessing(false);
          return;
        }

        const imageBuffer = await imageFile.arrayBuffer();
        let embeddedImage;
        if (imageFile.type === "image/png") {
          embeddedImage = await pdfDoc.embedPng(imageBuffer);
        } else {
          embeddedImage = await pdfDoc.embedJpg(imageBuffer);
        }

        const originalWidth = embeddedImage.width;
        const originalHeight = embeddedImage.height;

        for (const pageIdx of pagesToApply) {
          const page = docPages[pageIdx];
          const { width, height } = page.getSize();

          const targetWidth = width * imageScale;
          const targetHeight = (originalHeight / originalWidth) * targetWidth;

          page.drawImage(embeddedImage, {
            x: width / 2 - targetWidth / 2,
            y: height / 2 - targetHeight / 2,
            width: targetWidth,
            height: targetHeight,
            opacity: imageOpacity,
          });
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setWatermarkedPdfUrl(url);
    } catch (error) {
      console.error("Error applying watermark:", error);
      alert("Gagal menambahkan watermark pada PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  const currentPage = pages[activePageIndex];
  const isCurrentWatermarked = isPageWatermarked(activePageIndex);

  // Generate identical tiled coordinate list for SVG preview
  const getTiledCoordinates = () => {
    if (!currentPage || !text.trim()) return [];
    const width = currentPage.width;
    const height = currentPage.height;
    const textWidth = measureTextWidth(text, fontSize);
    const stepX = Math.max(50, textWidth + tiledSpacing);
    const stepY = Math.max(40, fontSize * 1.3 + tiledSpacing * 0.75);
    const diag = Math.sqrt(width * width + height * height);

    const list: { u: number; v: number }[] = [];
    for (let u = -diag; u <= diag; u += stepX) {
      for (let v = -diag; v <= diag; v += stepY) {
        list.push({ u, v });
      }
    }
    return list;
  };

  const tiledList = getTiledCoordinates();

  return (
    <div className="container mx-auto px-4 sm:px-6 md:px-10 py-8 sm:py-12 max-w-5xl">
      {/* Header */}
      <div className="text-center mb-8 sm:mb-12">
        <div className="inline-flex items-center justify-center p-3.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl mb-4 sm:mb-6 shadow-sm border border-indigo-100 dark:border-indigo-900/50">
          <Stamp size={30} strokeWidth={1.75} />
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight mb-2 sm:mb-4">
          Watermark PDF
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-lg max-w-xl mx-auto leading-relaxed">
          Tambahkan cap air teks atau logo transparan dengan pratinjau yang 100% presisi dan identik dengan hasil unduhan.
        </p>
      </div>

      {/* Main Container */}
      <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-5 sm:p-8 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] border border-white/80 dark:border-slate-800 mb-8 sm:mb-10 transition-colors">
        {!file ? (
          <Dropzone onFileDrop={handleFileDrop} accept="application/pdf" className="h-64" />
        ) : (
          <div className="mt-2">
            {/* File Info Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 mb-6 sm:mb-8 gap-4">
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-100 mb-0.5 text-sm sm:text-base">{file.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Total {pages.length} Halaman • {(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button
                onClick={removeFile}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-xl transition-colors font-medium border border-red-200/60 dark:border-red-900/50"
              >
                <Trash2 size={16} />
                Ganti File
              </button>
            </div>

            {isLoadingPages ? (
              <div className="flex flex-col items-center justify-center py-16 bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                <Loader2 size={36} className="text-indigo-500 animate-spin mb-4" />
                <p className="text-slate-600 dark:text-slate-300 font-medium text-sm">Sedang memuat pratinjau halaman PDF...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Watermark Controls & Settings */}
                <div className="lg:col-span-6 space-y-5">
                  {/* Type Selector */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setWatermarkType("text")}
                      className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-semibold text-xs sm:text-sm border-2 transition-all ${
                        watermarkType === "text"
                          ? "border-indigo-600 dark:border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 shadow-sm"
                          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <Type size={18} />
                      <span>Watermark Teks</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setWatermarkType("image")}
                      className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-semibold text-xs sm:text-sm border-2 transition-all ${
                        watermarkType === "image"
                          ? "border-indigo-600 dark:border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 shadow-sm"
                          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <ImageIcon size={18} />
                      <span>Watermark Gambar/Logo</span>
                    </button>
                  </div>

                  {/* Settings Box */}
                  <div className="p-4 sm:p-5 bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 space-y-4">
                    {watermarkType === "text" ? (
                      <>
                        <div>
                          <label className="block text-xs font-semibold text-slate-800 dark:text-slate-100 mb-1.5">
                            Teks Watermark
                          </label>
                          <input
                            type="text"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Contoh: RAHASIA / CONFIDENTIAL"
                            className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                              Ukuran ({fontSize}pt)
                            </label>
                            <input
                              type="range"
                              min="18"
                              max="90"
                              value={fontSize}
                              onChange={(e) => setFontSize(Number(e.target.value))}
                              className="w-full accent-indigo-600"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                              Opasitas ({Math.round(textOpacity * 100)}%)
                            </label>
                            <input
                              type="range"
                              min="0.05"
                              max="0.9"
                              step="0.05"
                              value={textOpacity}
                              onChange={(e) => setTextOpacity(Number(e.target.value))}
                              className="w-full accent-indigo-600"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                              Sudut ({rotation}&deg;)
                            </label>
                            <input
                              type="range"
                              min="-90"
                              max="90"
                              step="5"
                              value={rotation}
                              onChange={(e) => setRotation(Number(e.target.value))}
                              className="w-full accent-indigo-600"
                            />
                          </div>
                        </div>

                        {/* Pattern Selector */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                              Warna Teks
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={textColor}
                                onChange={(e) => setTextColor(e.target.value)}
                                className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 dark:border-slate-700 p-0.5 bg-white dark:bg-slate-900"
                              />
                              <span className="text-xs font-mono text-slate-600 dark:text-slate-400 uppercase">{textColor}</span>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                              Pola Tampilan
                            </label>
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                onClick={() => setPattern("center")}
                                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all ${
                                  pattern === "center"
                                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                    : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                                }`}
                              >
                                Tengah
                              </button>
                              <button
                                type="button"
                                onClick={() => setPattern("tiled")}
                                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all ${
                                  pattern === "tiled"
                                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                    : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                                }`}
                              >
                                Ubin (Tiled)
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* TILED SPACING / DENSITY SLIDER */}
                        {pattern === "tiled" && (
                          <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-xl border border-indigo-200/80 dark:border-indigo-800/60 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                                <Sliders size={13} className="text-indigo-600 dark:text-indigo-400" />
                                Kerapatan Jarak Ubin
                              </label>
                              <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
                                {getTiledSpacingLabel(tiledSpacing)} ({tiledSpacing}pt)
                              </span>
                            </div>

                            <input
                              type="range"
                              min="40"
                              max="220"
                              step="10"
                              value={tiledSpacing}
                              onChange={(e) => setTiledSpacing(Number(e.target.value))}
                              className="w-full accent-indigo-600"
                            />

                            <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                              <span>Sangat Rapat (40pt)</span>
                              <span>Standar (100pt)</span>
                              <span>Renggang (220pt)</span>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="block text-xs font-semibold text-slate-800 dark:text-slate-100 mb-1.5">
                            Unggah File Logo / Gambar (PNG / JPG)
                          </label>
                          <input
                            type="file"
                            accept="image/png, image/jpeg"
                            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                            className="w-full text-xs text-slate-500 dark:text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 dark:file:bg-indigo-950/60 dark:file:text-indigo-300 hover:file:bg-indigo-100 cursor-pointer"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                              Ukuran Skala ({Math.round(imageScale * 100)}%)
                            </label>
                            <input
                              type="range"
                              min="0.1"
                              max="0.8"
                              step="0.05"
                              value={imageScale}
                              onChange={(e) => setImageScale(Number(e.target.value))}
                              className="w-full accent-indigo-600"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                              Transparansi ({Math.round(imageOpacity * 100)}%)
                            </label>
                            <input
                              type="range"
                              min="0.05"
                              max="1"
                              step="0.05"
                              value={imageOpacity}
                              onChange={(e) => setImageOpacity(Number(e.target.value))}
                              className="w-full accent-indigo-600"
                            />
                          </div>
                        </div>
                      </>
                    )}

                    {/* Target Page Range */}
                    <div className="pt-3 border-t border-slate-200/60 dark:border-slate-700/60">
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Terapkan Pada Halaman:
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => setTargetPages("all")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                              targetPages === "all"
                                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent"
                                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                            }`}
                          >
                            Semua Halaman
                          </button>
                          <button
                            type="button"
                            onClick={() => setTargetPages("custom")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                              targetPages === "custom"
                                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent"
                                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                            }`}
                          >
                            Rentang Kustom
                          </button>
                        </div>
                        {targetPages === "custom" && (
                          <input
                            type="text"
                            value={customPageRange}
                            onChange={(e) => setCustomPageRange(e.target.value)}
                            placeholder="Contoh: 1, 3-5"
                            className="flex-1 px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-100"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={applyWatermark}
                    disabled={isProcessing}
                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md flex items-center justify-center gap-2 text-sm"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Menerapkan Watermark...</span>
                      </>
                    ) : (
                      <>
                        <Stamp size={16} />
                        <span>Beri Watermark Sekarang</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Right Column: 100% PRECISE VECTOR SVG PREVIEW (MATCHES PDF EXACTLY) */}
                <div className="lg:col-span-6 flex flex-col items-center">
                  <div className="flex items-center justify-between w-full mb-3 px-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide flex items-center gap-1.5">
                        <Eye size={14} className="text-indigo-500" />
                        Live Preview Real-Time
                      </span>
                      {isCurrentWatermarked ? (
                        <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-semibold border border-indigo-200 dark:border-indigo-800">
                          Watermark Aktif
                        </span>
                      ) : (
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-semibold">
                          Dilewati (Tanpa Watermark)
                        </span>
                      )}
                    </div>

                    {/* Page Switcher */}
                    {pages.length > 1 && (
                      <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-1 shadow-sm">
                        <button
                          type="button"
                          onClick={() => setActivePageIndex((prev) => Math.max(0, prev - 1))}
                          disabled={activePageIndex === 0}
                          className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-30 rounded"
                          title="Halaman Sebelumnya"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 px-1.5">
                          {activePageIndex + 1} / {pages.length}
                        </span>
                        <button
                          type="button"
                          onClick={() => setActivePageIndex((prev) => Math.min(pages.length - 1, prev + 1))}
                          disabled={activePageIndex === pages.length - 1}
                          className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-30 rounded"
                          title="Halaman Berikutnya"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Document Exact Vector SVG Preview Box */}
                  {currentPage && (
                    <div
                      className="relative border-2 border-slate-300 dark:border-slate-700 rounded-2xl overflow-hidden shadow-xl bg-white select-none max-w-full flex items-center justify-center min-h-[360px]"
                    >
                      <img
                        src={currentPage.imageUrl}
                        alt={`Halaman ${currentPage.pageNumber}`}
                        className="max-h-[58vh] object-contain pointer-events-none"
                      />

                      {/* 100% MATHEMATICALLY ACCURATE VECTOR SVG OVERLAY */}
                      {isCurrentWatermarked && (
                        <svg
                          viewBox={`0 0 ${currentPage.width} ${currentPage.height}`}
                          className="absolute inset-0 w-full h-full pointer-events-none"
                        >
                          {watermarkType === "text" && text.trim() && (
                            pattern === "center" ? (
                              <g transform={`translate(${currentPage.width / 2}, ${currentPage.height / 2}) rotate(${-rotation})`}>
                                <text
                                  x={0}
                                  y={0}
                                  textAnchor="middle"
                                  dominantBaseline="central"
                                  fill={textColor}
                                  fillOpacity={textOpacity}
                                  fontSize={fontSize}
                                  fontWeight="bold"
                                  fontFamily="Helvetica, Arial, sans-serif"
                                  className="select-none uppercase"
                                >
                                  {text}
                                </text>
                              </g>
                            ) : (
                              <g transform={`translate(${currentPage.width / 2}, ${currentPage.height / 2}) rotate(${-rotation})`}>
                                {tiledList.map((pt, idx) => (
                                  <text
                                    key={idx}
                                    x={pt.u}
                                    y={pt.v}
                                    textAnchor="middle"
                                    dominantBaseline="central"
                                    fill={textColor}
                                    fillOpacity={textOpacity}
                                    fontSize={fontSize}
                                    fontWeight="bold"
                                    fontFamily="Helvetica, Arial, sans-serif"
                                    className="select-none uppercase"
                                  >
                                    {text}
                                  </text>
                                ))}
                              </g>
                            )
                          )}

                          {watermarkType === "image" && imagePreviewUrl && (
                            <image
                              href={imagePreviewUrl}
                              x={currentPage.width / 2 - (currentPage.width * imageScale) / 2}
                              y={
                                currentPage.height / 2 -
                                ((imageNaturalSize.height / imageNaturalSize.width) * (currentPage.width * imageScale)) / 2
                              }
                              width={currentPage.width * imageScale}
                              height={(imageNaturalSize.height / imageNaturalSize.width) * (currentPage.width * imageScale)}
                              opacity={imageOpacity}
                            />
                          )}
                        </svg>
                      )}
                    </div>
                  )}

                  <p className="text-[11px] text-slate-400 mt-2.5 text-center">
                    Pratinjau menggunakan sistem koordinat vektor yang identik 100% dengan file PDF hasil unduhan.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Download Success Card */}
      {watermarkedPdfUrl && (
        <div
          ref={downloadRef}
          className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 p-6 sm:p-8 rounded-3xl text-center shadow-sm backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          <div className="inline-flex items-center justify-center p-3 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-full mb-4">
            <CheckCircle2 size={28} />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-emerald-950 dark:text-emerald-100 mb-2">Watermark Berhasil Diterapkan!</h3>
          <p className="text-xs sm:text-sm text-emerald-800/80 dark:text-emerald-400 mb-6 max-w-md mx-auto">
            Dokumen PDF Anda telah diberi watermark dan siap untuk diunduh.
          </p>
          <a
            href={watermarkedPdfUrl}
            download={`watermarked-${file?.name || "document.pdf"}`}
            className="inline-flex items-center justify-center gap-2.5 px-6 sm:px-8 py-3 sm:py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-semibold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
          >
            <Download size={18} strokeWidth={2} />
            Unduh Hasil PDF
          </a>
        </div>
      )}
    </div>
  );
}
