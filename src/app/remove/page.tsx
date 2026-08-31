"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PDFDocument } from "pdf-lib";
import {
  FileMinus2,
  Trash2,
  Download,
  Loader2,
  CheckCircle2,
  RotateCcw,
  AlertCircle,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import Dropzone from "@/components/Dropzone";

interface PageItem {
  id: string;
  pageNumber: number; // 1-indexed
  imageUrl: string;
  isDeleted: boolean;
}

export default function RemovePDF() {
  const [file, setFile] = useState<File | null>(null);
  const [items, setItems] = useState<PageItem[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedPdfUrl, setProcessedPdfUrl] = useState<string | null>(null);
  const [rangeInput, setRangeInput] = useState("");
  const downloadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (processedPdfUrl) {
      setTimeout(() => {
        downloadRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 150);
    }
  }, [processedPdfUrl]);

  // Preview Modal State
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [highResCache, setHighResCache] = useState<Record<number, string>>({});
  const [isLoadingHighRes, setIsLoadingHighRes] = useState<boolean>(false);

  const handleFileDrop = async (files: File[]) => {
    if (files && files[0]) {
      const selectedFile = files[0];
      if (selectedFile.type === "application/pdf") {
        setFile(selectedFile);
        setProcessedPdfUrl(null);
        setItems([]);
        setRangeInput("");
        setHighResCache({});
        setPreviewIndex(null);
        setIsLoadingFiles(true);

        try {
          const arrayBuffer = await selectedFile.arrayBuffer();
          const pdfjsLib = await import("pdfjs-dist");
          if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
          }
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          const totalPages = pdf.numPages;

          const newItems: PageItem[] = [];
          for (let i = 1; i <= totalPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 0.5 });
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            if (ctx) {
              canvas.width = viewport.width;
              canvas.height = viewport.height;
              await page.render({ canvasContext: ctx, viewport } as any).promise;
              const imageUrl = canvas.toDataURL("image/jpeg", 0.7);
              newItems.push({
                id: `page-${i}`,
                pageNumber: i,
                imageUrl,
                isDeleted: false,
              });
            }
          }
          setItems(newItems);
        } catch (error) {
          console.error("Error reading PDF:", error);
          alert("Gagal membaca file PDF.");
        } finally {
          setIsLoadingFiles(false);
        }
      }
    }
  };

  const removeFile = () => {
    setFile(null);
    setProcessedPdfUrl(null);
    setItems([]);
    setRangeInput("");
    setHighResCache({});
    setPreviewIndex(null);
  };

  const togglePageDeletion = (index: number) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        isDeleted: !updated[index].isDeleted,
      };
      return updated;
    });
  };

  const loadHighResPage = useCallback(
    async (pageIndex: number) => {
      if (!file || highResCache[pageIndex]) return;

      setIsLoadingHighRes(true);
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdfjsLib = await import("pdfjs-dist");
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
        }
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(pageIndex + 1);
        const viewport = page.getViewport({ scale: 1.75 });
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (ctx) {
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: ctx, viewport } as any).promise;
          const highResUrl = canvas.toDataURL("image/jpeg", 0.9);
          setHighResCache((prev) => ({
            ...prev,
            [pageIndex]: highResUrl,
          }));
        }
      } catch (error) {
        console.error("Error loading high-res preview:", error);
      } finally {
        setIsLoadingHighRes(false);
      }
    },
    [file, highResCache]
  );

  const openPreview = (index: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPreviewIndex(index);
    setZoomScale(1);
    loadHighResPage(index);
  };

  const closePreview = () => {
    setPreviewIndex(null);
    setZoomScale(1);
  };

  const nextPreview = useCallback(() => {
    if (previewIndex !== null && previewIndex < items.length - 1) {
      const nextIdx = previewIndex + 1;
      setPreviewIndex(nextIdx);
      loadHighResPage(nextIdx);
    }
  }, [previewIndex, items.length, loadHighResPage]);

  const prevPreview = useCallback(() => {
    if (previewIndex !== null && previewIndex > 0) {
      const prevIdx = previewIndex - 1;
      setPreviewIndex(prevIdx);
      loadHighResPage(prevIdx);
    }
  }, [previewIndex, loadHighResPage]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (previewIndex === null) return;

      if (e.key === "Escape") {
        closePreview();
      } else if (e.key === "ArrowRight") {
        nextPreview();
      } else if (e.key === "ArrowLeft") {
        prevPreview();
      } else if (e.key === " " || e.key === "Delete") {
        e.preventDefault();
        togglePageDeletion(previewIndex);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewIndex, nextPreview, prevPreview]);

  const applyRangeSelection = () => {
    if (!rangeInput.trim()) return;

    const parts = rangeInput.split(",").map((p) => p.trim()).filter(Boolean);
    const pagesToDelete = new Set<number>();

    for (const part of parts) {
      if (part.includes("-")) {
        const [startStr, endStr] = part.split("-");
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (!isNaN(start) && !isNaN(end) && start <= end) {
          for (let p = start; p <= end; p++) {
            if (p >= 1 && p <= items.length) {
              pagesToDelete.add(p);
            }
          }
        }
      } else {
        const page = parseInt(part, 10);
        if (!isNaN(page) && page >= 1 && page <= items.length) {
          pagesToDelete.add(page);
        }
      }
    }

    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        isDeleted: pagesToDelete.has(item.pageNumber),
      }))
    );
  };

  const markEvenPages = () => {
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        isDeleted: item.pageNumber % 2 === 0,
      }))
    );
  };

  const markOddPages = () => {
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        isDeleted: item.pageNumber % 2 !== 0,
      }))
    );
  };

  const resetAllPages = () => {
    setRangeInput("");
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        isDeleted: false,
      }))
    );
  };

  const deletedCount = items.filter((item) => item.isDeleted).length;
  const remainingCount = items.length - deletedCount;

  const removePagesAndSave = async () => {
    if (!file || items.length === 0) return;

    if (deletedCount === 0) {
      alert("Pilih setidaknya satu halaman yang ingin dihapus.");
      return;
    }

    if (remainingCount === 0) {
      alert("Anda tidak dapat menghapus semua halaman. Minimal harus ada 1 halaman tersisa.");
      return;
    }

    setIsProcessing(true);

    try {
      const fileBuffer = await file.arrayBuffer();
      const originalPdfDoc = await PDFDocument.load(fileBuffer);
      const newPdfDoc = await PDFDocument.create();

      const keepIndices = items
        .filter((item) => !item.isDeleted)
        .map((item) => item.pageNumber - 1);

      const copiedPages = await newPdfDoc.copyPages(originalPdfDoc, keepIndices);
      copiedPages.forEach((page) => newPdfDoc.addPage(page));

      const newPdfBytes = await newPdfDoc.save();
      const blob = new Blob([newPdfBytes as any], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      setProcessedPdfUrl(url);
    } catch (error) {
      console.error("Error removing pages:", error);
      alert("Terjadi kesalahan saat memproses PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 md:px-10 py-8 sm:py-12 max-w-5xl">
      {/* Header */}
      <div className="text-center mb-8 sm:mb-12">
        <div className="inline-flex items-center justify-center p-3.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-2xl mb-4 sm:mb-6 shadow-sm border border-rose-100 dark:border-rose-900/50">
          <FileMinus2 size={30} strokeWidth={1.75} />
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight mb-2 sm:mb-4">
          Hapus Halaman PDF
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-lg max-w-2xl mx-auto leading-relaxed">
          Pilih dan hapus halaman yang tidak dibutuhkan dari file PDF Anda secara mudah dan cepat.
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-5 sm:p-8 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] border border-white/80 dark:border-slate-800 mb-8 sm:mb-10 transition-colors">
        {!file ? (
          <Dropzone onFileDrop={handleFileDrop} accept="application/pdf" className="h-64" />
        ) : (
          <div className="mt-2">
            {/* File Info Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 mb-6 sm:mb-8 gap-4">
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-100 mb-0.5 text-sm sm:text-base">{file.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Total {items.length} Halaman • {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                onClick={removeFile}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-xl transition-colors font-medium border border-red-200/60 dark:border-red-900/50"
                title="Ganti file"
              >
                <Trash2 size={15} />
                Ganti File
              </button>
            </div>

            {isLoadingFiles ? (
              <div className="flex flex-col items-center justify-center py-16 bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                <Loader2 size={36} className="text-rose-500 animate-spin mb-4" />
                <p className="text-slate-600 dark:text-slate-300 font-medium text-sm">Sedang memuat pratinjau halaman PDF...</p>
              </div>
            ) : (
              <>
                {/* Control Panel */}
                <div className="p-4 sm:p-6 bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 mb-6 sm:mb-8">
                  <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-xs sm:text-sm uppercase tracking-wide">
                        Pilih Halaman yang Ingin Dihapus
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Klik pada kartu halaman untuk menandai hapus, atau klik ikon <strong>Preview (Mata)</strong> untuk melihat dalam ukuran besar.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={markOddPages}
                        className="px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-xs font-medium transition-colors"
                      >
                        Pilih Ganjil
                      </button>
                      <button
                        onClick={markEvenPages}
                        className="px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-xs font-medium transition-colors"
                      >
                        Pilih Genap
                      </button>
                      <button
                        onClick={resetAllPages}
                        className="px-3 py-1.5 bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg text-xs font-medium transition-colors inline-flex items-center gap-1.5"
                      >
                        <RotateCcw size={12} />
                        Reset
                      </button>
                    </div>
                  </div>

                  {/* Range Input Filter */}
                  <div className="flex flex-col sm:flex-row gap-2 mt-3 pt-3 sm:mt-4 sm:pt-4 border-t border-slate-200/60 dark:border-slate-700/60">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={rangeInput}
                        onChange={(e) => setRangeInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && applyRangeSelection()}
                        placeholder="Contoh: 1, 3-5, 8 (Ketik halaman lalu tekan Terapkan)"
                        className="w-full px-4 py-2 sm:py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                      />
                    </div>
                    <button
                      onClick={applyRangeSelection}
                      className="px-5 py-2 sm:py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs sm:text-sm font-semibold hover:bg-slate-800 dark:hover:bg-white transition-colors shadow-sm"
                    >
                      Terapkan Rentang
                    </button>
                  </div>
                </div>

                {/* Status Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 mb-6 shadow-sm">
                  <div className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm font-medium">
                    <span className="text-slate-600 dark:text-slate-300">
                      Total: <strong>{items.length}</strong> Hal
                    </span>
                    <span className="text-rose-600 dark:text-rose-400">
                      Dihapus: <strong>{deletedCount}</strong>
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400">
                      Tersisa: <strong>{remainingCount}</strong>
                    </span>
                  </div>

                  {remainingCount === 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-950/40 px-3 py-1 rounded-lg border border-amber-200/60 dark:border-amber-900/50">
                      <AlertCircle size={14} />
                      Minimal 1 halaman harus tersisa
                    </div>
                  )}
                </div>

                {/* Page Thumbnails Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 max-h-[560px] overflow-y-auto p-2 pr-3 custom-scrollbar mb-8">
                  {items.map((item, index) => (
                    <div
                      key={item.id}
                      onClick={() => togglePageDeletion(index)}
                      className={`group relative cursor-pointer flex flex-col items-center p-2.5 sm:p-3 rounded-2xl transition-all duration-200 select-none ${
                        item.isDeleted
                          ? "bg-rose-50/80 dark:bg-rose-950/30 border-2 border-rose-400 dark:border-rose-600 shadow-sm"
                          : "bg-white dark:bg-slate-900 border-2 border-slate-200/70 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 hover:shadow-md"
                      }`}
                    >
                      {/* Top Action Buttons */}
                      <div className="absolute top-2 inset-x-2 z-10 flex items-center justify-between pointer-events-none">
                        <button
                          type="button"
                          onClick={(e) => openPreview(index, e)}
                          className="pointer-events-auto flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-full shadow-sm border border-slate-200/80 dark:border-slate-700 hover:scale-110 transition-all"
                          title="Lihat Pratinjau Besar (Preview)"
                        >
                          <Eye size={13} strokeWidth={2} />
                        </button>

                        <div className="pointer-events-auto">
                          {item.isDeleted ? (
                            <span className="flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 bg-rose-600 text-white rounded-full shadow-sm animate-in zoom-in-50 duration-150">
                              <Trash2 size={13} strokeWidth={2.5} />
                            </span>
                          ) : (
                            <span className="flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-rose-500 group-hover:bg-rose-50 dark:group-hover:bg-rose-950/50 rounded-full transition-colors">
                              <Trash2 size={13} strokeWidth={1.5} />
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Thumbnail Container */}
                      <div className="relative w-full aspect-[1/1.4] mb-2 sm:mb-3 mt-1 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden flex items-center justify-center border border-slate-200/60 dark:border-slate-700/60">
                        <img
                          src={item.imageUrl}
                          alt={`Halaman ${item.pageNumber}`}
                          className={`max-w-full max-h-full object-contain transition-all duration-200 ${
                            item.isDeleted
                              ? "opacity-30 grayscale scale-95"
                              : "opacity-100 group-hover:scale-[1.02]"
                          }`}
                        />

                        {item.isDeleted && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-rose-900/10 backdrop-blur-[1px]">
                            <span className="px-2 py-0.5 bg-rose-600 text-white text-[10px] font-bold rounded-md uppercase tracking-wider shadow-sm">
                              Dihapus
                            </span>
                          </div>
                        )}

                        <div
                          onClick={(e) => openPreview(index, e)}
                          className="absolute inset-x-2 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/80 text-white text-[10px] font-medium py-1 rounded-lg text-center backdrop-blur-sm flex items-center justify-center gap-1 shadow-sm"
                        >
                          <Eye size={11} />
                          <span>Perbesar</span>
                        </div>
                      </div>

                      {/* Page Label */}
                      <div className="flex items-center justify-between w-full px-1">
                        <span
                          className={`text-xs font-semibold ${
                            item.isDeleted ? "text-rose-600 dark:text-rose-400 line-through" : "text-slate-700 dark:text-slate-200"
                          }`}
                        >
                          Hal {item.pageNumber}
                        </span>
                        <span
                          className={`text-[10px] font-medium ${
                            item.isDeleted ? "text-rose-500 dark:text-rose-400" : "text-slate-400 dark:text-slate-500"
                          }`}
                        >
                          {item.isDeleted ? "Dihapus" : "Tersisa"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Submit Action Button */}
                <div className="flex justify-center pt-2">
                  <button
                    onClick={removePagesAndSave}
                    disabled={isProcessing || deletedCount === 0 || remainingCount === 0}
                    className="w-full sm:w-auto px-8 sm:px-10 py-3.5 sm:py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-semibold focus:ring-4 focus:ring-rose-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 text-xs sm:text-base"
                  >
                    {isProcessing
                      ? "Sedang Memproses PDF..."
                      : `Hapus ${deletedCount} Halaman & Simpan (${remainingCount} Hal Tersisa)`}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Download Success Card */}
      {processedPdfUrl && (
        <div
          ref={downloadRef}
          className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 p-6 sm:p-8 rounded-3xl text-center shadow-sm backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          <div className="inline-flex items-center justify-center p-3 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-full mb-4 shadow-sm">
            <CheckCircle2 size={30} />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-emerald-950 dark:text-emerald-100 mb-2">Halaman Berhasil Dihapus!</h3>
          <p className="text-emerald-800/80 dark:text-emerald-400 text-xs sm:text-sm max-w-md mx-auto mb-6 sm:mb-8 leading-relaxed">
            File PDF Anda yang baru kini memiliki <strong>{remainingCount} halaman</strong>. Dokumen siap untuk diunduh.
          </p>
          <a
            href={processedPdfUrl}
            download={`cleaned-${file?.name || "document.pdf"}`}
            className="inline-flex items-center justify-center gap-2.5 px-6 sm:px-8 py-3 sm:py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-semibold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
          >
            <Download size={18} strokeWidth={2} />
            Unduh File PDF Baru
          </a>
        </div>
      )}

      {/* HIGH RESOLUTION PREVIEW MODAL */}
      {previewIndex !== null && items[previewIndex] && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-200"
          onClick={closePreview}
        >
          <div
            className="relative flex flex-col w-full max-w-4xl max-h-[92vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60">
              <div className="flex items-center gap-2 sm:gap-3">
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm sm:text-base">
                  Hal {items[previewIndex].pageNumber} dari {items.length}
                </h3>
                {items[previewIndex].isDeleted ? (
                  <span className="px-2 py-0.5 text-[10px] sm:text-xs font-semibold uppercase tracking-wider bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 rounded-full border border-rose-200 dark:border-rose-900/60">
                    Dihapus
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[10px] sm:text-xs font-semibold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 rounded-full border border-emerald-200 dark:border-emerald-900/60">
                    Tersisa
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-0.5 shadow-sm mr-2">
                  <button
                    onClick={() => setZoomScale((prev) => Math.max(0.75, prev - 0.25))}
                    className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    title="Perkecil"
                  >
                    <ZoomOut size={16} />
                  </button>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300 px-2 min-w-[3rem] text-center">
                    {Math.round(zoomScale * 100)}%
                  </span>
                  <button
                    onClick={() => setZoomScale((prev) => Math.min(2.5, prev + 0.25))}
                    className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    title="Perbesar"
                  >
                    <ZoomIn size={16} />
                  </button>
                </div>

                <button
                  onClick={() => togglePageDeletion(previewIndex)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    items[previewIndex].isDeleted
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                      : "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60"
                  }`}
                >
                  {items[previewIndex].isDeleted ? (
                    <>
                      <CheckCircle2 size={13} />
                      <span>Batal Hapus</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={13} />
                      <span>Hapus</span>
                    </>
                  )}
                </button>

                <button
                  onClick={closePreview}
                  className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors ml-1"
                  title="Tutup (Esc)"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="relative flex-1 overflow-auto bg-slate-100/70 dark:bg-slate-950 p-4 sm:p-6 flex items-center justify-center min-h-[350px]">
              {isLoadingHighRes && !highResCache[previewIndex] && (
                <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-slate-900/90 text-white text-xs px-3 py-1.5 rounded-full shadow-lg backdrop-blur-sm">
                  <Loader2 size={13} className="animate-spin text-rose-400" />
                  <span>Memuat resolusi tinggi...</span>
                </div>
              )}

              <div
                className="transition-transform duration-200 ease-out origin-center max-w-full flex items-center justify-center"
                style={{ transform: `scale(${zoomScale})` }}
              >
                <img
                  src={highResCache[previewIndex] || items[previewIndex].imageUrl}
                  alt={`Halaman ${items[previewIndex].pageNumber}`}
                  className="max-h-[65vh] sm:max-h-[70vh] w-auto object-contain rounded-xl shadow-xl border border-slate-300/80 dark:border-slate-800 bg-white"
                />
              </div>

              <button
                onClick={prevPreview}
                disabled={previewIndex === 0}
                className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-full shadow-lg border border-slate-200/80 dark:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed hover:scale-110 transition-all"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft size={20} />
              </button>

              <button
                onClick={nextPreview}
                disabled={previewIndex === items.length - 1}
                className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-full shadow-lg border border-slate-200/80 dark:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed hover:scale-110 transition-all"
                title="Halaman Berikutnya"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 sm:py-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
              <span className="hidden sm:inline">
                Gunakan panah <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded font-mono text-[11px]">←</kbd> <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded font-mono text-[11px]">→</kbd> untuk navigasi.
              </span>
              <span>
                Halaman {previewIndex + 1} / {items.length}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
