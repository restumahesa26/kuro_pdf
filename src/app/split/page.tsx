"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { PDFDocument } from "pdf-lib";
import {
  Scissors,
  Trash2,
  Download,
  Loader2,
  CheckCircle2,
  Plus,
  Eye,
  X,
  FileText,
  Archive,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Layers,
  Sparkles,
} from "lucide-react";
import JSZip from "jszip";
import Dropzone from "@/components/Dropzone";

interface PageItem {
  id: string;
  pageNumber: number; // 1-indexed
  imageUrl: string;
}

interface RangeSection {
  id: string;
  name: string;
  fromPage: number;
  toPage: number;
}

interface SplitResult {
  id: string;
  filename: string;
  rangeDescription: string;
  pageNumbers: number[];
  pageCount: number;
  blobUrl: string;
  thumbnailUrl: string;
  sizeBytes: number;
}

export default function SplitPDF() {
  const [file, setFile] = useState<File | null>(null);
  const [items, setItems] = useState<PageItem[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Split Modes: "ranges" | "extract_all" | "custom_text"
  const [splitMode, setSplitMode] = useState<"ranges" | "extract_all" | "custom_text">("ranges");
  
  // Custom range sections state
  const [sections, setSections] = useState<RangeSection[]>([]);
  const [rangeInput, setRangeInput] = useState<string>("");

  // Split Results State
  const [results, setResults] = useState<SplitResult[]>([]);
  const [zipUrl, setZipUrl] = useState<string | null>(null);
  const downloadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (results.length > 0) {
      setTimeout(() => {
        downloadRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
    }
  }, [results]);

  // High-Res Page Preview Modal State (for source pages & result preview)
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [highResCache, setHighResCache] = useState<Record<number, string>>({});
  const [isLoadingHighRes, setIsLoadingHighRes] = useState<boolean>(false);

  // Split Result Document Viewer Modal
  const [viewingResult, setViewingResult] = useState<SplitResult | null>(null);

  const handleFileDrop = async (files: File[]) => {
    if (files && files[0]) {
      const selectedFile = files[0];
      if (selectedFile.type === "application/pdf") {
        setFile(selectedFile);
        setResults([]);
        setZipUrl(null);
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
                pageNumber: i,
                imageUrl,
              });
            }
          }
          setItems(newItems);

          // Initialize default sections
          if (totalPages >= 2) {
            const mid = Math.ceil(totalPages / 2);
            setSections([
              { id: "sec-1", name: "Dokumen Bagian 1", fromPage: 1, toPage: mid },
              { id: "sec-2", name: "Dokumen Bagian 2", fromPage: mid + 1, toPage: totalPages },
            ]);
            setRangeInput(`1-${mid}, ${mid + 1}-${totalPages}`);
          } else {
            setSections([
              { id: "sec-1", name: "Dokumen Bagian 1", fromPage: 1, toPage: 1 },
            ]);
            setRangeInput("1");
          }
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
    setResults([]);
    setZipUrl(null);
    setSections([]);
    setRangeInput("");
    setHighResCache({});
    setPreviewIndex(null);
  };

  // Section Management
  const addSection = () => {
    const totalPages = items.length;
    const lastSection = sections[sections.length - 1];
    let nextStart = lastSection ? Math.min(totalPages, lastSection.toPage + 1) : 1;
    if (nextStart > totalPages) nextStart = totalPages;

    const newSec: RangeSection = {
      id: `sec-${Date.now()}`,
      name: `Dokumen Bagian ${sections.length + 1}`,
      fromPage: nextStart,
      toPage: totalPages,
    };
    setSections([...sections, newSec]);
  };

  const removeSection = (id: string) => {
    if (sections.length <= 1) {
      alert("Minimal harus ada 1 bagian dokumen.");
      return;
    }
    setSections(sections.filter((s) => s.id !== id));
  };

  const updateSection = (id: string, field: "fromPage" | "toPage" | "name", value: any) => {
    setSections((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          return { ...s, [field]: value };
        }
        return s;
      })
    );
  };

  // Load high-res preview on demand
  const loadHighResPage = useCallback(
    async (pageIndex: number) => {
      if (!file || highResCache[pageIndex]) return;

      setIsLoadingHighRes(true);
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdfjsLib = await import("pdfjs-dist");
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
        }
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(pageIndex + 1);
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
            [pageIndex]: highResUrl,
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

  const openPreview = (index: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPreviewIndex(index);
    setZoomScale(1);
    loadHighResPage(index);
  };

  const closePreview = () => {
    setPreviewIndex(null);
    setZoomScale(1);
  };

  const nextPreview = useCallback(() => {
    if (previewIndex !== null && previewIndex < items.length - 1) {
      const nextIdx = previewIndex + 1;
      setPreviewIndex(nextIdx);
      loadHighResPage(nextIdx);
    }
  }, [previewIndex, items.length, loadHighResPage]);

  const prevPreview = useCallback(() => {
    if (previewIndex !== null && previewIndex > 0) {
      const prevIdx = previewIndex - 1;
      setPreviewIndex(prevIdx);
      loadHighResPage(prevIdx);
    }
  }, [previewIndex, loadHighResPage]);

  // Keyboard navigation for preview modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (previewIndex === null && viewingResult === null) return;

      if (e.key === "Escape") {
        closePreview();
        setViewingResult(null);
      } else if (previewIndex !== null) {
        if (e.key === "ArrowRight") nextPreview();
        else if (e.key === "ArrowLeft") prevPreview();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewIndex, viewingResult, nextPreview, prevPreview]);

  // Process Split
  const processSplit = async () => {
    if (!file || items.length === 0) return;

    const totalPages = items.length;
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    const batches: { filename: string; rangeDesc: string; pageNumbers: number[] }[] = [];

    if (splitMode === "extract_all") {
      for (let i = 1; i <= totalPages; i++) {
        batches.push({
          filename: `${baseName}_hal_${i}.pdf`,
          rangeDesc: `Halaman ${i}`,
          pageNumbers: [i],
        });
      }
    } else if (splitMode === "ranges") {
      for (let i = 0; i < sections.length; i++) {
        const sec = sections[i];
        const from = Math.max(1, Math.min(totalPages, Number(sec.fromPage) || 1));
        const to = Math.max(1, Math.min(totalPages, Number(sec.toPage) || from));

        if (from > to) {
          alert(`Rentang pada "${sec.name}" tidak valid (Halaman awal ${from} lebih besar dari akhir ${to}).`);
          return;
        }

        const pages: number[] = [];
        for (let p = from; p <= to; p++) pages.push(p);

        batches.push({
          filename: `${baseName}_${from}-${to}.pdf`,
          rangeDesc: from === to ? `Halaman ${from}` : `Halaman ${from} - ${to}`,
          pageNumbers: pages,
        });
      }
    } else if (splitMode === "custom_text") {
      const parts = rangeInput.split(",").map((p) => p.trim()).filter(Boolean);
      if (parts.length === 0) {
        alert("Masukkan rentang halaman yang valid.");
        return;
      }

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (part.includes("-")) {
          const [startStr, endStr] = part.split("-");
          const start = parseInt(startStr, 10);
          const end = parseInt(endStr, 10);
          if (isNaN(start) || isNaN(end) || start < 1 || end > totalPages || start > end) {
            alert(`Rentang "${part}" tidak valid (Total halaman: ${totalPages}).`);
            return;
          }
          const pages: number[] = [];
          for (let p = start; p <= end; p++) pages.push(p);
          batches.push({
            filename: `${baseName}_${start}-${end}.pdf`,
            rangeDesc: `Halaman ${start} - ${end}`,
            pageNumbers: pages,
          });
        } else {
          const page = parseInt(part, 10);
          if (isNaN(page) || page < 1 || page > totalPages) {
            alert(`Halaman "${part}" tidak valid (Total halaman: ${totalPages}).`);
            return;
          }
          batches.push({
            filename: `${baseName}_hal_${page}.pdf`,
            rangeDesc: `Halaman ${page}`,
            pageNumbers: [page],
          });
        }
      }
    }

    if (batches.length === 0) {
      alert("Tidak ada bagian yang dapat dipisah.");
      return;
    }

    setIsProcessing(true);
    setResults([]);
    setZipUrl(null);

    try {
      const fileBuffer = await file.arrayBuffer();
      const originalPdfDoc = await PDFDocument.load(fileBuffer);

      const splitResults: SplitResult[] = [];
      const zip = new JSZip();

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const newPdfDoc = await PDFDocument.create();

        const indices = batch.pageNumbers.map((p) => p - 1);
        const copiedPages = await newPdfDoc.copyPages(originalPdfDoc, indices);
        copiedPages.forEach((page) => newPdfDoc.addPage(page));

        const pdfBytes = await newPdfDoc.save();
        const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
        const blobUrl = URL.createObjectURL(blob);

        const firstPageNumber = batch.pageNumbers[0];
        const thumbUrl = items[firstPageNumber - 1]?.imageUrl || "";

        splitResults.push({
          id: `result-${i}`,
          filename: batch.filename,
          rangeDescription: batch.rangeDesc,
          pageNumbers: batch.pageNumbers,
          pageCount: batch.pageNumbers.length,
          blobUrl,
          thumbnailUrl: thumbUrl,
          sizeBytes: pdfBytes.length,
        });

        zip.file(batch.filename, pdfBytes as any);
      }

      setResults(splitResults);

      if (splitResults.length > 1) {
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const generatedZipUrl = URL.createObjectURL(zipBlob);
        setZipUrl(generatedZipUrl);
      }
    } catch (error) {
      console.error("Error splitting PDF:", error);
      alert("Terjadi kesalahan saat memisahkan PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 md:px-10 py-8 sm:py-12 max-w-5xl">
      {/* Header */}
      <div className="text-center mb-8 sm:mb-12">
        <div className="inline-flex items-center justify-center p-3.5 bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 rounded-2xl mb-4 sm:mb-6 shadow-sm border border-orange-100 dark:border-orange-900/50">
          <Scissors size={30} strokeWidth={1.75} />
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight mb-2 sm:mb-4">
          Pisahkan PDF
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-lg max-w-2xl mx-auto leading-relaxed">
          Pecah file PDF menjadi beberapa dokumen terpisah atau ekstrak halaman tertentu dengan pratinjau lengkap.
        </p>
      </div>

      {/* Main Container */}
      <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-5 sm:p-8 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] border border-white/80 dark:border-slate-800 mb-8 sm:mb-10 transition-colors">
        {!file ? (
          <Dropzone onFileDrop={handleFileDrop} accept="application/pdf" className="h-64" />
        ) : (
          <div className="mt-2">
            {/* File Info Bar */}
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
                <Trash2 size={15} />
                Ganti File
              </button>
            </div>

            {isLoadingFiles ? (
              <div className="flex flex-col items-center justify-center py-16 bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                <Loader2 size={36} className="text-orange-500 animate-spin mb-4" />
                <p className="text-slate-600 dark:text-slate-300 font-medium text-sm">Sedang memuat pratinjau halaman PDF...</p>
              </div>
            ) : (
              <>
                {/* Source Page Preview Strip (Visual Reference) */}
                <div className="mb-6 sm:mb-8 p-4 sm:p-5 bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl border border-slate-200/70 dark:border-slate-700/60">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider">
                      Pratinjau Halaman Sumber ({items.length} Halaman)
                    </h3>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">
                      Klik untuk memperbesar
                    </span>
                  </div>

                  <div className="flex gap-2.5 sm:gap-3 overflow-x-auto pb-2 custom-scrollbar">
                    {items.map((item, index) => (
                      <div
                        key={item.id}
                        onClick={() => openPreview(index)}
                        className="group relative flex-shrink-0 w-16 sm:w-20 cursor-pointer bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 hover:border-orange-400 dark:hover:border-orange-500 hover:shadow-md transition-all flex flex-col items-center select-none"
                      >
                        <div className="relative w-full aspect-[1/1.4] bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden flex items-center justify-center border border-slate-200/60 dark:border-slate-700/60 mb-1">
                          <img
                            src={item.imageUrl}
                            alt={`Hal ${item.pageNumber}`}
                            className="max-w-full max-h-full object-contain"
                          />
                          <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                            <Eye size={16} />
                          </div>
                        </div>
                        <span className="text-[10px] sm:text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                          Hal {item.pageNumber}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mode Selector Tabs */}
                <div className="mb-6 sm:mb-8">
                  <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-xs sm:text-sm uppercase tracking-wide mb-3">
                    Pilih Cara Pisahkan PDF
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                      {
                        id: "ranges",
                        title: "Bagi per Bagian (Rentang)",
                        desc: "Tentukan bagian dokumen, misal Hal 1-3 & Hal 4-10",
                        icon: Layers,
                      },
                      {
                        id: "extract_all",
                        title: "Ekstrak Semua Halaman",
                        desc: "Pisahkan setiap halaman menjadi file PDF tersendiri",
                        icon: Sparkles,
                      },
                      {
                        id: "custom_text",
                        title: "Ketik Rentang Bebas",
                        desc: "Ketik manual rentang fleksibel, misal: 1-4, 6, 8-10",
                        icon: FileText,
                      },
                    ].map((mode) => {
                      const Icon = mode.icon;
                      const isSelected = splitMode === mode.id;
                      return (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => setSplitMode(mode.id as any)}
                          className={`flex flex-col items-start p-4 rounded-2xl border-2 text-left transition-all duration-200 ${
                            isSelected
                              ? "border-orange-500 bg-orange-50/70 dark:bg-orange-950/30 text-slate-900 dark:text-white shadow-sm"
                              : "border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50/50 dark:hover:bg-slate-800/50"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 mb-1.5">
                            <div
                              className={`p-1.5 rounded-lg ${
                                isSelected ? "bg-orange-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                              }`}
                            >
                              <Icon size={16} />
                            </div>
                            <span className="font-semibold text-sm text-slate-900 dark:text-white">{mode.title}</span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{mode.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Mode-Specific Configuration */}
                {splitMode === "ranges" && (
                  <div className="p-4 sm:p-6 bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 mb-6 sm:mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                      <div>
                        <h4 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                          Daftar Dokumen Hasil Pemisahan ({sections.length} File)
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Atur halaman awal dan akhir untuk tiap dokumen yang ingin dihasilkan.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={addSection}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-orange-50 dark:hover:bg-orange-950/40 text-orange-700 dark:text-orange-400 font-semibold border border-orange-200/80 dark:border-orange-800/60 rounded-xl text-xs shadow-sm transition-all hover:scale-105"
                      >
                        <Plus size={14} />
                        Tambah Dokumen
                      </button>
                    </div>

                    <div className="space-y-3">
                      {sections.map((sec, idx) => (
                        <div
                          key={sec.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm gap-3 sm:gap-4"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                              {idx + 1}
                            </div>
                            <input
                              type="text"
                              value={sec.name}
                              onChange={(e) => updateSection(sec.id, "name", e.target.value)}
                              className="font-medium text-slate-800 dark:text-slate-100 text-sm bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-orange-500 focus:outline-none px-1 py-0.5 w-full sm:w-auto"
                              placeholder="Nama file / bagian"
                            />
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-medium">
                              <span>Dari Hal:</span>
                              <input
                                type="number"
                                min={1}
                                max={items.length}
                                value={sec.fromPage}
                                onChange={(e) =>
                                  updateSection(sec.id, "fromPage", parseInt(e.target.value, 10) || 1)
                                }
                                className="w-14 sm:w-16 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-center font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-xs sm:text-sm"
                              />
                            </div>

                            <span className="text-slate-400 dark:text-slate-500 font-bold text-xs">s/d</span>

                            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-medium">
                              <span>Sampai:</span>
                              <input
                                type="number"
                                min={1}
                                max={items.length}
                                value={sec.toPage}
                                onChange={(e) =>
                                  updateSection(sec.id, "toPage", parseInt(e.target.value, 10) || 1)
                                }
                                className="w-14 sm:w-16 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-center font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-xs sm:text-sm"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => removeSection(sec.id)}
                              disabled={sections.length <= 1}
                              className="p-1.5 sm:p-2 text-red-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Hapus bagian ini"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {splitMode === "extract_all" && (
                  <div className="p-4 sm:p-6 bg-orange-50/60 dark:bg-orange-950/20 rounded-2xl border border-orange-200/80 dark:border-orange-900/40 mb-6 sm:mb-8 flex items-center gap-3 sm:gap-4">
                    <div className="p-2.5 sm:p-3 bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-400 rounded-2xl flex-shrink-0">
                      <Sparkles size={22} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white text-sm mb-0.5">
                        Siap Memecah Menjadi {items.length} File PDF Terpisah
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        Setiap halaman dari file PDF Anda akan diekstrak menjadi satu file PDF individual dan disiapkan untuk diunduh langsung atau sekaligus via ZIP.
                      </p>
                    </div>
                  </div>
                )}

                {splitMode === "custom_text" && (
                  <div className="p-4 sm:p-6 bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 mb-6 sm:mb-8">
                    <label className="block font-semibold text-slate-800 dark:text-slate-100 text-sm mb-1">
                      Rentang Halaman (Pisahkan dengan koma)
                    </label>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                      Contoh: <code className="bg-slate-200/60 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300">1-3, 5, 7-9</code> akan menghasilkan 3 file PDF berbeda.
                    </p>
                    <input
                      type="text"
                      value={rangeInput}
                      onChange={(e) => setRangeInput(e.target.value)}
                      placeholder={`Contoh: 1-${Math.ceil(items.length / 2)}, ${Math.ceil(items.length / 2) + 1}-${items.length}`}
                      className="w-full px-4 py-2.5 sm:py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                    />
                  </div>
                )}

                {/* Submit Action Button */}
                <div className="flex justify-center pt-2">
                  <button
                    onClick={processSplit}
                    disabled={isProcessing}
                    className="w-full sm:w-auto px-8 sm:px-10 py-3.5 sm:py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-semibold focus:ring-4 focus:ring-orange-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center justify-center gap-2.5 text-sm sm:text-base"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        <span>Sedang Memisahkan PDF...</span>
                      </>
                    ) : (
                      <>
                        <Scissors size={18} />
                        <span>Pisahkan PDF Sekarang</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* SPLIT RESULTS SECTION WITH DEDICATED PREVIEWS */}
      {results.length > 0 && (
        <div
          ref={downloadRef}
          className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 p-5 sm:p-8 rounded-3xl mb-8 shadow-sm backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 sm:pb-6 mb-5 sm:mb-6 border-b border-emerald-200/60 dark:border-emerald-800/40">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center justify-center p-2.5 sm:p-3 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-2xl shadow-sm">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-emerald-950 dark:text-emerald-100">PDF Berhasil Dipisahkan!</h3>
                <p className="text-xs text-emerald-800/80 dark:text-emerald-400 mt-0.5">
                  Dihasilkan <strong>{results.length} file PDF</strong> dari dokumen sumber.
                </p>
              </div>
            </div>

            {/* Master Download All ZIP Button */}
            {zipUrl && (
              <a
                href={zipUrl}
                download={`split_all_${file?.name?.replace(/\.[^/.]+$/, "") || "documents"}.zip`}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 sm:py-3 bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs sm:text-sm shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
              >
                <Archive size={16} />
                <span>Unduh Semua (ZIP)</span>
              </a>
            )}
          </div>

          {/* Cards for each split output result */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-2">
            {results.map((res, index) => (
              <div
                key={res.id}
                className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-emerald-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-bold text-[11px] flex items-center justify-center">
                        {index + 1}
                      </span>
                      <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200/50 dark:border-emerald-800/40">
                        {res.rangeDescription}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                      {formatBytes(res.sizeBytes)}
                    </span>
                  </div>

                  {/* Thumbnail & File Details */}
                  <div className="flex items-center gap-3.5 mb-4">
                    <div
                      onClick={() => setViewingResult(res)}
                      className="relative w-14 h-20 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden flex items-center justify-center border border-slate-200/80 dark:border-slate-700 shadow-sm flex-shrink-0 cursor-pointer group"
                      title="Klik untuk pratinjau dokumen ini"
                    >
                      {res.thumbnailUrl ? (
                        <img
                          src={res.thumbnailUrl}
                          alt={res.filename}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <FileText size={22} className="text-slate-400" />
                      )}
                      <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                        <Eye size={15} />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-slate-800 dark:text-slate-100 text-xs sm:text-sm truncate" title={res.filename}>
                        {res.filename}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Memuat <strong>{res.pageCount} Hal</strong> ({res.pageNumbers.join(", ")})
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons: Preview & Download */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setViewingResult(res)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                  >
                    <Eye size={13} />
                    <span>Pratinjau</span>
                  </button>

                  <a
                    href={res.blobUrl}
                    download={res.filename}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all shadow-sm"
                  >
                    <Download size={13} />
                    <span>Unduh</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HIGH RESOLUTION SOURCE PAGE PREVIEW MODAL */}
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
                Pratinjau Halaman {items[previewIndex].pageNumber} dari {items.length}
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
                  className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors"
                  title="Tutup (Esc)"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="relative flex-1 overflow-auto bg-slate-100/70 dark:bg-slate-950 p-4 sm:p-6 flex items-center justify-center min-h-[350px]">
              {isLoadingHighRes && !highResCache[previewIndex] && (
                <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-slate-900/90 text-white text-xs px-3 py-1.5 rounded-full shadow-lg backdrop-blur-sm">
                  <Loader2 size={13} className="animate-spin text-orange-400" />
                  <span>Memuat resolusi tinggi...</span>
                </div>
              )}

              <div
                className="transition-transform duration-200 ease-out origin-center max-w-full flex items-center justify-center"
                style={{ transform: `scale(${zoomScale})` }}
              >
                <img
                  src={highResCache[previewIndex] || items[previewIndex].imageUrl}
                  alt={`Halaman ${items[previewIndex].pageNumber}`}
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
                Halaman {previewIndex + 1} / {items.length}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* SPLIT RESULT MODAL / EMBEDDED PDF VIEWER */}
      {viewingResult && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setViewingResult(null)}
        >
          <div
            className="relative flex flex-col w-full max-w-5xl h-[85vh] sm:h-[90vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 pr-2">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-xl flex-shrink-0">
                  <FileText size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-xs sm:text-base truncate">{viewingResult.filename}</h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                    {viewingResult.rangeDescription} • {viewingResult.pageCount} Hal ({formatBytes(viewingResult.sizeBytes)})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                <a
                  href={viewingResult.blobUrl}
                  download={viewingResult.filename}
                  className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all shadow-sm"
                >
                  <Download size={14} />
                  <span className="hidden sm:inline">Unduh File Ini</span>
                  <span className="sm:hidden">Unduh</span>
                </a>

                <button
                  onClick={() => setViewingResult(null)}
                  className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors"
                  title="Tutup (Esc)"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body / PDF Viewer Frame */}
            <div className="flex-1 bg-slate-100 dark:bg-slate-950 overflow-hidden relative">
              <iframe
                src={`${viewingResult.blobUrl}#toolbar=1&navpanes=1`}
                className="w-full h-full border-0"
                title={viewingResult.filename}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
