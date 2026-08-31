"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import {
  PenTool,
  Trash2,
  Download,
  Loader2,
  CheckCircle2,
  RotateCcw,
  Upload as UploadIcon,
  Eraser,
  Move,
} from "lucide-react";
import Dropzone from "@/components/Dropzone";

interface PageInfo {
  pageNumber: number;
  imageUrl: string;
  width: number;
  height: number;
}

export default function SignPDF() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [selectedPageIndex, setSelectedPageIndex] = useState<number>(0);
  const [isLoadingPages, setIsLoadingPages] = useState<boolean>(false);

  // Signature source: "draw" | "upload"
  const [sigSource, setSigSource] = useState<"draw" | "upload">("draw");
  const [penColor, setPenColor] = useState<string>("#000000");
  const [penWidth, setPenWidth] = useState<number>(3);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);

  // Signature Placement
  const [sigPos, setSigPos] = useState<{ xPercent: number; yPercent: number }>({ xPercent: 50, yPercent: 75 });
  const [sigScale, setSigScale] = useState<number>(0.25); // percentage of page width

  const [isProcessing, setIsProcessing] = useState(false);
  const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null);
  const downloadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (signedPdfUrl) {
      setTimeout(() => {
        downloadRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 150);
    }
  }, [signedPdfUrl]);

  // Canvas Refs for Drawing
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const handleFileDrop = async (files: File[]) => {
    if (files && files[0] && files[0].type === "application/pdf") {
      const selected = files[0];
      setFile(selected);
      setSignedPdfUrl(null);
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
          const viewport = page.getViewport({ scale: 1.0 });
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (ctx) {
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: ctx, viewport } as any).promise;
            list.push({
              pageNumber: i,
              imageUrl: canvas.toDataURL("image/jpeg", 0.8),
              width: viewport.width,
              height: viewport.height,
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
    setSignedPdfUrl(null);
    setSignatureDataUrl(null);
  };

  // Drawing Canvas logic
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      setSignatureDataUrl(canvas.toDataURL("image/png"));
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setSignatureDataUrl(null);
      }
    }
  };

  // Upload signature with auto background transparency
  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files?.[0];
    if (!uploaded) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imgData.data;

          // Convert near-white pixels to transparent
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            if (r > 200 && g > 200 && b > 200) {
              data[i + 3] = 0; // alpha
            }
          }
          ctx.putImageData(imgData, 0, 0);
          setSignatureDataUrl(canvas.toDataURL("image/png"));
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(uploaded);
  };

  // Drag Placement on Page
  const handlePageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setSigPos({ xPercent: x, yPercent: y });
  };

  const applySignature = async () => {
    if (!file || !signatureDataUrl || pages.length === 0) {
      alert("Harap buat atau unggah tanda tangan terlebih dahulu.");
      return;
    }

    setIsProcessing(true);
    try {
      const buffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buffer);
      const targetPage = pdfDoc.getPages()[selectedPageIndex];
      const { width, height } = targetPage.getSize();

      const imgRes = await fetch(signatureDataUrl);
      const imgBytes = await imgRes.arrayBuffer();
      const pngImage = await pdfDoc.embedPng(imgBytes);

      const targetWidth = width * sigScale;
      const targetHeight = (pngImage.height / pngImage.width) * targetWidth;

      const pdfX = (sigPos.xPercent / 100) * width - targetWidth / 2;
      const pdfY = height - (sigPos.yPercent / 100) * height - targetHeight / 2;

      targetPage.drawImage(pngImage, {
        x: Math.max(0, pdfX),
        y: Math.max(0, pdfY),
        width: targetWidth,
        height: targetHeight,
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setSignedPdfUrl(url);
    } catch (error) {
      console.error("Error signing PDF:", error);
      alert("Gagal menandatangani PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  const currentPage = pages[selectedPageIndex];

  return (
    <div className="container mx-auto px-4 sm:px-6 md:px-10 py-8 sm:py-12 max-w-5xl">
      <div className="text-center mb-8 sm:mb-12">
        <div className="inline-flex items-center justify-center p-3.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-2xl mb-4 sm:mb-6 shadow-sm border border-emerald-100 dark:border-emerald-900/50">
          <PenTool size={30} strokeWidth={1.75} />
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight mb-2 sm:mb-4">
          Tanda Tangan PDF
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-lg max-w-xl mx-auto leading-relaxed">
          Bubuhkan tanda tangan atau paraf digital langsung pada dokumen PDF Anda dengan mudah.
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
                <Loader2 size={36} className="text-emerald-500 animate-spin mb-4" />
                <p className="text-slate-600 dark:text-slate-300 font-medium text-sm">Sedang memuat dokumen...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left: Signature Studio (Draw or Upload) */}
                <div className="lg:col-span-5 space-y-5">
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
                    <button
                      type="button"
                      onClick={() => setSigSource("draw")}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                        sigSource === "draw"
                          ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                          : "text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      Gambar Tanda Tangan
                    </button>
                    <button
                      type="button"
                      onClick={() => setSigSource("upload")}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                        sigSource === "upload"
                          ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                          : "text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      Unggah Gambar
                    </button>
                  </div>

                  {sigSource === "draw" ? (
                    <div className="space-y-3">
                      <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-950 overflow-hidden shadow-inner touch-none">
                        <canvas
                          ref={canvasRef}
                          width={380}
                          height={180}
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          onTouchStart={startDrawing}
                          onTouchMove={draw}
                          onTouchEnd={stopDrawing}
                          className="w-full h-[160px] sm:h-[180px] cursor-crosshair"
                        />
                        {!signatureDataUrl && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs">
                            Gambarkan tanda tangan Anda di sini
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          {["#000000", "#1e3a8a", "#dc2626"].map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => setPenColor(color)}
                              className={`w-6 h-6 rounded-full border-2 transition-transform ${
                                penColor === color ? "scale-125 border-slate-400" : "border-transparent"
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={clearCanvas}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                        >
                          <Eraser size={13} />
                          Hapus & Ulangi
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 text-center bg-slate-50/50 dark:bg-slate-800/30">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleSignatureUpload}
                          className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 dark:file:bg-emerald-950/60 dark:file:text-emerald-300 hover:file:bg-emerald-100 cursor-pointer"
                        />
                        <p className="text-[11px] text-slate-400 mt-2">
                          Latar belakang putih otomatis dibersihkan menjadi transparan.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Size & Page Control */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Pilih Halaman yang Ditandatangani:
                      </label>
                      <select
                        value={selectedPageIndex}
                        onChange={(e) => setSelectedPageIndex(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100"
                      >
                        {pages.map((p, idx) => (
                          <option key={idx} value={idx}>
                            Halaman {p.pageNumber}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Ukuran Tanda Tangan ({Math.round(sigScale * 100)}%)
                      </label>
                      <input
                        type="range"
                        min="0.1"
                        max="0.6"
                        step="0.05"
                        value={sigScale}
                        onChange={(e) => setSigScale(Number(e.target.value))}
                        className="w-full accent-emerald-600"
                      />
                    </div>
                  </div>

                  <button
                    onClick={applySignature}
                    disabled={isProcessing || !signatureDataUrl}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md flex items-center justify-center gap-2 text-sm"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Menerapkan Tanda Tangan...</span>
                      </>
                    ) : (
                      <>
                        <PenTool size={16} />
                        <span>Bubuhkan Tanda Tangan ke PDF</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Right: Interactive Page Preview & Signature Placement */}
                <div className="lg:col-span-7 flex flex-col items-center">
                  <div className="flex items-center justify-between w-full mb-3 px-1">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Pratinjau Halaman {selectedPageIndex + 1}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      💡 Klik pada area dokumen untuk memindahkan posisi tanda tangan
                    </span>
                  </div>

                  {currentPage && (
                    <div
                      onClick={handlePageClick}
                      className="relative border-2 border-slate-300 dark:border-slate-700 rounded-2xl overflow-hidden shadow-lg bg-white cursor-crosshair max-w-full"
                    >
                      <img
                        src={currentPage.imageUrl}
                        alt={`Halaman ${currentPage.pageNumber}`}
                        className="max-h-[60vh] object-contain select-none pointer-events-none"
                      />

                      {signatureDataUrl && (
                        <div
                          style={{
                            left: `${sigPos.xPercent}%`,
                            top: `${sigPos.yPercent}%`,
                            transform: "translate(-50%, -50%)",
                            width: `${sigScale * 100}%`,
                          }}
                          className="absolute pointer-events-none border-2 border-dashed border-emerald-500 bg-emerald-500/10 rounded-lg p-1 flex items-center justify-center animate-in zoom-in-50 duration-150"
                        >
                          <img
                            src={signatureDataUrl}
                            alt="Signature Preview"
                            className="w-full object-contain"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {signedPdfUrl && (
        <div
          ref={downloadRef}
          className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 p-6 sm:p-8 rounded-3xl text-center shadow-sm backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          <div className="inline-flex items-center justify-center p-3 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-full mb-4">
            <CheckCircle2 size={28} />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-emerald-950 dark:text-emerald-100 mb-2">Dokumen Berhasil Ditandatangani!</h3>
          <p className="text-xs sm:text-sm text-emerald-800/80 dark:text-emerald-400 mb-6 max-w-md mx-auto">
            Tanda tangan telah disematkan secara permanen ke halaman {selectedPageIndex + 1}.
          </p>
          <a
            href={signedPdfUrl}
            download={`signed-${file?.name || "document.pdf"}`}
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
