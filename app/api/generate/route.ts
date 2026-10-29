import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import { z } from "zod";
import { NextResponse } from "next/server";
import { MOTION_PRESETS, normalizeSpec } from "@/lib/motion-types";
import { buildSystemPrompt, buildUserPrompt, parseJsonObject } from "@/lib/ai-generation.mjs";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({
  provider: z.enum(["openai", "anthropic", "google", "custom"]),
  apiKey: z.string().max(512).optional().default(""),
  baseURL: z.string().trim().max(500).optional(),
  model: z.string().trim().min(2).max(100),
  prompt: z.string().trim().min(3).max(20000),
  currentSpec: z.unknown().optional(),
});

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const elementSchema = z.object({
  id: z.string().min(1).max(48),
  type: z.enum(["text", "rect", "circle", "ellipse", "line", "triangle", "path"]),
  x: z.number().min(-20).max(120), y: z.number().min(-20).max(120),
  width: z.number().min(0).max(120), height: z.number().min(0).max(120),
  color: hex, text: z.string().max(500).optional(), fontSize: z.number().min(8).max(180).optional(),
  pathData: z.string().max(2000).optional(), strokeColor: hex.optional(), strokeWidth: z.number().min(0).max(24).optional(),
  borderRadius: z.number().min(0).max(100).optional(), blur: z.number().min(0).max(40).optional(), gradientTo: hex.optional(), gradientAngle: z.number().min(0).max(360).optional(),
  layer: z.enum(["graphics", "typography"]).optional(),
  rotation: z.number().min(-360).max(360).optional(), opacity: z.number().min(0).max(1).optional(),
  startSeconds: z.number().min(0).max(60).optional(), endSeconds: z.number().min(0).max(60).optional(),
  motion: z.enum(["fade", "rise", "scale", "drift", "slide-left", "slide-right", "rotate", "bounce", "zoom", "none"]).optional(),
});
const motionSchema = z.object({
  eyebrow: z.string().min(1).max(54),
  title: z.string().min(1).max(80),
  subtitle: z.string().min(1).max(150),
  background: hex,
  accent: hex,
  secondary: hex,
  preset: z.enum(MOTION_PRESETS),
  durationSeconds: z.number().int().min(4).max(60),
  titleStartFrame: z.number().int().min(0).max(120),
  titleTravel: z.number().int().min(0).max(160),
  elements: z.array(elementSchema).min(1).max(256),
  scenes: z.array(z.object({
    title: z.string().min(1).max(80),
    subtitle: z.string().max(150),
    eyebrow: z.string().min(1).max(54),
    startSeconds: z.number().min(0).max(59.5),
    endSeconds: z.number().min(0.5).max(60),
    preset: z.enum(MOTION_PRESETS),
    accent: hex,
    secondary: hex,
    titleTravel: z.number().min(0).max(160),
  })).max(20).optional(),
});

function isPublicIPv4(address: string): boolean {
  const octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b, c] = octets;
  return !(
    a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 0 || b === 168)) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113)
  );
}

