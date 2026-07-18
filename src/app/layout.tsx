import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { FileText } from "lucide-react";

// Use Inter with a broader subset for better typography, and adjust weights
const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500", "600"] });

export const metadata: Metadata = {
  title: "Kuro PDF | Clean & Elegant Tools",
  description: "Aesthetic all-in-one PDF Tools portal for modern workflows.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.className} h-full antialiased selection:bg-blue-100 selection:text-blue-900`}>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-800 relative overflow-x-hidden">
        
        {/* Aesthetic Background Mesh for Glassmorphism */}
        <div className="fixed inset-0 z-[-1] pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-100/50 blur-[120px]" />
          <div className="absolute top-[20%] right-[-10%] w-[30%] h-[50%] rounded-full bg-purple-100/40 blur-[100px]" />
          <div className="absolute bottom-[-10%] left-[20%] w-[40%] h-[40%] rounded-full bg-teal-50/50 blur-[120px]" />
        </div>

        {/* Elegant Glassmorphism Header */}
        <header className="fixed top-0 inset-x-0 z-50 w-full border-b border-white/40 bg-white/60 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.03)] transition-all duration-300">
          <div className="container mx-auto flex h-16 items-center justify-between px-6 md:px-10">
            
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="p-2 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-lg text-white shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-300">
                <FileText size={18} strokeWidth={2.5} />
              </div>
              <span className="text-xl font-semibold tracking-tight text-slate-900">
                Kuro PDF
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-8 text-[13px] font-medium tracking-wide uppercase text-slate-500">
              <Link href="/" className="hover:text-blue-600 transition-colors">Beranda</Link>
              <Link href="#" className="hover:text-blue-600 transition-colors">Fitur</Link>
              <Link href="#" className="hover:text-blue-600 transition-colors">Harga</Link>
            </nav>

          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col pt-24 pb-12 z-10">{children}</main>

        {/* Minimalist Footer */}
        <footer className="border-t border-white/40 bg-white/30 backdrop-blur-lg py-10 mt-auto z-10">
          <div className="container mx-auto px-6 md:px-10 flex flex-col items-center justify-center gap-4">
            <div className="flex items-center gap-2 opacity-80">
              <FileText size={16} className="text-slate-800" strokeWidth={2.5} />
              <span className="text-sm font-semibold tracking-tight text-slate-800">Kuro PDF</span>
            </div>
            
            <p className="text-[13px] text-slate-500">
              &copy; {new Date().getFullYear()} Kuro PDF Tools. Crafted with precision.
            </p>
          </div>
        </footer>

      </body>
    </html>
  );
}
