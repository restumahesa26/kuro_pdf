"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { FilePlus2, Upload, Trash2, Download, GripVertical, CheckCircle2, Loader2 } from "lucide-react";
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

// Set worker later when needed

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
      className="flex items-center gap-4 p-3 bg-white/70 backdrop-blur-xl rounded-xl border border-white/60 shadow-sm mb-3 group transition-colors"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-2 text-slate-400 hover:text-slate-600 transition-colors touch-none"
      >
        <GripVertical size={20} />
      </div>
      
      <div className="flex-shrink-0 w-16 h-20 bg-slate-100 rounded-md border border-slate-200 overflow-hidden flex items-center justify-center shadow-[0_2px_5px_rgba(0,0,0,0.05)]">
        {props.item.thumbnailUrl ? (
          <img src={props.item.thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">PDF</div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-800 truncate text-sm">{props.item.file.name}</p>
        <p className="text-xs text-slate-500">{(props.item.file.size / 1024 / 1024).toFixed(2)} MB</p>
      </div>

      <button
        onClick={props.onRemove}
        className="p-2.5 text-red-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors"
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
      const page = await pdf.getPage(1); // Get first page
      
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
    return ""; // fallback
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
    <div className="container mx-auto px-6 py-12 max-w-4xl">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center p-3.5 bg-slate-100 text-slate-800 rounded-2xl mb-6 shadow-sm border border-slate-200/50">
          <FilePlus2 size={32} strokeWidth={1.5} />
        </div>
        <h1 className="text-3xl md:text-4xl font-semibold text-slate-900 tracking-tight mb-4">Gabungkan PDF</h1>
        <p className="text-slate-500 text-lg">
          Gabungkan dan atur urutan file PDF Anda menjadi satu file.
        </p>
      </div>

      <div className="bg-white/70 backdrop-blur-xl p-8 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-white/60 mb-10">
        <Dropzone onFileDrop={handleFileDrop} accept="application/pdf" multiple={true} className="mb-8" />

        {isLoadingFiles && (
          <div className="flex flex-col items-center justify-center py-10 mt-4 bg-slate-50/50 rounded-2xl border border-slate-100 mb-8">
            <Loader2 className="w-8 h-8 text-slate-400 animate-spin mb-3" />
            <p className="text-sm font-medium text-slate-600">Sedang memuat thumbnail file...</p>
          </div>
        )}

        {items.length > 0 && !isLoadingFiles && (
          <div className="mt-8">
            <h3 className="font-medium text-slate-800 mb-5 text-sm uppercase tracking-wide">
              File yang dipilih ({items.length})
            </h3>
            
            <p className="text-xs text-slate-500 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
              💡 <strong>Tips:</strong> Drag and drop ikon <GripVertical className="inline-block w-4 h-4 text-slate-400" /> untuk mengubah urutan gabungan file.
            </p>

            <div className="mb-8 max-h-[500px] overflow-y-auto pr-2">
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

            <div className="flex justify-center mt-10">
              <button
                onClick={mergePdfs}
                disabled={items.length < 2 || isProcessing}
                className="w-full sm:w-auto px-10 py-4 bg-slate-900 text-white rounded-2xl font-medium hover:bg-slate-800 focus:ring-4 focus:ring-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                {isProcessing ? "Memproses..." : "Gabungkan PDF Sekarang"}
              </button>
            </div>
          </div>
        )}
      </div>

      {mergedPdfUrl && (
        <div className="bg-emerald-50/50 border border-emerald-100 p-8 rounded-3xl text-center shadow-sm">
          <div className="inline-flex items-center justify-center p-3 bg-emerald-100 text-emerald-700 rounded-full mb-4">
            <CheckCircle2 size={28} />
          </div>
          <h3 className="text-xl font-semibold text-emerald-900 mb-2">PDF Berhasil Digabungkan!</h3>
          <a
            href={mergedPdfUrl}
            download="merged-document.pdf"
            className="inline-flex items-center justify-center gap-3 px-8 py-3.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 hover:shadow-md transition-all"
          >
            <Download size={20} strokeWidth={2} />
            Unduh Hasil Gabungan
          </a>
        </div>
      )}
    </div>
  );
}
