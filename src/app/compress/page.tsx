"use client";

import { useState, useRef, useEffect } from "react";
import { PDFDocument } from "pdf-lib";
import Dropzone from "@/components/Dropzone";
import { Minimize2, Trash2, Download, CheckCircle2 } from "lucide-react";

export default function CompressPDF() {
  const [file, setFile] = useState<File | null>(null);
  const [compressionLevel, setCompressionLevel] = useState<"extreme" | "recommended" | "less">("recommended");
  const [isProcessing, setIsProcessing] = useState(false);
  const [compressedPdfUrl, setCompressedPdfUrl] = useState<string | null>(null);
  const [originalSize, setOriginalSize] = useState<number>(0);
  const [compressedSize, setCompressedSize] = useState<number>(0);
  const downloadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (compressedPdfUrl) {
      setTimeout(() => {
        downloadRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 150);
    }
  }, [compressedPdfUrl]);

  const handleFileDrop = (files: File[]) => {
    if (files && files[0]) {
      const selectedFile = files[0];
      if (selectedFile.type === "application/pdf") {
        setFile(selectedFile);
        setOriginalSize(selectedFile.size);
        setCompressedPdfUrl(null);
      }
    }
  };

  const removeFile = () => {
    setFile(null);
    setCompressedPdfUrl(null);
    setOriginalSize(0);
    setCompressedSize(0);
  };

  const compressPdf = async () => {
    if (!file) return;
    setIsProcessing(true);

    try {
      const fileBuffer = await file.arrayBuffer();

      const pdfjsLib = await import("pdfjs-dist");
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
      }
      const pdf = await pdfjsLib.getDocument({ data: fileBuffer }).promise;
      const newPdfDoc = await PDFDocument.create();

      let scale = 1.5;
      let quality = 0.7;

      if (compressionLevel === "extreme") {
        scale = 1.0;
        quality = 0.5;
      } else if (compressionLevel === "less") {
        scale = 2.0;
        quality = 0.85;
      }

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) continue;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
        };

        await page.render(renderContext as any).promise;

        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        const imgRes = await fetch(dataUrl);
        const imgBuffer = await imgRes.arrayBuffer();

        const embeddedImage = await newPdfDoc.embedJpg(imgBuffer);
        const imgDims = embeddedImage.scale(1);

        const newPage = newPdfDoc.addPage([imgDims.width, imgDims.height]);
        newPage.drawImage(embeddedImage, {
          x: 0,
          y: 0,
          width: imgDims.width,
          height: imgDims.height,
        });
      }

      const compressedPdfBytes = await newPdfDoc.save();
      const finalSize = compressedPdfBytes.length;

      setCompressedSize(finalSize);

      const blob = new Blob([compressedPdfBytes as any], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setCompressedPdfUrl(url);
    } catch (error) {
      console.error("Error compressing PDF:", error);
      alert("Terjadi kesalahan saat mengompres PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 md:px-10 py-8 sm:py-12 max-w-4xl">
      <div className="text-center mb-8 sm:mb-12">
        <div className="inline-flex items-center justify-center p-3.5 bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 rounded-2xl mb-4 sm:mb-6 shadow-sm border border-sky-100 dark:border-sky-900/50">
          <Minimize2 size={30} strokeWidth={1.75} />
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight mb-2 sm:mb-4">
          Kompres PDF
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-lg max-w-xl mx-auto leading-relaxed">
          Perkecil ukuran file PDF Anda tanpa mengorbankan kualitas secara drastis.
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
                <p className="text-xs text-slate-500 dark:text-slate-400">{formatBytes(originalSize)}</p>
              </div>
              <button
                onClick={removeFile}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-xl transition-colors font-medium border border-red-200/60 dark:border-red-900/50"
                title="Hapus file"
              >
                <Trash2 size={16} strokeWidth={1.5} />
                Ganti File
              </button>
            </div>

            <div className="mb-6 sm:mb-8">
              <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-3 sm:mb-4 text-xs sm:text-sm uppercase tracking-wide">
                Pilih Tingkat Kompresi
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                {[
                  { id: "extreme", label: "Kompresi Ekstrem", desc: "Kualitas rendah, ukuran sangat kecil" },
                  { id: "recommended", label: "Kompresi Disarankan", desc: "Kualitas seimbang, kompresi ideal" },
                  { id: "less", label: "Kompresi Ringan", desc: "Kualitas tinggi, ukuran agak kecil" },
                ].map((level) => (
                  <button
                    key={level.id}
                    onClick={() => setCompressionLevel(level.id as any)}
                    className={`flex flex-col items-start p-4 sm:p-5 rounded-2xl border-2 transition-all duration-200 ${
                      compressionLevel === level.id
                        ? "border-sky-600 dark:border-sky-500 bg-sky-50/70 dark:bg-sky-950/40 text-slate-900 dark:text-white shadow-sm"
                        : "border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1.5">
                      <span className="font-semibold text-sm sm:text-base">
                        {level.label}
                      </span>
                      {compressionLevel === level.id && <CheckCircle2 size={18} className="text-sky-600 dark:text-sky-400" />}
                    </div>
                    <span className="text-xs text-left leading-relaxed text-slate-500 dark:text-slate-400">
                      {level.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-center mt-6 sm:mt-8">
              <button
                onClick={compressPdf}
                disabled={isProcessing}
                className="w-full sm:w-auto px-8 sm:px-10 py-3.5 sm:py-4 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl font-semibold focus:ring-4 focus:ring-sky-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm text-xs sm:text-base"
              >
                {isProcessing ? "Sedang Mengompres PDF..." : "Kompres PDF Sekarang"}
              </button>
            </div>
          </div>
        )}
      </div>

      {compressedPdfUrl && (
        <div
          ref={downloadRef}
          className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 p-6 sm:p-8 rounded-3xl text-center shadow-sm backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          <div className="inline-flex items-center justify-center p-3 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-full mb-4">
            <CheckCircle2 size={28} />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-emerald-950 dark:text-emerald-100 mb-2">PDF Berhasil Dikompres!</h3>
          <p className="text-xs sm:text-sm text-emerald-800/80 dark:text-emerald-400 mb-6 max-w-md mx-auto">
            Ukuran file berkurang dari <strong>{formatBytes(originalSize)}</strong> menjadi <strong>{formatBytes(compressedSize)}</strong> (Hemat {Math.max(0, Math.round(((originalSize - compressedSize) / originalSize) * 100))}%)
          </p>
          <a
            href={compressedPdfUrl}
            download={`compressed-${file?.name || "document.pdf"}`}
            className="inline-flex items-center justify-center gap-2.5 px-6 sm:px-8 py-3 sm:py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-semibold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
          >
            <Download size={18} strokeWidth={2} />
            Unduh PDF Sekarang
          </a>
        </div>
      )}
    </div>
  );
}
