"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Player } from "@remotion/player";
import {
  ArrowDownToLine, ArrowUp, ArrowDown, Check, ChevronDown, CircleHelp, Clapperboard, Clock3, FileDown, FileUp, Undo2, Redo2,
  Download, KeyRound, LoaderCircle, Monitor, RefreshCw,
  Settings2, Sparkles, WandSparkles, X, Copy, Layers3, BookmarkPlus, FolderOpen, Trash2, Plus,
} from "lucide-react";
import { DEFAULT_SPEC, MOTION_PRESETS, PRESET_META, normalizeSpec } from "@/lib/motion-types";
import type { MotionElement, MotionPreset, MotionSpec } from "@/lib/motion-types";
import { MotionComposition } from "@/components/motion-composition";

type Provider = "openai" | "anthropic" | "google" | "custom";
const PROVIDERS: { id: Provider; label: string; defaultModel: string; hint: string }[] = [
  { id: "openai", label: "OpenAI API", defaultModel: "gpt-4.1-mini", hint: "API key from platform.openai.com" },
  { id: "anthropic", label: "Anthropic", defaultModel: "claude-sonnet-4-5", hint: "API key from console.anthropic.com" },
  { id: "google", label: "Google Gemini API", defaultModel: "gemini-2.5-flash", hint: "API key from aistudio.google.com. Recommended for Gemini models used with Antigravity." },
  { id: "custom", label: "Custom OpenAI-compatible", defaultModel: "your-model-id", hint: "Works with compatible hosted gateways and APIs. Use a public HTTPS endpoint." },
];

const STARTER_PROMPTS = [
  { label: "Product launch", prompt: "A premium product launch for a futuristic silver headphone, clean black backdrop, lime and violet accents, confident editorial typography." },
  { label: "Creator intro", prompt: "A bold creator intro card that feels like an indie design studio: oversized type, acid lime accent, dark minimal grid, energetic but polished." },
  { label: "Event teaser", prompt: "A high-energy night event teaser with neon violet lines, electric green details, strong condensed typography, cinematic pacing." },
  { label: "App promo", prompt: "A minimal launch animation for a finance app, confident typography, soft violet and lime graphics, premium startup feel, calm motion." },
];

