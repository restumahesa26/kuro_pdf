"use client";

import { useState, useEffect, useRef } from "react";
import { PDFDocument } from "pdf-lib";
import {
  QrCode,
  Trash2,
  Download,
  Loader2,
  CheckCircle2,
  Move,
  ChevronLeft,
  ChevronRight,
  Eye,
  Sliders,
} from "lucide-react";
import Dropzone from "@/components/Dropzone";
import { generateQrCodeDataUrl } from "@/utils/qrcode";

interface PageInfo {
  pageNumber: number;
  imageUrl: string;
  width: number;
  height: number;
}

export default function AddQRCodePDF() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [isLoadingPages, setIsLoadingPages] = useState<boolean>(false);

  // Settings
  const [qrText, setQrText] = useState<string>("https://example.com");
  const [qrPreviewUrl, setQrPreviewUrl] = useState<string>("");
  const [qrSize, setQrSize] = useState<number>(80); // pt

  // Interactive Drag & Drop Position (percentage 0 - 100)
  // xPercent and yPercent represent the top-left of the QR box relative to document page
  const [qrPos, setQrPos] = useState<{ xPercent: number; yPercent: number }>({
    xPercent: 75,
    yPercent: 82,
  });

  const [targetPages, setTargetPages] = useState<"first" | "last" | "all" | "custom">("first");
  const [customRange, setCustomRange] = useState<string>("");

  // Dragging state
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [processedPdfUrl, setProcessedPdfUrl] = useState<string | null>(null);
  const downloadRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to download section when finished
  useEffect(() => {
    if (processedPdfUrl) {
      setTimeout(() => {
        downloadRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 150);
    }
  }, [processedPdfUrl]);

  // Update QR Code image when text changes
  useEffect(() => {
    if (!qrText.trim()) return;
    let isMounted = true;
    generateQrCodeDataUrl(qrText, 300).then((url) => {
      if (isMounted) setQrPreviewUrl(url);
    });
    return () => {
      isMounted = false;
    };
  }, [qrText]);

  const handleFileDrop = async (files: File[]) => {
    if (files && files[0] && files[0].type === "application/pdf") {
      const selected = files[0];
      setFile(selected);
      setProcessedPdfUrl(null);
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
    setProcessedPdfUrl(null);
  };

  const currentPage = pages[activePageIndex];

  // Width percentage of the QR Code relative to page
  const qrWidthPercent = currentPage ? (qrSize / currentPage.width) * 100 : 15;
  const qrHeightPercent = currentPage ? (qrSize / currentPage.height) * 100 : 15;

  // Preset Position Setter
  const setPresetPosition = (preset: "bottom-right" | "bottom-left" | "top-right" | "top-left" | "center") => {
    const margin = 5; // 5% margin
    if (preset === "bottom-right") {
      setQrPos({ xPercent: 100 - qrWidthPercent - margin, yPercent: 100 - qrHeightPercent - margin });
    } else if (preset === "bottom-left") {
      setQrPos({ xPercent: margin, yPercent: 100 - qrHeightPercent - margin });
    } else if (preset === "top-right") {
      setQrPos({ xPercent: 100 - qrWidthPercent - margin, yPercent: margin });
    } else if (preset === "top-left") {
      setQrPos({ xPercent: margin, yPercent: margin });
    } else if (preset === "center") {
      setQrPos({ xPercent: (100 - qrWidthPercent) / 2, yPercent: (100 - qrHeightPercent) / 2 });
    }
  };

  // Dragging event handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    updateQrPosition(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    updateQrPosition(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch Support for mobile
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches[0]) {
      updateQrPosition(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const updateQrPosition = (clientX: number, clientY: number) => {
    if (!previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();

    // Center the QR on click/drag point
    const rawX = ((clientX - rect.left) / rect.width) * 100 - qrWidthPercent / 2;
    const rawY = ((clientY - rect.top) / rect.height) * 100 - qrHeightPercent / 2;

    const clampedX = Math.max(0, Math.min(100 - qrWidthPercent, rawX));
    const clampedY = Math.max(0, Math.min(100 - qrHeightPercent, rawY));

    setQrPos({ xPercent: clampedX, yPercent: clampedY });
  };

  // Check if current page has QR Code
  const isPageTargeted = (pageIdx: number): boolean => {
    const count = pages.length;
    if (targetPages === "first") return pageIdx === 0;
    if (targetPages === "last") return pageIdx === count - 1;
    if (targetPages === "all") return true;

    const parts = customRange.split(",").map((p) => p.trim()).filter(Boolean);
    for (const part of parts) {
      if (part.includes("-")) {
        const [s, e] = part.split("-").map(Number);
        if (!isNaN(s) && !isNaN(e) && pageIdx + 1 >= s && pageIdx + 1 <= e) return true;
      } else {
        const p = Number(part);
        if (!isNaN(p) && pageIdx + 1 === p) return true;
      }
    }
    return false;
  };

  const processAddQRCode = async () => {
    if (!file || !qrText.trim()) {
      alert("Masukkan teks atau URL untuk QR Code terlebih dahulu.");
      return;
    }

    setIsProcessing(true);

    try {
      const buffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buffer);
      const docPages = pdfDoc.getPages();
      const count = docPages.length;

      const qrDataUrl = await generateQrCodeDataUrl(qrText, 350);
      const imgRes = await fetch(qrDataUrl);
      const imgBytes = await imgRes.arrayBuffer();
      const qrImage = await pdfDoc.embedPng(imgBytes);

      let targetIndices: number[] = [];
      if (targetPages === "first") {
        targetIndices = [0];
      } else if (targetPages === "last") {
        targetIndices = [count - 1];
      } else if (targetPages === "all") {
        targetIndices = Array.from({ length: count }, (_, i) => i);
      } else {
        const parts = customRange.split(",").map((p) => p.trim()).filter(Boolean);
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
        targetIndices = Array.from(set);
      }

      if (targetIndices.length === 0) {
        alert("Pilih target halaman yang valid.");
        setIsProcessing(false);
        return;
      }

      for (const idx of targetIndices) {
        if (idx >= count) continue;
        const page = docPages[idx];
        const { width: pdfW, height: pdfH } = page.getSize();

        // Exact coordinates from top-left percentage
        const x = (qrPos.xPercent / 100) * pdfW;
        const y = pdfH - (qrPos.yPercent / 100) * pdfH - qrSize;

        page.drawImage(qrImage, {
          x,
          y,
          width: qrSize,
          height: qrSize,
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setProcessedPdfUrl(url);
    } catch (error) {
      console.error("Error adding QR code:", error);
      alert("Gagal menambahkan QR code ke dokumen PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  const hasQrOnCurrentPage = isPageTargeted(activePageIndex);

  return (
    <div className="container mx-auto px-4 sm:px-6 md:px-10 py-8 sm:py-12 max-w-5xl">
      {/* Header */}
      <div className="text-center mb-8 sm:mb-12">
        <div className="inline-flex items-center justify-center p-3.5 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 rounded-2xl mb-4 sm:mb-6 shadow-sm border border-cyan-100 dark:border-cyan-900/50">
          <QrCode size={30} strokeWidth={1.75} />
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight mb-2 sm:mb-4">
          Tambah QR Code ke PDF
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-lg max-w-xl mx-auto leading-relaxed">
          Tempelkan QR Code dinamis dengan fitur geser (drag & drop) posisi secara bebas di atas dokumen PDF Anda.
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
                <Loader2 size={36} className="text-cyan-500 animate-spin mb-4" />
                <p className="text-slate-600 dark:text-slate-300 font-medium text-sm">Sedang memuat pratinjau halaman PDF...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: QR Code Controls */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="p-4 sm:p-5 bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-800 dark:text-slate-100 mb-1.5">
                        Isi Teks / URL QR Code:
                      </label>
                      <input
                        type="text"
                        value={qrText}
                        onChange={(e) => setQrText(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-800 dark:text-slate-100 mb-1.5">
                        Pintasan Posisi Cepat:
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: "bottom-right", label: "Bawah Kanan" },
                          { id: "bottom-left", label: "Bawah Kiri" },
                          { id: "top-right", label: "Atas Kanan" },
                          { id: "top-left", label: "Atas Kiri" },
                          { id: "center", label: "Tengah" },
                        ].map((pos) => (
                          <button
                            key={pos.id}
                            type="button"
                            onClick={() => setPresetPosition(pos.id as any)}
                            className="py-2 px-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-cyan-50 dark:hover:bg-cyan-950/50 hover:border-cyan-400 dark:hover:border-cyan-600 transition-colors"
                          >
                            {pos.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Ukuran QR ({qrSize}pt)
                        </label>
                        <input
                          type="range"
                          min="45"
                          max="160"
                          value={qrSize}
                          onChange={(e) => setQrSize(Number(e.target.value))}
                          className="w-full accent-cyan-600"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Target Halaman
                        </label>
                        <select
                          value={targetPages}
                          onChange={(e) => setTargetPages(e.target.value as any)}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100"
                        >
                          <option value="first">Halaman Pertama Saja</option>
                          <option value="last">Halaman Terakhir Saja</option>
                          <option value="all">Semua Halaman</option>
                          <option value="custom">Rentang Kustom</option>
                        </select>
                      </div>
                    </div>

                    {targetPages === "custom" && (
                      <div>
                        <input
                          type="text"
                          value={customRange}
                          onChange={(e) => setCustomRange(e.target.value)}
                          placeholder="Contoh: 1, 3-5"
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                        />
                      </div>
                    )}
                  </div>

                  <button
                    onClick={processAddQRCode}
                    disabled={isProcessing}
                    className="w-full py-3.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-2xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md flex items-center justify-center gap-2 text-xs sm:text-sm"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Menempelkan QR Code...</span>
                      </>
                    ) : (
                      <>
                        <QrCode size={16} />
                        <span>Tempelkan QR Code & Unduh</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Right Column: Interactive Drag & Drop Visual Document Studio */}
                <div className="lg:col-span-7 flex flex-col items-center">
                  {/* Top Bar with Page Switcher */}
                  <div className="flex items-center justify-between w-full mb-3 px-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide flex items-center gap-1.5">
                        <Eye size={14} className="text-cyan-500" />
                        Live Studio Drag & Drop
                      </span>
                      {hasQrOnCurrentPage ? (
                        <span className="text-[10px] bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 px-2 py-0.5 rounded-full font-semibold border border-cyan-200 dark:border-cyan-800">
                          QR Aktif
                        </span>
                      ) : (
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-semibold">
                          Dilewati (Tanpa QR)
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

                  {/* Interactive Document Page with Drag & Drop QR */}
                  {currentPage && (
                    <div
                      ref={previewRef}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onTouchMove={handleTouchMove}
                      className="relative border-2 border-slate-300 dark:border-slate-700 rounded-2xl overflow-hidden shadow-xl bg-white select-none max-w-full cursor-crosshair"
                    >
                      <img
                        src={currentPage.imageUrl}
                        alt={`Halaman ${currentPage.pageNumber}`}
                        className="max-h-[60vh] object-contain pointer-events-none block"
                      />

                      {/* Interactive Drag & Drop QR Code Box */}
                      {hasQrOnCurrentPage && qrPreviewUrl && (
                        <div
                          style={{
                            left: `${qrPos.xPercent}%`,
                            top: `${qrPos.yPercent}%`,
                            width: `${qrWidthPercent}%`,
                            height: `${qrHeightPercent}%`,
                          }}
                          className={`absolute p-1 bg-white border-2 border-cyan-500 rounded-lg shadow-2xl flex items-center justify-center cursor-move group transition-shadow ${
                            isDragging ? "ring-4 ring-cyan-500/30 shadow-2xl scale-105" : "hover:ring-2 hover:ring-cyan-500/50"
                          }`}
                        >
                          <img
                            src={qrPreviewUrl}
                            alt="QR Code"
                            className="w-full h-full object-contain pointer-events-none"
                          />
                          <div className="absolute -top-3 -right-3 p-1 bg-cyan-600 text-white rounded-full shadow-md opacity-80 group-hover:opacity-100">
                            <Move size={11} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-[11px] text-slate-400 mt-2.5 text-center">
                    💡 <strong>Geser (Drag & Drop)</strong> kotak QR Code di atas langsung ke posisi yang Anda inginkan pada dokumen.
                  </p>
                </div>
              </div>
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
          <div className="inline-flex items-center justify-center p-3 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-full mb-4">
            <CheckCircle2 size={28} />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-emerald-950 dark:text-emerald-100 mb-2">QR Code Berhasil Disematkan!</h3>
          <p className="text-xs sm:text-sm text-emerald-800/80 dark:text-emerald-400 mb-6 max-w-md mx-auto">
            Barcode QR Code telah ditempelkan secara rapi pada dokumen PDF Anda.
          </p>
          <a
            href={processedPdfUrl}
            download={`with_qrcode-${file?.name || "document.pdf"}`}
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
