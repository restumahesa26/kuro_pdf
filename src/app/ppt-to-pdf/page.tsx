"use client";

import { useState } from "react";
import { Presentation, Upload, Trash2, Download } from "lucide-react";
import Dropzone from "@/components/Dropzone";

export default function PptToPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const handleFileDrop = (files: File[]) => {
    if (files && files[0]) {
      const selectedFile = files[0];
      if (
        selectedFile.name.endsWith(".ppt") || 
        selectedFile.name.endsWith(".pptx")
      ) {
        setFile(selectedFile);
        setPdfUrl(null);
      } else {
        alert("Harap unggah file PowerPoint (.ppt, .pptx)");
      }
    }
  };

  const removeFile = () => {
    setFile(null);
    setPdfUrl(null);
  };

  const convertFile = async () => {
    if (!file) return;
    setIsProcessing(true);
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch("/api/convert", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error("Konversi gagal");
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch (error) {
      console.error("Error converting file:", error);
      alert("Terjadi kesalahan saat mengonversi file.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center p-3 bg-orange-100 text-orange-700 rounded-full mb-4">
          <Presentation size={32} />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">PPT ke PDF</h1>
        <p className="text-gray-600">
          Ubah presentasi PowerPoint (.ppt, .pptx) menjadi PDF agar mudah dibagikan.
        </p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
        {!file ? (
          <Dropzone 
            onFileDrop={handleFileDrop} 
            accept=".ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation" 
          />
        ) : (
          <div className="mt-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 mb-6">
              <p className="font-medium text-gray-800">{file.name}</p>
              <button
                onClick={removeFile}
                className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                title="Hapus file"
              >
                <Trash2 size={20} />
              </button>
            </div>

            <div className="flex justify-center">
              <button
                onClick={convertFile}
                disabled={isProcessing}
                className="w-full sm:w-auto px-8 py-3 bg-orange-600 text-white rounded-xl font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isProcessing ? "Mengonversi..." : "Konversi ke PDF"}
              </button>
            </div>
          </div>
        )}
      </div>

      {pdfUrl && (
        <div className="bg-green-50 border border-green-200 p-6 rounded-2xl text-center">
          <h3 className="text-lg font-semibold text-green-800 mb-4">Konversi Berhasil!</h3>
          <a
            href={pdfUrl}
            download={`converted-${file?.name.replace(/\.[^/.]+$/, "")}.pdf`}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors"
          >
            <Download size={20} />
            Unduh Hasil PDF
          </a>
        </div>
      )}
    </div>
  );
}
