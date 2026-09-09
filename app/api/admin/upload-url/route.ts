import { NextResponse } from "next/server";
import { checkCompanyAdmin } from "@/lib/whop-access";
import { createWhopFile } from "@/lib/whop-sdk";

export async function POST(request: Request) {
  try {
    const { companyId, filename } = await request.json();
    if (!companyId || !filename || !filename.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "A company ID and PDF filename are required." }, { status: 400 });
    }
    const access = await checkCompanyAdmin(companyId);
    if (access.access_level !== "admin") return NextResponse.json({ error: "Admin access required." }, { status: 403 });

    const file = await createWhopFile(filename);
    return NextResponse.json({ id: file.id, uploadUrl: file.upload_url, uploadHeaders: file.upload_headers });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not create upload." }, { status: 500 });
  }
}
