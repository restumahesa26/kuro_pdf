import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const format = formData.get("format") as string | null;
    const selectedPages = formData.get("pages") as string | null; // e.g. "1,3,4"
    
    if (!file) {
      return NextResponse.json(
        { error: "File tidak ditemukan dalam request." },
        { status: 400 }
      );
    }

    if (!format || !["docx", "pptx", "xlsx"].includes(format)) {
      return NextResponse.json(
        { error: "Format tidak valid." },
        { status: 400 }
      );
    }
    
    // Simulasi delay pemrosesan selama 2 detik
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    // Membuat isi file dummy sederhana
    const dummyContent = `Ini adalah file dummy hasil konversi dari PDF ke format ${format}.\nHalaman yang dipilih: ${selectedPages || "Semua"}\nNama File Asli: ${file.name}`;
    
    let contentType = "application/octet-stream";
    if (format === "docx") contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    if (format === "pptx") contentType = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    if (format === "xlsx") contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    const baseName = file.name.replace(/\.[^/.]+$/, "");
    const outputFilename = `${baseName}-converted.${format}`;

    return new NextResponse(dummyContent, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${outputFilename}"`,
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
