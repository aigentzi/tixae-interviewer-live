import axios from "axios";
import { NextRequest, NextResponse } from "next/server";

export const POST = async (req: NextRequest) => {
  try {
    const { fileName, contentType, folder } = await req.json();

    const options = {
      host: "https://storage.bunnycdn.com",
      path: "/" + process.env.BUNNY_CDN_USERNAME + "/" + folder + "/" + fileName,
      headers: {
        AccessKey: process.env.BUNNY_CDN_PASSWORD,
        'Content-Type': contentType,
      },
    };

    return NextResponse.json({
      uploadUrl: options.host + options.path,
      viewUrl: process.env.BUNNY_CDN_URL + "/" + folder + "/" + fileName,
      success: true,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({
      success: false,
      error: "Can't parse request",
    });
  }
}
