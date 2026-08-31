"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { ArrowDownUp, Trash2, Download, Loader2, Eye, X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, CheckCircle2 } from "lucide-react";
import { PDFDocument } from "pdf-lib";
import Dropzone from "@/components/Dropzone";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface PageItem {
  id: string; // id dnd-kit
  originalIndex: number; // 0-based
  imageUrl: string;
}

function SortableItem(props: { id: string; item: PageItem; index: number; onPreview: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: props.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="group relative bg-white dark:bg-slate-900 border-2 border-slate-200/80 dark:border-slate-800 hover:border-teal-500 dark:hover:border-teal-400 rounded-2xl shadow-sm cursor-grab active:cursor-grabbing p-2.5 sm:p-3 hover:shadow-md transition-all flex flex-col items-center select-none"
    >
      {/* Top Bar with Page Num and Preview Button */}
      <div className="flex items-center justify-between w-full mb-2">
        <span className="text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
          Hal {props.index + 1}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            props.onPreview();
          }}
          className="p-1 sm:p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/50 text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-300 rounded-lg transition-colors"
          title="Pratinjau Halaman"
        >
          <Eye size={13} strokeWidth={2} />
        </button>
      </div>

      <div className="relative w-full aspect-[1/1.4] bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden flex items-center justify-center border border-slate-200/60 dark:border-slate-700/60">
        <img
          src={props.item.imageUrl}
          alt={`Page ${props.item.originalIndex + 1}`}
          className="max-w-full max-h-full object-contain pointer-events-none"
        />

        <div
          onClick={(e) => {
            e.stopPropagation();
            props.onPreview();
          }}
          className="absolute inset-x-2 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/80 text-white text-[10px] font-medium py-1 rounded-lg text-center backdrop-blur-sm flex items-center justify-center gap-1 cursor-pointer shadow-sm"
        >
          <Eye size={11} />
          <span>Perbesar</span>
        </div>
      </div>
    </div>
  );
}