function isPublicIP(address: string): boolean {
  const version = isIP(address);
  if (version === 4) return isPublicIPv4(address);
  if (version !== 6) return false;
  const value = address.toLowerCase().split("%")[0];
  if (value === "::" || value === "::1" || value.startsWith("::ffff:") || value.startsWith("fc") || value.startsWith("fd") ||
      /^fe[89ab]/.test(value) || value.startsWith("ff")) return false;
  const mapped = value.match(/^(?:::ffff:)(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPublicIPv4(mapped[1]);
  return true;
}

async function assertPublicHttpsEndpoint(rawURL: string): Promise<URL> {
  let endpoint: URL;
  try {
    endpoint = new URL(rawURL);
  } catch {
    throw new Error("invalid_endpoint");
  }

  const hostname = endpoint.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password ||
      endpoint.search || endpoint.hash || !hostname || hostname === "localhost" ||
      hostname.endsWith(".localhost") || hostname.endsWith(".local") || isIP(hostname) && !isPublicIP(hostname)) {
    throw new Error("invalid_endpoint");
  }

  if (!isIP(hostname)) {
    let addresses: { address: string; family: number }[];
    try {
      addresses = await lookup(hostname, { all: true, verbatim: true });
    } catch {
      throw new Error("invalid_endpoint");
    }
    if (addresses.length === 0 || addresses.some(({ address }) => !isPublicIP(address))) {
      throw new Error("invalid_endpoint");
    }
  }
  return endpoint;
}

export async function POST(request: Request) {
  let body: z.infer<typeof requestSchema>;
  try {
    body = requestSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Check your provider, API key, model, and prompt." }, { status: 400 });
  }

  if (body.provider !== "custom" && body.apiKey.trim().length < 12) {
    return NextResponse.json({ error: "Enter a valid API key for the selected provider." }, { status: 400 });
  }

  let customEndpoint: URL | undefined;
  if (body.provider === "custom") {
    if (!body.baseURL) {
      return NextResponse.json({ error: "Enter your OpenAI-compatible base URL." }, { status: 400 });
    }
    try {
      customEndpoint = await assertPublicHttpsEndpoint(body.baseURL);
    } catch {
      return NextResponse.json({
        error: "Use a public HTTPS endpoint whose DNS resolves only to public IP addresses, without credentials, query parameters, or fragments.",
      }, { status: 400 });
    }
  }

  let stage: "provider" | "parse" | "validate" = "provider";
  try {
    const customFetch: typeof fetch = async (input, init) => {
      const target = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
      if (!customEndpoint || target.origin !== customEndpoint.origin) {
        throw new Error("Blocked request outside the configured custom endpoint.");
      }
      await assertPublicHttpsEndpoint(target.origin);
      const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
      if (!body.apiKey.trim()) headers.delete("authorization");
      return fetch(input, { ...init, headers, redirect: "error" });
    };

    const model =
      body.provider === "openai"
        ? createOpenAI({ apiKey: body.apiKey })(body.model)
        : body.provider === "custom"
          ? createOpenAI({
              apiKey: body.apiKey.trim() || "custom-no-auth",
              baseURL: customEndpoint!.toString().replace(/\/$/, ""),
              fetch: customFetch,
            })(body.model)
          : body.provider === "anthropic"
            ? createAnthropic({ apiKey: body.apiKey })(body.model)
            : createGoogleGenerativeAI({ apiKey: body.apiKey })(body.model);

    const system = buildSystemPrompt();
    const prompt = buildUserPrompt(body.prompt, body.currentSpec);
    let validated: z.infer<typeof motionSchema>;
    if (body.provider === "custom") {
      // OpenAI-compatible gateways vary in support for structured output, so
      // request plain text and validate the returned JSON locally.
      const result = await generateText({ model, maxOutputTokens: 6000, system, prompt });
      stage = "parse";
      const parsed = parseJsonObject(result.text);
      stage = "validate";
      validated = motionSchema.parse(parsed);
    } else {
      const result = await generateText({
        model,
        maxOutputTokens: 2400,
        output: Output.object({ schema: motionSchema }),
        system,
        prompt,
      });
      validated = motionSchema.parse(result.output);
    }
    return NextResponse.json({ spec: normalizeSpec(validated) }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    // Never return raw provider bodies or log SDK errors: they may contain
    // sensitive request metadata. Return a safe diagnostic instead.
    if (typeof stage !== "undefined" && stage === "parse") {
      return NextResponse.json({
        error: "The provider responded, but its reply was not valid JSON. Try a model that supports text generation, or a shorter prompt.",
        diagnostic: "invalid_provider_json",
      }, { status: 502, headers: { "Cache-Control": "no-store" } });
    }
    if (typeof stage !== "undefined" && stage === "validate") {
      return NextResponse.json({
        error: "The provider returned JSON, but required motion fields were missing or out of range. Try again or use a model with stronger JSON instruction following.",
        diagnostic: "invalid_composition_schema",
      }, { status: 502, headers: { "Cache-Control": "no-store" } });
    }

    const candidate = error && typeof error === "object" ? error as { statusCode?: unknown; status?: unknown; message?: unknown } : {};
    const providerStatus = Number(candidate.statusCode ?? candidate.status);
    let status = 502;
    let errorMessage = "The provider request failed. Check the model ID, provider access, credits, and gateway compatibility.";
    if (providerStatus === 401 || providerStatus === 403) {
      status = providerStatus;
      errorMessage = "The provider rejected the API key or denied access to this model. Check the key and model permissions.";
    } else if (providerStatus === 404) {
      status = 502;
      errorMessage = "The provider endpoint or model was not found. Check the custom base URL and exact model ID.";
    } else if (providerStatus === 400 || providerStatus === 422) {
      errorMessage = "The provider rejected the request format. This gateway may not fully support the OpenAI Chat Completions API.";
    } else if (providerStatus === 429) {
      errorMessage = "The provider rate-limited this request or the account has insufficient quota/credits.";
    } else if (providerStatus >= 500 && providerStatus <= 599) {
      errorMessage = "The provider or gateway returned a server error. Check its status page or request logs.";
    }
    return NextResponse.json({
      error: errorMessage,
      diagnostic: Number.isFinite(providerStatus) && providerStatus > 0 ? `provider_http_${providerStatus}` : "provider_request_failed",
    }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
