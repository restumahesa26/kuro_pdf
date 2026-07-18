export default function Footer() {
  return (
    <footer className="w-full border-t border-slate-200 bg-slate-50 py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-500 text-sm">
        <p>&copy; {new Date().getFullYear()} Kuro PDF. All rights reserved.</p>
        <p className="mt-2 text-slate-400">Alat manipulasi dan konversi PDF lengkap & aman.</p>
      </div>
    </footer>
  );
}
