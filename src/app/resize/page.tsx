"use client";

import { useState, useRef, useEffect } from "react";
import { PDFDocument } from "pdf-lib";
import {
  Scaling,
  Trash2,
  Download,
  Loader2,
  CheckCircle2,
  Maximize2,
} from "lucide-react";
import Dropzone from "@/components/Dropzone";

export default function ResizePDF() {
  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);

  // Settings
  const [targetSize, setTargetSize] = useState<string>("a4");
  const [orientationMode, setOrientationMode] = useState<"auto" | "portrait" | "landscape">("auto");
  const [scalingMode, setScalingMode] = useState<"fit" | "stretch" | "center">("fit");

  const [isProcessing, setIsProcessing] = useState(false);
  const [resizedPdfUrl, setResizedPdfUrl] = useState<string | null>(null);
  const downloadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (resizedPdfUrl) {
      setTimeout(() => {
        downloadRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 150);
    }
  }, [resizedPdfUrl]);

  const handleFileDrop = async (files: File[]) => {
    if (files && files[0] && files[0].type === "application/pdf") {
      const selected = files[0];
      setFile(selected);
      setResizedPdfUrl(null);
      try {
        const buffer = await selected.arrayBuffer();
        const pdf = await PDFDocument.load(buffer);
        setTotalPages(pdf.getPageCount());
      } catch (e) {
        console.error(e);
      }
    }
  };

  const removeFile = () => {
    setFile(null);
    setTotalPages(0);
    setResizedPdfUrl(null);
  };

  const getBaseDimensions = (sizeKey: string): { w: number; h: number } => {
    switch (sizeKey) {
      case "a3": return { w: 841.89, h: 1190.55 };
      case "a5": return { w: 419.53, h: 595.28 };
      case "letter": return { w: 612.0, h: 792.0 };
      case "legal": return { w: 612.0, h: 1008.0 };
      case "folio": return { w: 595.28, h: 935.43 };
      case "a4":
      default: return { w: 595.28, h: 841.89 };
    }
  };

  const processResize = async () => {
    if (!file) return;
    setIsProcessing(true);

    try {
      const buffer = await file.arrayBuffer();
      const srcDoc = await PDFDocument.load(buffer);
      const outDoc = await PDFDocument.create();

      const total = srcDoc.getPageCount();
      const baseDim = getBaseDimensions(targetSize);

      for (let i = 0; i < total; i++) {
        const srcPage = srcDoc.getPage(i);
        const { width: origW, height: origH } = srcPage.getSize();
        const isOrigLandscape = origW > origH;

        let outW = baseDim.w;
        let outH = baseDim.h;

        if (orientationMode === "auto") {
          if (isOrigLandscape) {
            outW = Math.max(baseDim.w, baseDim.h);
            outH = Math.min(baseDim.w, baseDim.h);
          } else {
            outW = Math.min(baseDim.w, baseDim.h);
            outH = Math.max(baseDim.w, baseDim.h);
          }
        } else if (orientationMode === "landscape") {
          outW = Math.max(baseDim.w, baseDim.h);
          outH = Math.min(baseDim.w, baseDim.h);
        } else {
          outW = Math.min(baseDim.w, baseDim.h);
          outH = Math.max(baseDim.w, baseDim.h);
        }

        const outPage = outDoc.addPage([outW, outH]);
        const [embedded] = await outDoc.embedPages([srcPage]);

        let drawW = outW;
        let drawH = outH;
        let posX = 0;
        let posY = 0;

        if (scalingMode === "fit") {
          const margin = 15;
          const availW = outW - margin * 2;
          const availH = outH - margin * 2;
          const scale = Math.min(availW / origW, availH / origH);

          drawW = origW * scale;
          drawH = origH * scale;
          posX = (outW - drawW) / 2;
          posY = (outH - drawH) / 2;
        } else if (scalingMode === "center") {
          drawW = origW;
          drawH = origH;
          posX = (outW - origW) / 2;
          posY = (outH - origH) / 2;
        } else if (scalingMode === "stretch") {
          drawW = outW;
          drawH = outH;
          posX = 0;
          posY = 0;
        }

        outPage.drawPage(embedded, {
          x: posX,
          y: posY,
          width: drawW,
          height: drawH,
        });
      }

      const pdfBytes = await outDoc.save();
      const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setResizedPdfUrl(url);
    } catch (error) {
      console.error("Error resizing PDF:", error);
      alert("Gagal mengubah ukuran PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 md:px-10 py-8 sm:py-12 max-w-4xl">
      <div className="text-center mb-8 sm:mb-12">
        <div className="inline-flex items-center justify-center p-3.5 bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 rounded-2xl mb-4 sm:mb-6 shadow-sm border border-violet-100 dark:border-violet-900/50">
          <Scaling size={30} strokeWidth={1.75} />
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight mb-2 sm:mb-4">
          Ubah Ukuran Kertas PDF
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-lg max-w-xl mx-auto leading-relaxed">
          Standarisasi ukuran dimensi halaman PDF Anda menjadi A4, Letter, F4/Folio, atau A3.
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
                <p className="text-xs text-slate-500 dark:text-slate-400">Total {totalPages} Halaman • {(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button
                onClick={removeFile}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-xl transition-colors font-medium border border-red-200/60 dark:border-red-900/50"
              >
                <Trash2 size={16} />
                Ganti File
              </button>
            </div>

            {/* Customizer */}
            <div className="p-5 sm:p-6 bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 mb-6 sm:mb-8 space-y-6">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">
                  Pilih Ukuran Kertas Target
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { id: "a4", label: "A4", dim: "210 x 297 mm" },
                    { id: "folio", label: "F4 / Folio", dim: "215 x 330 mm" },
                    { id: "letter", label: "Letter", dim: "8.5 x 11 in" },
                    { id: "legal", label: "Legal", dim: "8.5 x 14 in" },
                    { id: "a3", label: "A3", dim: "297 x 420 mm" },
                    { id: "a5", label: "A5", dim: "148 x 210 mm" },
                  ].map((size) => (
                    <button
                      key={size.id}
                      type="button"
                      onClick={() => setTargetSize(size.id)}
                      className={`flex flex-col p-3 rounded-xl border text-left transition-all ${
                        targetSize === size.id
                          ? "border-violet-600 dark:border-violet-500 bg-violet-50/70 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 font-bold shadow-sm"
                          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <span className="text-xs sm:text-sm">{size.label}</span>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{size.dim}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Orientasi Kertas
                  </label>
                  <select
                    value={orientationMode}
                    onChange={(e) => setOrientationMode(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100"
                  >
                    <option value="auto">Otomatis (Ikuti Rasio Halaman Asli)</option>
                    <option value="portrait">Paksa Portrait (Tegak)</option>
                    <option value="landscape">Paksa Landscape (Mendatar)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Mode Penskalaan Konten
                  </label>
                  <select
                    value={scalingMode}
                    onChange={(e) => setScalingMode(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100"
                  >
                    <option value="fit">Sesuaikan Proporsional dengan Margin (Fit)</option>
                    <option value="center">Tetap Ukuran Asli di Tengah (Center)</option>
                    <option value="stretch">Regangkan Penuh Lembar (Stretch)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-center pt-2">
              <button
                onClick={processResize}
                disabled={isProcessing}
                className="w-full sm:w-auto px-8 sm:px-10 py-3.5 sm:py-4 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center justify-center gap-2.5 text-xs sm:text-base"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Mengubah Ukuran PDF...</span>
                  </>
                ) : (
                  <>
                    <Scaling size={18} />
                    <span>Ubah Ukuran PDF Sekarang</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {resizedPdfUrl && (
        <div
          ref={downloadRef}
          className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 p-6 sm:p-8 rounded-3xl text-center shadow-sm backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          <div className="inline-flex items-center justify-center p-3 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-full mb-4">
            <CheckCircle2 size={28} />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-emerald-950 dark:text-emerald-100 mb-2">Ukuran PDF Berhasil Diubah!</h3>
          <p className="text-xs sm:text-sm text-emerald-800/80 dark:text-emerald-400 mb-6 max-w-md mx-auto">
            Halaman dokumen telah disesuaikan ke standar <strong>{targetSize.toUpperCase()}</strong>.
          </p>
          <a
            href={resizedPdfUrl}
            download={`resized_${targetSize}-${file?.name || "document.pdf"}`}
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
