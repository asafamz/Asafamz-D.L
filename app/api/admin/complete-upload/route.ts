import { NextResponse } from "next/server";
import { FILE_METADATA_KEY } from "@/lib/catalog";
import { checkCompanyAdmin } from "@/lib/whop-access";
import { retrieveFile, retrieveProduct, updateProductMetadata, WhopApiError } from "@/lib/whop-rest";

interface CompleteUploadRequestBody {
  companyId?: string;
  productId?: string;
  fileId?: string;
}

export async function POST(request: Request) {
  try {
    const { companyId, productId, fileId } = (await request.json()) as CompleteUploadRequestBody;
    if (!companyId || !productId || !fileId) {
      return NextResponse.json(
        { error: "companyId, productId and fileId are required." },
        { status: 400 },
      );
    }

    const access = await checkCompanyAdmin(companyId);
    if (access.access_level !== "admin") {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const file = await retrieveFile(fileId);
    if (file.upload_status !== "ready") {
      return NextResponse.json(
        { error: `File is not ready yet (${file.upload_status}).` },
        { status: 409 },
      );
    }

    const product = await retrieveProduct(productId);
    await updateProductMetadata(productId, {
      ...(product.metadata ?? {}),
      [FILE_METADATA_KEY]: fileId,
    });

    return NextResponse.json({ success: true, fileId });
  } catch (error) {
    console.error(error);
    const status = error instanceof WhopApiError ? error.status : 500;
    return NextResponse.json({ error: "Could not save the uploaded file." }, { status });
  }
}
