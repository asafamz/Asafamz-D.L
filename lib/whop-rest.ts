/**
 * Typed REST client for Whop API operations that are not reliably available
 * on @whop/sdk 0.0.3 (or whose TypeScript definitions in that version don't
 * match what the API actually accepts/returns):
 *
 *   - Files (upload / retrieve) — 0.0.3 has no `files` namespace at all.
 *   - Experience creation — 0.0.3's `experiences.create` type doesn't know
 *     about `is_public`, even though the API accepts it.
 *   - Product metadata updates — 0.0.3's `products.update` type doesn't
 *     model `metadata` correctly.
 *
 * We deliberately stay OFF the SDK for these specific calls instead of
 * upgrading @whop/sdk, per the pinned-version constraint. Everything else
 * (user auth / access checks) continues to go through lib/whop-sdk.ts and
 * lib/whop-access.ts, which are not affected by this class of problem.
 *
 * All requests are plain `fetch` calls against the documented REST API
 * (https://api.whop.com/api/v1), authenticated with WHOP_API_KEY. This file
 * only ever runs on the server — never import it from a "use client" file.
 */

const WHOP_API_BASE = "https://api.whop.com/api/v1";

// The /files endpoints require this dated API version or later. We pin it
// explicitly only for file calls, since that's the one place Whop's docs
// mandate a minimum version. Product/Experience calls are left unpinned so
// they keep using the same (company_id-based) request/response shapes the
// rest of this app — and the pinned SDK — already assume.
const FILES_API_VERSION = "2026-08-21-1";

export class WhopApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown, message: string) {
    super(message);
    this.name = "WhopApiError";
    this.status = status;
    this.body = body;
  }
}

function requireApiKey(): string {
  const key = process.env.WHOP_API_KEY;
  if (!key) throw new Error("WHOP_API_KEY is not set.");
  return key;
}

interface WhopFetchOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: Record<string, unknown>;
  apiVersionDate?: string;
  searchParams?: Record<string, string | undefined>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function whopFetch<T>(path: string, options: WhopFetchOptions = {}): Promise<T> {
  const url = new URL(`${WHOP_API_BASE}${path}`);
  if (options.searchParams) {
    for (const [key, value] of Object.entries(options.searchParams)) {
      if (value !== undefined) url.searchParams.set(key, value);
    }
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${requireApiKey()}`,
    "Content-Type": "application/json",
  };
  if (options.apiVersionDate) headers["Api-Version-Date"] = options.apiVersionDate;

  const response = await fetch(url.toString(), {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  const rawText = await response.text();
  const data: unknown = rawText ? JSON.parse(rawText) : null;

  if (!response.ok) {
    const message =
      isRecord(data) && typeof data.message === "string"
        ? data.message
        : `Whop API request failed with status ${response.status} for ${path}`;
    throw new WhopApiError(response.status, data, message);
  }

  return data as T;
}

interface WhopPage<T> {
  data: T[];
  page_info: {
    end_cursor: string | null;
    start_cursor: string | null;
    has_next_page: boolean;
    has_previous_page: boolean;
  };
}

async function listAllPages<T>(
  path: string,
  searchParams: Record<string, string | undefined>,
  apiVersionDate?: string,
): Promise<T[]> {
  const results: T[] = [];
  let after: string | undefined;

  for (;;) {
    const page = await whopFetch<WhopPage<T>>(path, {
      method: "GET",
      searchParams: { ...searchParams, after },
      apiVersionDate,
    });
    results.push(...page.data);
    if (!page.page_info.has_next_page || !page.page_info.end_cursor) break;
    after = page.page_info.end_cursor;
  }

  return results;
}

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------

export type WhopFileUploadStatus = "pending" | "processing" | "ready" | "failed";
export type WhopFileVisibility = "private" | "public";

export interface WhopFile {
  id: string;
  filename: string;
  content_type: string | null;
  size: number | null;
  url: string | null;
  upload_status: WhopFileUploadStatus;
  visibility: WhopFileVisibility;
  upload_url?: string | null;
  upload_headers?: Record<string, string> | null;
}

export async function createPrivateFile(filename: string): Promise<WhopFile> {
  return whopFetch<WhopFile>("/files", {
    method: "POST",
    body: { filename, visibility: "private" },
    apiVersionDate: FILES_API_VERSION,
  });
}

export async function retrieveFile(fileId: string): Promise<WhopFile> {
  return whopFetch<WhopFile>(`/files/${fileId}`, {
    apiVersionDate: FILES_API_VERSION,
  });
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export interface WhopProduct {
  id: string;
  title: string;
  headline?: string | null;
  route?: string;
  metadata: Record<string, unknown> | null;
}

export async function listProducts(companyId: string): Promise<WhopProduct[]> {
  return listAllPages<WhopProduct>("/products", { company_id: companyId });
}

export async function retrieveProduct(productId: string): Promise<WhopProduct> {
  return whopFetch<WhopProduct>(`/products/${productId}`);
}

export async function updateProductMetadata(
  productId: string,
  metadata: Record<string, unknown>,
): Promise<WhopProduct> {
  return whopFetch<WhopProduct>(`/products/${productId}`, {
    method: "PATCH",
    body: { metadata },
  });
}

// ---------------------------------------------------------------------------
// Experiences
// ---------------------------------------------------------------------------

export interface WhopExperienceProductRef {
  id: string;
  title: string;
  route: string;
}

export interface WhopExperience {
  id: string;
  name: string;
  is_public?: boolean;
  app?: { id: string; name: string };
  company?: { id: string; title: string };
  products?: WhopExperienceProductRef[];
}

export async function listExperiences(companyId: string, appId: string): Promise<WhopExperience[]> {
  return listAllPages<WhopExperience>("/experiences", {
    company_id: companyId,
    app_id: appId,
  });
}

export async function retrieveExperience(experienceId: string): Promise<WhopExperience> {
  return whopFetch<WhopExperience>(`/experiences/${experienceId}`);
}

export async function createExperience(
  companyId: string,
  appId: string,
  name: string,
): Promise<WhopExperience> {
  return whopFetch<WhopExperience>("/experiences", {
    method: "POST",
    body: {
      company_id: companyId,
      app_id: appId,
      name,
      is_public: false,
    },
  });
}

export async function attachExperience(experienceId: string, productId: string): Promise<WhopExperience> {
  return whopFetch<WhopExperience>(`/experiences/${experienceId}/attach`, {
    method: "POST",
    body: { product_id: productId },
  });
}
