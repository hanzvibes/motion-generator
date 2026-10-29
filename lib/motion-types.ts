export const MOTION_PRESETS = ["kinetic", "orbit", "neon", "editorial"] as const;

export type MotionPreset = (typeof MOTION_PRESETS)[number];

export type MotionScene = { title: string; subtitle: string; eyebrow: string; startSeconds: number; endSeconds: number; preset: MotionPreset; accent: string; secondary: string; titleTravel: number; };
export type MotionElement = {
  id: string;
  type: "text" | "rect" | "circle" | "ellipse" | "line" | "triangle" | "path";
  x: number; y: number; width: number; height: number;
  color: string; text?: string; fontSize?: number; rotation?: number;
  pathData?: string; strokeColor?: string; strokeWidth?: number; borderRadius?: number; blur?: number; gradientTo?: string; gradientAngle?: number;
  layer?: "graphics" | "typography";
  opacity?: number; startSeconds?: number; endSeconds?: number;
  motion?: "fade" | "rise" | "scale" | "drift" | "slide-left" | "slide-right" | "rotate" | "bounce" | "zoom" | "none";
};

export type MotionSpec = {
  title: string;
  subtitle: string;
  eyebrow: string;
  background: string;
  accent: string;
  secondary: string;
  preset: MotionPreset;
  durationSeconds: number;
  titleStartFrame: number;
  titleTravel: number;
  titleEasing: "spring" | "ease-in" | "ease-out" | "linear";
  scenes?: MotionScene[];
  elements?: MotionElement[];
};

export const DEFAULT_SPEC: MotionSpec = {
  eyebrow: "MOTION STUDY / 001",
  title: "Ideas in motion.",
  subtitle: "Turn a thought into something people can feel.",
  background: "#101114",
  accent: "#c6ff55",
  secondary: "#8b7cff",
  preset: "kinetic",
  durationSeconds: 8,
  titleStartFrame: 0,
  titleTravel: 54,
  titleEasing: "spring",
};

export const PRESET_META: Record<MotionPreset, { name: string; description: string }> = {
  kinetic: { name: "Kinetic type", description: "Bold type, sharp movement" },
  orbit: { name: "Orbit", description: "Sculptural shapes, slow drift" },
  neon: { name: "Neon pulse", description: "High contrast, electric glow" },
  editorial: { name: "Editorial", description: "Quiet, minimal, refined" },
};

