"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { PDFDocument, degrees } from "pdf-lib";
import {
  RotateCw,
  Trash2,
  Download,
  Loader2,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  CheckCircle2,
} from "lucide-react";
import Dropzone from "@/components/Dropzone";

interface PageItem {
  id: string;
  originalIndex: number;
  imageUrl: string;
  rotation: number;
}

export default function RotatePDF() {
  const [file, setFile] = useState<File | null>(null);
  const [items, setItems] = useState<PageItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [rotatedPdfUrl, setRotatedPdfUrl] = useState<string | null>(null);
  const downloadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (rotatedPdfUrl) {
      setTimeout(() => {
        downloadRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 150);
    }
  }, [rotatedPdfUrl]);

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
        setRotatedPdfUrl(null);
        setItems([]);
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
                originalIndex: i - 1,
                imageUrl,
                rotation: 0,
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
    setRotatedPdfUrl(null);
    setItems([]);
    setHighResCache({});
    setPreviewIndex(null);
  };

  const handleRotatePage = (index: number) => {
    const newItems = [...items];
    newItems[index].rotation = (newItems[index].rotation + 90) % 360;
    setItems(newItems);
  };

  const handleRotateAll = () => {
    const newItems = items.map((item) => ({
      ...item,
      rotation: (item.rotation + 90) % 360,
    }));
    setItems(newItems);
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
      if (e.key === "Escape") closePreview();
      else if (e.key === "ArrowRight") nextPreview();
      else if (e.key === "ArrowLeft") prevPreview();
      else if (e.key === "r" || e.key === "R") handleRotatePage(previewIndex);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewIndex, nextPreview, prevPreview]);

  const rotatePdf = async () => {
    if (!file || items.length === 0) return;
    setIsProcessing(true);

    try {
      const fileBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(fileBuffer);
      const pages = pdfDoc.getPages();

      items.forEach((item) => {
        const page = pages[item.originalIndex];
        const currentRotation = page.getRotation().angle;
        page.setRotation(degrees(currentRotation + item.rotation));
      });

      const rotatedPdfFile = await pdfDoc.save();
      const blob = new Blob([rotatedPdfFile as any], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setRotatedPdfUrl(url);
    } catch (error) {
      console.error("Error rotating PDF:", error);
      alert("Terjadi kesalahan saat memutar PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 md:px-10 py-8 sm:py-12 max-w-5xl">
      <div className="text-center mb-8 sm:mb-12">
        <div className="inline-flex items-center justify-center p-3.5 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-2xl mb-4 sm:mb-6 shadow-sm border border-purple-100 dark:border-purple-900/50">
          <RotateCw size={30} strokeWidth={1.75} />
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight mb-2 sm:mb-4">
          Putar PDF
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-lg max-w-xl mx-auto leading-relaxed">
          Putar orientasi halaman PDF Anda satu per satu atau sekaligus sesuai kebutuhan.
        </p>
      </div>

      <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-5 sm:p-8 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] border border-white/80 dark:border-slate-800 mb-8 sm:mb-10 transition-colors">
        {!file ? (
          <Dropzone onFileDrop={handleFileDrop} accept="application/pdf" className="h-64" />
        ) : (
          <div className="mt-2">
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
                title="Hapus file"
              >
                <Trash2 size={16} />
                Ganti File
              </button>
            </div>

            {isLoadingFiles ? (
              <div className="flex flex-col items-center justify-center py-16 bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                <Loader2 size={36} className="text-purple-500 animate-spin mb-4" />
                <p className="text-slate-600 dark:text-slate-300 font-medium text-sm">Sedang memuat pratinjau halaman PDF...</p>
              </div>
            ) : (
              <>
                <div className="p-4 sm:p-6 bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 mb-6 sm:mb-8">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-xs sm:text-sm uppercase tracking-wide">
                        Atur Orientasi Halaman
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Klik tombol putar pada halaman atau gunakan tombol di samping untuk putar semua.
                      </p>
                    </div>
                    <button
                      onClick={handleRotateAll}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shadow-sm"
                    >
                      <RotateCw size={14} />
                      Putar Semua 90&deg;
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 max-h-[560px] overflow-y-auto p-2 pr-3 custom-scrollbar mb-8">
                  {items.map((item, index) => (
                    <div
                      key={item.id}
                      className="group relative bg-white dark:bg-slate-900 p-2.5 sm:p-3 rounded-2xl border-2 border-slate-200/70 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 hover:shadow-md transition-all flex flex-col items-center select-none"
                    >
                      <div className="absolute top-2 left-2 z-10">
                        <button
                          type="button"
                          onClick={(e) => openPreview(index, e)}
                          className="flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 rounded-full shadow-sm border border-slate-200/80 dark:border-slate-700 hover:scale-110 transition-all"
                          title="Lihat Pratinjau Besar (Preview)"
                        >
                          <Eye size={13} strokeWidth={2} />
                        </button>
                      </div>

                      <div className="relative w-full aspect-[1/1.4] mb-2 sm:mb-3 mt-1 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden flex items-center justify-center border border-slate-200/60 dark:border-slate-700/60">
                        <img
                          src={item.imageUrl}
                          alt={`Page ${item.originalIndex + 1}`}
                          className="max-w-full max-h-full object-contain transition-transform duration-300 ease-in-out"
                          style={{ transform: `rotate(${item.rotation}deg)` }}
                        />

                        <div
                          onClick={(e) => openPreview(index, e)}
                          className="absolute inset-x-2 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/80 text-white text-[10px] font-medium py-1 rounded-lg text-center backdrop-blur-sm flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                        >
                          <Eye size={11} />
                          <span>Perbesar</span>
                        </div>
                      </div>

                      <div className="flex w-full items-center justify-between px-1">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Hal {item.originalIndex + 1}
                        </span>
                        <button
                          onClick={() => handleRotatePage(index)}
                          className="p-1 sm:p-1.5 bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-950/80 rounded-xl transition-colors"
                          title="Putar 90&deg;"
                        >
                          <RotateCw size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-center pt-2">
                  <button
                    onClick={rotatePdf}
                    disabled={isProcessing}
                    className="w-full sm:w-auto px-8 sm:px-10 py-3.5 sm:py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 text-xs sm:text-base"
                  >
                    {isProcessing ? "Memproses..." : "Terapkan Putaran & Simpan PDF"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {rotatedPdfUrl && (
        <div
          ref={downloadRef}
          className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 p-6 sm:p-8 rounded-3xl text-center shadow-sm backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          <div className="inline-flex items-center justify-center p-3 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-full mb-4">
            <CheckCircle2 size={28} />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-emerald-950 dark:text-emerald-100 mb-2">PDF Berhasil Diputar!</h3>
          <p className="text-xs sm:text-sm text-emerald-800/80 dark:text-emerald-400 mb-6 max-w-md mx-auto">
            Orientasi halaman PDF Anda telah disesuaikan dan siap diunduh.
          </p>
          <a
            href={rotatedPdfUrl}
            download={`rotated-${file?.name || "document.pdf"}`}
            className="inline-flex items-center justify-center gap-2.5 px-6 sm:px-8 py-3 sm:py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-semibold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
          >
            <Download size={18} strokeWidth={2} />
            Unduh Hasil PDF
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
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm sm:text-base">
                Hal {items[previewIndex].originalIndex + 1} dari {items.length} ({items[previewIndex].rotation}&deg;)
              </h3>

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
                  onClick={() => handleRotatePage(previewIndex)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-950/80 border border-purple-200 dark:border-purple-900/60 rounded-xl text-xs font-semibold transition-all"
                >
                  <RotateCw size={13} />
                  <span>Putar 90&deg;</span>
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
                  <Loader2 size={13} className="animate-spin text-purple-400" />
                  <span>Memuat resolusi tinggi...</span>
                </div>
              )}

              <div
                className="transition-transform duration-200 ease-out origin-center max-w-full flex items-center justify-center"
                style={{
                  transform: `scale(${zoomScale}) rotate(${items[previewIndex].rotation}deg)`,
                }}
              >
                <img
                  src={highResCache[previewIndex] || items[previewIndex].imageUrl}
                  alt={`Halaman ${items[previewIndex].originalIndex + 1}`}
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
