import { NextResponse } from "next/server";
import { checkCompanyAdmin } from "@/lib/whop-access";
import { whopsdk } from "@/lib/whop-sdk";

export async function POST(request: Request) {
  try {
    const { companyId, productId } = await request.json();
    if (!companyId || !productId) return NextResponse.json({ error: "companyId and productId are required." }, { status: 400 });
    const access = await checkCompanyAdmin(companyId);
    if (access.access_level !== "admin") return NextResponse.json({ error: "Admin access required." }, { status: 403 });

    const experience = await whopsdk.experiences.create({
      app_id: process.env.NEXT_PUBLIC_WHOP_APP_ID!,
      company_id: companyId,
      name: "Asafamz Digital Library",
    });
    await whopsdk.experiences.attach(experience.id, { product_id: productId });
    return NextResponse.json({ success: true, experienceId: experience.id });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not create or attach the library experience." }, { status: 500 });
  }
}
