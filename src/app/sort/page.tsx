"use client";

import { useState } from "react";
import { ArrowDownUp, Upload, Trash2, Download } from "lucide-react";
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

// Set worker later when needed

interface PageItem {
  id: string; // id dnd-kit
  originalIndex: number; // 0-based
  imageUrl: string;
}

function SortableItem(props: { id: string; item: PageItem; index: number }) {
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
      className="bg-white border-2 border-gray-200 rounded-lg shadow-sm cursor-grab active:cursor-grabbing p-2 hover:border-teal-400 transition-colors"
    >
      <div className="text-xs font-semibold text-gray-500 mb-1 text-center">
        Halaman {props.index + 1}
      </div>
      <img
        src={props.item.imageUrl}
        alt={`Page ${props.item.originalIndex + 1}`}
        className="w-full h-40 object-contain border border-gray-100 bg-gray-50"
      />
    </div>
  );
}

export default function SortPDF() {
  const [file, setFile] = useState<File | null>(null);
  const [items, setItems] = useState<PageItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

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
        setIsProcessing(true);
        
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
              await page.render({ canvasContext: ctx, canvas, viewport }).promise;
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
          setIsProcessing(false);
        }
      }
    }
  };

  const removeFile = () => {
    setFile(null);
    setItems([]);
    setPdfUrl(null);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

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
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center p-3 bg-teal-100 text-teal-700 rounded-full mb-4">
          <ArrowDownUp size={32} />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Sortir PDF</h1>
        <p className="text-gray-600">
          Ubah urutan halaman PDF Anda dengan drag and drop.
        </p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
        {!file ? (
          <Dropzone onFileDrop={handleFileDrop} accept="application/pdf" />
        ) : (
          <div className="mt-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 mb-6">
              <div>
                <p className="font-medium text-gray-800">{file.name}</p>
                <p className="text-sm text-gray-500">{items.length} Halaman</p>
              </div>
              <button
                onClick={removeFile}
                className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                title="Hapus file"
              >
                <Trash2 size={20} />
              </button>
            </div>

            {items.length > 0 && (
              <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-6">
                <h3 className="font-medium text-gray-700 mb-4 text-center">
                  Drag and drop untuk mengubah urutan halaman
                </h3>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={items} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {items.map((item, index) => (
                        <SortableItem key={item.id} id={item.id} item={item} index={index} />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            )}

            <div className="flex justify-center">
              <button
                onClick={sortPdf}
                disabled={isProcessing || items.length === 0}
                className="w-full sm:w-auto px-8 py-3 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isProcessing ? "Memproses..." : "Terapkan Urutan Baru"}
              </button>
            </div>
          </div>
        )}
      </div>

      {pdfUrl && (
        <div className="bg-green-50 border border-green-200 p-6 rounded-2xl text-center">
          <h3 className="text-lg font-semibold text-green-800 mb-4">Urutan Berhasil Diubah!</h3>
          <a
            href={pdfUrl}
            download={`sorted-${file?.name || "document"}`}
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
