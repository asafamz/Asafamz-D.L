import { Whop } from "@whop/sdk";

export const whopsdk = new Whop({
  appID: process.env.NEXT_PUBLIC_WHOP_APP_ID,
  apiKey: process.env.WHOP_API_KEY,
  webhookKey: btoa(process.env.WHOP_WEBHOOK_SECRET || ""),
});

// The pinned @whop/sdk version used by this project does not expose the
// files namespace, so file operations use Whop's documented REST API.
const WHOP_API_URL = "https://api.whop.com/api/v1";

async function whopFileRequest(path: string, options: RequestInit = {}) {
  const apiKey = process.env.WHOP_API_KEY;
  if (!apiKey) throw new Error("WHOP_API_KEY is not configured.");

  const response = await fetch(`${WHOP_API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Whop file API error ${response.status}: ${text}`);
  }

  return response.json();
}

export async function createWhopFile(filename: string) {
  return whopFileRequest("/files", {
    method: "POST",
    body: JSON.stringify({ filename, visibility: "private" }),
  });
}

export async function retrieveWhopFile(fileId: string) {
  return whopFileRequest(`/files/${encodeURIComponent(fileId)}`);
}
