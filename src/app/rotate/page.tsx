"use client";

import { useState } from "react";
import { PDFDocument, degrees } from "pdf-lib";
import { RotateCw, Upload, Trash2, Download, Loader2 } from "lucide-react";
import Dropzone from "@/components/Dropzone";

interface PageItem {
  id: string;
  originalIndex: number;
  imageUrl: string;
  rotation: number;
}

export default function RotatePDF() {
  const [file, setFile] = useState<File | null>(null);
  const [items, setItems] = useState<PageItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [rotatedPdfUrl, setRotatedPdfUrl] = useState<string | null>(null);

  const handleFileDrop = async (files: File[]) => {
    if (files && files[0]) {
      const selectedFile = files[0];
      if (selectedFile.type === "application/pdf") {
        setFile(selectedFile);
        setRotatedPdfUrl(null);
        setItems([]);
        setIsLoadingFiles(true);
        
        try {
          const arrayBuffer = await selectedFile.arrayBuffer();
          const pdfjsLib = await import("pdfjs-dist");
          if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
          }
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          const totalPages = pdf.numPages;
          
          const newItems: PageItem[] = [];
          for (let i = 1; i <= totalPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 0.5 }); // Low res for thumbnail
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            
            if (ctx) {
              canvas.width = viewport.width;
              canvas.height = viewport.height;
              await page.render({ canvasContext: ctx, viewport } as any).promise;
              const imageUrl = canvas.toDataURL("image/jpeg", 0.7);
              newItems.push({
                id: `page-${i}`,
                originalIndex: i - 1,
                imageUrl,
                rotation: 0,
              });
            }
          }
          setItems(newItems);
        } catch (error) {
          console.error("Error reading PDF:", error);
          alert("Gagal membaca file PDF.");
        } finally {
          setIsLoadingFiles(false);
        }
      }
    }
  };

  const removeFile = () => {
    setFile(null);
    setRotatedPdfUrl(null);
    setItems([]);
  };

  const handleRotatePage = (index: number) => {
    const newItems = [...items];
    newItems[index].rotation = (newItems[index].rotation + 90) % 360;
    setItems(newItems);
  };

  const handleRotateAll = () => {
    const newItems = items.map(item => ({
      ...item,
      rotation: (item.rotation + 90) % 360
    }));
    setItems(newItems);
  };

  const rotatePdf = async () => {
    if (!file || items.length === 0) return;
    setIsProcessing(true);
    
    try {
      const fileBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(fileBuffer);
      const pages = pdfDoc.getPages();
      
      items.forEach((item) => {
        const page = pages[item.originalIndex];
        const currentRotation = page.getRotation().angle;
        page.setRotation(degrees(currentRotation + item.rotation));
      });
      
      const rotatedPdfFile = await pdfDoc.save();
      const blob = new Blob([rotatedPdfFile as any], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setRotatedPdfUrl(url);
    } catch (error) {
      console.error("Error rotating PDF:", error);
      alert("Terjadi kesalahan saat memutar PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center p-3 bg-purple-100 text-purple-600 rounded-full mb-4">
          <RotateCw size={32} />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Putar PDF</h1>
        <p className="text-gray-600">
          Putar orientasi halaman PDF Anda satu per satu sesuai keinginan.
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

            {isLoadingFiles ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 size={40} className="text-purple-500 animate-spin mb-4" />
                <p className="text-gray-600 font-medium">Sedang memuat halaman PDF...</p>
              </div>
            ) : (
              <>
                <div className="bg-purple-50 border border-purple-100 p-6 rounded-xl mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium text-purple-900">Putar Halaman (Per Halaman)</h3>
                    <button
                      onClick={handleRotateAll}
                      className="px-4 py-2 bg-purple-200 text-purple-800 rounded-lg text-sm font-medium hover:bg-purple-300 transition-colors flex items-center gap-2"
                    >
                      <RotateCw size={16} />
                      Putar Semua 90&deg;
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {items.map((item, index) => (
                      <div key={item.id} className="relative group bg-white p-2 rounded-xl shadow-sm border border-gray-200 flex flex-col items-center">
                        <div className="relative w-full aspect-[1/1.4] mb-2 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                          <img 
                            src={item.imageUrl} 
                            alt={`Page ${item.originalIndex + 1}`}
                            className="max-w-full max-h-full object-contain transition-transform duration-300 ease-in-out"
                            style={{ transform: `rotate(${item.rotation}deg)` }}
                          />
                        </div>
                        <div className="flex w-full items-center justify-between">
                          <span className="text-xs font-medium text-gray-500">Hal {item.originalIndex + 1}</span>
                          <button
                            onClick={() => handleRotatePage(index)}
                            className="p-1.5 bg-purple-100 text-purple-600 hover:bg-purple-200 rounded-full transition-colors"
                            title="Putar 90&deg;"
                          >
                            <RotateCw size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={rotatePdf}
                    disabled={isProcessing}
                    className="w-full sm:w-auto px-8 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isProcessing ? "Memproses..." : "Terapkan Putaran"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {rotatedPdfUrl && (
        <div className="bg-green-50 border border-green-200 p-6 rounded-2xl text-center">
          <h3 className="text-lg font-semibold text-green-800 mb-4">PDF Berhasil Diputar!</h3>
          <a
            href={rotatedPdfUrl}
            download={`rotated-${file?.name || "document"}`}
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
