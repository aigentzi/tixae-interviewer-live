import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

// Configure larger body size limit for video uploads
export const maxDuration = 60; // 60 seconds timeout
export const dynamic = "force-dynamic";

export const POST = async (req: NextRequest) => {
  console.log("Uploading file");

  try {
    const formData = await req.formData();
    const body = Object.fromEntries(formData);
    const file = (body.file as File) || null;
    const fileName = file.name || "default.png";
    const folder = body.folder || "default";

    if (!file || !fileName) {
      return NextResponse.json({
        success: false,
        error: "No file or filename provided",
      });
    }

    // Check file size (100MB limit for regular upload endpoint)
    const maxSizeBytes = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSizeBytes) {
      return NextResponse.json({
        success: false,
        error: `File size (${(file.size / 1024 / 1024).toFixed(
          1
        )}MB) exceeds maximum allowed size of 100MB. Please use a smaller file or try again.`,
      });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const options = {
      host: "https://storage.bunnycdn.com",
      path:
        "/" + process.env.BUNNY_CDN_USERNAME + "/" + folder + "/" + fileName,
      headers: {
        AccessKey: process.env.BUNNY_CDN_PASSWORD,
        "Content-Type": "application/octet-stream",
      },
    };

    const response = await axios.put(options.host + options.path, buffer, {
      headers: options.headers,
    });

    if (response.status !== 201) {
      return NextResponse.json({
        success: false,
        error: "Failed to upload file to storage",
      });
    }

    return NextResponse.json({
      success: true,
      url: process.env.BUNNY_CDN_URL + "/" + folder + "/" + fileName,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    });
  }
};
