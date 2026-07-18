import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, rgb } from "pdf-lib";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    
    if (!file) {
      return NextResponse.json(
        { error: "File tidak ditemukan dalam request." },
        { status: 400 }
      );
    }
    
    // Simulasi delay pemrosesan selama 2 detik
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    // Membuat file PDF dummy
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // Ukuran A4
    
    page.drawText(`Hasil Konversi Dummy`, {
      x: 50,
      y: 750,
      size: 24,
      color: rgb(0.2, 0.2, 0.2),
    });
    
    page.drawText(`Nama File Asli: ${file.name}`, {
      x: 50,
      y: 710,
      size: 14,
      color: rgb(0.4, 0.4, 0.4),
    });
    
    page.drawText(`Catatan: Ini adalah file PDF hasil dari Mock API.`, {
      x: 50,
      y: 670,
      size: 12,
      color: rgb(0.6, 0.6, 0.6),
    });
    
    const pdfBytes = await pdfDoc.save();
    
    return new NextResponse(pdfBytes as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="converted-${file.name}.pdf"`,
      },
    });
    
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan internal pada server." },
      { status: 500 }
    );
  }
}
