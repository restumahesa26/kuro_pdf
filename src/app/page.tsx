import Link from "next/link";
import {
  FilePlus2,
  SplitSquareHorizontal,
  Minimize2,
  RotateCw,
  ArrowDownUp,
  Crop,
  FileMinus2,
  FileText,
  Presentation,
  Table,
  FileSpreadsheet,
  Image as ImageIcon,
  FileImage,
  Lock,
  Heart,
  Stamp,
  FileDigit,
  PenTool,
  Grid2X2,
  Scaling,
  FilePlus,
  EyeOff,
  QrCode,
  FileCode2,
  Images,
  ShieldCheck,
  ServerOff,
  Cpu,
  Zap,
  CheckCircle2,
  LockKeyhole,
} from "lucide-react";

type Tool = {
  id: string;
  name: string;
  icon: React.ElementType;
  href?: string;
  description: string;
  comingSoon?: boolean;
  isNew?: boolean;
};

interface ToolGroup {
  title: string;
  description: string;
  tools: Tool[];
}

const toolGroups: ToolGroup[] = [
  {
    title: "Kelola & Tata Letak Halaman PDF",
    description: "Gabungkan, pisahkan, hapus, atur urutan, dan ubah tata letak halaman PDF secara lokal.",
    tools: [
      { id: "merge", name: "Merge PDF", icon: FilePlus2, href: "/merge", description: "Gabungkan banyak file PDF menjadi satu file." },
      { id: "split", name: "Split PDF", icon: SplitSquareHorizontal, href: "/split", description: "Pisahkan satu PDF menjadi beberapa dokumen dengan pratinjau." },
      { id: "remove", name: "Hapus Halaman", icon: FileMinus2, href: "/remove", description: "Hapus halaman tertentu yang tidak diinginkan dari file PDF." },
      { id: "compress", name: "Compress PDF", icon: Minimize2, href: "/compress", description: "Perkecil ukuran file PDF tanpa mengurangi kualitas secara drastis." },
      { id: "rotate", name: "Rotate PDF", icon: RotateCw, href: "/rotate", description: "Putar orientasi halaman PDF Anda satu per satu atau sekaligus." },
      { id: "sort", name: "Sort PDF", icon: ArrowDownUp, href: "/sort", description: "Susun ulang urutan halaman dalam PDF dengan drag and drop." },
      { id: "crop", name: "Crop PDF", icon: Crop, href: "/crop", description: "Potong margin kosong atau area yang tidak diinginkan." },
      { id: "nup", name: "Cetak N-Up", icon: Grid2X2, href: "/nup", description: "Gabungkan 2 atau 4 halaman ke dalam 1 lembar kertas hemat cetak.", isNew: true },
      { id: "resize", name: "Ubah Ukuran Kertas", icon: Scaling, href: "/resize", description: "Standarisasi dimensi halaman dokumen ke ukuran A4, Letter, F4, atau A3.", isNew: true },
      { id: "add-blank-page", name: "Sisipkan Lembar Kosong", icon: FilePlus, href: "/add-blank-page", description: "Tambahkan halaman kosong di awal, akhir, atau di antara bab dokumen.", isNew: true },
    ]
  },
  {
    title: "Kustomisasi & Keamanan PDF",
    description: "Beri watermark, nomor halaman, tanda tangan, sensor data, dan kelola metadata.",
    tools: [
      { id: "watermark", name: "Watermark PDF", icon: Stamp, href: "/watermark", description: "Tambahkan cap air teks atau logo transparan untuk perlindungan hak cipta.", isNew: true },
      { id: "page-number", name: "Nomor Halaman", icon: FileDigit, href: "/page-number", description: "Sisipkan penomoran halaman otomatis di header atau footer dokumen.", isNew: true },
      { id: "sign", name: "Tanda Tangan Digital", icon: PenTool, href: "/sign", description: "Gambar atau unggah tanda tangan/paraf dan tempatkan langsung pada PDF.", isNew: true },
      { id: "redact", name: "Sensor / Redact PDF", icon: EyeOff, href: "/redact", description: "Tutup permanen data sensitif seperti NIK, kontak, atau nomor rekening.", isNew: true },
      { id: "add-qrcode", name: "Tambah QR Code", icon: QrCode, href: "/add-qrcode", description: "Tempelkan QR Code dinamis untuk verifikasi surat atau tautan dokumen.", isNew: true },
      { id: "metadata", name: "Edit Metadata PDF", icon: FileCode2, href: "/metadata", description: "Ubah judul, penulis, atau bersihkan seluruh jejak data tersembunyi.", isNew: true },
      { id: "protect", name: "Protect PDF", icon: Lock, description: "Tambahkan kata sandi untuk mengamankan PDF Anda.", comingSoon: true },
    ]
  },
  {
    title: "Ekstraksi Konten",
    description: "Ambil gambar dan aset visual dari dalam dokumen PDF tanpa upload.",
    tools: [
      { id: "extract-images", name: "Ekstrak Semua Gambar", icon: Images, href: "/extract-images", description: "Ambil seluruh gambar resolusi asli dari halaman PDF dan unduh via ZIP.", isNew: true },
    ]
  },
  {
    title: "Ubah dari PDF",
    description: "Konversi PDF Anda menjadi format file lain.",
    tools: [
      { id: "pdf-to-word", name: "PDF to Word", icon: FileText, description: "Ubah PDF menjadi dokumen Word yang dapat diedit.", comingSoon: true },
      { id: "pdf-to-ppt", name: "PDF to PPT", icon: Presentation, description: "Konversi PDF ke presentasi PowerPoint.", comingSoon: true },
      { id: "pdf-to-excel", name: "PDF to Excel", icon: Table, description: "Ekstrak tabel PDF menjadi spreadsheet Excel.", comingSoon: true },
      { id: "pdf-to-jpg", name: "PDF to JPG", icon: ImageIcon, description: "Ubah setiap halaman PDF menjadi gambar JPG.", comingSoon: true },
    ]
  },
  {
    title: "Ubah ke PDF",
    description: "Ubah berbagai macam dokumen menjadi format PDF.",
    tools: [
      { id: "word-to-pdf", name: "Word to PDF", icon: FileText, description: "Ubah dokumen Word menjadi file PDF.", comingSoon: true },
      { id: "ppt-to-pdf", name: "PPT to PDF", icon: Presentation, description: "Ubah presentasi PPT menjadi PDF.", comingSoon: true },
      { id: "excel-to-pdf", name: "Excel to PDF", icon: FileSpreadsheet, description: "Ubah spreadsheet Excel ke PDF.", comingSoon: true },
      { id: "jpg-to-pdf", name: "JPG to PDF", icon: FileImage, description: "Ubah gambar JPG menjadi dokumen PDF.", comingSoon: true },
    ]
  },
];

