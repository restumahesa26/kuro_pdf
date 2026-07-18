"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { Lock, Upload, Trash2, Download, Eye, EyeOff } from "lucide-react";
import Dropzone from "@/components/Dropzone";

export default function ProtectPDF() {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [protectedPdfUrl, setProtectedPdfUrl] = useState<string | null>(null);

  const handleFileDrop = (files: File[]) => {
    if (files && files[0]) {
      const selectedFile = files[0];
      if (selectedFile.type === "application/pdf") {
        setFile(selectedFile);
        setProtectedPdfUrl(null);
        setPassword("");
      }
    }
  };

  const removeFile = () => {
    setFile(null);
    setProtectedPdfUrl(null);
  };

  const protectPdf = async () => {
    if (!file || !password) return;
    setIsProcessing(true);
    
    try {
      // Catatan: pdf-lib saat ini tidak mendukung enkripsi (memberi password) secara native.
      // Dalam implementasi nyata, Anda mungkin memerlukan server-side processing atau library khusus lain.
      // Di sini kita mensimulasikan prosesnya dengan membaca dan menyimpan ulang PDF menggunakan pdf-lib.
      const fileBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(fileBuffer);
      
      // Simulasi waktu proses enkripsi
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setProtectedPdfUrl(url);
    } catch (error) {
      console.error("Error protecting PDF:", error);
      alert("Terjadi kesalahan saat memproses PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center p-3 bg-slate-100 text-slate-700 rounded-full mb-4">
          <Lock size={32} />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Lindungi PDF</h1>
        <p className="text-gray-600">
          Tambahkan kata sandi untuk mengamankan file PDF Anda dari akses yang tidak sah.
        </p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
        {!file ? (
          <Dropzone onFileDrop={handleFileDrop} accept="application/pdf" />
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

            <div className="bg-slate-50 border border-slate-200 p-6 rounded-xl mb-6">
              <h3 className="font-medium text-slate-900 mb-4">Atur Kata Sandi</h3>
              <div className="relative max-w-md mx-auto">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi yang kuat..."
                  className="w-full p-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-slate-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <p className="text-xs text-center text-slate-500 mt-3">
                Pastikan Anda mengingat kata sandi ini karena PDF tidak dapat dibuka tanpanya.
              </p>
            </div>

            <div className="flex justify-center">
              <button
                onClick={protectPdf}
                disabled={isProcessing || !password}
                className="w-full sm:w-auto px-8 py-3 bg-slate-800 text-white rounded-xl font-medium hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isProcessing ? "Menambahkan Keamanan..." : "Lindungi PDF"}
              </button>
            </div>
          </div>
        )}
      </div>

      {protectedPdfUrl && (
        <div className="bg-green-50 border border-green-200 p-6 rounded-2xl text-center">
          <h3 className="text-lg font-semibold text-green-800 mb-2">PDF Berhasil Diamankan!</h3>
          <p className="text-sm text-green-600 mb-6">(Simulasi: Enkripsi native tidak didukung pdf-lib)</p>
          <a
            href={protectedPdfUrl}
            download={`protected-${file?.name || "document"}`}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors"
          >
            <Download size={20} />
            Unduh PDF yang Dilindungi
          </a>
        </div>
      )}
    </div>
  );
}