export default function SortPDF() {
  const [file, setFile] = useState<File | null>(null);
  const [items, setItems] = useState<PageItem[]>([]);
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

  // Preview Modal State
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [highResCache, setHighResCache] = useState<Record<number, string>>({});
  const [isLoadingHighRes, setIsLoadingHighRes] = useState<boolean>(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleFileDrop = async (files: File[]) => {
    if (files && files[0]) {
      const selectedFile = files[0];
      if (selectedFile.type === "application/pdf") {
        setFile(selectedFile);
        setPdfUrl(null);
        setItems([]);
        setHighResCache({});
        setPreviewIndex(null);
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
            const viewport = page.getViewport({ scale: 0.5 });
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
    setItems([]);
    setPdfUrl(null);
    setHighResCache({});
    setPreviewIndex(null);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const loadHighResPage = useCallback(
    async (originalPageIndex: number) => {
      if (!file || highResCache[originalPageIndex]) return;

      setIsLoadingHighRes(true);
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdfjsLib = await import("pdfjs-dist");
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
        }
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(originalPageIndex + 1);
        const viewport = page.getViewport({ scale: 1.75 });
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (ctx) {
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: ctx, viewport } as any).promise;
          const highResUrl = canvas.toDataURL("image/jpeg", 0.9);
          setHighResCache((prev) => ({
            ...prev,
            [originalPageIndex]: highResUrl,
          }));
        }
      } catch (error) {
        console.error("Error loading high-res preview:", error);
      } finally {
        setIsLoadingHighRes(false);
      }
    },
    [file, highResCache]
  );

  const openPreview = (index: number) => {
    setPreviewIndex(index);
    setZoomScale(1);
    if (items[index]) {
      loadHighResPage(items[index].originalIndex);
    }
  };

  const closePreview = () => {
    setPreviewIndex(null);
    setZoomScale(1);
  };

  const nextPreview = useCallback(() => {
    if (previewIndex !== null && previewIndex < items.length - 1) {
      const nextIdx = previewIndex + 1;
      setPreviewIndex(nextIdx);
      if (items[nextIdx]) {
        loadHighResPage(items[nextIdx].originalIndex);
      }
    }
  }, [previewIndex, items, loadHighResPage]);

  const prevPreview = useCallback(() => {
    if (previewIndex !== null && previewIndex > 0) {
      const prevIdx = previewIndex - 1;
      setPreviewIndex(prevIdx);
      if (items[prevIdx]) {
        loadHighResPage(items[prevIdx].originalIndex);
      }
    }
  }, [previewIndex, items, loadHighResPage]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (previewIndex === null) return;
      if (e.key === "Escape") closePreview();
      else if (e.key === "ArrowRight") nextPreview();
      else if (e.key === "ArrowLeft") prevPreview();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewIndex, nextPreview, prevPreview]);

  const sortPdf = async () => {
    if (!file || items.length === 0) return;
    setIsProcessing(true);

    try {
      const fileBuffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(fileBuffer);
      const newPdf = await PDFDocument.create();

      const indices = items.map((item) => item.originalIndex);
      const copiedPages = await newPdf.copyPages(pdf, indices);
      copiedPages.forEach((page) => newPdf.addPage(page));

      const newPdfBytes = await newPdf.save();
      const blob = new Blob([newPdfBytes as any], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch (error) {
      console.error("Error sorting PDF:", error);
      alert("Terjadi kesalahan saat menyusun ulang PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 md:px-10 py-8 sm:py-12 max-w-5xl">
      <div className="text-center mb-8 sm:mb-12">
        <div className="inline-flex items-center justify-center p-3.5 bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 rounded-2xl mb-4 sm:mb-6 shadow-sm border border-teal-100 dark:border-teal-900/50">
          <ArrowDownUp size={30} strokeWidth={1.75} />
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight mb-2 sm:mb-4">
          Sortir & Susun Ulang PDF
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-lg max-w-xl mx-auto leading-relaxed">
          Geser dan atur urutan halaman PDF Anda secara visual dengan drag and drop yang mudah.
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
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Total {items.length} Halaman • {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                onClick={removeFile}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-xl transition-colors font-medium border border-red-200/60 dark:border-red-900/50"
                title="Ganti file"
              >
                <Trash2 size={16} />
                Ganti File
              </button>
            </div>

            {isLoadingFiles ? (
              <div className="flex flex-col items-center justify-center py-16 bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                <Loader2 size={36} className="text-teal-500 animate-spin mb-4" />
                <p className="text-slate-600 dark:text-slate-300 font-medium text-sm">Sedang memuat pratinjau halaman PDF...</p>
              </div>
            ) : (
              <>
                <div className="p-3.5 sm:p-4 bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 mb-6 text-center">
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    💡 <strong>Tips:</strong> Tarik (drag) kartu halaman untuk memindahkannya ke posisi baru, atau klik ikon <strong>Eye</strong> untuk memperbesar.
                  </p>
                </div>

                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={items} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 max-h-[560px] overflow-y-auto p-2 pr-3 custom-scrollbar mb-8">
                      {items.map((item, index) => (
                        <SortableItem
                          key={item.id}
                          id={item.id}
                          item={item}
                          index={index}
                          onPreview={() => openPreview(index)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>

                <div className="flex justify-center pt-2">
                  <button
                    onClick={sortPdf}
                    disabled={isProcessing || items.length === 0}
                    className="w-full sm:w-auto px-8 sm:px-10 py-3.5 sm:py-4 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 text-xs sm:text-base"
                  >
                    {isProcessing ? "Menyusun PDF..." : "Terapkan Urutan Baru & Simpan PDF"}
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
          <div className="inline-flex items-center justify-center p-3 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-full mb-4 shadow-sm">
            <CheckCircle2 size={30} />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-emerald-950 dark:text-emerald-100 mb-2">Urutan Berhasil Diubah!</h3>
          <p className="text-xs sm:text-sm text-emerald-800/80 dark:text-emerald-400 mb-6 max-w-md mx-auto">
            Halaman PDF Anda telah berhasil disusun ulang sesuai urutan baru.
          </p>
          <a
            href={pdfUrl}
            download={`sorted-${file?.name || "document.pdf"}`}
            className="inline-flex items-center justify-center gap-2.5 px-6 sm:px-8 py-3 sm:py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-semibold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
          >
            <Download size={18} strokeWidth={2} />
            Unduh Hasil PDF
          </a>
        </div>
      )}

      {/* HIGH RESOLUTION PREVIEW MODAL */}
      {previewIndex !== null && items[previewIndex] && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-200"
          onClick={closePreview}
        >
          <div
            className="relative flex flex-col w-full max-w-4xl max-h-[92vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm sm:text-base">
                Posisi ke-{previewIndex + 1} (Halaman Asli {items[previewIndex].originalIndex + 1})
              </h3>

              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-0.5 shadow-sm mr-2">
                  <button
                    onClick={() => setZoomScale((prev) => Math.max(0.75, prev - 0.25))}
                    className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    title="Perkecil"
                  >
                    <ZoomOut size={16} />
                  </button>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300 px-2 min-w-[3rem] text-center">
                    {Math.round(zoomScale * 100)}%
                  </span>
                  <button
                    onClick={() => setZoomScale((prev) => Math.min(2.5, prev + 0.25))}
                    className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    title="Perbesar"
                  >
                    <ZoomIn size={16} />
                  </button>
                </div>

                <button
                  onClick={closePreview}
                  className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors ml-1"
                  title="Tutup (Esc)"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="relative flex-1 overflow-auto bg-slate-100/70 dark:bg-slate-950 p-4 sm:p-6 flex items-center justify-center min-h-[350px]">
              {isLoadingHighRes && !highResCache[items[previewIndex].originalIndex] && (
                <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-slate-900/90 text-white text-xs px-3 py-1.5 rounded-full shadow-lg backdrop-blur-sm">
                  <Loader2 size={13} className="animate-spin text-teal-400" />
                  <span>Memuat resolusi tinggi...</span>
                </div>
              )}

              <div
                className="transition-transform duration-200 ease-out origin-center max-w-full flex items-center justify-center"
                style={{ transform: `scale(${zoomScale})` }}
              >
                <img
                  src={highResCache[items[previewIndex].originalIndex] || items[previewIndex].imageUrl}
                  alt={`Halaman ${items[previewIndex].originalIndex + 1}`}
                  className="max-h-[65vh] sm:max-h-[70vh] w-auto object-contain rounded-xl shadow-xl border border-slate-300/80 dark:border-slate-800 bg-white"
                />
              </div>

              <button
                onClick={prevPreview}
                disabled={previewIndex === 0}
                className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-full shadow-lg border border-slate-200/80 dark:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed hover:scale-110 transition-all"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft size={20} />
              </button>

              <button
                onClick={nextPreview}
                disabled={previewIndex === items.length - 1}
                className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-full shadow-lg border border-slate-200/80 dark:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed hover:scale-110 transition-all"
                title="Halaman Berikutnya"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 sm:py-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
              <span className="hidden sm:inline">
                Gunakan panah <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded font-mono text-[11px]">←</kbd> <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded font-mono text-[11px]">→</kbd> untuk navigasi.
              </span>
              <span>
                Posisi ke-{previewIndex + 1} dari {items.length}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
