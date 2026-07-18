"use client";

import { useState } from "react";
import { Table, Upload, Trash2, Download, Loader2, CheckCircle2, Circle } from "lucide-react";
import Dropzone from "@/components/Dropzone";

interface PageItem {
  id: string;
  originalIndex: number;
  imageUrl: string;
  selected: boolean;
}

export default function PdfToExcel() {
  const [file, setFile] = useState<File | null>(null);
  const [items, setItems] = useState<PageItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState<string | null>(null);

  const handleFileDrop = async (files: File[]) => {
    if (files && files[0]) {
      const selectedFile = files[0];
      if (selectedFile.type === "application/pdf") {
        setFile(selectedFile);
        setDownloadUrl(null);
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
                selected: true, // Default select all
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
    setDownloadUrl(null);
    setItems([]);
  };

  const togglePageSelection = (index: number) => {
    const newItems = [...items];
    newItems[index].selected = !newItems[index].selected;
    setItems(newItems);
  };

  const selectAll = (select: boolean) => {
    const newItems = items.map(item => ({ ...item, selected: select }));
    setItems(newItems);
  };

  const selectedCount = items.filter(item => item.selected).length;

  const convertPdfToExcel = async () => {
    if (!file || selectedCount === 0) return;
    setIsProcessing(true);
    setDownloadUrl(null);
    
    try {
      const selectedItems = items.filter(item => item.selected);
      const selectedPages = selectedItems.map(item => item.originalIndex + 1).join(",");
      
      const formData = new FormData();
      formData.append("file", file);
      formData.append("format", "xlsx");
      formData.append("pages", selectedPages);
      
      const response = await fetch("/api/mock-convert-from-pdf", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error("Konversi gagal");
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      // Get filename from Content-Disposition if possible, or fallback
      const disposition = response.headers.get("Content-Disposition");
      let filename = `converted-${file.name.replace(".pdf", "")}.xlsx`;
      if (disposition && disposition.indexOf("filename=") !== -1) {
        const matches = /filename="([^"]+)"/.exec(disposition);
        if (matches != null && matches[1]) {
          filename = matches[1];
        }
      }
      
      setDownloadUrl(url);
      setDownloadName(filename);
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
        <div className="inline-flex items-center justify-center p-3 bg-emerald-100 text-emerald-700 rounded-full mb-4">
          <Table size={32} />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">PDF ke Excel</h1>
        <p className="text-gray-600">
          Ekstrak tabel PDF menjadi spreadsheet Excel (.xlsx). Pilih halaman yang ingin dikonversi.
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
                <Loader2 size={40} className="text-emerald-500 animate-spin mb-4" />
                <p className="text-gray-600 font-medium">Sedang memuat halaman PDF...</p>
              </div>
            ) : (
              <>
                <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-xl mb-6">
                  <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                    <h3 className="font-medium text-emerald-900">
                      Pilih Halaman ({selectedCount} dipilih)
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => selectAll(true)}
                        className="px-3 py-1.5 bg-white border border-emerald-200 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-50 transition-colors"
                      >
                        Pilih Semua
                      </button>
                      <button
                        onClick={() => selectAll(false)}
                        className="px-3 py-1.5 bg-white border border-emerald-200 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-50 transition-colors"
                      >
                        Batal Pilih Semua
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-h-[400px] overflow-y-auto p-2 custom-scrollbar">
                    {items.map((item, index) => (
                      <div 
                        key={item.id} 
                        onClick={() => togglePageSelection(index)}
                        className={`relative cursor-pointer group bg-white p-2 rounded-xl shadow-sm border-2 transition-all flex flex-col items-center ${
                          item.selected ? "border-emerald-500 ring-2 ring-emerald-100" : "border-gray-200 hover:border-emerald-300"
                        }`}
                      >
                        <div className="absolute top-2 right-2 z-10 bg-white rounded-full">
                          {item.selected ? (
                            <CheckCircle2 size={24} className="text-emerald-500" />
                          ) : (
                            <Circle size={24} className="text-gray-300" />
                          )}
                        </div>
                        <div className="relative w-full aspect-[1/1.4] mb-2 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                          <img 
                            src={item.imageUrl} 
                            alt={`Page ${item.originalIndex + 1}`}
                            className={`max-w-full max-h-full object-contain transition-opacity ${item.selected ? 'opacity-100' : 'opacity-60'}`}
                          />
                        </div>
                        <span className={`text-xs font-medium ${item.selected ? 'text-emerald-700' : 'text-gray-500'}`}>
                          Hal {item.originalIndex + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={convertPdfToExcel}
                    disabled={isProcessing || selectedCount === 0}
                    className="w-full sm:w-auto px-8 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isProcessing ? "Memproses..." : `Konversi ${selectedCount} Halaman`}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {downloadUrl && (
        <div className="bg-green-50 border border-green-200 p-6 rounded-2xl text-center">
          <h3 className="text-lg font-semibold text-green-800 mb-4">Konversi Berhasil!</h3>
          <a
            href={downloadUrl}
            download={downloadName || "spreadsheet.xlsx"}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors"
          >
            <Download size={20} />
            Unduh File Excel
          </a>
        </div>
      )}
    </div>
  );
}
