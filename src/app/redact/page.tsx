"use client";

import { useState, useRef, useEffect } from "react";
import { PDFDocument, rgb } from "pdf-lib";
import {
  EyeOff,
  Trash2,
  Download,
  Loader2,
  CheckCircle2,
  Square,
  Sparkles,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Dropzone from "@/components/Dropzone";

interface RedactBox {
  id: string;
  pageIndex: number;
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
  type: "black" | "white" | "blur";
}

interface PageInfo {
  pageNumber: number;
  imageUrl: string;
  width: number;
  height: number;
}

export default function RedactPDF() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [selectedPageIndex, setSelectedPageIndex] = useState<number>(0);
  const [isLoadingPages, setIsLoadingPages] = useState<boolean>(false);

  // Redaction settings
  const [boxes, setBoxes] = useState<RedactBox[]>([]);
  const [censorType, setCensorType] = useState<"black" | "white" | "blur">("blur");

  // Zoom control
  const [zoomScale, setZoomScale] = useState<number>(1.25);

  // Dragging / drawing new box
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentBox, setCurrentBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [redactedPdfUrl, setRedactedPdfUrl] = useState<string | null>(null);
  const downloadRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to download section when processing is completed
  useEffect(() => {
    if (redactedPdfUrl) {
      setTimeout(() => {
        downloadRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 150);
    }
  }, [redactedPdfUrl]);

  const handleFileDrop = async (files: File[]) => {
    if (files && files[0] && files[0].type === "application/pdf") {
      const selected = files[0];
      setFile(selected);
      setRedactedPdfUrl(null);
      setPages([]);
      setBoxes([]);
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
          const viewport = page.getViewport({ scale: 1.75 });
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (ctx) {
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: ctx, viewport } as any).promise;
            list.push({
              pageNumber: i,
              imageUrl: canvas.toDataURL("image/jpeg", 0.9),
              width: page.view[2] - page.view[0] || viewport.width / 1.75,
              height: page.view[3] - page.view[1] || viewport.height / 1.75,
            });
          }
        }
        setPages(list);
        setSelectedPageIndex(0);
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
    setBoxes([]);
    setRedactedPdfUrl(null);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setIsDrawing(true);
    setStartPos({ x, y });
    setCurrentBox({ x, y, w: 0, h: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !startPos) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const currentX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const currentY = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    const minX = Math.min(startPos.x, currentX);
    const minY = Math.min(startPos.y, currentY);
    const w = Math.abs(currentX - startPos.x);
    const h = Math.abs(currentY - startPos.y);

    setCurrentBox({ x: minX, y: minY, w, h });
  };

  const handleMouseUp = () => {
    if (isDrawing && currentBox && currentBox.w > 0.5 && currentBox.h > 0.5) {
      const newBox: RedactBox = {
        id: `box-${Date.now()}`,
        pageIndex: selectedPageIndex,
        xPercent: currentBox.x,
        yPercent: currentBox.y,
        widthPercent: currentBox.w,
        heightPercent: currentBox.h,
        type: censorType,
      };
      setBoxes((prev) => [...prev, newBox]);
    }
    setIsDrawing(false);
    setStartPos(null);
    setCurrentBox(null);
  };

  const removeBox = (id: string) => {
    setBoxes(boxes.filter((b) => b.id !== id));
  };

  const clearCurrentPageBoxes = () => {
    setBoxes(boxes.filter((b) => b.pageIndex !== selectedPageIndex));
  };

  const processRedaction = async () => {
    if (!file || boxes.length === 0) {
      alert("Tentukan setidaknya satu area sensor pada dokumen.");
      return;
    }

    setIsProcessing(true);

    try {
      const buffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buffer);
      const pdfPages = pdfDoc.getPages();

      const hasBlurBoxes = boxes.some((b) => b.type === "blur");
      let pdfjsDoc: any = null;

      if (hasBlurBoxes) {
        const pdfjsLib = await import("pdfjs-dist");
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
        }
        pdfjsDoc = await pdfjsLib.getDocument({ data: buffer.slice(0) }).promise;
      }

      // Group boxes by page
      for (let pIdx = 0; pIdx < pdfPages.length; pIdx++) {
        const pageBoxes = boxes.filter((b) => b.pageIndex === pIdx);
        if (pageBoxes.length === 0) continue;

        const page = pdfPages[pIdx];
        const { width: pdfW, height: pdfH } = page.getSize();

        const pageBlurBoxes = pageBoxes.filter((b) => b.type === "blur");
        let pageCanvas: HTMLCanvasElement | null = null;
        let pageCtx: CanvasRenderingContext2D | null = null;

        if (pageBlurBoxes.length > 0 && pdfjsDoc) {
          const pdfjsPage = await pdfjsDoc.getPage(pIdx + 1);
          const viewport = pdfjsPage.getViewport({ scale: 2.5 }); // High-DPI rasterization
          pageCanvas = document.createElement("canvas");
          pageCanvas.width = viewport.width;
          pageCanvas.height = viewport.height;
          pageCtx = pageCanvas.getContext("2d");
          if (pageCtx) {
            await pdfjsPage.render({ canvasContext: pageCtx, viewport }).promise;
          }
        }

        for (const box of pageBoxes) {
          const boxW = (box.widthPercent / 100) * pdfW;
          const boxH = (box.heightPercent / 100) * pdfH;
          const boxX = (box.xPercent / 100) * pdfW;
          const boxY = pdfH - (box.yPercent / 100) * pdfH - boxH;

          if (box.type === "black") {
            page.drawRectangle({
              x: boxX,
              y: boxY,
              width: boxW,
              height: boxH,
              color: rgb(0, 0, 0),
            });
          } else if (box.type === "white") {
            page.drawRectangle({
              x: boxX,
              y: boxY,
              width: boxW,
              height: boxH,
              color: rgb(1, 1, 1),
            });
          } else if (box.type === "blur" && pageCanvas && pageCtx) {
            const rawX = (box.xPercent / 100) * pageCanvas.width;
            const rawY = (box.yPercent / 100) * pageCanvas.height;
            const rawW = Math.max(2, (box.widthPercent / 100) * pageCanvas.width);
            const rawH = Math.max(2, (box.heightPercent / 100) * pageCanvas.height);

            // Sample with 20px padding to avoid dark edge bleeding
            const pad = 24;
            const srcX = Math.max(0, rawX - pad);
            const srcY = Math.max(0, rawY - pad);
            const srcW = Math.min(pageCanvas.width - srcX, rawW + pad * 2);
            const srcH = Math.min(pageCanvas.height - srcY, rawH + pad * 2);

            const tempCanvas = document.createElement("canvas");
            tempCanvas.width = Math.round(srcW);
            tempCanvas.height = Math.round(srcH);
            const tempCtx = tempCanvas.getContext("2d")!;
            tempCtx.drawImage(pageCanvas, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);

            // High aesthetic Gaussian optical blur
            tempCtx.filter = "blur(12px)";
            tempCtx.drawImage(tempCanvas, 0, 0);
            tempCtx.filter = "blur(8px)";
            tempCtx.drawImage(tempCanvas, 0, 0);

            // Extract central cropped patch without border artifacts
            const patchCanvas = document.createElement("canvas");
            patchCanvas.width = Math.round(rawW);
            patchCanvas.height = Math.round(rawH);
            const patchCtx = patchCanvas.getContext("2d");

            if (patchCtx) {
              const cropOffsetX = rawX - srcX;
              const cropOffsetY = rawY - srcY;
              patchCtx.drawImage(tempCanvas, cropOffsetX, cropOffsetY, rawW, rawH, 0, 0, patchCanvas.width, patchCanvas.height);

              const patchDataUrl = patchCanvas.toDataURL("image/png");
              const patchRes = await fetch(patchDataUrl);
              const patchBytes = await patchRes.arrayBuffer();
              const embeddedPatch = await pdfDoc.embedPng(patchBytes);

              page.drawImage(embeddedPatch, {
                x: boxX,
                y: boxY,
                width: boxW,
                height: boxH,
              });
            }
          }
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setRedactedPdfUrl(url);
    } catch (error) {
      console.error("Error applying redaction:", error);
      alert("Gagal menerapkan sensor data pada PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  const currentPage = pages[selectedPageIndex];
  const currentPageBoxes = boxes.filter((b) => b.pageIndex === selectedPageIndex);

  return (
    <div className="container mx-auto px-3 sm:px-6 md:px-8 py-6 sm:py-10 max-w-6xl">
      {/* Header */}
      <div className="text-center mb-6 sm:mb-10">
        <div className="inline-flex items-center justify-center p-3.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-2xl mb-3 sm:mb-4 shadow-sm border border-rose-100 dark:border-rose-900/50">
          <EyeOff size={30} strokeWidth={1.75} />
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">
          Sensor / Redact PDF
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-base max-w-xl mx-auto leading-relaxed">
          Tutup permanen data sensitif seperti NIK, kontak, atau nomor rekening dengan pilihan Blur Kaca, Hitam, atau Putih.
        </p>
      </div>

      {/* Main Studio Container */}
      <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-4 sm:p-7 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] border border-white/80 dark:border-slate-800 mb-8 transition-colors">
        {!file ? (
          <Dropzone onFileDrop={handleFileDrop} accept="application/pdf" className="h-64" />
        ) : (
          <div className="mt-1">
            {/* File Info Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 mb-5 gap-3">
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-100 text-xs sm:text-sm">{file.name}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Total {pages.length} Halaman • {boxes.length} Area Tersensor</p>
              </div>
              <button
                onClick={removeFile}
                className="inline-flex items-center justify-center gap-2 px-3.5 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-xl transition-colors font-medium border border-red-200/60 dark:border-red-900/50"
              >
                <Trash2 size={14} />
                Ganti File
              </button>
            </div>

            {isLoadingPages ? (
              <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                <Loader2 size={36} className="text-rose-500 animate-spin mb-4" />
                <p className="text-slate-600 dark:text-slate-300 font-medium text-sm">Sedang memuat lembar kerja dokumen...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Tools, Types, and Page Navigation */}
                <div className="lg:col-span-4 space-y-4">
                  <div className="p-4 bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 space-y-4">
                    {/* Page Selector & Navigator */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Pilih Halaman:
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedPageIndex((prev) => Math.max(0, prev - 1))}
                          disabled={selectedPageIndex === 0}
                          className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 disabled:opacity-30"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <select
                          value={selectedPageIndex}
                          onChange={(e) => setSelectedPageIndex(Number(e.target.value))}
                          className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100"
                        >
                          {pages.map((p, idx) => (
                            <option key={idx} value={idx}>
                              Halaman {p.pageNumber} of {pages.length}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setSelectedPageIndex((prev) => Math.min(pages.length - 1, prev + 1))}
                          disabled={selectedPageIndex === pages.length - 1}
                          className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 disabled:opacity-30"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Sensor Style Selector (Blur, Black, White) */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Gaya Sensor:
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setCensorType("blur")}
                          className={`py-2.5 px-2 rounded-xl text-xs font-semibold border flex flex-col items-center justify-center gap-1 transition-all ${
                            censorType === "blur"
                              ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                              : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          <Sparkles size={14} className="text-amber-300" />
                          <span>Blur Kaca</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setCensorType("black")}
                          className={`py-2.5 px-2 rounded-xl text-xs font-semibold border flex flex-col items-center justify-center gap-1 transition-all ${
                            censorType === "black"
                              ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                              : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          <Square size={14} className="fill-black text-black" />
                          <span>Hitam</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setCensorType("white")}
                          className={`py-2.5 px-2 rounded-xl text-xs font-semibold border flex flex-col items-center justify-center gap-1 transition-all ${
                            censorType === "white"
                              ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-sm"
                              : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          <Square size={14} className="fill-white text-slate-400" />
                          <span>Putih</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Active boxes on current page */}
                  <div className="p-4 bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl border border-slate-200/70 dark:border-slate-700/60">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Sensor di Halaman Ini ({currentPageBoxes.length})
                      </span>
                      {currentPageBoxes.length > 0 && (
                        <button
                          type="button"
                          onClick={clearCurrentPageBoxes}
                          className="text-[11px] text-red-500 hover:text-red-700 font-semibold"
                        >
                          Hapus Semua
                        </button>
                      )}
                    </div>

                    {currentPageBoxes.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-3">
                        Tarik kursor di atas dokumen untuk menempelkan kotak sensor.
                      </p>
                    ) : (
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
                        {currentPageBoxes.map((b, idx) => (
                          <div
                            key={b.id}
                            className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs"
                          >
                            <span className="text-slate-700 dark:text-slate-300 font-medium capitalize">
                              Sensor #{idx + 1} ({b.type === "blur" ? "Blur Kaca" : b.type})
                            </span>
                            <button
                              type="button"
                              onClick={() => removeBox(b.id)}
                              className="text-red-400 hover:text-red-600 p-1"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={processRedaction}
                    disabled={isProcessing || boxes.length === 0}
                    className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md flex items-center justify-center gap-2 text-xs sm:text-sm"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Menerapkan Sensor...</span>
                      </>
                    ) : (
                      <>
                        <EyeOff size={16} />
                        <span>Terapkan {boxes.length} Sensor & Unduh</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Right Column: Large Interactive Studio Workbench with Zoom Controls */}
                <div className="lg:col-span-8 flex flex-col items-center">
                  {/* Top Workbench Toolbar */}
                  <div className="flex flex-wrap items-center justify-between w-full mb-3 px-1 gap-2">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Tarik kotak pada teks yang ingin disensor (Hal. {selectedPageIndex + 1})
                    </span>

                    {/* Zoom Toolbar */}
                    <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-1 shadow-sm">
                      <button
                        type="button"
                        onClick={() => setZoomScale((prev) => Math.max(0.8, prev - 0.25))}
                        disabled={zoomScale <= 0.8}
                        className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg disabled:opacity-30 transition-colors"
                        title="Zoom Out"
                      >
                        <ZoomOut size={14} />
                      </button>

                      <span className="text-xs font-mono font-semibold px-1 text-slate-700 dark:text-slate-300 min-w-[45px] text-center">
                        {Math.round(zoomScale * 100)}%
                      </span>

                      <button
                        type="button"
                        onClick={() => setZoomScale((prev) => Math.min(2.5, prev + 0.25))}
                        disabled={zoomScale >= 2.5}
                        className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg disabled:opacity-30 transition-colors"
                        title="Zoom In"
                      >
                        <ZoomIn size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={() => setZoomScale(1.0)}
                        className="px-2 py-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border-l border-slate-200 dark:border-slate-700 transition-colors"
                        title="Reset 100%"
                      >
                        Reset
                      </button>
                    </div>
                  </div>

                  {/* Scrollable Large Document Workbench */}
                  <div className="w-full max-h-[70vh] overflow-auto p-4 sm:p-6 bg-slate-100 dark:bg-slate-950/80 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-start justify-center custom-scrollbar">
                    {currentPage && (
                      <div
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        style={{
                          width: `${zoomScale * 100}%`,
                          maxWidth: `${Math.max(100, zoomScale * 100)}%`,
                        }}
                        className="relative border-2 border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden shadow-2xl bg-white cursor-crosshair select-none transition-all duration-100"
                      >
                        <img
                          src={currentPage.imageUrl}
                          alt={`Halaman ${currentPage.pageNumber}`}
                          className="w-full h-auto block pointer-events-none"
                        />

                        {/* Saved Redact Boxes */}
                        {currentPageBoxes.map((b) => (
                          <div
                            key={b.id}
                            style={{
                              left: `${b.xPercent}%`,
                              top: `${b.yPercent}%`,
                              width: `${b.widthPercent}%`,
                              height: `${b.heightPercent}%`,
                            }}
                            className={`absolute pointer-events-none rounded-[2px] ${
                              b.type === "black"
                                ? "bg-black border border-black"
                                : b.type === "white"
                                ? "bg-white border border-slate-300 shadow-sm"
                                : "backdrop-blur-[6px] backdrop-saturate-150 bg-white/20 border border-white/60 shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                            }`}
                          />
                        ))}

                        {/* Active Drawing Box */}
                        {isDrawing && currentBox && (
                          <div
                            style={{
                              left: `${currentBox.x}%`,
                              top: `${currentBox.y}%`,
                              width: `${currentBox.w}%`,
                              height: `${currentBox.h}%`,
                            }}
                            className={`absolute pointer-events-none rounded-[2px] border-2 border-dashed ${
                              censorType === "black"
                                ? "bg-black/80 border-rose-500"
                                : censorType === "white"
                                ? "bg-white/80 border-rose-500"
                                : "backdrop-blur-[6px] bg-white/30 border-blue-500"
                            }`}
                          />
                        )}
                      </div>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-400 mt-2 text-center">
                    💡 Gunakan fitur Zoom In (+) di atas untuk memperbesar halaman dan menyeleksi kata atau tanda tangan dengan sangat detail.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Download Card with Ref for Auto-Scroll */}
      {redactedPdfUrl && (
        <div
          ref={downloadRef}
          className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 p-6 sm:p-8 rounded-3xl text-center shadow-sm backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          <div className="inline-flex items-center justify-center p-3 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-full mb-4">
            <CheckCircle2 size={28} />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-emerald-950 dark:text-emerald-100 mb-2">Data Sensitif Berhasil Disensor!</h3>
          <p className="text-xs sm:text-sm text-emerald-800/80 dark:text-emerald-400 mb-6 max-w-md mx-auto">
            Semua area yang ditandai telah ditutup secara permanen dan dokumen siap diunduh.
          </p>
          <a
            href={redactedPdfUrl}
            download={`redacted-${file?.name || "document.pdf"}`}
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
