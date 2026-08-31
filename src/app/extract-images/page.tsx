"use client";

import { useState, useRef, useEffect } from "react";
import {
  Images,
  Trash2,
  Download,
  Loader2,
  CheckCircle2,
  Archive,
  Eye,
  FileImage,
} from "lucide-react";
import Dropzone from "@/components/Dropzone";
import JSZip from "jszip";

interface ExtractedImage {
  id: string;
  pageNumber: number;
  dataUrl: string;
  width: number;
  height: number;
  filename: string;
}

export default function ExtractImagesPDF() {
  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [images, setImages] = useState<ExtractedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [zipUrl, setZipUrl] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<ExtractedImage | null>(null);
  const downloadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (images.length > 0) {
      setTimeout(() => {
        downloadRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
    }
  }, [images]);

  const handleFileDrop = async (files: File[]) => {
    if (files && files[0] && files[0].type === "application/pdf") {
      const selected = files[0];
      setFile(selected);
      setImages([]);
      setZipUrl(null);
      setIsProcessing(true);

      try {
        const buffer = await selected.arrayBuffer();
        const pdfjsLib = await import("pdfjs-dist");
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
        }
        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
        const total = pdf.numPages;
        setTotalPages(total);

        const extracted: ExtractedImage[] = [];
        const zip = new JSZip();

        for (let i = 1; i <= total; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.75 }); // High-res extraction
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d");

          if (ctx) {
            await page.render({ canvasContext: ctx, viewport } as any).promise;
            const dataUrl = canvas.toDataURL("image/png", 0.95);
            const filename = `${selected.name.replace(/\.[^/.]+$/, "")}_hal_${i}.png`;

            extracted.push({
              id: `img-${i}`,
              pageNumber: i,
              dataUrl,
              width: Math.round(viewport.width),
              height: Math.round(viewport.height),
              filename,
            });

            // Add to zip
            const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
            zip.file(filename, base64Data, { base64: true });
          }
        }

        setImages(extracted);

        if (extracted.length > 0) {
          const zipBlob = await zip.generateAsync({ type: "blob" });
          setZipUrl(URL.createObjectURL(zipBlob));
        }
      } catch (error) {
        console.error("Error extracting images:", error);
        alert("Gagal mengekstrak gambar dari file PDF.");
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const removeFile = () => {
    setFile(null);
    setTotalPages(0);
    setImages([]);
    setZipUrl(null);
    setPreviewImage(null);
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 md:px-10 py-8 sm:py-12 max-w-5xl">
      <div className="text-center mb-8 sm:mb-12">
        <div className="inline-flex items-center justify-center p-3.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-2xl mb-4 sm:mb-6 shadow-sm border border-emerald-100 dark:border-emerald-900/50">
          <Images size={30} strokeWidth={1.75} />
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight mb-2 sm:mb-4">
          Ekstrak Gambar dari PDF
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-lg max-w-xl mx-auto leading-relaxed">
          Ambil seluruh gambar dan halaman dokumen PDF Anda dalam kualitas tinggi dan unduh sekaligus via ZIP.
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

            {isProcessing ? (
              <div className="flex flex-col items-center justify-center py-16 bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                <Loader2 size={36} className="text-emerald-500 animate-spin mb-4" />
                <p className="text-slate-600 dark:text-slate-300 font-medium text-sm">Sedang mengekstrak seluruh gambar PDF...</p>
              </div>
            ) : (
              <div>
                <div
                  ref={downloadRef}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-6 border-b border-slate-200/60 dark:border-slate-700/60"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-xl font-bold text-xs">
                      {images.length} Gambar Ditemukan
                    </span>
                  </div>

                  {zipUrl && (
                    <a
                      href={zipUrl}
                      download={`extracted_images_${file?.name?.replace(/\.[^/.]+$/, "") || "pdf"}.zip`}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs sm:text-sm shadow-sm hover:shadow transition-all"
                    >
                      <Archive size={16} />
                      <span>Unduh Semua Gambar (ZIP)</span>
                    </a>
                  )}
                </div>

                {/* Images Gallery Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[560px] overflow-y-auto p-2 pr-3 custom-scrollbar">
                  {images.map((img) => (
                    <div
                      key={img.id}
                      className="group bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div
                        onClick={() => setPreviewImage(img)}
                        className="relative w-full aspect-[1/1.3] bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden flex items-center justify-center border border-slate-200/60 dark:border-slate-700 mb-2 cursor-pointer"
                      >
                        <img
                          src={img.dataUrl}
                          alt={img.filename}
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <Eye size={18} />
                        </div>
                      </div>

                      <div className="flex items-center justify-between px-1 mb-2">
                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          Halaman {img.pageNumber}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {img.width}x{img.height}
                        </span>
                      </div>

                      <a
                        href={img.dataUrl}
                        download={img.filename}
                        className="w-full py-1.5 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Download size={13} />
                        <span>Unduh PNG</span>
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* High-res Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative flex flex-col max-w-3xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
              <span className="font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-100">
                {previewImage.filename} ({previewImage.width}x{previewImage.height} px)
              </span>
              <a
                href={previewImage.dataUrl}
                download={previewImage.filename}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1"
              >
                <Download size={13} />
                <span>Unduh</span>
              </a>
            </div>

            <div className="p-4 bg-slate-100/60 dark:bg-slate-950 overflow-auto flex items-center justify-center">
              <img
                src={previewImage.dataUrl}
                alt={previewImage.filename}
                className="max-h-[70vh] object-contain rounded-xl shadow"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
