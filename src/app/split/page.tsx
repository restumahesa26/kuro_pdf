"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { Scissors, Upload, Trash2, Download } from "lucide-react";
import JSZip from "jszip";
import Dropzone from "@/components/Dropzone";

export default function SplitPDF() {
  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [ranges, setRanges] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [splitPdfUrl, setSplitPdfUrl] = useState<string | null>(null);
  const [isZipOutput, setIsZipOutput] = useState(false);

  const handleFileDrop = async (files: File[]) => {
    if (files && files[0]) {
      const selectedFile = files[0];
      if (selectedFile.type === "application/pdf") {
        setFile(selectedFile);
        setSplitPdfUrl(null);
        setIsZipOutput(false);
        setRanges("");
        
        try {
          const arrayBuffer = await selectedFile.arrayBuffer();
          const pdfjsLib = await import("pdfjs-dist");
          if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
          }
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          setTotalPages(pdf.numPages);
          setRanges(`1-${pdf.numPages}`);
        } catch (error) {
          console.error("Error reading PDF:", error);
          alert("Gagal membaca file PDF.");
        }
      }
    }
  };

  const removeFile = () => {
    setFile(null);
    setTotalPages(0);
    setSplitPdfUrl(null);
    setIsZipOutput(false);
  };

  const splitPdf = async () => {
    if (!file) return;
    
    // Parse ranges
    const rangeList = ranges.split(',').map(r => r.trim()).filter(Boolean);
    const validRanges: { start: number, end: number }[] = [];
    
    for (const range of rangeList) {
      if (range.includes('-')) {
        const [startStr, endStr] = range.split('-');
        const start = parseInt(startStr);
        const end = parseInt(endStr);
        if (!isNaN(start) && !isNaN(end) && start >= 1 && end <= totalPages && start <= end) {
          validRanges.push({ start, end });
        } else {
          alert(`Rentang "${range}" tidak valid.`);
          return;
        }
      } else {
        const page = parseInt(range);
        if (!isNaN(page) && page >= 1 && page <= totalPages) {
          validRanges.push({ start: page, end: page });
        } else {
          alert(`Halaman "${range}" tidak valid.`);
          return;
        }
      }
    }

    if (validRanges.length === 0) {
      alert("Masukkan rentang halaman yang valid.");
      return;
    }

    setIsProcessing(true);
    
    try {
      const fileBuffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(fileBuffer);
      
      if (validRanges.length === 1) {
        // Single split -> direct PDF
        const splitPdfDoc = await PDFDocument.create();
        const { start, end } = validRanges[0];
        
        const indices = [];
        for (let i = start - 1; i <= end - 1; i++) {
          indices.push(i);
        }
        
        const copiedPages = await splitPdfDoc.copyPages(pdf, indices);
        copiedPages.forEach((page) => splitPdfDoc.addPage(page));
        
        const splitPdfFile = await splitPdfDoc.save();
        const blob = new Blob([splitPdfFile as any], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        setSplitPdfUrl(url);
        setIsZipOutput(false);
      } else {
        // Multiple splits -> ZIP
        const zip = new JSZip();
        
        for (let i = 0; i < validRanges.length; i++) {
          const { start, end } = validRanges[i];
          const splitPdfDoc = await PDFDocument.create();
          
          const indices = [];
          for (let p = start - 1; p <= end - 1; p++) {
            indices.push(p);
          }
          
          const copiedPages = await splitPdfDoc.copyPages(pdf, indices);
          copiedPages.forEach((page) => splitPdfDoc.addPage(page));
          
          const splitPdfFile = await splitPdfDoc.save();
          zip.file(`split_${start}-${end}.pdf`, splitPdfFile as any);
        }
        
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const zipUrl = URL.createObjectURL(zipBlob);
        setSplitPdfUrl(zipUrl);
        setIsZipOutput(true);
      }
    } catch (error) {
      console.error("Error splitting PDF:", error);
      alert("Terjadi kesalahan saat memisahkan PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center p-3 bg-orange-100 text-orange-600 rounded-full mb-4">
          <Scissors size={32} />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Pisahkan PDF</h1>
        <p className="text-gray-600">
          Ekstrak halaman tertentu dari file PDF Anda secara instan di browser.
        </p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
        {!file ? (
          <Dropzone onFileDrop={handleFileDrop} accept="application/pdf" />
        ) : (
          <div className="mt-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 mb-6">
              <div>
                <p className="font-medium text-gray-800">{file.name}</p>
                <p className="text-sm text-gray-500">{totalPages} Halaman</p>
              </div>
              <button
                onClick={removeFile}
                className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                title="Hapus file"
              >
                <Trash2 size={20} />
              </button>
            </div>

            <div className="bg-orange-50 border border-orange-100 p-6 rounded-xl mb-6">
              <h3 className="font-medium text-orange-900 mb-4">Rentang Halaman</h3>
              <div>
                <label className="block text-sm text-gray-600 mb-2">
                  Ketik rentang halaman yang ingin dipisah (pisahkan dengan koma jika lebih dari satu)
                </label>
                <input
                  type="text"
                  value={ranges}
                  onChange={(e) => setRanges(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="Contoh: 1-4, 6-8, 10"
                />
              </div>
            </div>

            <div className="flex justify-center">
              <button
                onClick={splitPdf}
                disabled={isProcessing}
                className="w-full sm:w-auto px-8 py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isProcessing ? "Memproses..." : "Pisahkan PDF"}
              </button>
            </div>
          </div>
        )}
      </div>

      {splitPdfUrl && (
        <div className="bg-green-50 border border-green-200 p-6 rounded-2xl text-center">
          <h3 className="text-lg font-semibold text-green-800 mb-4">Halaman Berhasil Diekstrak!</h3>
          <a
            href={splitPdfUrl}
            download={isZipOutput ? `split-${file?.name?.replace(/\.pdf$/i, '') || "document"}.zip` : `split-${file?.name || "document"}`}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors"
          >
            <Download size={20} />
            Unduh Hasil {isZipOutput ? "ZIP" : "PDF"}
          </a>
        </div>
      )}
    </div>
  );
}