export function MotionEditor() {
  const [spec, setSpec] = useState<MotionSpec>(DEFAULT_SPEC);
  const [prompt, setPrompt] = useState("");
  const [hasGenerated, setHasGenerated] = useState(false);
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [canvasEditing, setCanvasEditing] = useState(false);
  const [dragState, setDragState] = useState<{ id: string; pointerId: number; startX: number; startY: number; originX: number; originY: number; moved: boolean } | null>(null);
  const [provider, setProvider] = useState<Provider>("openai");
  const [apiKey, setApiKey] = useState("");
  const [baseURL, setBaseURL] = useState("");
  const [credentialsSaved, setCredentialsSaved] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [model, setModel] = useState(PROVIDERS[0].defaultModel);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const currentProvider = PROVIDERS.find((item) => item.id === provider) ?? PROVIDERS[0];
  const [aspect, setAspect] = useState<"16:9" | "9:16" | "1:1">("16:9");
  const [fps, setFps] = useState<24 | 30 | 60>(30);
  const frameCount = spec.durationSeconds * fps;
  const [projectName, setProjectName] = useState("Untitled Motion");
  const [history, setHistory] = useState<MotionSpec[]>([]);
  const [future, setFuture] = useState<MotionSpec[]>([]);
  const [layers, setLayers] = useState({ background: true, graphics: true, typography: true, footer: true });
  const [savedProjects, setSavedProjects] = useState<{ id: string; name: string; aspect: "16:9" | "9:16" | "1:1"; fps: 24 | 30 | 60; layers: { background: boolean; graphics: boolean; typography: boolean; footer: boolean }; spec: MotionSpec; updatedAt: number }[]>([]);
  const [customPresets, setCustomPresets] = useState<{ id: string; name: string; spec: MotionSpec }[]>([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const [libraryLoaded, setLibraryLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dimensions = aspect === "9:16" ? { width: 1080, height: 1920 } : aspect === "1:1" ? { width: 1080, height: 1080 } : { width: 1920, height: 1080 };
  const inputProps = useMemo(() => ({ spec, layers }), [spec, layers]);

  useEffect(() => {
    try {
      const savedAI = localStorage.getItem("motion-studio-byok-v1");
      if (savedAI) {
        const parsed = JSON.parse(savedAI) as { provider?: Provider; apiKey?: string; baseURL?: string; model?: string };
        if (parsed.provider && PROVIDERS.some((item) => item.id === parsed.provider)) setProvider(parsed.provider);
        if (typeof parsed.apiKey === "string") {
          localStorage.setItem("motion-studio-byok-v1", JSON.stringify({ provider: parsed.provider, baseURL: parsed.baseURL, model: parsed.model }));
        }
        if (typeof parsed.baseURL === "string") setBaseURL(parsed.baseURL);
        if (typeof parsed.model === "string") setModel(parsed.model);
        setCredentialsSaved(true);
      }
    } catch { setMessage({ type: "error", text: "Saved AI settings could not be read from this browser." }); }
  }, []);

  useEffect(() => {
    try {
      const projects = localStorage.getItem("motion-studio-projects-v1");
      const presets = localStorage.getItem("motion-studio-presets-v1");
      if (projects) {
        const parsedProjects: unknown = JSON.parse(projects);
        if (!Array.isArray(parsedProjects)) throw new Error("Saved projects are not a list.");
        setSavedProjects(parsedProjects.filter((item): item is { id: string; name: string; aspect: "16:9" | "9:16" | "1:1"; fps: 24 | 30 | 60; layers: { background: boolean; graphics: boolean; typography: boolean; footer: boolean }; spec: MotionSpec; updatedAt: number } =>
          !!item && typeof item === "object" && typeof item.id === "string" && typeof item.name === "string" &&
          (item.aspect === "16:9" || item.aspect === "9:16" || item.aspect === "1:1") &&
          !!item.spec && typeof item.spec === "object" && typeof item.updatedAt === "number"
        ).slice(0, 20));
      }
      if (presets) {
        const parsedPresets: unknown = JSON.parse(presets);
        if (!Array.isArray(parsedPresets)) throw new Error("Saved presets are not a list.");
        setCustomPresets(parsedPresets.filter((item): item is { id: string; name: string; spec: MotionSpec } =>
          !!item && typeof item === "object" && typeof item.id === "string" && typeof item.name === "string" &&
          !!item.spec && typeof item.spec === "object"
        ).slice(0, 30));
      }
    } catch { setMessage({ type: "error", text: "Saved library could not be read. Exported project files remain unaffected." }); }
    finally { setLibraryLoaded(true); }
  }, []);
  useEffect(() => { if (!libraryLoaded) return; try { localStorage.setItem("motion-studio-projects-v1", JSON.stringify(savedProjects.slice(0, 20))); } catch { setMessage({ type: "error", text: "Local project library is full. Export a project file to keep a backup." }); } }, [savedProjects, libraryLoaded]);
  useEffect(() => { if (!libraryLoaded) return; try { localStorage.setItem("motion-studio-presets-v1", JSON.stringify(customPresets.slice(0, 30))); } catch { setMessage({ type: "error", text: "Custom preset storage is full." }); } }, [customPresets, libraryLoaded]);

  function changeProvider(next: Provider) {
    setProvider(next);
    setModel(PROVIDERS.find((item) => item.id === next)?.defaultModel ?? "");
    setCredentialsSaved(false);
    setConnectionStatus(null);
  }

  function saveAISettings() {
    try {
      localStorage.setItem("motion-studio-byok-v1", JSON.stringify({ provider, baseURL, model }));
      setCredentialsSaved(true);
      setMessage({ type: "success", text: "Provider settings saved. Your API key stays in memory only and clears when you refresh." });
    } catch {
      setMessage({ type: "error", text: "Could not save settings in this browser. Check available storage." });
    }
  }

  function clearAISettings() {
    localStorage.removeItem("motion-studio-byok-v1");
    setApiKey("");
    setBaseURL("");
    setCredentialsSaved(false);
    setConnectionStatus(null);
    setMessage({ type: "info", text: "Saved provider settings removed and the in-memory API key cleared." });
  }

  async function testAIConnection() {
    setTestingConnection(true);
    setConnectionStatus(null);
    try {
      const response = await fetch("/api/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey, baseURL, model }),
      });
      const data = await response.json() as { ok?: boolean; error?: string; message?: string };
      if (!response.ok || !data.ok) throw new Error(data.error || "Connection test failed. Check provider settings.");
      setConnectionStatus({ type: "success", text: data.message || "Connection successful." });
    } catch (error) {
      setConnectionStatus({ type: "error", text: error instanceof Error ? error.message : "Connection test failed." });
    } finally {
      setTestingConnection(false);
    }
  }

  function update<K extends keyof MotionSpec>(key: K, value: MotionSpec[K]) {
    setSpec((current) => { const next = normalizeSpec({ ...current, [key]: value }); if (JSON.stringify(current) !== JSON.stringify(next)) { setHistory((items) => [...items.slice(-39), current]); setFuture([]); } return next; });
  }
  function addElement(type: MotionElement["type"] = "text") {
    const elements = spec.elements ?? [];
    if (elements.length >= 256) {
      setMessage({ type: "info", text: "Composition reached the safe limit of 256 elements." });
      return;
    }
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `element-${Date.now()}`;
    const element: MotionElement = {
      id, type, x: type === "text" ? 10 : 42, y: type === "text" ? 40 : 28,
      width: type === "text" ? 78 : 16, height: type === "text" ? 10 : 22,
      color: type === "text" ? "#f5f5f1" : spec.accent,
      text: type === "text" ? "New headline" : undefined,
      fontSize: type === "text" ? 56 : undefined,
      layer: type === "text" ? "typography" : "graphics",
      startSeconds: 0, endSeconds: spec.durationSeconds, motion: "rise",
    };
    setHistory((items) => [...items.slice(-39), spec]);
    setFuture([]);
    setSpec(normalizeSpec({ ...spec, elements: [...elements, element] }));
    setSelectedElementId(id);
    setMessage({ type: "success", text: "Element added to the composition." });
  }

  function updateElement(id: string, patch: Partial<MotionElement>) {
    setSpec((current) => {
      const elements = current.elements ?? [];
      const nextElements = elements.map((element) => {
        if (element.id !== id) return element;
        const updated = { ...element, ...patch };
        const start = updated.startSeconds ?? 0;
        const end = updated.endSeconds ?? current.durationSeconds;
        if (end <= start) {
          if (patch.endSeconds !== undefined) updated.startSeconds = Math.max(0, end - 0.1);
          else updated.endSeconds = Math.min(current.durationSeconds, start + 0.1);
        }
        return updated;
      });
      const next = normalizeSpec({ ...current, elements: nextElements });
      if (JSON.stringify(current) !== JSON.stringify(next)) {
        setHistory((items) => [...items.slice(-39), current]);
        setFuture([]);
      }
      return next;
    });
  }

  function moveElement(id: string, direction: -1 | 1) {
    const elements = [...(spec.elements ?? [])];
    const index = elements.findIndex((element) => element.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= elements.length) return;
    [elements[index], elements[target]] = [elements[target], elements[index]];
    setHistory((items) => [...items.slice(-39), spec]);
    setFuture([]);
    setSpec(normalizeSpec({ ...spec, elements }));
  }

  function deleteElement(id: string) {
    setHistory((items) => [...items.slice(-39), spec]);
    setFuture([]);
    setSpec(normalizeSpec({ ...spec, elements: (spec.elements ?? []).filter((element) => element.id !== id) }));
    setSelectedElementId((current) => current === id ? null : current);
    setMessage({ type: "success", text: "Element removed." });
  }

  function updateScene(index: number, patch: Partial<NonNullable<MotionSpec["scenes"]>[number]>) {
    setSpec((current) => {
      if (!current.scenes?.[index]) return current;
      const scenes = current.scenes.map((scene, sceneIndex) => sceneIndex === index ? { ...scene, ...patch } : scene);
      const next = normalizeSpec({ ...current, scenes });
      if (JSON.stringify(current) !== JSON.stringify(next)) {
        setHistory((items) => [...items.slice(-39), current]);
        setFuture([]);
      }
      return next;
    });
  }
  function commitScenes(nextScenes: NonNullable<MotionSpec["scenes"]>) {
    setSpec((current) => {
      const next = normalizeSpec({ ...current, scenes: nextScenes });
      if (JSON.stringify(current) !== JSON.stringify(next)) {
        setHistory((items) => [...items.slice(-39), current]);
        setFuture([]);
      }
      return next;
    });
  }
  function addScene(duplicateSelected = false) {
    const scenes = spec.scenes ?? [];
    if (scenes.length >= 20) {
      setMessage({ type: "info", text: "Maximum 20 scenes per composition." });
      return;
    }
    const targetIndex = Math.min(activeSceneIndex, Math.max(0, scenes.length - 1));
    const target = scenes[targetIndex];
    const longestIndex = scenes.reduce((best, scene, index) => {
      const bestDuration = scenes[best].endSeconds - scenes[best].startSeconds;
      return scene.endSeconds - scene.startSeconds > bestDuration ? index : best;
    }, 0);
    const splitIndex = duplicateSelected && target ? targetIndex : longestIndex;
    const splitTarget = scenes[splitIndex];
    const start = splitTarget?.startSeconds ?? 0;
    const end = splitTarget?.endSeconds ?? spec.durationSeconds;
    const midpoint = Math.round(((start + end) / 2) * 2) / 2;
    if (!splitTarget || midpoint - start < 0.5 || end - midpoint < 0.5) {
      setMessage({ type: "error", text: "Tidak ada ruang waktu yang cukup untuk menambah scene." });
      return;
    }
    const first = { ...splitTarget, endSeconds: midpoint };
    const second = { ...splitTarget, startSeconds: midpoint, endSeconds: end, eyebrow: duplicateSelected ? splitTarget.eyebrow : `SCENE ${scenes.length + 1}` };
    const next = [...scenes];
    next.splice(splitIndex, 1, first, second);
    commitScenes(next);
    setActiveSceneIndex(splitIndex + 1);
    setMessage({ type: "success", text: duplicateSelected ? "Scene duplicated." : "Scene added by splitting the longest scene." });
  }
  function deleteScene() {
    const scenes = spec.scenes ?? [];
    if (scenes.length <= 1) {
      setMessage({ type: "info", text: "Keep at least one scene in the composition." });
      return;
    }
    const index = Math.min(activeSceneIndex, scenes.length - 1);
    commitScenes(scenes.filter((_, sceneIndex) => sceneIndex !== index));
    setActiveSceneIndex(Math.max(0, index - 1));
    setMessage({ type: "success", text: "Scene removed." });
  }
  function undo() { if (!history.length) return; setFuture((items) => [spec, ...items].slice(0, 40)); setSpec(history[history.length - 1]); setHistory((items) => items.slice(0, -1)); }
  function redo() { if (!future.length) return; setHistory((items) => [...items.slice(-39), spec]); setSpec(future[0]); setFuture((items) => items.slice(1)); }
  function saveToLibrary(name = projectName) { const cleanName = name.trim().slice(0, 80) || "Untitled Motion"; setSavedProjects((items) => [{ id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now()), name: cleanName, aspect, fps, layers, spec, updatedAt: Date.now() }, ...items.filter((item) => item.name !== cleanName)].slice(0, 20)); setMessage({ type: "success", text: "Project saved to this browser." }); }
  function duplicateProject() { const nextName = `${projectName.trim() || "Untitled Motion"} copy`.slice(0, 80); setProjectName(nextName); saveToLibrary(nextName); }
  function saveCustomPreset() { const name = window.prompt("Name this custom motion preset", PRESET_META[spec.preset].name + " custom"); if (!name?.trim()) return; const cleanName = name.trim().slice(0, 40); setCustomPresets((items) => [{ id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now()), name: cleanName, spec }, ...items.filter((item) => item.name !== cleanName)].slice(0, 30)); setMessage({ type: "success", text: "Custom preset saved." }); }
  function loadSavedProject(item: { name: string; aspect: "16:9" | "9:16" | "1:1"; fps?: 24 | 30 | 60; layers?: { background: boolean; graphics: boolean; typography: boolean; footer: boolean }; spec: MotionSpec }) { setHistory((items) => [...items.slice(-39), spec]); setFuture([]); setCanvasEditing(false); setDragState(null); setSpec(normalizeSpec(item.spec)); setSelectedElementId(item.spec.elements?.[0]?.id ?? null); setProjectName(item.name); setAspect(item.aspect); if (item.fps === 24 || item.fps === 30 || item.fps === 60) setFps(item.fps); if (item.layers) setLayers(item.layers); setMessage({ type: "success", text: "Saved project restored." }); }
  function saveProject() { saveToLibrary(); const blob = new Blob([JSON.stringify({ version: 1, name: projectName, aspect, fps, layers, spec }, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = (projectName.trim() || "motion-project").replace(/[^a-z0-9-_]+/gi, "-").toLowerCase() + ".json"; link.click(); URL.revokeObjectURL(url); setMessage({ type: "success", text: "Project file exported." }); }
  async function loadProject(file?: File) {
    if (!file) return;
    try {
      if (file.size === 0) throw new Error("Project file is empty.");
      if (file.size > 1_000_000) throw new Error("Project file is too large (max 1 MB).");

      let parsed: unknown;
      try {
        parsed = JSON.parse(await file.text());
      } catch {
        throw new Error("Project file is not valid JSON.");
      }
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Invalid project file.");
      }

      const data = parsed as { version?: unknown; name?: unknown; aspect?: unknown; fps?: unknown; layers?: unknown; spec?: unknown };
      if (data.version !== 1) throw new Error("Unsupported project version. Import a Motion Generator v1 project.");
      if (!data.spec || typeof data.spec !== "object" || Array.isArray(data.spec)) {
        throw new Error("Project is missing a valid motion spec.");
      }
      const rawSpec = data.spec as Record<string, unknown>;
      const requiredTextFields = ["eyebrow", "title", "subtitle", "background", "accent", "secondary", "preset"];
      if (requiredTextFields.some((key) => typeof rawSpec[key] !== "string") ||
          typeof rawSpec.durationSeconds !== "number" ||
          !Number.isFinite(rawSpec.durationSeconds) ||
          typeof rawSpec.titleStartFrame !== "number" ||
          !Number.isFinite(rawSpec.titleStartFrame) ||
          typeof rawSpec.titleTravel !== "number" ||
          !Number.isFinite(rawSpec.titleTravel)) {
        throw new Error("Project motion spec is incomplete or has invalid field types.");
      }
      if (data.aspect !== "16:9" && data.aspect !== "9:16" && data.aspect !== "1:1") {
        throw new Error("Project has an unsupported canvas ratio.");
      }
      if (data.name !== undefined && typeof data.name !== "string") {
        throw new Error("Project name must be text.");
      }

      const nextSpec = normalizeSpec(data.spec as Partial<MotionSpec>);
      const nextName = typeof data.name === "string" ? data.name.trim().slice(0, 80) : "Untitled Motion";
      setHistory((items) => [...items.slice(-39), spec]);
      setFuture([]);
      setSpec(nextSpec);
      setHasGenerated(true);
      setProjectName(nextName || "Untitled Motion");
      setAspect(data.aspect);
      if (data.fps === 24 || data.fps === 30 || data.fps === 60) setFps(data.fps);
      if (data.layers && typeof data.layers === "object" && !Array.isArray(data.layers)) { const savedLayers = data.layers as Record<string, unknown>; setLayers({ background: savedLayers.background !== false, graphics: savedLayers.graphics !== false, typography: savedLayers.typography !== false, footer: savedLayers.footer !== false }); }
      setMessage({ type: "success", text: "Project loaded." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Could not load project file." });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }
  function applyTemplate(template: "launch" | "social" | "minimal") { setHasGenerated(true); const templates = { launch: { ...DEFAULT_SPEC, eyebrow: "NEW RELEASE / 2026", title: "Made to stand out.", subtitle: "A new perspective starts here.", preset: "neon" as MotionPreset, accent: "#c6ff55", secondary: "#8b7cff" }, social: { ...DEFAULT_SPEC, eyebrow: "CREATOR SERIES / 001", title: "Make some noise.", subtitle: "Ideas worth stopping for.", preset: "kinetic" as MotionPreset, accent: "#ff765d", secondary: "#ffd166" }, minimal: { ...DEFAULT_SPEC, eyebrow: "STUDIO NOTES / 001", title: "Less, but better.", subtitle: "Clarity in every frame.", preset: "editorial" as MotionPreset, background: "#e9e7dd", accent: "#272822", secondary: "#9eaa87" } }; setHistory((items) => [...items.slice(-39), spec]); setFuture([]); setSpec(normalizeSpec(templates[template])); setSelectedElementId(null); setMessage({ type: "success", text: "Template applied." }); }

  async function generate() {
    if (provider !== "custom" && !apiKey.trim()) {
      setSettingsOpen(true);
      setMessage({ type: "error", text: "Masukkan API key milikmu dulu di AI settings." });
      return;
    }
    if (provider === "custom" && !baseURL.trim()) {
      setSettingsOpen(true);
      setMessage({ type: "error", text: "Masukkan base URL endpoint OpenAI-compatible." });
      return;
    }
    if (!prompt.trim()) {
      setMessage({ type: "error", text: "Tulis ide motion graphic terlebih dahulu." });
      return;
    }
    setCanvasEditing(false);
    setGenerating(true);
    setMessage(null);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ provider, apiKey: apiKey.trim(), baseURL: baseURL.trim(), model: model.trim(), prompt: prompt.trim(), currentSpec: hasGenerated ? spec : undefined }),
      });
      const data = (await response.json()) as { spec?: Partial<MotionSpec>; error?: string };
      if (!response.ok || !data.spec) throw new Error(data.error ?? "Generate failed.");
      setHistory((items) => [...items.slice(-39), spec]);
      setFuture([]);
      const generatedSpec = normalizeSpec(data.spec);
      setSpec(generatedSpec);
      setSelectedElementId(generatedSpec.elements?.[0]?.id ?? null);
      setHasGenerated(true);
      setMessage({ type: "success", text: "Motion direction generated. Preview updated." });
      setSettingsOpen(false);
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Something went wrong. Try again." });
    } finally {
      setGenerating(false);
    }
  }

  async function exportVideo() {
    setExporting(true);
    setMessage({ type: "info", text: "Rendering frames in this browser. Keep this tab open." });
    try {
      const { renderMediaOnWeb } = await import("@remotion/web-renderer");
      const { getBlob } = await renderMediaOnWeb({
        composition: {
          id: "MotionComposition",
          component: MotionComposition,
          durationInFrames: frameCount,
          fps,
          width: dimensions.width,
          height: dimensions.height,
          defaultProps: inputProps,
        },
        inputProps,
      });
      const blob = await getBlob();
      const mimeType = blob.type.toLowerCase();
      const extension = mimeType.includes("mp4") ? "mp4" : mimeType.includes("webm") ? "webm" : null;
      if (!extension) throw new Error("unsupported_export_type");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = (projectName.trim() || "motion-studio").replace(/[^a-z0-9-_]+/gi, "-").toLowerCase() + "-" + aspect.replace(":", "x") + "." + extension;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage({ type: "success", text: `Export finished as ${extension.toUpperCase()}. Check your downloads.` });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error && error.message === "unsupported_export_type" ? "The browser renderer returned an unsupported video format. Try an up-to-date Chrome/Edge browser." : "Browser export failed. Use an up-to-date Chrome/Edge browser and try again." });
    } finally {
      setExporting(false);
    }
  }

  return (
    <main className="studio-shell">
      <header className="topbar">
        <Link className="brand" href="/" aria-label="Motion Studio home">
          <span className="brand-mark"><Clapperboard size={17} strokeWidth={2.2} /></span>
          <span>motion<span className="brand-slash">/</span>studio</span>
          <span className="beta-pill">BETA</span>
        </Link>
        <div className="topbar-center"><span className="live-dot" /> LOCAL PROJECT <span className="topbar-divider">/</span> {projectName.toUpperCase()}</div>
        {hasGenerated && <div className="topbar-actions"><button className="button button-quiet" onClick={undo} disabled={!history.length} title="Undo"><Undo2 size={15}/></button><button className="button button-quiet" onClick={redo} disabled={!future.length} title="Redo"><Redo2 size={15}/></button><button className="button button-quiet" onClick={saveProject} title="Save project"><FileDown size={15}/><span>Save</span></button><button className="button button-quiet" onClick={duplicateProject} title="Duplicate project"><Copy size={15}/><span>Duplicate</span></button><button className="button button-quiet" onClick={() => setShowLibrary((open) => !open)} title="Saved projects"><FolderOpen size={15}/><span>Library</span></button><button className="button button-quiet" onClick={() => fileInputRef.current?.click()} title="Import project file"><FileUp size={15}/><span>Open</span></button><input ref={fileInputRef} type="file" accept="application/json,.json" hidden onChange={(event) => { void loadProject(event.target.files?.[0]); event.currentTarget.value = ""; }}/></div>}
        <div className="topbar-actions">
          <button className="button button-quiet button-settings" onClick={() => setSettingsOpen((open) => !open)}><KeyRound size={15} /> <span>AI settings</span> <ChevronDown size={13} /></button>
          <button className="button button-primary export-button" onClick={exportVideo} disabled={exporting}>
            {exporting ? <LoaderCircle size={15} className="spin" /> : <Download size={15} />}
            {exporting ? "Rendering…" : "Export video"}
          </button>
        </div>
      </header>

      {showLibrary && <section className="project-library" aria-label="Saved projects"><div className="project-library-head"><div><span className="eyebrow">LOCAL LIBRARY</span><strong>Saved projects</strong></div><button className="icon-button" onClick={() => setShowLibrary(false)} aria-label="Close library"><X size={15}/></button></div>{savedProjects.length ? savedProjects.map((item) => <div className="saved-project-row" key={item.id}><button className="saved-project-load" onClick={() => loadSavedProject(item)}><strong>{item.name}</strong><span>{item.aspect} · {new Date(item.updatedAt).toLocaleString()}</span></button><button className="icon-button" aria-label={`Delete ${item.name}`} onClick={() => setSavedProjects((items) => items.filter((saved) => saved.id !== item.id))}><Trash2 size={13}/></button></div>) : <p className="muted small">Save a project to keep a local snapshot here.</p>}</section>}
      <div className={`workspace ${hasGenerated ? "workspace-ready" : "workspace-prompt-first"}`}>
        <aside className="left-panel">
          <div className="panel-heading">
            <div><span className="eyebrow">01 / CREATIVE DIRECTION</span><h1>Make it move.</h1></div>
            <span className="icon-square"><WandSparkles size={17} /></span>
          </div>
          <p className="muted intro-copy">Describe the feeling. Let AI shape the first frame, then fine-tune the details.</p>

          <div className="field-label-row"><label htmlFor="prompt">Your idea</label><button className="button button-small" onClick={() => setPrompt((value) => { const brief = value.trim().replace(/[.\s]+$/, ""); const guidance = "Create a polished motion graphic with a clear visual hierarchy, intentional negative space, strong typography, cohesive colors, and a readable opening-to-ending sequence. Avoid clutter and keep the main message legible at mobile size."; return brief ? `${brief}. ${guidance}` : guidance; })}>Improve brief</button><span className="tiny-count">{prompt.length.toLocaleString()} characters</span></div>
          <textarea id="prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} className="prompt-input" placeholder="Describe any motion graphic you can imagine…"/>
          {hasGenerated && <div className="starter-row">
            {STARTER_PROMPTS.slice(0, 3).map((item) => (
              <button key={item.label} className="starter-chip" onClick={() => setPrompt(item.prompt)}>{item.label}</button>
            ))}
          </div>}
          <button className="button button-generate" onClick={generate} disabled={generating}>
            {generating ? <LoaderCircle size={16} className="spin" /> : <Sparkles size={16} />}
            {generating ? "Designing your motion…" : "Generate motion"}
            {!generating && <span className="button-shortcut">↗</span>}
          </button>
          <div className="fine-print"><KeyRound size={12} /> Bring your own key. No app subscription required.</div>

          {settingsOpen && (
            <section className="settings-card" aria-label="AI provider settings">
              <div className="settings-head"><div><span className="eyebrow">AI CONNECTION</span><h2>Your provider</h2></div><button className="icon-button" aria-label="Close AI settings" onClick={() => setSettingsOpen(false)}><X size={16}/></button></div>
              <label className="control-label" htmlFor="provider">Provider</label>
              <select id="provider" value={provider} onChange={(event) => changeProvider(event.target.value as Provider)} className="control-input">
                {PROVIDERS.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}
              </select>
              {provider === "custom" && <><label className="control-label" htmlFor="base-url">Base URL</label><input id="base-url" type="url" value={baseURL} onChange={(event) => { setBaseURL(event.target.value); setCredentialsSaved(false); }} className="control-input" placeholder="https://api.example.com/v1" autoComplete="url" spellCheck={false}/></>}
              <label className="control-label" htmlFor="model">Model ID</label>
              <input id="model" value={model} onChange={(event) => { setModel(event.target.value); setCredentialsSaved(false); }} className="control-input" placeholder="Enter your provider model ID" autoComplete="off"/>
              <label className="control-label" htmlFor="api-key">API key {provider === "custom" ? "(optional if endpoint needs no auth)" : ""}</label>
              <input id="api-key" type="password" value={apiKey} onChange={(event) => { setApiKey(event.target.value); setCredentialsSaved(false); }} className="control-input" placeholder={provider === "custom" ? "API key / bearer token (if required)" : "Paste your API key"} autoComplete="off" spellCheck={false}/>
              <p className="settings-hint">{currentProvider.hint}. {credentialsSaved ? "Provider settings are saved locally; the API key is never saved." : "Provider settings are not saved until you choose Save settings."}</p>
              <p className="settings-hint">Saved credentials stay in this browser local storage and are sent to this app’s server only when testing or generating. Avoid saving keys on a shared device. Antigravity account sign-in is not supported; use a provider API key.</p>
              <div className="settings-actions"><button className="button button-small" onClick={saveAISettings} type="button"><Check size={12}/> Save settings</button><button className="button button-small" onClick={testAIConnection} type="button" disabled={testingConnection}>{testingConnection ? <LoaderCircle size={12} className="spin"/> : <RefreshCw size={12}/>} {testingConnection ? "Testing…" : "Test connection"}</button><button className="button button-small" onClick={clearAISettings} type="button">Clear saved</button></div>
              {connectionStatus && <p className={`settings-connection ${connectionStatus.type}`} role="status">{connectionStatus.text}</p>}
              <div className="settings-foot"><span><span className="status-dot" /> BYOK · {credentialsSaved ? "Provider saved · key in memory" : "Not saved"}</span></div>
            </section>
          )}

          {hasGenerated && <>
          <details className="advanced-controls"><summary>Style & canvas options</summary>
          <div className="section-divider" />
          <div className="section-title"><span className="eyebrow">02 / STARTER TEMPLATES</span><span className="muted small">One-tap start</span></div>
          <div className="template-grid">
            <button className="template-card" onClick={() => applyTemplate("launch")}><span className="template-preview template-launch">Aa</span><strong>Product launch</strong><span>Bold / Neon</span></button>
            <button className="template-card" onClick={() => applyTemplate("social")}><span className="template-preview template-social">GO!</span><strong>Social intro</strong><span>Expressive / Kinetic</span></button>
            <button className="template-card" onClick={() => applyTemplate("minimal")}><span className="template-preview template-minimal">Less.</span><strong>Minimal editorial</strong><span>Quiet / Clean</span></button>
          </div>
          <div className="section-divider" />
          <div className="section-title"><span className="eyebrow">03 / STYLE SYSTEM</span><span className="muted small">Choose a direction</span></div>
          <div className="preset-grid">
            {MOTION_PRESETS.map((preset) => (
              <button key={preset} className={`preset-card ${spec.preset === preset ? "selected" : ""}`} onClick={() => update("preset", preset as MotionPreset)} aria-pressed={spec.preset === preset}>
                <span className={`preset-art preset-art-${preset}`}><span /></span>
                <span className="preset-name">{PRESET_META[preset].name}</span>
                <span className="preset-description">{PRESET_META[preset].description}</span>
                {spec.preset === preset && <Check size={13} className="preset-check" />}
              </button>
            ))}
          </div>

          <label className="control-label" htmlFor="output-fps">Frame rate</label><select id="output-fps" className="control-input" value={fps} onChange={(event) => setFps(Number(event.target.value) as 24 | 30 | 60)}><option value={24}>24 FPS · Cinematic</option><option value={30}>30 FPS · Social</option><option value={60}>60 FPS · Smooth</option></select>
          <div className="section-divider" />
          <div className="section-title"><span className="eyebrow">CUSTOM PRESETS</span><button className="button button-small" onClick={saveCustomPreset}><BookmarkPlus size={12}/> Save current</button></div>
          {customPresets.length > 0 ? <div className="custom-preset-list">{customPresets.map((item) => <div className="custom-preset-row" key={item.id}><button className="custom-preset-load" onClick={() => { setHistory((items) => [...items.slice(-39), spec]); setFuture([]); setSpec(normalizeSpec(item.spec)); setMessage({ type: "success", text: `Preset “${item.name}” applied.` }); }}><span>{item.name}</span><small>{PRESET_META[item.spec.preset].name}</small></button><button className="icon-button" aria-label={`Delete ${item.name}`} onClick={() => setCustomPresets((items) => items.filter((preset) => preset.id !== item.id))}><Trash2 size={13}/></button></div>)}</div> : <p className="muted small">Save a style you like to reuse it later.</p>}
          <div className="section-divider" />
          <div className="section-title"><span className="eyebrow">04 / CANVAS</span><span className="muted small">Aspect ratio</span></div>
          <div className="aspect-grid" role="group" aria-label="Canvas aspect ratio">
            {(["16:9", "9:16", "1:1"] as const).map((ratio) => <button key={ratio} className={"aspect-button " + (aspect === ratio ? "active" : "")} onClick={() => setAspect(ratio)} aria-pressed={aspect === ratio}><span className={"aspect-icon aspect-" + ratio.replace(":", "-")} />{ratio}</button>)}
          </div>
          <div className="canvas-chip"><Monitor size={15} /><span>{dimensions.width} × {dimensions.height}</span><span className="canvas-fps">{fps} FPS</span></div>
          <label className="range-label" htmlFor="duration"><span>Duration</span><strong>{spec.durationSeconds}s</strong></label>
          <input id="duration" type="range" min="4" max="60" value={spec.durationSeconds} onChange={(event) => update("durationSeconds", Number(event.target.value))} className="range-input"/>
          </details>
          </>}
        </aside>

        <section className="preview-panel" aria-label="Motion preview">
          {!hasGenerated ? <div className="prompt-first-empty"><div className="empty-orbit"><span /><i /><b /></div><span className="eyebrow">YOUR CANVAS IS READY</span><h2>Your idea, in motion.</h2><p>Write a prompt on the left. Your first composition will appear here.</p><div className="empty-capabilities"><span>Typography</span><span>Color & style</span><span>Animated composition</span></div></div> : <>
          <div className="preview-heading"><div><span className="eyebrow">LIVE COMPOSITION</span><div className="preview-title">{projectName || "Untitled motion"} <span className="edit-dot" /></div></div><div className="preview-heading-actions"><span className="preview-size"><Monitor size={13}/> {dimensions.width} × {dimensions.height}</span>{(spec.elements?.length ?? 0) > 0 && <button className={"button button-small canvas-edit-toggle " + (canvasEditing ? "active" : "")} type="button" aria-pressed={canvasEditing} onClick={() => { setCanvasEditing((active) => !active); setDragState(null); }}>{canvasEditing ? <Check size={12}/> : <Layers3 size={12}/>} {canvasEditing ? "Done editing" : "Edit canvas"}</button>}<button className="icon-button" title="Reset composition" aria-label="Reset composition" onClick={() => { setHistory((items) => [...items.slice(-39), spec]); setFuture([]); setSpec(DEFAULT_SPEC); setSelectedElementId(null); setCanvasEditing(false); }}><RefreshCw size={15}/></button></div></div>
          <div className="preview-stage">
            <div className="preview-frame">
              <Player
                component={MotionComposition}
                inputProps={inputProps}
                durationInFrames={frameCount}
                compositionWidth={dimensions.width}
                compositionHeight={dimensions.height}
                fps={fps}
                controls={!canvasEditing}
                clickToPlay={!canvasEditing}
                doubleClickToFullscreen={!canvasEditing}
                style={{ width: "100%", aspectRatio: dimensions.width + " / " + dimensions.height, maxHeight: aspect === "9:16" ? "68vh" : undefined }}
                className="motion-player"
              />
              {canvasEditing && <div className="canvas-edit-overlay" aria-label="Drag elements to reposition them">
                <div className="canvas-edit-hint">DRAG TO MOVE · ARROW KEYS TO NUDGE · SHIFT = 5%</div>
                {(spec.elements ?? []).map((element, index) => <button
                  key={element.id}
                  type="button"
                  className={"canvas-element-handle " + (selectedElementId === element.id ? "selected" : "")}
                  style={{ left: `${element.x}%`, top: `${element.y}%`, width: `${element.width}%`, height: `${Math.max(2, element.height)}%`, zIndex: selectedElementId === element.id ? 1000 : index + 1 }}
                  aria-label={`Select and move ${element.type === "text" ? element.text || "text element" : element.type}`}
                  title={element.type === "text" ? element.text : element.type}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setSelectedElementId(element.id);
                    setDragState({ id: element.id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: element.x, originY: element.y, moved: false });
                    event.currentTarget.setPointerCapture(event.pointerId);
                  }}
                  onPointerMove={(event) => {
                    if (!dragState || dragState.id !== element.id || dragState.pointerId !== event.pointerId) return;
                    const bounds = event.currentTarget.parentElement?.getBoundingClientRect();
                    if (!bounds || bounds.width <= 0 || bounds.height <= 0) return;
                    const nextX = dragState.originX + (event.clientX - dragState.startX) / bounds.width * 100;
                    const nextY = dragState.originY + (event.clientY - dragState.startY) / bounds.height * 100;
                    if (!dragState.moved) {
                      setHistory((items) => [...items.slice(-39), spec]);
                      setFuture([]);
                      setDragState({ ...dragState, moved: true });
                    }
                    setSpec((current) => normalizeSpec({ ...current, elements: (current.elements ?? []).map((item) => item.id === element.id ? { ...item, x: nextX, y: nextY } : item) }));
                  }}
                  onPointerUp={(event) => {
                    if (dragState?.id === element.id && dragState.pointerId === event.pointerId) setDragState(null);
                  }}
                  onPointerCancel={() => setDragState(null)}
                  onKeyDown={(event) => {
                    if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
                    event.preventDefault();
                    const step = event.shiftKey ? 5 : 1;
                    const dx = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
                    const dy = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
                    updateElement(element.id, { x: element.x + dx, y: element.y + dy });
                  }}
                ><span>{element.type === "text" ? element.text || "Text" : element.type}</span></button>)}
              </div>}
            </div>
            <div className="preview-overlay"><span><span className="status-dot" /> PREVIEW RENDER</span><span>BROWSER EXPORT</span></div>
          </div>
          <div className="timeline-block">
            <div className="timeline-head"><span className="eyebrow">TIMELINE</span><span className="muted small">{spec.durationSeconds}.0s total</span></div>
            <div className="timeline-ruler"><span>00:00</span><span>00:02</span><span>00:04</span><span>00:06</span><span>{String(spec.durationSeconds).padStart(2, "0")}:00</span></div>
            {spec.scenes?.length ? <div className="track-row"><div className="track-label">SCENES</div><div className="track-lane scene-track-lane">{spec.scenes.map((scene, index) => <div key={`${scene.startSeconds}-${index}`} className="track-clip scene-track-clip" title={`${scene.eyebrow}: ${scene.title}`} style={{ left: `${scene.startSeconds / spec.durationSeconds * 100}%`, width: `${Math.max(5, (scene.endSeconds - scene.startSeconds) / spec.durationSeconds * 100)}%` }}><span>{index + 1}. {scene.title}</span><span className="track-clip-end">{scene.endSeconds - scene.startSeconds}s</span></div>)}</div></div> : <div className="track-row"><div className="track-label">MOTION</div><div className="track-lane"><div className="track-clip" style={{ width: "100%" }}><span>Intro / {PRESET_META[spec.preset].name}</span><span className="track-clip-end">{spec.durationSeconds}s</span></div></div></div>}
            <div className="track-row"><div className="track-label">TYPE</div><div className="track-lane"><div className="track-clip track-clip-type" style={{ width: "76%" }}><span>{spec.title || "Untitled"}</span></div></div></div>
            <div className="track-row"><div className="track-label">KEYFRAME</div><div className="track-lane"><div className="track-clip track-clip-type" style={{ width: Math.min(100, spec.titleStartFrame / Math.max(1, frameCount) * 100) + "%", minWidth: 5 }}><span>Title start · frame {spec.titleStartFrame}</span></div></div></div>
            {(spec.elements ?? []).slice(0, 12).map((element, index) => {
              const start = element.startSeconds ?? 0;
              const end = element.endSeconds ?? spec.durationSeconds;
              const clipWidth = Math.max(1, (end - start) / spec.durationSeconds * 100);
              return <div className="track-row" key={element.id}>
                <div className="track-label">{element.type === "text" ? "TEXT" : "LAYER " + String(index + 1).padStart(2, "0")}</div>
                <div className="track-lane element-track-lane">
                  <button type="button" className={"track-clip element-track-clip " + (selectedElementId === element.id ? "selected" : "")} style={{ left: `${start / spec.durationSeconds * 100}%`, width: `${clipWidth}%` }} onClick={() => setSelectedElementId(element.id)} title={element.type === "text" ? element.text : element.type}>
                    <span>{element.type === "text" ? element.text || "Text layer" : element.type}</span>
                  </button>
                </div>
              </div>;
            })}
            {(spec.elements?.length ?? 0) > 12 && <p className="muted small timeline-more">Showing 12 of {spec.elements?.length} element tracks. Select any element in the inspector to edit it.</p>}
          <div className="timeline-bottom"><span><Clock3 size={12}/> {fps} frames / second</span><span>Composition updates live <span className="live-dot" /></span></div>
          </div>
          </>}
        </section>

        <aside className="right-panel">
          <div className="right-panel-heading"><div><span className="eyebrow">04 / PROPERTIES</span><h2>Fine-tune</h2></div><span className="icon-square"><Settings2 size={16}/></span></div>
          <p className="muted small">Edits are reflected in the preview instantly.</p>
          <div className="property-section">
            <span className="property-heading">Project</span>
            <label className="control-label" htmlFor="project-name">Project name</label>
            <input id="project-name" className="control-input" value={projectName} maxLength={80} onChange={(event) => setProjectName(event.target.value)} />
          </div>
          {hasGenerated && <details className="advanced-controls element-controls" open>
            <summary>Composition elements <span className="muted small">{spec.elements?.length ?? 0}</span></summary>
            <div className="property-section">
              <div className="element-add-row">
                <button className="button button-small" type="button" onClick={() => addElement("text")}><Plus size={12}/> Text</button>
                <button className="button button-small" type="button" onClick={() => addElement("rect")}><Plus size={12}/> Shape</button>
                <button className="button button-small" type="button" onClick={() => addElement("path")}><Plus size={12}/> Vector path</button>
              </div>
              {(spec.elements ?? []).length === 0 ? <p className="settings-hint">Add elements or generate a composition with AI.</p> : <div className="element-list">
                {(spec.elements ?? []).map((element, index) => <div className={"element-list-row " + (selectedElementId === element.id ? "selected" : "")} key={element.id}>
                  <button type="button" className="element-select" onClick={() => setSelectedElementId(element.id)}>
                    <span className="element-index">{String(index + 1).padStart(2, "0")}</span>
                    <span className="element-swatch" style={{ background: element.color }} />
                    <span className="element-name">{element.type === "text" ? element.text || "Text" : element.type === "path" ? "Vector path" : element.type}</span>
                  </button>
                  <button className="icon-button" type="button" aria-label={`Move element ${index + 1} forward`} disabled={index === 0} onClick={() => moveElement(element.id, -1)}><ArrowUp size={12}/></button>
                  <button className="icon-button" type="button" aria-label={`Move element ${index + 1} backward`} disabled={index === (spec.elements?.length ?? 1) - 1} onClick={() => moveElement(element.id, 1)}><ArrowDown size={12}/></button>
                  <button className="icon-button" type="button" aria-label={`Delete element ${index + 1}`} onClick={() => deleteElement(element.id)}><Trash2 size={12}/></button>
                </div>)}
              </div>}
              {(() => {
                const element = (spec.elements ?? []).find((item) => item.id === selectedElementId);
                if (!element) return null;
                return <div className="element-editor">
                  <div className="section-title"><span className="property-heading">Selected element</span><button className="button button-small" type="button" onClick={() => deleteElement(element.id)}><Trash2 size={12}/> Remove</button></div>
                  <label className="control-label" htmlFor="element-type">Element type</label>
                  <select id="element-type" className="control-input" value={element.type} onChange={(event) => { const type = event.target.value as MotionElement["type"]; updateElement(element.id, { type, layer: type === "text" ? "typography" : "graphics", ...(type === "text" ? { text: element.text ?? "New text", fontSize: element.fontSize ?? 56 } : {}) }); }}>
                    <option value="text">Text</option><option value="rect">Rectangle</option><option value="circle">Circle</option><option value="ellipse">Ellipse</option><option value="line">Line</option><option value="triangle">Triangle</option><option value="path">Vector path</option>
                  </select>
                  <label className="control-label" htmlFor="element-layer">Render layer</label>
                  <select id="element-layer" className="control-input" value={element.layer ?? (element.type === "text" ? "typography" : "graphics")} onChange={(event) => updateElement(element.id, { layer: event.target.value as MotionElement["layer"] })}><option value="graphics">Graphics</option><option value="typography">Typography</option></select>
                  {element.type === "text" && <><label className="control-label" htmlFor="element-text">Text content</label><textarea id="element-text" className="control-input property-textarea" maxLength={500} value={element.text ?? ""} onChange={(event) => updateElement(element.id, { text: event.target.value })}/><label className="control-label" htmlFor="element-font-size">Font size</label><input id="element-font-size" className="control-input" type="number" min="8" max="180" value={element.fontSize ?? 56} onChange={(event) => updateElement(element.id, { fontSize: Number(event.target.value) })}/></>}
                  {element.type === "path" && <><label className="control-label" htmlFor="element-path">SVG path data</label><textarea id="element-path" className="control-input property-textarea" maxLength={2000} value={element.pathData ?? "M 10 50 L 90 10 L 90 90 Z"} onChange={(event) => updateElement(element.id, { pathData: event.target.value })}/></>}
                  <div className="element-number-grid">
                    <div><label className="control-label" htmlFor="element-x">X (%)</label><input id="element-x" className="control-input" type="number" min="-20" max="120" value={element.x} onChange={(event) => updateElement(element.id, { x: Number(event.target.value) })}/></div>
                    <div><label className="control-label" htmlFor="element-y">Y (%)</label><input id="element-y" className="control-input" type="number" min="-20" max="120" value={element.y} onChange={(event) => updateElement(element.id, { y: Number(event.target.value) })}/></div>
                    <div><label className="control-label" htmlFor="element-width">Width (%)</label><input id="element-width" className="control-input" type="number" min="0" max="120" value={element.width} onChange={(event) => updateElement(element.id, { width: Number(event.target.value) })}/></div>
                    <div><label className="control-label" htmlFor="element-height">Height (%)</label><input id="element-height" className="control-input" type="number" min="0" max="120" value={element.height} onChange={(event) => updateElement(element.id, { height: Number(event.target.value) })}/></div>
                  </div>
                  <div className="scene-time-grid">
                    <div><label className="control-label" htmlFor="element-start">Start (sec)</label><input id="element-start" className="control-input" type="number" min="0" max={spec.durationSeconds} step="0.1" value={element.startSeconds ?? 0} onChange={(event) => updateElement(element.id, { startSeconds: Number(event.target.value) })}/></div>
                    <div><label className="control-label" htmlFor="element-end">End (sec)</label><input id="element-end" className="control-input" type="number" min="0.1" max={spec.durationSeconds} step="0.1" value={element.endSeconds ?? spec.durationSeconds} onChange={(event) => updateElement(element.id, { endSeconds: Number(event.target.value) })}/></div>
                  </div>
                  <div className="scene-time-grid">
                    <div><label className="control-label" htmlFor="element-color">Fill color</label><input id="element-color" className="control-input" type="color" value={element.color} onChange={(event) => updateElement(element.id, { color: event.target.value })}/></div>
                    <div><label className="control-label" htmlFor="element-gradient">Gradient end</label><input id="element-gradient" className="control-input" type="color" value={element.gradientTo ?? element.color} onChange={(event) => updateElement(element.id, { gradientTo: event.target.value })}/></div>
                  </div>
                  <details className="element-effects">
                    <summary>Effects & appearance</summary>
                    <label className="range-label" htmlFor="element-gradient-angle"><span>Gradient angle</span><strong>{element.gradientAngle ?? 135}°</strong></label>
                    <input id="element-gradient-angle" className="range-input" type="range" min="0" max="360" step="15" value={element.gradientAngle ?? 135} onChange={(event) => updateElement(element.id, { gradientAngle: Number(event.target.value) })}/>
                    <label className="range-label" htmlFor="element-radius"><span>Corner radius</span><strong>{element.borderRadius ?? 0}%</strong></label>
                    <input id="element-radius" className="range-input" type="range" min="0" max="100" step="2" value={element.borderRadius ?? 0} onChange={(event) => updateElement(element.id, { borderRadius: Number(event.target.value) })}/>
                    <label className="range-label" htmlFor="element-blur"><span>Blur</span><strong>{element.blur ?? 0}px</strong></label>
                    <input id="element-blur" className="range-input" type="range" min="0" max="40" step="1" value={element.blur ?? 0} onChange={(event) => updateElement(element.id, { blur: Number(event.target.value) })}/>
                    <div className="scene-time-grid">
                      <div><label className="control-label" htmlFor="element-stroke">Stroke color</label><input id="element-stroke" className="control-input" type="color" value={element.strokeColor ?? element.color} onChange={(event) => updateElement(element.id, { strokeColor: event.target.value })}/></div>
                      <div><label className="control-label" htmlFor="element-stroke-width">Stroke width</label><input id="element-stroke-width" className="control-input" type="number" min="0" max="24" value={element.strokeWidth ?? 0} onChange={(event) => updateElement(element.id, { strokeWidth: Number(event.target.value) })}/></div>
                    </div>
                  </details>
                  <label className="control-label" htmlFor="element-motion">Entrance motion</label>
                  <select id="element-motion" className="control-input" value={element.motion ?? "none"} onChange={(event) => updateElement(element.id, { motion: event.target.value as MotionElement["motion"] })}>
                    <option value="none">None</option><option value="fade">Fade</option><option value="rise">Rise</option><option value="scale">Scale</option><option value="zoom">Zoom</option><option value="drift">Drift</option><option value="slide-left">Slide left</option><option value="slide-right">Slide right</option><option value="rotate">Rotate in</option><option value="bounce">Bounce</option>
                  </select>
                  <label className="range-label" htmlFor="element-opacity"><span>Opacity</span><strong>{Math.round((element.opacity ?? 1) * 100)}%</strong></label>
                  <input id="element-opacity" className="range-input" type="range" min="0" max="1" step="0.05" value={element.opacity ?? 1} onChange={(event) => updateElement(element.id, { opacity: Number(event.target.value) })}/>
                  <label className="range-label" htmlFor="element-rotation"><span>Rotation</span><strong>{element.rotation ?? 0}°</strong></label>
                  <input id="element-rotation" className="range-input" type="range" min="-180" max="180" step="1" value={element.rotation ?? 0} onChange={(event) => updateElement(element.id, { rotation: Number(event.target.value) })}/>
                </div>;
              })()}
            </div>
          </details>}
          {hasGenerated ? <details className="advanced-controls scene-controls"><summary>Scene-by-scene controls</summary><div className="property-section">
            <span className="property-heading">Scene editor</span>
            {!spec.scenes?.length ? <>
              <p className="settings-hint">Turn this composition into a timed scene to unlock scene-by-scene editing.</p>
              <button className="button button-primary" type="button" onClick={() => {
                commitScenes([{ title: spec.title, subtitle: spec.subtitle, eyebrow: spec.eyebrow, startSeconds: 0, endSeconds: spec.durationSeconds, preset: spec.preset, accent: spec.accent, secondary: spec.secondary, titleTravel: spec.titleTravel }]);
                setActiveSceneIndex(0);
                setMessage({ type: "success", text: "Scene created. You can now add more scenes." });
              }}>Create first scene</button>
            </> : <>
            <label className="control-label" htmlFor="active-scene">Selected scene</label>
            <select id="active-scene" className="control-input" value={Math.min(activeSceneIndex, spec.scenes.length - 1)} onChange={(event) => setActiveSceneIndex(Number(event.target.value))}>
              {spec.scenes.map((scene, index) => <option key={index} value={index}>{index + 1}. {scene.title || "Untitled scene"}</option>)}
            </select>
            <div className="scene-management-actions">
              <button className="button button-quiet" type="button" onClick={() => addScene(false)} disabled={spec.scenes.length >= 20} title="Split the longest scene to make room"><Layers3 size={13}/> Add scene</button>
              <button className="button button-quiet" type="button" onClick={() => addScene(true)} disabled={spec.scenes.length >= 6} title="Duplicate selected scene"><Copy size={13}/> Duplicate</button>
              <button className="button button-quiet" type="button" onClick={deleteScene} disabled={spec.scenes.length <= 1} title="Delete selected scene"><Trash2 size={13}/></button>
            </div>
            {(() => {
              const index = Math.min(activeSceneIndex, spec.scenes.length - 1);
              const scene = spec.scenes[index];
              if (!scene) return null;
              return <>
                <label className="control-label" htmlFor="scene-eyebrow">Scene label</label>
                <input id="scene-eyebrow" className="control-input" maxLength={54} value={scene.eyebrow} onChange={(event) => updateScene(index, { eyebrow: event.target.value })}/>
                <label className="control-label" htmlFor="scene-title">Headline</label>
                <textarea id="scene-title" className="control-input property-textarea" maxLength={80} value={scene.title} onChange={(event) => updateScene(index, { title: event.target.value })}/>
                <label className="control-label" htmlFor="scene-subtitle">Supporting text</label>
                <textarea id="scene-subtitle" className="control-input property-textarea" maxLength={150} value={scene.subtitle} onChange={(event) => updateScene(index, { subtitle: event.target.value })}/>
                <label className="control-label" htmlFor="scene-preset">Motion style</label>
                <select id="scene-preset" className="control-input" value={scene.preset} onChange={(event) => updateScene(index, { preset: event.target.value as MotionPreset })}>
                  {MOTION_PRESETS.map((preset) => <option key={preset} value={preset}>{PRESET_META[preset].name}</option>)}
                </select>
                <div className="scene-time-grid">
                  <div><label className="control-label" htmlFor="scene-accent">Accent color</label><input id="scene-accent" className="control-input" type="color" value={scene.accent} onChange={(event) => updateScene(index, { accent: event.target.value })}/></div>
                  <div><label className="control-label" htmlFor="scene-secondary">Secondary color</label><input id="scene-secondary" className="control-input" type="color" value={scene.secondary} onChange={(event) => updateScene(index, { secondary: event.target.value })}/></div>
                </div>
                <label className="range-label" htmlFor="scene-title-travel"><span>Title entrance travel</span><strong>{scene.titleTravel}px</strong></label>
                <input id="scene-title-travel" className="range-input" type="range" min="0" max="160" step="4" value={scene.titleTravel} onChange={(event) => updateScene(index, { titleTravel: Number(event.target.value) })}/>
                <div className="scene-time-grid">
                  <div><label className="control-label" htmlFor="scene-start">Start (sec)</label><input id="scene-start" className="control-input" type="number" min="0" max={Math.max(0, scene.endSeconds - 0.5)} step="0.5" value={scene.startSeconds} onChange={(event) => updateScene(index, { startSeconds: Number(event.target.value) })}/></div>
                  <div><label className="control-label" htmlFor="scene-end">End (sec)</label><input id="scene-end" className="control-input" type="number" min={scene.startSeconds + 0.5} max={spec.durationSeconds} step="0.5" value={scene.endSeconds} onChange={(event) => updateScene(index, { endSeconds: Number(event.target.value) })}/></div>
                </div>
                <p className="settings-hint">Changes apply to this scene in the preview and exported video.</p>
              </>;
            })()}
            </>}
          </div></details> : null}
          <div className="property-section">
            <span className="property-heading">Typography</span>
            <label className="control-label" htmlFor="eyebrow">Eyebrow</label>
            <input id="eyebrow" className="control-input" value={spec.eyebrow} maxLength={54} onChange={(event) => update("eyebrow", event.target.value)}/>
            <label className="control-label" htmlFor="title">Headline</label>
            <textarea id="title" className="control-input property-textarea" value={spec.title} maxLength={80} onChange={(event) => update("title", event.target.value)}/>
            <label className="control-label" htmlFor="subtitle">Supporting text</label>
            <textarea id="subtitle" className="control-input property-textarea" value={spec.subtitle} maxLength={150} onChange={(event) => update("subtitle", event.target.value)}/>
          </div>
          <div className="property-section">
            <span className="property-heading">Color palette</span>
            {([{ label: "Background", key: "background" }, { label: "Accent", key: "accent" }, { label: "Secondary", key: "secondary" }] as const).map(({ label, key }) => (
              <label className="color-row" key={key} htmlFor={`color-${key}`}>
                <span className="color-swatch" style={{ backgroundColor: spec[key] }} />
                <span>{label}</span>
                <span className="color-value">{spec[key].toUpperCase()}</span>
                <input id={`color-${key}`} type="color" value={spec[key]} onChange={(event) => update(key, event.target.value)} aria-label={label + " color"} />
              </label>
            ))}
          </div>
          <div className="property-section">
            <span className="property-heading">Title keyframes</span>
            <label className="range-label" htmlFor="title-start-frame"><span>Entrance frame</span><strong>{spec.titleStartFrame}f / {frameCount}f</strong></label>
            <input id="title-start-frame" className="range-input" type="range" min="0" max={Math.min(120, Math.max(0, frameCount - 1))} step="1" value={Math.min(spec.titleStartFrame, Math.min(120, Math.max(0, frameCount - 1)))} onChange={(event) => update("titleStartFrame", Number(event.target.value))} />
            <label className="range-label" htmlFor="title-travel"><span>Entrance travel</span><strong>{spec.titleTravel}px</strong></label>
            <input id="title-travel" className="range-input" type="range" min="0" max="160" step="4" value={spec.titleTravel} onChange={(event) => update("titleTravel", Number(event.target.value))} />
            <p className="settings-hint">Adjust the title entrance timing and travel distance.</p>
          </div>
          <div className="property-section">
            <span className="property-heading">Keyframe easing</span>
            <label className="control-label" htmlFor="title-easing">Title entrance curve</label>
            <select id="title-easing" className="control-input" value={spec.titleEasing} onChange={(event) => update("titleEasing", event.target.value as MotionSpec["titleEasing"])}><option value="spring">Spring</option><option value="ease-out">Ease out</option><option value="ease-in">Ease in</option><option value="linear">Linear</option></select>
            <p className="settings-hint">The preview and export use the same curve.</p>
          </div>
          <div className="property-section">
            <span className="property-heading">Layer visibility</span>
            {([{ key: "background", label: "Background & grid" }, { key: "graphics", label: "Motion graphics" }, { key: "typography", label: "Title & subtitle" }, { key: "footer", label: "Footer details" }] as const).map(({ key, label }) => <label className="layer-toggle" key={key}><input type="checkbox" checked={layers[key]} onChange={(event) => setLayers((current) => ({ ...current, [key]: event.target.checked }))}/><span>{label}</span><Layers3 size={13}/></label>)}
          </div>
          <div className="property-section motion-summary">
            <span className="property-heading">Motion settings</span>
            <div className="summary-row"><span>Direction</span><strong>{PRESET_META[spec.preset].name}</strong></div>
            <div className="summary-row"><span>Duration</span><strong>{spec.durationSeconds} seconds</strong></div>
            <div className="summary-row"><span>Frame rate</span><strong>{fps} FPS</strong></div>
            <div className="summary-row"><span>Format</span><strong>Browser-supported video</strong></div>
          </div>
          <button className="button button-primary button-full" onClick={exportVideo} disabled={exporting}>
            {exporting ? <LoaderCircle size={15} className="spin"/> : <ArrowDownToLine size={15}/>}
            {exporting ? "Rendering in browser…" : "Export composition"}
          </button>
          <p className="export-note"><CircleHelp size={12}/> Export runs on your device. Use an updated browser for video encoding.</p>
        </aside>
      </div>

      {message && <div className={`toast toast-${message.type}`} role="status"><span className="toast-icon">{message.type === "success" ? <Check size={15}/> : message.type === "error" ? <X size={15}/> : <LoaderCircle size={15}/>}</span><span>{message.text}</span><button className="icon-button toast-close" onClick={() => setMessage(null)} aria-label="Dismiss message"><X size={14}/></button></div>}
      <footer className="bottom-bar"><span>Made for ideas that deserve movement.</span><span>REMOTION ENGINE <span className="bottom-separator">·</span> BYOK AI <span className="bottom-separator">·</span> BROWSER EXPORT</span></footer>
    </main>
  );
}
