import { FileText } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200/50 dark:border-slate-800/60 bg-white/40 dark:bg-slate-900/40 backdrop-blur-lg py-8 sm:py-10 mt-auto relative z-10 transition-colors">
      <div className="container mx-auto px-4 sm:px-6 md:px-10 flex flex-col items-center justify-center gap-3">
        <div className="flex items-center gap-2 opacity-80">
          <FileText size={16} className="text-slate-800 dark:text-slate-200" strokeWidth={2.5} />
          <span className="text-sm font-bold tracking-tight text-slate-800 dark:text-slate-200">Kuro PDF</span>
        </div>
        
        <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 text-center">
          &copy; {new Date().getFullYear()} Kuro PDF Tools. Cepat, aman, dan diproses langsung di browser.
        </p>
      </div>
    </footer>
  );
}
