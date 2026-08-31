import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Image from "next/image";
import "./globals.css";
import Navbar from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "Kuro PDF | Alat PDF Lengkap, Cepat & 100% Privat",
  description: "Aplikasi PDF all-in-one minimalis, cepat, dan 100% aman diproses langsung di peramban tanpa kirim data ke server.",
  icons: {
    icon: [
      { url: "/favicon/favicon.ico" },
      { url: "/favicon/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    apple: [
      { url: "/favicon/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: ["/favicon/favicon.ico"],
  },
  manifest: "/favicon/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning className={`${inter.className} h-full antialiased selection:bg-emerald-100 selection:text-emerald-900 dark:selection:bg-emerald-900/50 dark:selection:text-emerald-200`}>
      <head>
        <link rel="icon" href="/favicon/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/favicon/apple-touch-icon.png" />
        <link rel="manifest" href="/favicon/site.webmanifest" />
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
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[40%] rounded-full bg-emerald-100/40 dark:bg-emerald-950/15 blur-[130px]" />
          <div className="absolute top-[20%] right-[-10%] w-[40%] h-[50%] rounded-full bg-teal-100/40 dark:bg-teal-950/15 blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[20%] w-[50%] h-[40%] rounded-full bg-cyan-50/50 dark:bg-cyan-950/10 blur-[130px]" />
        </div>

        {/* Global Responsive Navbar */}
        <Navbar />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col pt-20 sm:pt-24 pb-12 relative">{children}</main>

        {/* Minimalist Footer */}
        <footer className="border-t border-slate-200/50 dark:border-slate-800/60 bg-white/40 dark:bg-slate-900/40 backdrop-blur-lg py-8 sm:py-10 mt-auto relative z-10 transition-colors">
          <div className="container mx-auto px-4 sm:px-6 md:px-10 flex flex-col items-center justify-center gap-3">
            <div className="flex items-center gap-2.5 opacity-90">
              <div className="w-5 h-5 rounded-lg overflow-hidden flex items-center justify-center">
                <Image
                  src="/favicon/favicon.svg"
                  alt="Kuro PDF Logo"
                  width={20}
                  height={20}
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">Kuro PDF</span>
            </div>
            
            <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 text-center">
              &copy; {new Date().getFullYear()} Kuro PDF. Cepat, aman, dan 100% diproses langsung di browser Anda.
            </p>
          </div>
        </footer>

      </body>
    </html>
  );
}
