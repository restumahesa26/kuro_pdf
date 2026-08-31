"use client";

import { useState, useRef, useEffect } from "react";
import { PDFDocument } from "pdf-lib";
import {
  FileCode2,
  Trash2,
  Download,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Dropzone from "@/components/Dropzone";

interface MetadataState {
  title: string;
  author: string;
  subject: string;
  keywords: string;
  creator: string;
  producer: string;
  creationDate: string;
  modificationDate: string;
}

export default function MetadataPDF() {
  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);

  const [meta, setMeta] = useState<MetadataState>({
    title: "",
    author: "",
    subject: "",
    keywords: "",
    creator: "",
    producer: "",
    creationDate: "",
    modificationDate: "",
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [updatedPdfUrl, setUpdatedPdfUrl] = useState<string | null>(null);
  const downloadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (updatedPdfUrl) {
      setTimeout(() => {
        downloadRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 150);
    }
  }, [updatedPdfUrl]);

  const handleFileDrop = async (files: File[]) => {
    if (files && files[0] && files[0].type === "application/pdf") {
      const selected = files[0];
      setFile(selected);
      setUpdatedPdfUrl(null);

      try {
        const buffer = await selected.arrayBuffer();
        const pdfDoc = await PDFDocument.load(buffer);
        setTotalPages(pdfDoc.getPageCount());

        setMeta({
          title: pdfDoc.getTitle() || "",
          author: pdfDoc.getAuthor() || "",
          subject: pdfDoc.getSubject() || "",
          keywords: (pdfDoc.getKeywords() || []).join(", "),
          creator: pdfDoc.getCreator() || "",
          producer: pdfDoc.getProducer() || "",
          creationDate: pdfDoc.getCreationDate() ? pdfDoc.getCreationDate()!.toLocaleDateString() : "-",
          modificationDate: pdfDoc.getModificationDate() ? pdfDoc.getModificationDate()!.toLocaleDateString() : "-",
        });
      } catch (e) {
        console.error(e);
      }
    }
  };

  const removeFile = () => {
    setFile(null);
    setTotalPages(0);
    setUpdatedPdfUrl(null);
    setMeta({
      title: "",
      author: "",
      subject: "",
      keywords: "",
      creator: "",
      producer: "",
      creationDate: "",
      modificationDate: "",
    });
  };

  const stripAllMetadata = () => {
    setMeta({
      title: "",
      author: "",
      subject: "",
      keywords: "",
      creator: "",
      producer: "",
      creationDate: "",
      modificationDate: "",
    });
  };

  const saveMetadata = async () => {
    if (!file) return;
    setIsProcessing(true);

    try {
      const buffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buffer);

      pdfDoc.setTitle(meta.title);
      pdfDoc.setAuthor(meta.author);
      pdfDoc.setSubject(meta.subject);
      pdfDoc.setKeywords(
        meta.keywords
          ? meta.keywords.split(",").map((k) => k.trim()).filter(Boolean)
          : []
      );
      pdfDoc.setCreator(meta.creator);
      pdfDoc.setProducer(meta.producer);

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setUpdatedPdfUrl(url);
    } catch (error) {
      console.error("Error saving metadata:", error);
      alert("Gagal memperbarui metadata dokumen PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 md:px-10 py-8 sm:py-12 max-w-4xl">
      <div className="text-center mb-8 sm:mb-12">
        <div className="inline-flex items-center justify-center p-3.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-2xl mb-4 sm:mb-6 shadow-sm border border-blue-100 dark:border-blue-900/50">
          <FileCode2 size={30} strokeWidth={1.75} />
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight mb-2 sm:mb-4">
          Edit & Bersihkan Metadata PDF
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-lg max-w-xl mx-auto leading-relaxed">
          Ubah judul, penulis, subjek, atau hapus seluruh jejak data tersembunyi untuk menjaga privasi dokumen Anda.
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
                <p className="text-xs text-slate-500 dark:text-slate-400">Total {totalPages} Halaman • {(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button
                onClick={removeFile}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-xl transition-colors font-medium border border-red-200/60 dark:border-red-900/50"
              >
                <Trash2 size={16} />
                Ganti File
              </button>
            </div>

            {/* Quick action bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 mb-6">
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                🛡️ Bersihkan metadata untuk menyembunyikan identitas pembuat file.
              </span>
              <button
                type="button"
                onClick={stripAllMetadata}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs font-semibold hover:bg-rose-100 transition-colors"
              >
                <ShieldCheck size={14} />
                Bersihkan Semua Metadata
              </button>
            </div>

            {/* Metadata Fields */}
            <div className="p-5 sm:p-6 bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 mb-6 sm:mb-8 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Judul Dokumen (Title)
                  </label>
                  <input
                    type="text"
                    value={meta.title}
                    onChange={(e) => setMeta({ ...meta, title: e.target.value })}
                    placeholder="Judul dokumen..."
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Penulis / Pengarang (Author)
                  </label>
                  <input
                    type="text"
                    value={meta.author}
                    onChange={(e) => setMeta({ ...meta, author: e.target.value })}
                    placeholder="Nama penulis..."
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Subjek (Subject)
                  </label>
                  <input
                    type="text"
                    value={meta.subject}
                    onChange={(e) => setMeta({ ...meta, subject: e.target.value })}
                    placeholder="Subjek dokumen..."
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Kata Kunci / Tag (Keywords, pisahkan koma)
                  </label>
                  <input
                    type="text"
                    value={meta.keywords}
                    onChange={(e) => setMeta({ ...meta, keywords: e.target.value })}
                    placeholder="Contoh: surat, laporan, keuangan"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Aplikasi Pembuat (Creator)
                  </label>
                  <input
                    type="text"
                    value={meta.creator}
                    onChange={(e) => setMeta({ ...meta, creator: e.target.value })}
                    placeholder="Kuro PDF / Microsoft Word..."
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Produser PDF (Producer)
                  </label>
                  <input
                    type="text"
                    value={meta.producer}
                    onChange={(e) => setMeta({ ...meta, producer: e.target.value })}
                    placeholder="PDF Producer..."
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-center pt-2">
              <button
                onClick={saveMetadata}
                disabled={isProcessing}
                className="w-full sm:w-auto px-8 sm:px-10 py-3.5 sm:py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center justify-center gap-2.5 text-xs sm:text-base"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Menyimpan Metadata...</span>
                  </>
                ) : (
                  <>
                    <FileCode2 size={18} />
                    <span>Simpan Perubahan Metadata</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {updatedPdfUrl && (
        <div
          ref={downloadRef}
          className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 p-6 sm:p-8 rounded-3xl text-center shadow-sm backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          <div className="inline-flex items-center justify-center p-3 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-full mb-4">
            <CheckCircle2 size={28} />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-emerald-950 dark:text-emerald-100 mb-2">Metadata Berhasil Disimpan!</h3>
          <p className="text-xs sm:text-sm text-emerald-800/80 dark:text-emerald-400 mb-6 max-w-md mx-auto">
            Informasi metadata pada dokumen PDF Anda telah diperbarui sesuai input Anda.
          </p>
          <a
            href={updatedPdfUrl}
            download={`meta-${file?.name || "document.pdf"}`}
            className="inline-flex items-center justify-center gap-2.5 px-6 sm:px-8 py-3 sm:py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-semibold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
          >
            <Download size={18} strokeWidth={2} />
            Unduh Hasil PDF
          </a>
        </div>
      )}
    </div>
  );
}
