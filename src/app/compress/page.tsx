"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import Dropzone from "@/components/Dropzone";
import { Minimize2, Upload, Trash2, Download, CheckCircle2 } from "lucide-react";

// Set worker later when needed

export default function CompressPDF() {
  const [file, setFile] = useState<File | null>(null);
  const [compressionLevel, setCompressionLevel] = useState<"extreme" | "recommended" | "less">("recommended");
  const [isProcessing, setIsProcessing] = useState(false);
  const [compressedPdfUrl, setCompressedPdfUrl] = useState<string | null>(null);
  const [originalSize, setOriginalSize] = useState<number>(0);
  const [compressedSize, setCompressedSize] = useState<number>(0);

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

      // Determine quality and scale based on compression level
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

        // Create a canvas to render the page
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) continue;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        // Render PDF page into canvas context
        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
        };

        await page.render(renderContext as any).promise;

        // Get JPEG image data from canvas
        const dataUrl = canvas.toDataURL("image/jpeg", quality);

        // Fetch the data URL as an array buffer to embed in pdf-lib
        const imgRes = await fetch(dataUrl);
        const imgBuffer = await imgRes.arrayBuffer();

        // Embed the JPEG image
        const embeddedImage = await newPdfDoc.embedJpg(imgBuffer);
        const imgDims = embeddedImage.scale(1);

        // Add a page matching the image dimensions
        const newPage = newPdfDoc.addPage([imgDims.width, imgDims.height]);
        newPage.drawImage(embeddedImage, {
          x: 0,
          y: 0,
          width: imgDims.width,
          height: imgDims.height,
        });
      }

      // Save the newly constructed compressed PDF
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
    <div className="container mx-auto px-6 py-12 max-w-4xl">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center p-3.5 bg-slate-100 text-slate-800 rounded-2xl mb-6 shadow-sm border border-slate-200/50">
          <Minimize2 size={32} strokeWidth={1.5} />
        </div>
        <h1 className="text-3xl md:text-4xl font-semibold text-slate-900 tracking-tight mb-4">Kompres PDF</h1>
        <p className="text-slate-500 text-lg">
          Perkecil ukuran file PDF Anda tanpa mengorbankan kualitas.
        </p>
      </div>

      <div className="bg-white/70 backdrop-blur-xl p-8 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-white/60 mb-10">
        {!file ? (
          <Dropzone onFileDrop={handleFileDrop} accept="application/pdf" className="h-64" />
        ) : (
          <div className="mt-4">
            <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-200 mb-8">
              <div>
                <p className="font-medium text-slate-800 mb-1">{file.name}</p>
                <p className="text-xs text-slate-500">{formatBytes(originalSize)}</p>
              </div>
              <button
                onClick={removeFile}
                className="p-2.5 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors"
                title="Hapus file"
              >
                <Trash2 size={20} strokeWidth={1.5} />
              </button>
            </div>

            <div className="mb-8">
              <h3 className="font-medium text-slate-800 mb-5 text-sm uppercase tracking-wide">Pilih Tingkat Kompresi</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { id: "extreme", label: "Kompresi Ekstrem", desc: "Kualitas rendah, ukuran sangat kecil" },
                  { id: "recommended", label: "Kompresi Disarankan", desc: "Kualitas baik, kompresi ideal" },
                  { id: "less", label: "Kompresi Ringan", desc: "Kualitas tinggi, ukuran agak kecil" },
                ].map((level) => (
                  <button
                    key={level.id}
                    onClick={() => setCompressionLevel(level.id as any)}
                    className={`flex flex-col items-start p-5 rounded-2xl border-2 transition-all duration-300 ${compressionLevel === level.id
                        ? "border-slate-800 bg-slate-900 text-white shadow-md"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      }`}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <span className={`font-semibold ${compressionLevel === level.id ? 'text-white' : 'text-slate-900'}`}>
                        {level.label}
                      </span>
                      {compressionLevel === level.id && <CheckCircle2 size={18} className="text-white" />}
                    </div>
                    <span className={`text-xs text-left leading-relaxed ${compressionLevel === level.id ? 'text-slate-300' : 'text-slate-500'}`}>
                      {level.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-center mt-10">
              <button
                onClick={compressPdf}
                disabled={isProcessing}
                className="w-full sm:w-auto px-10 py-4 bg-slate-900 text-white rounded-2xl font-medium hover:bg-slate-800 focus:ring-4 focus:ring-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                {isProcessing ? "Mengompresi PDF..." : "Kompres PDF"}
              </button>
            </div>
          </div>
        )}
      </div>

      {compressedPdfUrl && (
        <div className="bg-emerald-50/50 border border-emerald-100 p-8 rounded-3xl text-center shadow-sm">
          <div className="inline-flex items-center justify-center p-3 bg-emerald-100 text-emerald-700 rounded-full mb-4">
            <CheckCircle2 size={28} />
          </div>
          <h3 className="text-xl font-semibold text-emerald-900 mb-2">PDF Berhasil Dikompres!</h3>
          <p className="text-emerald-700/80 mb-8">
            Ukuran file Anda berkurang dari <strong>{formatBytes(originalSize)}</strong> menjadi <strong>{formatBytes(compressedSize)}</strong>
          </p>
          <a
            href={compressedPdfUrl}
            download={`compressed-${file?.name || "document"}`}
            className="inline-flex items-center justify-center gap-3 px-8 py-3.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 hover:shadow-md transition-all"
          >
            <Download size={20} strokeWidth={2} />
            Unduh PDF Sekarang
          </a>
        </div>
      )}
    </div>
  );
}