export function normalizeSpec(input: Partial<MotionSpec>): MotionSpec {
  const isHex = (value: unknown): value is string =>
    typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);

  const presets = new Set<string>(MOTION_PRESETS);
  const duration = Number.isFinite(input.durationSeconds) ? Math.min(60, Math.max(4, Math.round(input.durationSeconds as number))) : DEFAULT_SPEC.durationSeconds;
  return {
    eyebrow: typeof input.eyebrow === "string" ? input.eyebrow.slice(0, 54) : DEFAULT_SPEC.eyebrow,
    title: typeof input.title === "string" ? input.title.slice(0, 80) : DEFAULT_SPEC.title,
    subtitle: typeof input.subtitle === "string" ? input.subtitle.slice(0, 150) : DEFAULT_SPEC.subtitle,
    background: isHex(input.background) ? input.background : DEFAULT_SPEC.background,
    accent: isHex(input.accent) ? input.accent : DEFAULT_SPEC.accent,
    secondary: isHex(input.secondary) ? input.secondary : DEFAULT_SPEC.secondary,
    preset: typeof input.preset === "string" && presets.has(input.preset)
      ? (input.preset as MotionPreset)
      : DEFAULT_SPEC.preset,
    durationSeconds: duration,
    titleStartFrame: Number.isFinite(input.titleStartFrame) ? Math.min(120, Math.max(0, Math.round(input.titleStartFrame as number))) : DEFAULT_SPEC.titleStartFrame,
    titleTravel: Number.isFinite(input.titleTravel) ? Math.min(160, Math.max(0, Math.round(input.titleTravel as number))) : DEFAULT_SPEC.titleTravel,
    titleEasing: input.titleEasing === "ease-in" || input.titleEasing === "ease-out" || input.titleEasing === "linear" || input.titleEasing === "spring" ? input.titleEasing : DEFAULT_SPEC.titleEasing,
    elements: Array.isArray(input.elements) ? input.elements.slice(0, 256).filter((element) => element && typeof element === "object").map((element, index) => ({
      id: typeof element.id === "string" ? element.id.slice(0, 48) : `element-${index + 1}`,
      type: element.type === "text" || element.type === "circle" || element.type === "ellipse" || element.type === "line" || element.type === "triangle" || element.type === "path" ? element.type : "rect",
      x: Number.isFinite(element.x) ? Math.max(-20, Math.min(120, element.x)) : 50,
      y: Number.isFinite(element.y) ? Math.max(-20, Math.min(120, element.y)) : 50,
      width: Number.isFinite(element.width) ? Math.max(0, Math.min(120, element.width)) : 10,
      height: Number.isFinite(element.height) ? Math.max(0, Math.min(120, element.height)) : 10,
      color: isHex(element.color) ? element.color : DEFAULT_SPEC.accent,
      layer: element.layer === "typography" ? "typography" : "graphics",
      ...(typeof element.text === "string" ? { text: element.text.slice(0, 500) } : {}),
      ...(typeof element.pathData === "string" ? { pathData: element.pathData.slice(0, 2000) } : {}),
      ...(isHex(element.strokeColor) ? { strokeColor: element.strokeColor } : {}),
      ...(Number.isFinite(element.strokeWidth) ? { strokeWidth: Math.max(0, Math.min(24, element.strokeWidth as number)) } : {}),
      ...(Number.isFinite(element.borderRadius) ? { borderRadius: Math.max(0, Math.min(100, element.borderRadius as number)) } : {}),
      ...(Number.isFinite(element.blur) ? { blur: Math.max(0, Math.min(40, element.blur as number)) } : {}),
      ...(isHex(element.gradientTo) ? { gradientTo: element.gradientTo } : {}),
      ...(Number.isFinite(element.gradientAngle) ? { gradientAngle: Math.max(0, Math.min(360, element.gradientAngle as number)) } : {}),
      ...(Number.isFinite(element.fontSize) ? { fontSize: Math.max(8, Math.min(180, element.fontSize as number)) } : {}),
      ...(Number.isFinite(element.rotation) ? { rotation: Math.max(-360, Math.min(360, element.rotation as number)) } : {}),
      ...(Number.isFinite(element.opacity) ? { opacity: Math.max(0, Math.min(1, element.opacity as number)) } : {}),
      ...(Number.isFinite(element.startSeconds) ? { startSeconds: Math.max(0, Math.min(duration, element.startSeconds as number)) } : {}),
      ...(Number.isFinite(element.endSeconds) ? { endSeconds: Math.max(0, Math.min(duration, element.endSeconds as number)) } : {}),
      motion: element.motion === "fade" || element.motion === "rise" || element.motion === "scale" || element.motion === "drift" || element.motion === "slide-left" || element.motion === "slide-right" || element.motion === "rotate" || element.motion === "bounce" || element.motion === "zoom" ? element.motion : "none",
    })) : undefined,
    scenes: Array.isArray(input.scenes) ? input.scenes.slice(0, 20).map((scene, index) => ({ title: typeof scene.title === "string" ? scene.title.slice(0, 80) : "Scene", subtitle: typeof scene.subtitle === "string" ? scene.subtitle.slice(0, 150) : "", eyebrow: typeof scene.eyebrow === "string" ? scene.eyebrow.slice(0, 54) : `SCENE ${index + 1}`, startSeconds: Number.isFinite(scene.startSeconds) ? Math.max(0, Math.min(duration - 0.5, scene.startSeconds)) : Math.min(duration - 0.5, index * 2), endSeconds: Number.isFinite(scene.endSeconds) ? Math.max(0.5, Math.min(duration, scene.endSeconds)) : Math.min(duration, (index + 1) * 2), preset: typeof scene.preset === "string" && presets.has(scene.preset) ? scene.preset as MotionPreset : DEFAULT_SPEC.preset, accent: isHex(scene.accent) ? scene.accent : DEFAULT_SPEC.accent, secondary: isHex(scene.secondary) ? scene.secondary : DEFAULT_SPEC.secondary, titleTravel: Number.isFinite(scene.titleTravel) ? Math.max(0, Math.min(160, scene.titleTravel)) : DEFAULT_SPEC.titleTravel })).filter((scene) => scene.endSeconds > scene.startSeconds) : undefined,
  };
}
