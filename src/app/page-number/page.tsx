"use client";

import { useState, useEffect, useRef } from "react";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import {
  FileDigit,
  Trash2,
  Download,
  Loader2,
  CheckCircle2,
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

export default function PageNumberPDF() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [isLoadingPages, setIsLoadingPages] = useState<boolean>(false);

  // Settings
  const [formatType, setFormatType] = useState<string>("simple"); // simple, prefix, fraction, detailed, roman
  const [position, setPosition] = useState<"bottom-center" | "bottom-right" | "bottom-left" | "top-center" | "top-right" | "top-left">("bottom-center");
  const [skipFirstPage, setSkipFirstPage] = useState<boolean>(true);
  const [startNumber, setStartNumber] = useState<number>(1);
  const [fontSize, setFontSize] = useState<number>(11);
  const [margin, setMargin] = useState<number>(24);
  const [textColor, setTextColor] = useState<string>("#475569");

  const [isProcessing, setIsProcessing] = useState(false);
  const [numberedPdfUrl, setNumberedPdfUrl] = useState<string | null>(null);
  const downloadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (numberedPdfUrl) {
      setTimeout(() => {
        downloadRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 150);
    }
  }, [numberedPdfUrl]);

  const handleFileDrop = async (files: File[]) => {
    if (files && files[0] && files[0].type === "application/pdf") {
      const selected = files[0];
      setFile(selected);
      setNumberedPdfUrl(null);
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
    setNumberedPdfUrl(null);
  };

  const toRoman = (num: number): string => {
    const lookup: Record<string, number> = {
      m: 1000, cm: 900, d: 500, cd: 400,
      c: 100, xc: 90, l: 50, xl: 40,
      x: 10, ix: 9, v: 5, iv: 4, i: 1
    };
    let roman = "";
    for (const i in lookup) {
      while (num >= lookup[i]) {
        roman += i;
        num -= lookup[i];
      }
    }
    return roman;
  };

  const hexToRgb = (hex: string) => {
    const cleanHex = hex.replace("#", "");
    const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
    const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
    const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
    return rgb(isNaN(r) ? 0 : r, isNaN(g) ? 0 : g, isNaN(b) ? 0 : b);
  };

  // Helper to get formatted text for any given page index
  const getPageLabel = (pageIdx: number): string | null => {
    if (skipFirstPage && pageIdx === 0 && pages.length > 1) {
      return null;
    }

    let calculatedNum = startNumber;
    if (skipFirstPage && pages.length > 1) {
      calculatedNum = startNumber + (pageIdx - 1);
    } else {
      calculatedNum = startNumber + pageIdx;
    }

    const total = pages.length;

    if (formatType === "simple") {
      return `${calculatedNum}`;
    } else if (formatType === "prefix") {
      return `Hal. ${calculatedNum}`;
    } else if (formatType === "fraction") {
      return `${calculatedNum} / ${total}`;
    } else if (formatType === "detailed") {
      return `Halaman ${calculatedNum} dari ${total}`;
    } else if (formatType === "roman") {
      return toRoman(calculatedNum);
    }
    return `${calculatedNum}`;
  };

  const applyPageNumbers = async () => {
    if (!file) return;
    setIsProcessing(true);

    try {
      const buffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buffer);
      const docPages = pdfDoc.getPages();
      const total = docPages.length;
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const color = hexToRgb(textColor);

      let currentNum = startNumber;

      for (let i = 0; i < total; i++) {
        if (i === 0 && skipFirstPage && total > 1) {
          continue;
        }

        let labelText = "";
        if (formatType === "simple") {
          labelText = `${currentNum}`;
        } else if (formatType === "prefix") {
          labelText = `Hal. ${currentNum}`;
        } else if (formatType === "fraction") {
          labelText = `${currentNum} / ${total}`;
        } else if (formatType === "detailed") {
          labelText = `Halaman ${currentNum} dari ${total}`;
        } else if (formatType === "roman") {
          labelText = toRoman(currentNum);
        }

        const page = docPages[i];
        const { width, height } = page.getSize();
        const textWidth = helvetica.widthOfTextAtSize(labelText, fontSize);

        let x = 0;
        let y = 0;

        if (position.includes("bottom")) {
          y = margin;
        } else {
          y = height - margin - fontSize;
        }

        if (position.includes("center")) {
          x = (width - textWidth) / 2;
        } else if (position.includes("right")) {
          x = width - margin - textWidth;
        } else if (position.includes("left")) {
          x = margin;
        }

        page.drawText(labelText, {
          x,
          y,
          size: fontSize,
          font: helvetica,
          color,
        });

        currentNum++;
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setNumberedPdfUrl(url);
    } catch (error) {
      console.error("Error numbering PDF:", error);
      alert("Gagal menambahkan nomor halaman pada PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  const currentPage = pages[activePageIndex];
  const currentLabel = getPageLabel(activePageIndex);
  const isNumbered = currentLabel !== null;

  // Calculate SVG preview position coordinates
  const getSvgCoordinates = () => {
    if (!currentPage) return { x: 0, y: 0, textAnchor: "middle" as const };
    const { width, height } = currentPage;

    let x = width / 2;
    let y = height - margin;
    let textAnchor: "start" | "middle" | "end" = "middle";

    if (position.includes("bottom")) {
      y = height - margin;
    } else {
      y = margin + fontSize;
    }

    if (position.includes("center")) {
      x = width / 2;
      textAnchor = "middle";
    } else if (position.includes("right")) {
      x = width - margin;
      textAnchor = "end";
    } else if (position.includes("left")) {
      x = margin;
      textAnchor = "start";
    }

    return { x, y, textAnchor };
  };

  const svgPos = getSvgCoordinates();

  return (
    <div className="container mx-auto px-4 sm:px-6 md:px-10 py-8 sm:py-12 max-w-5xl">
      {/* Header */}
      <div className="text-center mb-8 sm:mb-12">
        <div className="inline-flex items-center justify-center p-3.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-2xl mb-4 sm:mb-6 shadow-sm border border-blue-100 dark:border-blue-900/50">
          <FileDigit size={30} strokeWidth={1.75} />
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight mb-2 sm:mb-4">
          Tambah Nomor Halaman PDF
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-lg max-w-xl mx-auto leading-relaxed">
          Sisipkan nomor halaman otomatis di header atau footer dokumen dengan pratinjau langsung secara real-time.
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
                <Loader2 size={36} className="text-blue-500 animate-spin mb-4" />
                <p className="text-slate-600 dark:text-slate-300 font-medium text-sm">Sedang memuat pratinjau halaman PDF...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Controls & Settings */}
                <div className="lg:col-span-6 space-y-5">
                  <div className="p-4 sm:p-5 bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 space-y-5">
                    {/* Format Selection */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-800 dark:text-slate-100 mb-2.5">
                        Format Penomoran
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {[
                          { id: "simple", label: "1, 2, 3", example: "1" },
                          { id: "prefix", label: "Hal. X", example: "Hal. 1" },
                          { id: "fraction", label: "X / Total", example: "1 / 10" },
                          { id: "detailed", label: "Halaman X dari Y", example: "Halaman 1 dari 10" },
                          { id: "roman", label: "Romawi", example: "i, ii, iii" },
                        ].map((fmt) => (
                          <button
                            key={fmt.id}
                            type="button"
                            onClick={() => setFormatType(fmt.id)}
                            className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all ${
                              formatType === fmt.id
                                ? "border-blue-600 dark:border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold shadow-sm"
                                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            <span className="text-xs">{fmt.label}</span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{fmt.example}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Position Selector */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-800 dark:text-slate-100 mb-2.5">
                        Posisi Nomor Halaman
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: "top-left", label: "Atas Kiri" },
                          { id: "top-center", label: "Atas Tengah" },
                          { id: "top-right", label: "Atas Kanan" },
                          { id: "bottom-left", label: "Bawah Kiri" },
                          { id: "bottom-center", label: "Bawah Tengah" },
                          { id: "bottom-right", label: "Bawah Kanan" },
                        ].map((pos) => (
                          <button
                            key={pos.id}
                            type="button"
                            onClick={() => setPosition(pos.id as any)}
                            className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all text-center ${
                              position === pos.id
                                ? "border-blue-600 dark:border-blue-500 bg-blue-600 text-white shadow-sm"
                                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
                            }`}
                          >
                            {pos.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Options & Sliders */}
                    <div className="space-y-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={skipFirstPage}
                            onChange={(e) => setSkipFirstPage(e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                          />
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                            Lewati Halaman Pertama (Cover)
                          </span>
                        </label>

                        <div className="flex items-center gap-2">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Mulai dari:
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={startNumber}
                            onChange={(e) => setStartNumber(Number(e.target.value) || 1)}
                            className="w-16 px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-100 text-center"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Ukuran ({fontSize}pt)
                          </label>
                          <input
                            type="range"
                            min="8"
                            max="20"
                            value={fontSize}
                            onChange={(e) => setFontSize(Number(e.target.value))}
                            className="w-full accent-blue-600"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Jarak Margin ({margin}pt)
                          </label>
                          <input
                            type="range"
                            min="10"
                            max="60"
                            value={margin}
                            onChange={(e) => setMargin(Number(e.target.value))}
                            className="w-full accent-blue-600"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Warna
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={textColor}
                              onChange={(e) => setTextColor(e.target.value)}
                              className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5"
                            />
                            <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400">{textColor}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={applyPageNumbers}
                    disabled={isProcessing}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md flex items-center justify-center gap-2 text-sm"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Menambahkan Nomor Halaman...</span>
                      </>
                    ) : (
                      <>
                        <FileDigit size={16} />
                        <span>Terapkan Nomor Halaman Sekarang</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Right Column: Interactive Real-Time Live Preview */}
                <div className="lg:col-span-6 flex flex-col items-center">
                  <div className="flex items-center justify-between w-full mb-3 px-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide flex items-center gap-1.5">
                        <Eye size={14} className="text-blue-500" />
                        Live Preview Real-Time
                      </span>
                      {isNumbered ? (
                        <span className="text-[10px] bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-semibold border border-blue-200 dark:border-blue-800">
                          Nomor: {currentLabel}
                        </span>
                      ) : (
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-semibold">
                          Dilewati (Cover/Hal 1)
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

                  {/* Document Preview Box with Vector SVG Overlay */}
                  {currentPage && (
                    <div
                      className="relative border-2 border-slate-300 dark:border-slate-700 rounded-2xl overflow-hidden shadow-xl bg-white select-none max-w-full flex items-center justify-center min-h-[360px]"
                    >
                      <img
                        src={currentPage.imageUrl}
                        alt={`Halaman ${currentPage.pageNumber}`}
                        className="max-h-[58vh] object-contain pointer-events-none"
                      />

                      {/* Vector SVG Number Overlay */}
                      {isNumbered && currentLabel && (
                        <svg
                          viewBox={`0 0 ${currentPage.width} ${currentPage.height}`}
                          className="absolute inset-0 w-full h-full pointer-events-none"
                        >
                          <text
                            x={svgPos.x}
                            y={svgPos.y}
                            textAnchor={svgPos.textAnchor}
                            fill={textColor}
                            fontSize={fontSize}
                            fontFamily="Helvetica, Arial, sans-serif"
                            className="select-none"
                          >
                            {currentLabel}
                          </text>
                        </svg>
                      )}
                    </div>
                  )}

                  <p className="text-[11px] text-slate-400 mt-2.5 text-center">
                    Pratinjau nomor halaman di atas terupdate secara otomatis dan presisi 100% dengan file unduhan.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Download Success Card */}
      {numberedPdfUrl && (
        <div
          ref={downloadRef}
          className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 p-6 sm:p-8 rounded-3xl text-center shadow-sm backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          <div className="inline-flex items-center justify-center p-3 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-full mb-4">
            <CheckCircle2 size={28} />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-emerald-950 dark:text-emerald-100 mb-2">Nomor Halaman Berhasil Diterapkan!</h3>
          <p className="text-xs sm:text-sm text-emerald-800/80 dark:text-emerald-400 mb-6 max-w-md mx-auto">
            Semua nomor halaman telah disisipkan sesuai posisi dan format yang dipilih.
          </p>
          <a
            href={numberedPdfUrl}
            download={`numbered-${file?.name || "document.pdf"}`}
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
