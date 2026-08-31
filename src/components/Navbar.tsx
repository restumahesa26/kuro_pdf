"use client";

import Link from "next/link";
import { FileText } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 w-full border-b border-slate-200/60 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/80 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_30px_rgba(0,0,0,0.3)] transition-colors duration-300">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 md:px-10">
        {/* Logo and Brand */}
        <Link href="/" className="flex items-center gap-2.5 group select-none">
          <div className="p-2 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl text-white shadow-md shadow-blue-500/20 group-hover:shadow-blue-500/40 group-hover:scale-105 transition-all duration-300">
            <FileText size={18} strokeWidth={2.5} />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors">
            Kuro PDF
          </span>
        </Link>

        {/* Right side: Dark / Light Mode Toggle */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
