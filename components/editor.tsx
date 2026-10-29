"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Player } from "@remotion/player";
import {
  ArrowDownToLine, Check, ChevronDown, CircleHelp, Clapperboard, Clock3, FileDown, FileUp, Undo2, Redo2,
  Download, KeyRound, LoaderCircle, Monitor, RefreshCw,
  Settings2, Sparkles, WandSparkles, X, Copy, Layers3, BookmarkPlus, FolderOpen, Trash2,
} from "lucide-react";
import { DEFAULT_SPEC, MOTION_PRESETS, PRESET_META, normalizeSpec } from "@/lib/motion-types";
import type { MotionPreset, MotionSpec } from "@/lib/motion-types";
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
  const [prompt, setPrompt] = useState(STARTER_PROMPTS[1].prompt);
  const [provider, setProvider] = useState<Provider>("openai");
  const [apiKey, setApiKey] = useState("");
  const [baseURL, setBaseURL] = useState("");
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
  }

  function update<K extends keyof MotionSpec>(key: K, value: MotionSpec[K]) {
    setSpec((current) => { const next = normalizeSpec({ ...current, [key]: value }); if (JSON.stringify(current) !== JSON.stringify(next)) { setHistory((items) => [...items.slice(-39), current]); setFuture([]); } return next; });
  }
  function undo() { if (!history.length) return; setFuture((items) => [spec, ...items].slice(0, 40)); setSpec(history[history.length - 1]); setHistory((items) => items.slice(0, -1)); }
  function redo() { if (!future.length) return; setHistory((items) => [...items.slice(-39), spec]); setSpec(future[0]); setFuture((items) => items.slice(1)); }
  function saveToLibrary(name = projectName) { const cleanName = name.trim().slice(0, 80) || "Untitled Motion"; setSavedProjects((items) => [{ id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now()), name: cleanName, aspect, fps, layers, spec, updatedAt: Date.now() }, ...items.filter((item) => item.name !== cleanName)].slice(0, 20)); setMessage({ type: "success", text: "Project saved to this browser." }); }
  function duplicateProject() { const nextName = `${projectName.trim() || "Untitled Motion"} copy`.slice(0, 80); setProjectName(nextName); saveToLibrary(nextName); }
  function saveCustomPreset() { const name = window.prompt("Name this custom motion preset", PRESET_META[spec.preset].name + " custom"); if (!name?.trim()) return; const cleanName = name.trim().slice(0, 40); setCustomPresets((items) => [{ id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now()), name: cleanName, spec }, ...items.filter((item) => item.name !== cleanName)].slice(0, 30)); setMessage({ type: "success", text: "Custom preset saved." }); }
  function loadSavedProject(item: { name: string; aspect: "16:9" | "9:16" | "1:1"; fps?: 24 | 30 | 60; layers?: { background: boolean; graphics: boolean; typography: boolean; footer: boolean }; spec: MotionSpec }) { setHistory((items) => [...items.slice(-39), spec]); setFuture([]); setSpec(normalizeSpec(item.spec)); setProjectName(item.name); setAspect(item.aspect); if (item.fps === 24 || item.fps === 30 || item.fps === 60) setFps(item.fps); if (item.layers) setLayers(item.layers); setMessage({ type: "success", text: "Saved project restored." }); }
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
  function applyTemplate(template: "launch" | "social" | "minimal") { const templates = { launch: { ...DEFAULT_SPEC, eyebrow: "NEW RELEASE / 2026", title: "Made to stand out.", subtitle: "A new perspective starts here.", preset: "neon" as MotionPreset, accent: "#c6ff55", secondary: "#8b7cff" }, social: { ...DEFAULT_SPEC, eyebrow: "CREATOR SERIES / 001", title: "Make some noise.", subtitle: "Ideas worth stopping for.", preset: "kinetic" as MotionPreset, accent: "#ff765d", secondary: "#ffd166" }, minimal: { ...DEFAULT_SPEC, eyebrow: "STUDIO NOTES / 001", title: "Less, but better.", subtitle: "Clarity in every frame.", preset: "editorial" as MotionPreset, background: "#e9e7dd", accent: "#272822", secondary: "#9eaa87" } }; setHistory((items) => [...items.slice(-39), spec]); setFuture([]); setSpec(normalizeSpec(templates[template])); setMessage({ type: "success", text: "Template applied." }); }

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
    setGenerating(true);
    setMessage(null);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ provider, apiKey: apiKey.trim(), baseURL: baseURL.trim(), model: model.trim(), prompt: prompt.trim() }),
      });
      const data = (await response.json()) as { spec?: Partial<MotionSpec>; error?: string };
      if (!response.ok || !data.spec) throw new Error(data.error ?? "Generate failed.");
      setHistory((items) => [...items.slice(-39), spec]);
      setFuture([]);
      setSpec(normalizeSpec(data.spec));
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
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = (projectName.trim() || "motion-studio").replace(/[^a-z0-9-_]+/gi, "-").toLowerCase() + "-" + aspect.replace(":", "x") + ".mp4";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMessage({ type: "success", text: "Export finished. Check your downloads." });
    } catch {
      setMessage({ type: "error", text: "Browser export failed. Use an up-to-date Chrome/Edge browser and try again." });
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
        <div className="topbar-actions"><button className="button button-quiet" onClick={undo} disabled={!history.length} title="Undo"><Undo2 size={15}/></button><button className="button button-quiet" onClick={redo} disabled={!future.length} title="Redo"><Redo2 size={15}/></button><button className="button button-quiet" onClick={saveProject} title="Save project"><FileDown size={15}/><span>Save</span></button><button className="button button-quiet" onClick={duplicateProject} title="Duplicate project"><Copy size={15}/><span>Duplicate</span></button><button className="button button-quiet" onClick={() => setShowLibrary((open) => !open)} title="Saved projects"><FolderOpen size={15}/><span>Library</span></button><button className="button button-quiet" onClick={() => fileInputRef.current?.click()} title="Import project file"><FileUp size={15}/><span>Open</span></button><input ref={fileInputRef} type="file" accept="application/json,.json" hidden onChange={(event) => { void loadProject(event.target.files?.[0]); event.currentTarget.value = ""; }}/></div>
        <div className="topbar-actions">
          <button className="button button-quiet button-settings" onClick={() => setSettingsOpen((open) => !open)}><KeyRound size={15} /> <span>AI settings</span> <ChevronDown size={13} /></button>
          <button className="button button-primary export-button" onClick={exportVideo} disabled={exporting}>
            {exporting ? <LoaderCircle size={15} className="spin" /> : <Download size={15} />}
            {exporting ? "Rendering…" : "Export video"}
          </button>
        </div>
      </header>

      {showLibrary && <section className="project-library" aria-label="Saved projects"><div className="project-library-head"><div><span className="eyebrow">LOCAL LIBRARY</span><strong>Saved projects</strong></div><button className="icon-button" onClick={() => setShowLibrary(false)} aria-label="Close library"><X size={15}/></button></div>{savedProjects.length ? savedProjects.map((item) => <div className="saved-project-row" key={item.id}><button className="saved-project-load" onClick={() => loadSavedProject(item)}><strong>{item.name}</strong><span>{item.aspect} · {new Date(item.updatedAt).toLocaleString()}</span></button><button className="icon-button" aria-label={`Delete ${item.name}`} onClick={() => setSavedProjects((items) => items.filter((saved) => saved.id !== item.id))}><Trash2 size={13}/></button></div>) : <p className="muted small">Save a project to keep a local snapshot here.</p>}</section>}
      <div className="workspace">
        <aside className="left-panel">
          <div className="panel-heading">
            <div><span className="eyebrow">01 / CREATIVE DIRECTION</span><h1>Make it move.</h1></div>
            <span className="icon-square"><WandSparkles size={17} /></span>
          </div>
          <p className="muted intro-copy">Describe the feeling. Let AI shape the first frame, then fine-tune the details.</p>

          <div className="field-label-row"><label htmlFor="prompt">Your idea</label><button className="button button-small" onClick={() => setPrompt((value) => { const brief = value.trim().replace(/[.\s]+$/, ""); const guidance = "Create a polished motion graphic with a clear visual hierarchy, intentional negative space, strong typography, cohesive colors, and a readable opening-to-ending sequence. Avoid clutter and keep the main message legible at mobile size."; return (brief ? `${brief}. ${guidance}` : guidance).slice(0, 1200); })}>Improve brief</button><span className="tiny-count">{prompt.length}/1200</span></div>
          <textarea id="prompt" value={prompt} maxLength={1200} onChange={(event) => setPrompt(event.target.value)} className="prompt-input" placeholder="A bold launch animation for…"/>
          <div className="starter-row">
            {STARTER_PROMPTS.slice(0, 3).map((item) => (
              <button key={item.label} className="starter-chip" onClick={() => setPrompt(item.prompt)}>{item.label}</button>
            ))}
          </div>
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
              {provider === "custom" && <><label className="control-label" htmlFor="base-url">Base URL</label><input id="base-url" type="url" value={baseURL} onChange={(event) => setBaseURL(event.target.value)} className="control-input" placeholder="https://api.example.com/v1" autoComplete="url" spellCheck={false}/></>}
              <label className="control-label" htmlFor="model">Model ID</label>
              <input id="model" value={model} onChange={(event) => setModel(event.target.value)} className="control-input" placeholder="Enter your provider model ID" autoComplete="off"/>
              <label className="control-label" htmlFor="api-key">API key {provider === "custom" ? "(optional if endpoint needs no auth)" : ""}</label>
              <input id="api-key" type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} className="control-input" placeholder={provider === "custom" ? "API key / bearer token (if required)" : "Paste your API key"} autoComplete="off" spellCheck={false}/>
              <p className="settings-hint">{currentProvider.hint}. The key is only sent with a generation request and is not saved by this app.</p>
              <p className="settings-hint">Antigravity users: choose Google Gemini API with an AI Studio key. ChatGPT/Codex account sign-in is not available in this build; use an OpenAI API key for now.</p>
              <div className="settings-foot"><span><span className="status-dot" /> Request-only</span><button className="button button-small" onClick={() => { setApiKey(""); setMessage({ type: "info", text: "API key cleared from this page." }); }}>Clear key</button></div>
            </section>
          )}

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
          <input id="duration" type="range" min="4" max="15" value={spec.durationSeconds} onChange={(event) => update("durationSeconds", Number(event.target.value))} className="range-input"/>
        </aside>

        <section className="preview-panel" aria-label="Motion preview">
          <div className="preview-heading"><div><span className="eyebrow">LIVE COMPOSITION</span><div className="preview-title">{projectName || "Untitled motion"} <span className="edit-dot" /></div></div><div className="preview-heading-actions"><span className="preview-size"><Monitor size={13}/> {dimensions.width} × {dimensions.height}</span><button className="icon-button" title="Reset text" aria-label="Reset motion text" onClick={() => { setHistory((items) => [...items.slice(-39), spec]); setFuture([]); setSpec(DEFAULT_SPEC); }}><RefreshCw size={15}/></button></div></div>
          <div className="preview-stage">
            <div className="preview-frame">
              <Player
                component={MotionComposition}
                inputProps={inputProps}
                durationInFrames={frameCount}
                compositionWidth={dimensions.width}
                compositionHeight={dimensions.height}
                fps={fps}
                controls
                clickToPlay
                doubleClickToFullscreen
                style={{ width: "100%", aspectRatio: dimensions.width + " / " + dimensions.height, maxHeight: aspect === "9:16" ? "68vh" : undefined }}
                className="motion-player"
              />
            </div>
            <div className="preview-overlay"><span><span className="status-dot" /> PREVIEW RENDER</span><span>H.264 READY</span></div>
          </div>
          <div className="timeline-block">
            <div className="timeline-head"><span className="eyebrow">TIMELINE</span><span className="muted small">{spec.durationSeconds}.0s total</span></div>
            <div className="timeline-ruler"><span>00:00</span><span>00:02</span><span>00:04</span><span>00:06</span><span>{String(spec.durationSeconds).padStart(2, "0")}:00</span></div>
            <div className="track-row"><div className="track-label">MOTION</div><div className="track-lane"><div className="track-clip" style={{ width: "100%" }}><span>Intro / {PRESET_META[spec.preset].name}</span><span className="track-clip-end">{spec.durationSeconds}s</span></div></div></div>
            <div className="track-row"><div className="track-label">TYPE</div><div className="track-lane"><div className="track-clip track-clip-type" style={{ width: "76%" }}><span>{spec.title || "Untitled"}</span></div></div></div>
            <div className="track-row"><div className="track-label">KEYFRAME</div><div className="track-lane"><div className="track-clip track-clip-type" style={{ width: Math.min(100, spec.titleStartFrame / Math.max(1, frameCount) * 100) + "%", minWidth: 5 }}><span>Title start · frame {spec.titleStartFrame}</span></div></div></div>
          <div className="timeline-bottom"><span><Clock3 size={12}/> {fps} frames / second</span><span>Composition updates live <span className="live-dot" /></span></div>
          </div>
        </section>

        <aside className="right-panel">
          <div className="right-panel-heading"><div><span className="eyebrow">04 / PROPERTIES</span><h2>Fine-tune</h2></div><span className="icon-square"><Settings2 size={16}/></span></div>
          <p className="muted small">Edits are reflected in the preview instantly.</p>
          <div className="property-section">
            <span className="property-heading">Project</span>
            <label className="control-label" htmlFor="project-name">Project name</label>
            <input id="project-name" className="control-input" value={projectName} maxLength={80} onChange={(event) => setProjectName(event.target.value)} />
          </div>
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
            <div className="summary-row"><span>Format</span><strong>MP4 · H.264</strong></div>
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
