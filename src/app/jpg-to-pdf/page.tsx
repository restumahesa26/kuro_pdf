"use client";

import { useState } from "react";
import { FileImage, Upload, Trash2, Download, ArrowUp, ArrowDown } from "lucide-react";
import jsPDF from "jspdf";
import Dropzone from "@/components/Dropzone";

export default function JpgToPdf() {
  const [images, setImages] = useState<{ file: File; url: string }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const handleFileDrop = (files: File[]) => {
    if (files && files.length > 0) {
      const selectedFiles = files.filter(
        (file) => file.type.startsWith("image/")
      );
      
      const newImages = selectedFiles.map(file => ({
        file,
        url: URL.createObjectURL(file)
      }));
      
      setImages((prev) => [...prev, ...newImages]);
      setPdfUrl(null);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
    setPdfUrl(null);
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newImages = [...images];
    const temp = newImages[index - 1];
    newImages[index - 1] = newImages[index];
    newImages[index] = temp;
    setImages(newImages);
  };

  const moveDown = (index: number) => {
    if (index === images.length - 1) return;
    const newImages = [...images];
    const temp = newImages[index + 1];
    newImages[index + 1] = newImages[index];
    newImages[index] = temp;
    setImages(newImages);
  };

  const convertToPdf = async () => {
    if (images.length === 0) return;
    setIsProcessing(true);
    
    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        
        // Buat promise untuk membaca dimensi gambar
        const img = new Image();
        img.src = image.url;
        await new Promise((resolve) => {
          img.onload = resolve;
        });
        
        if (i > 0) {
          pdf.addPage();
        }
        
        // Kalkulasi aspek rasio agar fit dalam A4
        const ratio = Math.min(pdfWidth / img.width, pdfHeight / img.height);
        const width = img.width * ratio;
        const height = img.height * ratio;
        
        // Center image
        const x = (pdfWidth - width) / 2;
        const y = (pdfHeight - height) / 2;
        
        pdf.addImage(img, "JPEG", x, y, width, height);
      }
      
      const pdfBlob = pdf.output("blob");
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
    } catch (error) {
      console.error("Error converting images to PDF:", error);
      alert("Terjadi kesalahan saat membuat PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center p-3 bg-yellow-100 text-yellow-600 rounded-full mb-4">
          <FileImage size={32} />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">JPG ke PDF</h1>
        <p className="text-gray-600">
          Ubah kumpulan gambar Anda menjadi satu file PDF dengan mudah.
        </p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
        <Dropzone onFileDrop={handleFileDrop} accept="image/*" multiple={true} />

        {images.length > 0 && (
          <div className="mt-8">
            <h3 className="font-semibold text-gray-700 mb-4">Gambar yang dipilih ({images.length}):</h3>
            <ul className="space-y-3 mb-6">
              {images.map((img, index) => (
                <li key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-4 flex-1">
                    <img src={img.url} alt={`Preview ${index}`} className="w-12 h-12 object-cover rounded" />
                    <span className="truncate text-sm text-gray-700">{img.file.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                      className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-30"
                    >
                      <ArrowUp size={18} />
                    </button>
                    <button
                      onClick={() => moveDown(index)}
                      disabled={index === images.length - 1}
                      className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-30"
                    >
                      <ArrowDown size={18} />
                    </button>
                    <button
                      onClick={() => removeImage(index)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors ml-2"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex justify-center">
              <button
                onClick={convertToPdf}
                disabled={isProcessing}
                className="w-full sm:w-auto px-8 py-3 bg-yellow-500 text-white rounded-xl font-medium hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isProcessing ? "Memproses..." : "Buat PDF"}
              </button>
            </div>
          </div>
        )}
      </div>

      {pdfUrl && (
        <div className="bg-green-50 border border-green-200 p-6 rounded-2xl text-center">
          <h3 className="text-lg font-semibold text-green-800 mb-4">PDF Berhasil Dibuat!</h3>
          <a
            href={pdfUrl}
            download="images-to-document.pdf"
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
