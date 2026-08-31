"use client";

import { useState, useRef, useEffect } from "react";
import { PDFDocument, rgb } from "pdf-lib";
import {
  Grid2X2,
  Trash2,
  Download,
  Loader2,
  CheckCircle2,
  LayoutGrid,
  Columns2,
} from "lucide-react";
import Dropzone from "@/components/Dropzone";

export default function NUpPDF() {
  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);

  // Settings
  const [nupMode, setNupMode] = useState<"2" | "4">("2");
  const [pageSize, setPageSize] = useState<"a4" | "letter" | "folio">("a4");
  const [orientation, setOrientation] = useState<"landscape" | "portrait">("landscape");
  const [drawBorder, setDrawBorder] = useState<boolean>(true);

  const [isProcessing, setIsProcessing] = useState(false);
  const [nupPdfUrl, setNupPdfUrl] = useState<string | null>(null);
  const downloadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (nupPdfUrl) {
      setTimeout(() => {
        downloadRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 150);
    }
  }, [nupPdfUrl]);

  const handleFileDrop = async (files: File[]) => {
    if (files && files[0] && files[0].type === "application/pdf") {
      const selected = files[0];
      setFile(selected);
      setNupPdfUrl(null);
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
    setNupPdfUrl(null);
  };

  const getTargetDimensions = (): { width: number; height: number } => {
    let w = 595.28; // A4 pt
    let h = 841.89;

    if (pageSize === "letter") {
      w = 612;
      h = 792;
    } else if (pageSize === "folio") {
      w = 595.28;
      h = 935.43;
    }

    if (orientation === "landscape") {
      return { width: Math.max(w, h), height: Math.min(w, h) };
    } else {
      return { width: Math.min(w, h), height: Math.max(w, h) };
    }
  };

  const processNup = async () => {
    if (!file) return;
    setIsProcessing(true);

    try {
      const buffer = await file.arrayBuffer();
      const srcDoc = await PDFDocument.load(buffer);
      const outDoc = await PDFDocument.create();

      const total = srcDoc.getPageCount();
      const { width: outW, height: outH } = getTargetDimensions();
      const margin = 20;
      const gutter = 15;

      const itemsPerPage = nupMode === "2" ? 2 : 4;
      const numOutputSheets = Math.ceil(total / itemsPerPage);

      for (let sheetIdx = 0; sheetIdx < numOutputSheets; sheetIdx++) {
        const outPage = outDoc.addPage([outW, outH]);

        if (nupMode === "2") {
          // 2 slots
          const cols = orientation === "landscape" ? 2 : 1;
          const rows = orientation === "landscape" ? 1 : 2;

          const slotW = (outW - margin * 2 - (cols - 1) * gutter) / cols;
          const slotH = (outH - margin * 2 - (rows - 1) * gutter) / rows;

          for (let slot = 0; slot < 2; slot++) {
            const pageIndex = sheetIdx * 2 + slot;
            if (pageIndex >= total) break;

            const [embedded] = await outDoc.embedPages([srcDoc.getPage(pageIndex)]);
            const scale = Math.min(slotW / embedded.width, slotH / embedded.height) * 0.95;
            const drawW = embedded.width * scale;
            const drawH = embedded.height * scale;

            let col = slot % cols;
            let row = Math.floor(slot / cols);

            const slotX = margin + col * (slotW + gutter);
            const slotY = outH - margin - (row + 1) * slotH - row * gutter;

            const posX = slotX + (slotW - drawW) / 2;
            const posY = slotY + (slotH - drawH) / 2;

            if (drawBorder) {
              outPage.drawRectangle({
                x: slotX,
                y: slotY,
                width: slotW,
                height: slotH,
                borderColor: rgb(0.85, 0.88, 0.92),
                borderWidth: 0.75,
              });
            }

            outPage.drawPage(embedded, {
              x: posX,
              y: posY,
              width: drawW,
              height: drawH,
            });
          }
        } else {
          // 4 slots: 2x2 grid
          const cols = 2;
          const rows = 2;

          const slotW = (outW - margin * 2 - gutter) / 2;
          const slotH = (outH - margin * 2 - gutter) / 2;

          for (let slot = 0; slot < 4; slot++) {
            const pageIndex = sheetIdx * 4 + slot;
            if (pageIndex >= total) break;

            const [embedded] = await outDoc.embedPages([srcDoc.getPage(pageIndex)]);
            const scale = Math.min(slotW / embedded.width, slotH / embedded.height) * 0.95;
            const drawW = embedded.width * scale;
            const drawH = embedded.height * scale;

            let col = slot % cols;
            let row = Math.floor(slot / cols);

            const slotX = margin + col * (slotW + gutter);
            const slotY = outH - margin - (row + 1) * slotH - row * gutter;

            const posX = slotX + (slotW - drawW) / 2;
            const posY = slotY + (slotH - drawH) / 2;

            if (drawBorder) {
              outPage.drawRectangle({
                x: slotX,
                y: slotY,
                width: slotW,
                height: slotH,
                borderColor: rgb(0.85, 0.88, 0.92),
                borderWidth: 0.75,
              });
            }

            outPage.drawPage(embedded, {
              x: posX,
              y: posY,
              width: drawW,
              height: drawH,
            });
          }
        }
      }

      const pdfBytes = await outDoc.save();
      const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setNupPdfUrl(url);
    } catch (error) {
      console.error("Error creating N-up PDF:", error);
      alert("Gagal memproses penggabungan lembar PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 md:px-10 py-8 sm:py-12 max-w-4xl">
      <div className="text-center mb-8 sm:mb-12">
        <div className="inline-flex items-center justify-center p-3.5 bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 rounded-2xl mb-4 sm:mb-6 shadow-sm border border-teal-100 dark:border-teal-900/50">
          <Grid2X2 size={30} strokeWidth={1.75} />
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight mb-2 sm:mb-4">
          Cetak N-Up (2-in-1, 4-in-1)
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-lg max-w-xl mx-auto leading-relaxed">
          Gabungkan 2 atau 4 halaman ke dalam 1 lembar kertas untuk menghemat kertas dan materi cetak.
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
                <p className="text-xs text-slate-500 dark:text-slate-400">Total {totalPages} Halaman Asli • {(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button
                onClick={removeFile}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-xl transition-colors font-medium border border-red-200/60 dark:border-red-900/50"
              >
                <Trash2 size={16} />
                Ganti File
              </button>
            </div>

            {/* Layout Mode */}
            <div className="p-5 sm:p-6 bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 mb-6 sm:mb-8 space-y-6">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">
                  Pilih Tata Letak Lembar
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setNupMode("2");
                      setOrientation("landscape");
                    }}
                    className={`flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                      nupMode === "2"
                        ? "border-teal-600 dark:border-teal-500 bg-teal-50/70 dark:bg-teal-950/40 text-teal-800 dark:text-teal-200 shadow-sm"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300">
                      <Columns2 size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">2 Halaman per Lembar (2-in-1)</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Menjadi {Math.ceil(totalPages / 2)} lembar output. Cocok untuk dokumen & buku.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNupMode("4");
                      setOrientation("landscape");
                    }}
                    className={`flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                      nupMode === "4"
                        ? "border-teal-600 dark:border-teal-500 bg-teal-50/70 dark:bg-teal-950/40 text-teal-800 dark:text-teal-200 shadow-sm"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300">
                      <LayoutGrid size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">4 Halaman per Lembar (4-in-1)</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Menjadi {Math.ceil(totalPages / 4)} lembar output. Cocok untuk slide presentasi.
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Format & Options */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Ukuran Kertas Kertas
                  </label>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100"
                  >
                    <option value="a4">A4 (210 x 297 mm)</option>
                    <option value="letter">Letter (8.5 x 11 in)</option>
                    <option value="folio">F4 / Folio (215 x 330 mm)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Orientasi Lembar
                  </label>
                  <select
                    value={orientation}
                    onChange={(e) => setOrientation(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100"
                  >
                    <option value="landscape">Landscape (Mendatar)</option>
                    <option value="portrait">Portrait (Tegak)</option>
                  </select>
                </div>

                <div className="flex items-center">
                  <label className="flex items-center gap-2.5 cursor-pointer mt-4">
                    <input
                      type="checkbox"
                      checked={drawBorder}
                      onChange={(e) => setDrawBorder(e.target.checked)}
                      className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                    />
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Beri Garis Batas Pemisah
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-center pt-2">
              <button
                onClick={processNup}
                disabled={isProcessing}
                className="w-full sm:w-auto px-8 sm:px-10 py-3.5 sm:py-4 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center justify-center gap-2.5 text-xs sm:text-base"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Sedang Menyusun N-Up PDF...</span>
                  </>
                ) : (
                  <>
                    <Grid2X2 size={18} />
                    <span>Proses N-Up PDF Sekarang</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {nupPdfUrl && (
        <div
          ref={downloadRef}
          className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 p-6 sm:p-8 rounded-3xl text-center shadow-sm backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          <div className="inline-flex items-center justify-center p-3 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-full mb-4">
            <CheckCircle2 size={28} />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-emerald-950 dark:text-emerald-100 mb-2">N-Up PDF Berhasil Dibuat!</h3>
          <p className="text-xs sm:text-sm text-emerald-800/80 dark:text-emerald-400 mb-6 max-w-md mx-auto">
            Halaman PDF Anda telah disatukan ke dalam lembar baru dan siap untuk dicetak atau disimpan.
          </p>
          <a
            href={nupPdfUrl}
            download={`nup_${nupMode}in1-${file?.name || "document.pdf"}`}
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
