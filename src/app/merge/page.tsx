"use client";

import { useState, useRef, useEffect } from "react";
import { PDFDocument } from "pdf-lib";
import { FilePlus2, Trash2, Download, GripVertical, CheckCircle2, Loader2 } from "lucide-react";
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
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface FileItem {
  id: string;
  file: File;
  thumbnailUrl: string;
}

function SortableItem(props: { id: string; item: FileItem; onRemove: () => void }) {
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
      className="flex items-center gap-3 sm:gap-4 p-3 sm:p-3.5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm mb-3 group transition-colors select-none"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1.5 sm:p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors touch-none"
      >
        <GripVertical size={20} />
      </div>
      
      <div className="flex-shrink-0 w-14 h-18 sm:w-16 sm:h-20 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700 overflow-hidden flex items-center justify-center shadow-sm">
        {props.item.thumbnailUrl ? (
          <img src={props.item.thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-semibold">PDF</div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-800 dark:text-slate-100 truncate text-xs sm:text-sm">{props.item.file.name}</p>
        <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">{(props.item.file.size / 1024 / 1024).toFixed(2)} MB</p>
      </div>

      <button
        onClick={props.onRemove}
        className="p-2 sm:p-2.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-500 rounded-xl transition-colors"
        title="Hapus file"
      >
        <Trash2 size={18} strokeWidth={1.5} />
      </button>
    </div>
  );
}

export default function MergePDF() {
  const [items, setItems] = useState<FileItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [mergedPdfUrl, setMergedPdfUrl] = useState<string | null>(null);
  const downloadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mergedPdfUrl) {
      setTimeout(() => {
        downloadRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 150);
    }
  }, [mergedPdfUrl]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const generateThumbnail = async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfjsLib = await import("pdfjs-dist");
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
      }
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(1);
      
      const viewport = page.getViewport({ scale: 0.5 });
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      
      if (ctx) {
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: ctx, viewport } as any).promise;
        return canvas.toDataURL("image/jpeg", 0.7);
      }
    } catch (error) {
      console.error("Error generating thumbnail:", error);
    }
    return "";
  };

  const handleFileDrop = async (files: File[]) => {
    if (files && files.length > 0) {
      const selectedFiles = files.filter(
        (file) => file.type === "application/pdf"
      );
      
      if (selectedFiles.length === 0) return;
      
      setIsLoadingFiles(true);
      
      const newItems: FileItem[] = [];
      for (const file of selectedFiles) {
        const thumb = await generateThumbnail(file);
        newItems.push({
          id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file,
          thumbnailUrl: thumb,
        });
      }
      
      setItems((prev) => [...prev, ...newItems]);
      setMergedPdfUrl(null);
      setIsLoadingFiles(false);
    }
  };

  const removeFile = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    setMergedPdfUrl(null);
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

  const mergePdfs = async () => {
    if (items.length < 2) return;
    setIsProcessing(true);
    
    try {
      const mergedPdf = await PDFDocument.create();
      
      for (const item of items) {
        const fileBuffer = await item.file.arrayBuffer();
        const pdf = await PDFDocument.load(fileBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }
      
      const mergedPdfFile = await mergedPdf.save();
      const blob = new Blob([mergedPdfFile as any], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setMergedPdfUrl(url);
    } catch (error) {
      console.error("Error merging PDFs:", error);
      alert("Terjadi kesalahan saat menggabungkan PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 md:px-10 py-8 sm:py-12 max-w-4xl">
      <div className="text-center mb-8 sm:mb-12">
        <div className="inline-flex items-center justify-center p-3.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-2xl mb-4 sm:mb-6 shadow-sm border border-blue-100 dark:border-blue-900/50">
          <FilePlus2 size={30} strokeWidth={1.75} />
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight mb-2 sm:mb-4">
          Gabungkan PDF
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-lg max-w-xl mx-auto leading-relaxed">
          Gabungkan dan atur urutan banyak file PDF Anda menjadi satu dokumen secara mudah.
        </p>
      </div>

      <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-5 sm:p-8 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] border border-white/80 dark:border-slate-800 mb-8 sm:mb-10 transition-colors">
        <Dropzone onFileDrop={handleFileDrop} accept="application/pdf" multiple={true} className="mb-6 sm:mb-8" />

        {isLoadingFiles && (
          <div className="flex flex-col items-center justify-center py-10 mt-4 bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 mb-8">
            <Loader2 className="w-8 h-8 text-slate-400 animate-spin mb-3" />
            <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300">Sedang memuat thumbnail file...</p>
          </div>
        )}

        {items.length > 0 && !isLoadingFiles && (
          <div className="mt-6 sm:mt-8">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-3 sm:mb-4 text-xs sm:text-sm uppercase tracking-wide">
              File yang dipilih ({items.length})
            </h3>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
              💡 <strong>Tips:</strong> Tarik (drag) ikon <GripVertical className="inline-block w-3.5 h-3.5 text-slate-400" /> untuk mengubah urutan gabungan file.
            </p>

            <div className="mb-6 sm:mb-8 max-h-[500px] overflow-y-auto pr-1 sm:pr-2 custom-scrollbar">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={items} strategy={verticalListSortingStrategy}>
                  {items.map((item) => (
                    <SortableItem key={item.id} id={item.id} item={item} onRemove={() => removeFile(item.id)} />
                  ))}
                </SortableContext>
              </DndContext>
            </div>

            <div className="flex justify-center mt-6 sm:mt-8">
              <button
                onClick={mergePdfs}
                disabled={items.length < 2 || isProcessing}
                className="w-full sm:w-auto px-8 sm:px-10 py-3.5 sm:py-4 bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-2xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm text-xs sm:text-base"
              >
                {isProcessing ? "Sedang Menggabungkan..." : "Gabungkan PDF Sekarang"}
              </button>
            </div>
          </div>
        )}
      </div>

      {mergedPdfUrl && (
        <div
          ref={downloadRef}
          className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 p-6 sm:p-8 rounded-3xl text-center shadow-sm backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          <div className="inline-flex items-center justify-center p-3 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-full mb-4">
            <CheckCircle2 size={28} />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-emerald-950 dark:text-emerald-100 mb-2">PDF Berhasil Digabungkan!</h3>
          <p className="text-xs sm:text-sm text-emerald-800/80 dark:text-emerald-400 mb-6 max-w-md mx-auto">
            Semua file PDF pilihan Anda telah disatukan menjadi satu dokumen lengkap.
          </p>
          <a
            href={mergedPdfUrl}
            download="merged-document.pdf"
            className="inline-flex items-center justify-center gap-2.5 px-6 sm:px-8 py-3 sm:py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-semibold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
          >
            <Download size={18} strokeWidth={2} />
            Unduh Hasil Gabungan
          </a>
        </div>
      )}
    </div>
  );
}
