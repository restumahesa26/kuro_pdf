"use client";

import { useState } from "react";
import { FileImage, Upload, Download, Loader2, Trash2, CheckCircle2, Circle } from "lucide-react";
import JSZip from "jszip";
import Dropzone from "@/components/Dropzone";

interface PageItem {
  id: string;
  originalIndex: number;
  imageUrl: string;
  selected: boolean;
}

export default function PdfToJpg() {
  const [file, setFile] = useState<File | null>(null);
  const [items, setItems] = useState<PageItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [zipUrl, setZipUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [singleJpgUrl, setSingleJpgUrl] = useState<string | null>(null);
  const [singleJpgName, setSingleJpgName] = useState<string | null>(null);

  const handleFileDrop = async (files: File[]) => {
    if (files && files[0]) {
      const selectedFile = files[0];
      if (selectedFile.type === "application/pdf") {
        setFile(selectedFile);
        setZipUrl(null);
        setSingleJpgUrl(null);
        setProgress({ current: 0, total: 0 });
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
    setZipUrl(null);
    setSingleJpgUrl(null);
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

  const convertPdfToJpg = async () => {
    if (!file || selectedCount === 0) return;
    setIsProcessing(true);
    setZipUrl(null);
    setSingleJpgUrl(null);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfjsLib = await import("pdfjs-dist");
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
      }
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      const selectedItems = items.filter(item => item.selected);
      setProgress({ current: 0, total: selectedItems.length });
      
      if (selectedItems.length === 1) {
        // If only 1 page selected, just download it directly
        const pageToConvert = selectedItems[0];
        const page = await pdf.getPage(pageToConvert.originalIndex + 1);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        
        if (ctx) {
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: ctx, viewport } as any).promise;
          const imgData = canvas.toDataURL("image/jpeg", 0.9);
          
          setProgress({ current: 1, total: 1 });
          setSingleJpgUrl(imgData);
          setSingleJpgName(`page-${pageToConvert.originalIndex + 1}.jpg`);
        }
      } else {
        // Multiple pages, zip them
        const zip = new JSZip();
        
        for (let i = 0; i < selectedItems.length; i++) {
          const item = selectedItems[i];
          const pageNum = item.originalIndex + 1;
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 2.0 }); // High quality
          
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          
          if (ctx) {
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: ctx, viewport } as any).promise;
            
            const imgData = canvas.toDataURL("image/jpeg", 0.9);
            const base64Data = imgData.replace(/^data:image\/jpeg;base64,/, "");
            zip.file(`page-${pageNum}.jpg`, base64Data, { base64: true });
          }
          
          setProgress({ current: i + 1, total: selectedItems.length });
        }
        
        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        setZipUrl(url);
      }
    } catch (error) {
      console.error("Error converting PDF to JPG:", error);
      alert("Terjadi kesalahan saat mengonversi file.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center p-3 bg-blue-100 text-blue-700 rounded-full mb-4">
          <FileImage size={32} />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">PDF ke JPG</h1>
        <p className="text-gray-600">
          Ubah halaman PDF menjadi gambar JPG berkualitas tinggi. Pilih halaman yang ingin dikonversi.
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
                <Loader2 size={40} className="text-blue-500 animate-spin mb-4" />
                <p className="text-gray-600 font-medium">Sedang memuat halaman PDF...</p>
              </div>
            ) : (
              <>
                <div className="bg-blue-50 border border-blue-100 p-6 rounded-xl mb-6">
                  <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                    <h3 className="font-medium text-blue-900">
                      Pilih Halaman ({selectedCount} dipilih)
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => selectAll(true)}
                        className="px-3 py-1.5 bg-white border border-blue-200 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors"
                      >
                        Pilih Semua
                      </button>
                      <button
                        onClick={() => selectAll(false)}
                        className="px-3 py-1.5 bg-white border border-blue-200 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors"
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
                          item.selected ? "border-blue-500 ring-2 ring-blue-100" : "border-gray-200 hover:border-blue-300"
                        }`}
                      >
                        <div className="absolute top-2 right-2 z-10 bg-white rounded-full">
                          {item.selected ? (
                            <CheckCircle2 size={24} className="text-blue-500" />
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
                        <span className={`text-xs font-medium ${item.selected ? 'text-blue-700' : 'text-gray-500'}`}>
                          Hal {item.originalIndex + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {isProcessing && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="flex justify-between text-sm mb-2 font-medium text-gray-700">
                      <span>Mengonversi...</span>
                      <span>{progress.current} / {progress.total} Halaman</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${(progress.current / progress.total) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                <div className="flex justify-center">
                  <button
                    onClick={convertPdfToJpg}
                    disabled={isProcessing || selectedCount === 0}
                    className="w-full sm:w-auto px-8 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isProcessing ? "Memproses..." : `Konversi ${selectedCount} Halaman`}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {(zipUrl || singleJpgUrl) && (
        <div className="bg-green-50 border border-green-200 p-6 rounded-2xl text-center">
          <h3 className="text-lg font-semibold text-green-800 mb-4">Konversi Berhasil!</h3>
          <a
            href={zipUrl || singleJpgUrl || "#"}
            download={zipUrl ? `images-${file?.name.replace(".pdf", "")}.zip` : singleJpgName || "image.jpg"}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors"
          >
            <Download size={20} />
            Unduh Hasil ({zipUrl ? "ZIP" : "JPG"})
          </a>
        </div>
      )}
    </div>
  );
}
