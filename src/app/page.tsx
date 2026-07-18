import Link from "next/link";
import {
  FilePlus2,
  SplitSquareHorizontal,
  Minimize2,
  RotateCw,
  ArrowDownUp,
  Crop,
  FileText,
  Presentation,
  Table,
  FileSpreadsheet,
  Image as ImageIcon,
  FileImage,
  Lock,
  Heart,
} from "lucide-react";

type Tool = {
  id: string;
  name: string;
  icon: React.ElementType;
  href: string;
  description: string;
};

const toolGroups = [
  {
    title: "Kelola PDF",
    description: "Gabungkan, pisahkan, dan atur halaman PDF Anda.",
    tools: [
      { id: "merge", name: "Merge PDF", icon: FilePlus2, href: "/merge", description: "Gabungkan banyak file PDF menjadi satu file." },
      { id: "split", name: "Split PDF", icon: SplitSquareHorizontal, href: "/split", description: "Pisahkan satu PDF menjadi beberapa dokumen." },
      { id: "compress", name: "Compress PDF", icon: Minimize2, href: "/compress", description: "Perkecil ukuran file PDF tanpa mengurangi kualitas." },
      { id: "rotate", name: "Rotate PDF", icon: RotateCw, href: "/rotate", description: "Putar orientasi halaman PDF Anda." },
      { id: "sort", name: "Sort PDF", icon: ArrowDownUp, href: "/sort", description: "Susun ulang urutan halaman dalam PDF." },
      { id: "crop", name: "Crop PDF", icon: Crop, href: "/crop", description: "Potong margin atau area yang tidak diinginkan." },
    ]
  },
  {
    title: "Ubah dari PDF",
    description: "Konversi PDF Anda menjadi format file lain.",
    tools: [
      { id: "pdf-to-word", name: "PDF to Word", icon: FileText, href: "/pdf-to-word", description: "Ubah PDF menjadi dokumen Word yang dapat diedit." },
      { id: "pdf-to-ppt", name: "PDF to PPT", icon: Presentation, href: "/pdf-to-ppt", description: "Konversi PDF ke presentasi PowerPoint." },
      { id: "pdf-to-excel", name: "PDF to Excel", icon: Table, href: "/pdf-to-excel", description: "Ekstrak tabel PDF menjadi spreadsheet Excel." },
      { id: "pdf-to-jpg", name: "PDF to JPG", icon: ImageIcon, href: "/pdf-to-jpg", description: "Ubah setiap halaman PDF menjadi gambar JPG." },
    ]
  },
  {
    title: "Ubah ke PDF",
    description: "Ubah berbagai macam dokumen menjadi format PDF.",
    tools: [
      { id: "word-to-pdf", name: "Word to PDF", icon: FileText, href: "/word-to-pdf", description: "Ubah dokumen Word menjadi file PDF." },
      { id: "ppt-to-pdf", name: "PPT to PDF", icon: Presentation, href: "/ppt-to-pdf", description: "Ubah presentasi PPT menjadi PDF." },
      { id: "excel-to-pdf", name: "Excel to PDF", icon: FileSpreadsheet, href: "/excel-to-pdf", description: "Ubah spreadsheet Excel ke PDF." },
      { id: "jpg-to-pdf", name: "JPG to PDF", icon: FileImage, href: "/jpg-to-pdf", description: "Ubah gambar JPG menjadi dokumen PDF." },
    ]
  },
  {
    title: "Keamanan PDF",
    description: "Lindungi dokumen PDF Anda dari akses tidak sah.",
    tools: [
      { id: "protect", name: "Protect PDF", icon: Lock, href: "/protect", description: "Tambahkan kata sandi untuk mengamankan PDF Anda." },
    ]
  }
];

export default function Home() {
  return (
    <div className="container mx-auto px-6 md:px-10 py-16 md:py-24 max-w-6xl">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto mb-20">
        <div className="inline-flex items-center justify-center px-4 py-1.5 mb-6 text-xs font-medium tracking-wide uppercase bg-slate-100 text-slate-600 rounded-full border border-slate-200/50">
          Cepat & Gratis
        </div>
        <h1 className="text-4xl md:text-5xl font-semibold text-slate-900 tracking-tight mb-6">
          Kumpulan Alat PDF Minimalis
        </h1>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
          Kelola, manipulasi, dan konversi file PDF dengan sangat mudah.
          Desain elegan, diproses langsung di browser Anda.
        </p>
      </div>

      {/* Tool Groups */}
      <div className="space-y-20">
        {toolGroups.map((group, groupIdx) => (
          <section key={groupIdx}>
            <div className="mb-8 border-b border-slate-200/50 pb-4">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900 mb-2">{group.title}</h2>
              <p className="text-slate-500 text-sm">{group.description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {group.tools.map((tool) => {
                const Icon = tool.icon;
                return (
                  <Link
                    key={tool.id}
                    href={tool.href}
                    className="group relative flex flex-col p-6 bg-white/70 backdrop-blur-xl rounded-2xl border border-white/60 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:bg-white/90 hover:border-white transition-all duration-300 overflow-hidden"
                  >
                    {/* Hover Glow Effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    <div className="relative z-10 flex items-start gap-5">
                      <div className="flex-shrink-0 p-3 bg-slate-50 text-slate-700 rounded-xl group-hover:bg-slate-900 group-hover:text-white transition-colors duration-300">
                        <Icon size={22} strokeWidth={2} />
                      </div>

                      <div>
                        <h3 className="font-semibold text-slate-900 mb-1.5 group-hover:text-slate-900 transition-colors">
                          {tool.name}
                        </h3>
                        <p className="text-[13px] text-slate-500 leading-relaxed">
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

      {/* Donation Section */}
      <div className="mt-32 max-w-2xl mx-auto text-center">
        <div className="relative p-8 md:p-10 bg-gradient-to-br from-yellow-50/50 via-amber-50/30 to-orange-50/50 backdrop-blur-xl rounded-3xl border border-yellow-200/50 shadow-[0_8px_30px_rgba(251,191,36,0.1)] overflow-hidden">
          {/* Subtle background element */}
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-yellow-300/20 blur-2xl rounded-full" />
          <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-orange-300/20 blur-2xl rounded-full" />

          <div className="relative z-10 flex flex-col items-center">
            <div className="flex items-center justify-center w-14 h-14 bg-white rounded-2xl shadow-sm border border-yellow-100 mb-5 text-amber-500">
              <Heart size={26} fill="currentColor" strokeWidth={1.5} className="animate-pulse" />
            </div>

            <h3 className="text-2xl font-semibold text-slate-900 tracking-tight mb-3">
              Dukung Kuro PDF
            </h3>
            <p className="text-sm md:text-base text-slate-600 mb-8 max-w-md mx-auto leading-relaxed">
              Jika alat gratis ini membantu pekerjaan Anda, pertimbangkan untuk mentraktir kami kopi melalui Saweria agar kami terus bersemangat!
            </p>

            <a
              href="https://saweria.co/pointcoder"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative inline-flex items-center justify-center gap-2.5 px-8 py-3.5 bg-slate-900 text-white rounded-xl font-medium transition-all duration-300 hover:bg-slate-800 hover:shadow-lg hover:-translate-y-0.5 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-orange-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="relative z-10">Donasi via Saweria</span>
              <Heart size={16} className="relative z-10 text-amber-400 group-hover:text-amber-300 transition-colors" fill="currentColor" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
