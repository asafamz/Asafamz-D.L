import { NextResponse } from "next/server";
import { checkCompanyAdmin } from "@/lib/whop-access";
import { attachExperience, createExperience, WhopApiError } from "@/lib/whop-rest";

interface CreateExperienceRequestBody {
  companyId?: string;
  productId?: string;
}

export async function POST(request: Request) {
  try {
    const { companyId, productId } = (await request.json()) as CreateExperienceRequestBody;
    if (!companyId || !productId) {
      return NextResponse.json(
        { error: "companyId and productId are required." },
        { status: 400 },
      );
    }

    const access = await checkCompanyAdmin(companyId);
    if (access.access_level !== "admin") {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const appId = process.env.NEXT_PUBLIC_WHOP_APP_ID;
    if (!appId) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_WHOP_APP_ID is not configured." },
        { status: 500 },
      );
    }

    const experience = await createExperience(companyId, appId, "Asafamz Digital Library");
    await attachExperience(experience.id, productId);

    return NextResponse.json({ success: true, experienceId: experience.id });
  } catch (error) {
    console.error(error);
    const status = error instanceof WhopApiError ? error.status : 500;
    return NextResponse.json(
      { error: "Could not create or attach the library experience." },
      { status },
    );
  }
}
