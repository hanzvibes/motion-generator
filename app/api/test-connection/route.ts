import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 20;

const schema = z.object({
  provider: z.enum(["openai", "anthropic", "google", "custom"]),
  apiKey: z.string().max(512).optional().default(""),
  baseURL: z.string().trim().max(500).optional(),
  model: z.string().trim().min(2).max(100),
});

function isPublicIP(address: string): boolean {
  const version = isIP(address);
  if (version === 4) {
    const parts = address.split(".").map(Number);
    if (parts.length !== 4 || parts.some((part) => part < 0 || part > 255)) return false;
    const [a, b] = parts;
    return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
      (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19)) ||
      (a === 198 && b === 51) || (a === 203 && b === 0));
  }
  if (version !== 6) return false;
  const value = address.toLowerCase().split("%")[0];
  return !(value === "::" || value === "::1" || value.startsWith("::ffff:") ||
    value.startsWith("fc") || value.startsWith("fd") || /^fe[89ab]/.test(value) || value.startsWith("ff"));
}

async function validatePublicHttps(raw: string): Promise<URL> {
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error("Enter a valid base URL."); }
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash ||
      !hostname || hostname === "localhost" || hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") || (isIP(hostname) !== 0 && !isPublicIP(hostname))) {
    throw new Error("Custom endpoints must use a public HTTPS URL without credentials, query parameters, or fragments.");
  }
  if (!isIP(hostname)) {
    let addresses: { address: string; family: number }[];
    try { addresses = await lookup(hostname, { all: true, verbatim: true }); }
    catch { throw new Error("The custom endpoint hostname could not be resolved."); }
    if (!addresses.length || addresses.some(({ address }) => !isPublicIP(address))) {
      throw new Error("The custom endpoint must resolve only to public IP addresses.");
    }
  }
  return url;
}

export async function POST(request: Request) {
  let body: z.infer<typeof schema>;
  try { body = schema.parse(await request.json()); }
  catch { return NextResponse.json({ ok: false, error: "Check the provider, model ID, and API key." }, { status: 400 }); }

  if (body.provider !== "custom" && body.apiKey.trim().length < 12) {
    return NextResponse.json({ ok: false, error: "Enter an API key for the selected provider." }, { status: 400 });
  }

  let endpoint: URL | undefined;
  if (body.provider === "custom") {
    if (!body.baseURL) return NextResponse.json({ ok: false, error: "Enter the custom provider base URL." }, { status: 400 });
    try { endpoint = await validatePublicHttps(body.baseURL); }
    catch (error) {
      return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Invalid custom endpoint." }, { status: 400 });
    }
  }

  try {
    const safeFetch: typeof fetch = async (input, init) => {
      const target = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
      if (!endpoint || target.origin !== endpoint.origin) throw new Error("Blocked request outside the configured endpoint.");
      await validatePublicHttps(target.origin);
      const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
      if (!body.apiKey.trim()) headers.delete("authorization");
      return fetch(input, { ...init, headers, redirect: "error" });
    };

    const model =
      body.provider === "openai"
        ? createOpenAI({ apiKey: body.apiKey })(body.model)
        : body.provider === "anthropic"
          ? createAnthropic({ apiKey: body.apiKey })(body.model)
          : body.provider === "google"
            ? createGoogleGenerativeAI({ apiKey: body.apiKey })(body.model)
            : createOpenAI({
                apiKey: body.apiKey.trim() || "custom-no-auth",
                baseURL: endpoint!.toString().replace(/\/$/, ""),
                fetch: safeFetch,
              })(body.model);

    await generateText({ model, prompt: "Reply with exactly the word OK.", maxOutputTokens: 8 });
    return NextResponse.json({ ok: true, message: "Connection successful. The provider accepted the request." }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const unauthorized = /api.?key|unauthorized|authentication|invalid.?token|forbidden/i.test(message);
    return NextResponse.json({
      ok: false,
      error: unauthorized
        ? "Authentication failed. Check the API key and provider."
        : "Connection failed. Check the model ID, provider access, credits, and endpoint URL.",
    }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
