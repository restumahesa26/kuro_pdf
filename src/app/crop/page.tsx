"use client";

import { useState, useRef, useEffect } from "react";
import { Crop as CropIcon, Trash2, Download, Loader2, Copy, CheckCircle2 } from "lucide-react";
import { PDFDocument } from "pdf-lib";
import Dropzone from "@/components/Dropzone";
import ReactCrop, { type Crop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

interface PageCropItem {
  id: string;
  originalIndex: number;
  imageUrl: string;
  cropPercent?: Crop;
}

export default function CropPDF() {
  const [file, setFile] = useState<File | null>(null);
  const [items, setItems] = useState<PageCropItem[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const downloadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pdfUrl) {
      setTimeout(() => {
        downloadRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 150);
    }
  }, [pdfUrl]);

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
            const viewport = page.getViewport({ scale: 1.0 });
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

        const cropX = (item.cropPercent.x / 100) * width;
        const cropY = (item.cropPercent.y / 100) * height;
        const cropWidth = (item.cropPercent.width / 100) * width;
        const cropHeight = (item.cropPercent.height / 100) * height;

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
    <div className="container mx-auto px-4 sm:px-6 md:px-10 py-8 sm:py-12 max-w-5xl">
      <div className="text-center mb-8 sm:mb-12">
        <div className="inline-flex items-center justify-center p-3.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-2xl mb-4 sm:mb-6 shadow-sm border border-rose-100 dark:border-rose-900/50">
          <CropIcon size={30} strokeWidth={1.75} />
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight mb-2 sm:mb-4">
          Potong (Crop) PDF
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-lg max-w-xl mx-auto leading-relaxed">
          Buang margin kosong atau potong area tertentu pada file PDF Anda secara visual.
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
                <p className="text-xs text-slate-500 dark:text-slate-400">{items.length} Halaman</p>
              </div>
              <button
                onClick={removeFile}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-xl transition-colors font-medium border border-red-200/60 dark:border-red-900/50"
              >
                <Trash2 size={16} />
                Ganti File
              </button>
            </div>

            {isLoadingFiles ? (
              <div className="flex flex-col items-center justify-center py-16 bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                <Loader2 size={36} className="text-rose-500 animate-spin mb-4" />
                <p className="text-slate-600 dark:text-slate-300 font-medium text-sm">Sedang memuat halaman PDF...</p>
              </div>
            ) : (
              <>
                {activeItem && (
                  <div className="bg-slate-50/80 dark:bg-slate-800/40 p-4 sm:p-6 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 mb-6 flex flex-col items-center">
                    <div className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                      <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                        Memotong Halaman {activeItem.originalIndex + 1}
                      </h3>
                      <button
                        onClick={applyCropToAll}
                        className="px-3.5 py-1.5 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/80 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
                        title="Terapkan ukuran potong ini ke seluruh halaman"
                      >
                        <Copy size={14} />
                        Terapkan ke Semua Halaman
                      </button>
                    </div>
                    
                    <div className="border border-slate-300 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-900 rounded-xl overflow-hidden max-w-full">
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
                <div className="mb-6 sm:mb-8">
                  <h4 className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Pilih Halaman:</h4>
                  <div className="flex gap-3 overflow-x-auto pb-3 custom-scrollbar">
                    {items.map((item, index) => (
                      <button
                        key={item.id}
                        onClick={() => setActiveIndex(index)}
                        className={`relative shrink-0 w-20 sm:w-24 h-28 sm:h-32 rounded-xl border-2 overflow-hidden transition-all ${
                          activeIndex === index 
                            ? "border-rose-500 shadow-md ring-2 ring-rose-200 dark:ring-rose-900" 
                            : "border-slate-200 dark:border-slate-700 hover:border-rose-300 opacity-75 hover:opacity-100"
                        }`}
                      >
                        <img 
                          src={item.imageUrl} 
                          className="w-full h-full object-cover" 
                          alt={`Thumb ${index + 1}`} 
                        />
                        <div className="absolute bottom-0 inset-x-0 bg-slate-950/70 text-white text-[10px] sm:text-xs py-1 text-center font-medium">
                          Hal {index + 1}
                        </div>
                        {item.cropPercent && item.cropPercent.width > 0 && (
                          <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border border-white shadow-sm" title="Sudah dipotong" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-center pt-2">
                  <button
                    onClick={cropPdf}
                    disabled={isProcessing}
                    className="w-full sm:w-auto px-8 sm:px-10 py-3.5 sm:py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-semibold focus:ring-4 focus:ring-rose-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 text-xs sm:text-base"
                  >
                    {isProcessing ? "Sedang Memotong PDF..." : "Potong PDF Sekarang"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {pdfUrl && (
        <div
          ref={downloadRef}
          className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 p-6 sm:p-8 rounded-3xl text-center shadow-sm backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          <div className="inline-flex items-center justify-center p-3 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-full mb-4">
            <CheckCircle2 size={28} />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-emerald-950 dark:text-emerald-100 mb-2">PDF Berhasil Dipotong!</h3>
          <p className="text-xs sm:text-sm text-emerald-800/80 dark:text-emerald-400 mb-6 max-w-md mx-auto">
            Area yang tidak diinginkan telah dipotong dan file PDF baru siap diunduh.
          </p>
          <a
            href={pdfUrl}
            download={`cropped-${file?.name || "document.pdf"}`}
            className="inline-flex items-center justify-center gap-2.5 px-6 sm:px-8 py-3 sm:py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-semibold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
          >
            <Download size={18} />
            Unduh Hasil PDF
          </a>
        </div>
      )}
    </div>
  );
}
