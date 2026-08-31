"use client";

import Link from "next/link";
import Image from "next/image";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 w-full border-b border-slate-200/60 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/80 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_30px_rgba(0,0,0,0.3)] transition-colors duration-300">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 md:px-10">
        {/* Logo and Brand */}
        <Link href="/" className="flex items-center gap-3 group select-none">
          <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-2xl overflow-hidden shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-300 flex items-center justify-center bg-slate-900 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
            <Image
              src="/favicon/favicon.svg"
              alt="Kuro PDF Logo"
              width={28}
              height={28}
              className="w-7 h-7 object-contain"
              priority
            />
          </div>
          <div className="flex flex-col">
            <span className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors leading-none">
              Kuro PDF
            </span>
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 tracking-wider uppercase mt-0.5">
              100% Privat &amp; Lokal
            </span>
          </div>
        </Link>

        {/* Right side: Dark / Light Mode Toggle */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
