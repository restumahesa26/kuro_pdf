import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { FileText } from "lucide-react";

const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "Kuro PDF | Minimalist & Elegant PDF Tools",
  description: "Aesthetic all-in-one PDF Tools portal for modern workflows.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning className={`${inter.className} h-full antialiased selection:bg-blue-100 selection:text-blue-900 dark:selection:bg-blue-900/50 dark:selection:text-blue-200`}>
      <head>
        {/* Prevent theme flashing on page load */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme');
                if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-slate-50 dark:bg-[#0b0f19] text-slate-800 dark:text-slate-100 relative overflow-x-hidden transition-colors duration-300">
        
        {/* Aesthetic Background Mesh for Glassmorphism */}
        <div className="fixed inset-0 z-[-1] pointer-events-none transition-opacity duration-500">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[40%] rounded-full bg-blue-100/60 dark:bg-blue-950/20 blur-[130px]" />
          <div className="absolute top-[20%] right-[-10%] w-[40%] h-[50%] rounded-full bg-purple-100/50 dark:bg-purple-950/20 blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[20%] w-[50%] h-[40%] rounded-full bg-teal-50/60 dark:bg-teal-950/15 blur-[130px]" />
        </div>

        {/* Global Responsive Navbar */}
        <Navbar />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col pt-20 sm:pt-24 pb-12 relative">{children}</main>

        {/* Minimalist Footer */}
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

      </body>
    </html>
  );
}