export default function Home() {
  return (
    <div className="container mx-auto px-4 sm:px-6 md:px-10 py-10 sm:py-16 md:py-20 max-w-6xl">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-5 text-xs font-semibold tracking-wide bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-full border border-emerald-200/80 dark:border-emerald-800/60 shadow-xs">
          <ShieldCheck size={15} className="text-emerald-600 dark:text-emerald-400" />
          <span>100% Client-Side • Dokumen Anda Tidak Pernah Dikirim ke Server</span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4 sm:mb-6 leading-[1.15]">
          Alat PDF Lengkap, Cepat &amp; <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 dark:from-emerald-400 dark:via-teal-300 dark:to-cyan-400">100% Privat</span>
        </h1>

        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Seluruh pemrosesan PDF berjalan langsung di dalam peramban (browser) perangkat Anda. 
          <strong className="text-slate-800 dark:text-white font-semibold"> Tidak ada file yang diunggah, disimpan, atau ditransfer ke server mana pun.</strong>
        </p>
      </div>

      {/* Prominent Privacy & Security Highlight Banner */}
      <div className="mb-14 sm:mb-20 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-cyan-500/10 dark:from-emerald-950/30 dark:via-slate-900/40 dark:to-cyan-950/20 border border-emerald-200/80 dark:border-emerald-800/50 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-emerald-200/60 dark:border-emerald-800/40">
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-emerald-600 dark:bg-emerald-500 text-white rounded-2xl shadow-sm flex-shrink-0">
              <LockKeyhole size={24} strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-1">
                Jaminan Keamanan &amp; Privasi Mutlak (Zero-Server Storage)
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Kuro PDF dirancang khusus dengan arsitektur <em>Zero-Knowledge</em>. Data Anda adalah hak privasi Anda sepenuhnya.
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white dark:bg-slate-800/90 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-bold border border-emerald-200 dark:border-emerald-700 shadow-xs self-start md:self-auto flex-shrink-0">
            <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400" />
            <span>0 Byte Data Disimpan</span>
          </div>
        </div>

        {/* 4 Security Pillars Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 pt-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-xl flex-shrink-0 mt-0.5">
              <ServerOff size={18} />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mb-1">
                Tanpa Kirim ke Server
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Dokumen tidak pernah diunggah ke cloud/server eksternal mana pun. File tidak pernah meninggalkan gawai Anda.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 rounded-xl flex-shrink-0 mt-0.5">
              <Cpu size={18} />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mb-1">
                Proses 100% Front-End
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Manipulasi PDF, kompresi, sensor, dan tanda tangan dieksekusi murni di RAM browser menggunakan WebAssembly &amp; JS.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300 rounded-xl flex-shrink-0 mt-0.5">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mb-1">
                Aman Dokumen Sensitif
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Sangat aman untuk kontrak kerja, laporan keuangan, nomor rekening, rekam medis, dan identitas pribadi.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-xl flex-shrink-0 mt-0.5">
              <Zap size={18} />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mb-1">
                Instan &amp; Tanpa Kuota Upload
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Kecepatan instan tanpa jeda mengunggah file besar, hemat kuota internet, dan bebas batasan ukuran file.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tool Groups */}
      <div className="space-y-14 sm:space-y-20">
        {toolGroups.map((group, groupIdx) => (
          <section key={groupIdx}>
            <div className="mb-6 sm:mb-8 border-b border-slate-200/60 dark:border-slate-800/80 pb-4">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-1.5">
                {group.title}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">{group.description}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {group.tools.map((tool) => {
                const Icon = tool.icon;

                if (tool.comingSoon) {
                  return (
                    <div
                      key={tool.id}
                      className="relative flex flex-col p-5 sm:p-6 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-[0_4px_20px_rgba(0,0,0,0.02)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.2)] overflow-hidden cursor-not-allowed select-none group"
                    >
                      {/* Coming Soon Badge */}
                      <div className="absolute top-4 right-4 z-10">
                        <span className="inline-flex items-center px-2.5 py-1 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full border border-slate-200/80 dark:border-slate-700/80">
                          Coming Soon
                        </span>
                      </div>

                      <div className="relative z-10 flex items-start gap-4 sm:gap-5 opacity-60 group-hover:opacity-80 transition-opacity">
                        <div className="flex-shrink-0 p-3 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl">
                          <Icon size={22} strokeWidth={2} />
                        </div>

                        <div className="pr-14 sm:pr-16">
                          <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-1 text-sm sm:text-base">
                            {tool.name}
                          </h3>
                          <p className="text-xs sm:text-[13px] text-slate-400 dark:text-slate-500 leading-relaxed">
                            {tool.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <Link
                    key={tool.id}
                    href={tool.href || "#"}
                    className="group relative flex flex-col p-5 sm:p-6 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-white/80 dark:border-slate-800/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.25)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_8px_30px_rgba(16,185,129,0.1)] hover:bg-white/90 dark:hover:bg-slate-900/90 hover:border-white dark:hover:border-slate-700 transition-all duration-300 overflow-hidden"
                  >
                    {/* New Badge */}
                    {tool.isNew && (
                      <div className="absolute top-4 right-4 z-10">
                        <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-full border border-emerald-200 dark:border-emerald-800">
                          Baru
                        </span>
                      </div>
                    )}

                    {/* Hover Glow Effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/40 dark:from-emerald-900/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    <div className="relative z-10 flex items-start gap-4 sm:gap-5">
                      <div className="flex-shrink-0 p-3 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl group-hover:bg-slate-900 group-hover:text-white dark:group-hover:bg-emerald-600 dark:group-hover:text-white transition-colors duration-300">
                        <Icon size={22} strokeWidth={2} />
                      </div>

                      <div className={tool.isNew ? "pr-12" : ""}>
                        <h3 className="font-semibold text-slate-900 dark:text-white mb-1 text-sm sm:text-base group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                          {tool.name}
                        </h3>
                        <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">
                          {tool.description}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {/* Security FAQ & Trust Guarantee Callout */}
      <div className="mt-16 sm:mt-24 p-6 sm:p-8 bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-3xl backdrop-blur-md">
        <div className="max-w-3xl mx-auto text-center space-y-3">
          <div className="inline-flex items-center justify-center p-2.5 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-2xl mb-1">
            <ShieldCheck size={26} />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
            Bagaimana Kuro PDF Menjaga Kerahasiaan Dokumen Anda?
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Berbeda dengan konverter PDF online konvensional yang mengirim file ke server pihak ketiga, Kuro PDF menggunakan teknologi <strong>WebAssembly &amp; Modern Client-Side JavaScript</strong>. Setiap manipulasi data berlangsung di dalam RAM peramban komputer/ponsel Anda sendiri. Begitu tab ditutup, memori dibersihkan seketika tanpa jejak.
          </p>
        </div>
      </div>

      {/* Donation Section */}
      <div className="mt-14 sm:mt-20 max-w-2xl mx-auto text-center">
        <div className="relative p-6 sm:p-10 bg-gradient-to-br from-yellow-50/60 via-amber-50/30 to-orange-50/60 dark:from-amber-950/20 dark:via-yellow-950/10 dark:to-orange-950/20 backdrop-blur-xl rounded-3xl border border-yellow-200/60 dark:border-amber-900/40 shadow-[0_8px_30px_rgba(251,191,36,0.1)] dark:shadow-[0_8px_30px_rgba(251,191,36,0.03)] overflow-hidden">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-yellow-300/20 dark:bg-yellow-500/10 blur-2xl rounded-full" />
          <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-orange-300/20 dark:bg-orange-500/10 blur-2xl rounded-full" />

          <div className="relative z-10 flex flex-col items-center">
            <div className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-yellow-100 dark:border-amber-900/60 mb-4 sm:mb-5 text-amber-500">
              <Heart size={24} fill="currentColor" strokeWidth={1.5} className="animate-pulse" />
            </div>

            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-2 sm:mb-3">
              Dukung Kuro PDF
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mb-6 sm:mb-8 max-w-md mx-auto leading-relaxed">
              Jika alat gratis dan privat ini membantu pekerjaan harian Anda, pertimbangkan untuk mentraktir kami kopi melalui Saweria agar kami terus bersemangat merilis fitur baru!
            </p>

            <a
              href="https://saweria.co/pointcoder"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-semibold text-sm transition-all duration-300 hover:bg-slate-800 dark:hover:bg-slate-100 hover:shadow-lg hover:-translate-y-0.5 overflow-hidden"
            >
              <span className="relative z-10">Donasi via Saweria</span>
              <Heart size={16} className="relative z-10 text-amber-400 dark:text-amber-500" fill="currentColor" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
