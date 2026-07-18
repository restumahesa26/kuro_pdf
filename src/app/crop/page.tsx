"use client";

import { useState } from "react";
import { Crop as CropIcon, Upload, Trash2, Download, Loader2, Copy } from "lucide-react";
import { PDFDocument } from "pdf-lib";
import Dropzone from "@/components/Dropzone";
import ReactCrop, { type Crop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

interface PageCropItem {
  id: string;
  originalIndex: number;
  imageUrl: string;
  cropPercent?: Crop; // store as percentage for resolution independence
}

export default function CropPDF() {
  const [file, setFile] = useState<File | null>(null);
  const [items, setItems] = useState<PageCropItem[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const handleFileDrop = async (files: File[]) => {
    if (files && files[0]) {
      const selectedFile = files[0];
      if (selectedFile.type === "application/pdf") {
        setFile(selectedFile);
        setPdfUrl(null);
        setItems([]);
        setActiveIndex(0);
        setIsLoadingFiles(true);

        try {
          const arrayBuffer = await selectedFile.arrayBuffer();
          const pdfjsLib = await import("pdfjs-dist");
          if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
          }
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          const totalPages = pdf.numPages;

          const newItems: PageCropItem[] = [];
          for (let i = 1; i <= totalPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 1.0 }); // Full scale for cropping
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
    setPdfUrl(null);
    setItems([]);
    setActiveIndex(0);
  };

  const setCropForActivePage = (pixelCrop: Crop, percentCrop: Crop) => {
    const newItems = [...items];
    newItems[activeIndex].cropPercent = percentCrop;
    setItems(newItems);
  };

  const applyCropToAll = () => {
    const activeCrop = items[activeIndex].cropPercent;
    if (!activeCrop || activeCrop.width === 0) {
      alert("Buat potongan (crop) pada halaman aktif terlebih dahulu.");
      return;
    }
    const newItems = items.map(item => ({
      ...item,
      cropPercent: { ...activeCrop }
    }));
    setItems(newItems);
  };

  const cropPdf = async () => {
    if (!file || items.length === 0) return;
    setIsProcessing(true);

    try {
      const fileBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(fileBuffer);
      const pages = pdfDoc.getPages();

      let hasCroppedAny = false;

      items.forEach((item) => {
        if (!item.cropPercent || item.cropPercent.width === 0) return;
        
        hasCroppedAny = true;
        const page = pages[item.originalIndex];
        const { width, height } = page.getSize();

        // Convert percentage crop back to actual PDF dimensions
        const cropX = (item.cropPercent.x / 100) * width;
        const cropY = (item.cropPercent.y / 100) * height;
        const cropWidth = (item.cropPercent.width / 100) * width;
        const cropHeight = (item.cropPercent.height / 100) * height;

        // In PDF, Y coordinate goes from bottom to top, whereas crop percent goes from top to bottom
        const pdfCropY = height - cropY - cropHeight;

        page.setCropBox(cropX, pdfCropY, cropWidth, cropHeight);
      });

      if (!hasCroppedAny) {
        alert("Tidak ada area crop yang dibuat di halaman manapun.");
        setIsProcessing(false);
        return;
      }

      const newPdfBytes = await pdfDoc.save();
      const blob = new Blob([newPdfBytes as any], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch (error) {
      console.error("Error cropping PDF:", error);
      alert("Terjadi kesalahan saat memotong PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  const activeItem = items[activeIndex];

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center p-3 bg-rose-100 text-rose-700 rounded-full mb-4">
          <CropIcon size={32} />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Potong PDF</h1>
        <p className="text-gray-600">
          Buang margin kosong pada file PDF Anda per halaman sesuai keinginan.
        </p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
        {!file ? (
          <Dropzone onFileDrop={handleFileDrop} accept="application/pdf" />
        ) : (
          <div className="mt-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 mb-6 gap-4">
              <div>
                <p className="font-medium text-gray-800">{file.name}</p>
                <p className="text-sm text-gray-500">{items.length} Halaman</p>
              </div>
              <button
                onClick={removeFile}
                className="px-4 py-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg transition-colors flex items-center gap-2 font-medium"
              >
                <Trash2 size={18} />
                Ganti File
              </button>
            </div>

            {isLoadingFiles ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 size={40} className="text-rose-500 animate-spin mb-4" />
                <p className="text-gray-600 font-medium">Sedang memuat halaman PDF...</p>
              </div>
            ) : (
              <>
                {activeItem && (
                  <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-6 flex flex-col items-center">
                    <div className="w-full flex justify-between items-center mb-4">
                      <h3 className="font-medium text-gray-700">
                        Memotong Halaman {activeItem.originalIndex + 1}
                      </h3>
                      <button
                        onClick={applyCropToAll}
                        className="px-4 py-2 bg-rose-100 text-rose-700 hover:bg-rose-200 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        title="Terapkan ukuran potong ini ke seluruh halaman"
                      >
                        <Copy size={16} />
                        Terapkan ke Semua
                      </button>
                    </div>
                    
                    <div className="border border-gray-300 shadow-sm bg-white overflow-hidden max-w-full">
                      <ReactCrop 
                        crop={activeItem.cropPercent} 
                        onChange={(pixelCrop, percentCrop) => setCropForActivePage(pixelCrop, percentCrop)}
                      >
                        <img
                          src={activeItem.imageUrl}
                          alt={`Halaman ${activeItem.originalIndex + 1}`}
                          className="max-h-[50vh] object-contain"
                        />
                      </ReactCrop>
                    </div>
                  </div>
                )}

                {/* Thumbnail Carousel */}
                <div className="mb-8">
                  <h4 className="text-sm font-medium text-gray-500 mb-3">Pilih Halaman:</h4>
                  <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                    {items.map((item, index) => (
                      <button
                        key={item.id}
                        onClick={() => setActiveIndex(index)}
                        className={`relative shrink-0 w-24 h-32 rounded-lg border-2 overflow-hidden transition-all ${
                          activeIndex === index 
                            ? "border-rose-500 shadow-md ring-2 ring-rose-200" 
                            : "border-gray-200 hover:border-rose-300 opacity-70 hover:opacity-100"
                        }`}
                      >
                        <img 
                          src={item.imageUrl} 
                          className="w-full h-full object-cover" 
                          alt={`Thumb ${index + 1}`} 
                        />
                        <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-xs py-1 text-center font-medium">
                          Hal {index + 1}
                        </div>
                        {item.cropPercent && item.cropPercent.width > 0 && (
                          <div className="absolute top-1 right-1 w-3 h-3 bg-rose-500 rounded-full border border-white shadow-sm" title="Sudah dipotong" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={cropPdf}
                    disabled={isProcessing}
                    className="w-full sm:w-auto px-10 py-3 bg-rose-600 text-white rounded-xl font-medium hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg"
                  >
                    {isProcessing ? "Memproses..." : "Potong PDF"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {pdfUrl && (
        <div className="bg-green-50 border border-green-200 p-6 rounded-2xl text-center">
          <h3 className="text-lg font-semibold text-green-800 mb-4">PDF Berhasil Dipotong!</h3>
          <a
            href={pdfUrl}
            download={`cropped-${file?.name || "document"}`}
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
