export const MOTION_PRESETS = ["kinetic", "orbit", "neon", "editorial"] as const;

export type MotionPreset = (typeof MOTION_PRESETS)[number];

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
    durationSeconds: Number.isFinite(input.durationSeconds)
      ? Math.min(15, Math.max(4, Math.round(input.durationSeconds as number)))
      : DEFAULT_SPEC.durationSeconds,
    titleStartFrame: Number.isFinite(input.titleStartFrame) ? Math.min(120, Math.max(0, Math.round(input.titleStartFrame as number))) : DEFAULT_SPEC.titleStartFrame,
    titleTravel: Number.isFinite(input.titleTravel) ? Math.min(160, Math.max(0, Math.round(input.titleTravel as number))) : DEFAULT_SPEC.titleTravel,
  };
}
