"use client";

import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { CSSProperties } from "react";
import type { MotionSpec } from "@/lib/motion-types";

export type MotionLayers = { background: boolean; graphics: boolean; typography: boolean; footer: boolean };
export type MotionCompositionProps = { spec: MotionSpec; layers?: MotionLayers };
const DEFAULT_LAYERS: MotionLayers = { background: true, graphics: true, typography: true, footer: true };

export function MotionComposition({ spec, layers = DEFAULT_LAYERS }: MotionCompositionProps) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const animationFrame = Math.max(0, frame - spec.titleStartFrame);
  const intro = spec.titleEasing === "spring" ? spring({ frame: animationFrame, fps, config: { damping: 18, stiffness: 100, mass: 0.8 } }) : interpolate(animationFrame, [0, 24], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: spec.titleEasing === "ease-in" ? Easing.in(Easing.cubic) : spec.titleEasing === "ease-out" ? Easing.out(Easing.cubic) : Easing.linear });
  const fade = interpolate(frame, [spec.titleStartFrame, spec.titleStartFrame + 18, spec.titleStartFrame + 42], [0, 1, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lift = interpolate(intro, [0, 1], [spec.titleTravel, 0]);
  const spin = interpolate(frame, [0, 240], [-14, 22]);
  const pulse = 0.92 + Math.sin(frame / 13) * 0.05;
  const large = width * 0.105;
  const line = (opacity: number): CSSProperties => ({
    height: 1,
    width: "100%",
    background: `rgba(255,255,255,${opacity})`,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: layers.background ? spec.background : "transparent", color: "#f5f5f1", overflow: "hidden", fontFamily: "Arial, Helvetica, sans-serif" }}>
      <AbsoluteFill style={{ display: layers.background ? "block" : "none", opacity: 0.2, backgroundImage: "linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px)", backgroundSize: `${width / 18}px ${width / 18}px`, maskImage: "linear-gradient(to bottom, black, transparent 88%)" }} />
      <AbsoluteFill style={{ display: layers.background ? "block" : "none", opacity: 0.32, background: `radial-gradient(ellipse at 80% 18%, ${spec.secondary}55, transparent 42%), radial-gradient(ellipse at 8% 88%, ${spec.accent}18, transparent 36%)` }} />
      <div style={{ position: "absolute", inset: "6.5%", border: "1px solid rgba(255,255,255,.13)", borderRadius: 8 }} />
      <div style={{ position: "absolute", top: "9%", left: "9%", right: "9%", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: Math.max(10, width * 0.012), letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,.62)" }}>
        <span>{spec.eyebrow}</span>
        <span>FRAME 01 — {String(Math.max(1, Math.round(frame / fps))).padStart(2, "0")}s</span>
      </div>

      {layers.graphics && spec.preset === "orbit" && (
        <>
          <div style={{ position: "absolute", width: "51%", aspectRatio: "1", left: "25%", top: "15%", border: `1px solid ${spec.accent}8a`, borderRadius: "50%", transform: `rotate(${spin}deg) scale(${pulse})`, opacity: fade }} />
          <div style={{ position: "absolute", width: "37%", aspectRatio: "1", left: "32%", top: "22%", border: "1px solid rgba(255,255,255,.28)", borderRadius: "50%", transform: `rotate(${-spin * 1.4}deg)`, opacity: fade }} />
          <div style={{ position: "absolute", width: "14%", aspectRatio: "1", left: `${43 + Math.sin(frame / 25) * 13}%`, top: `${37 + Math.cos(frame / 25) * 12}%`, borderRadius: "50%", background: spec.accent, boxShadow: `0 0 90px ${spec.accent}88`, opacity: fade }} />
        </>
      )}
      {layers.graphics && spec.preset === "neon" && (
        <>
          <div style={{ position: "absolute", width: "56%", height: "48%", left: "22%", top: "22%", border: `2px solid ${spec.accent}`, borderRadius: 22, transform: `rotate(${spin / 4}deg) scale(${pulse})`, boxShadow: `0 0 30px ${spec.accent}60, inset 0 0 30px ${spec.accent}18`, opacity: fade }} />
          <div style={{ position: "absolute", width: "43%", height: "36%", left: "28.5%", top: "28%", border: `1px solid ${spec.secondary}`, borderRadius: 16, transform: `rotate(${-spin / 3}deg)`, opacity: fade }} />
        </>
      )}
      {layers.graphics && spec.preset === "editorial" && (
        <div style={{ position: "absolute", left: "9%", top: "28%", width: "14%", height: "32%", background: spec.accent, opacity: fade, transform: `translateY(${lift * 0.3}px)` }} />
      )}
      {layers.graphics && spec.preset === "kinetic" && (
        <div style={{ position: "absolute", right: "-4%", top: "19%", width: "30%", aspectRatio: "1", borderRadius: "50%", background: `linear-gradient(135deg, ${spec.accent}, ${spec.secondary})`, filter: "blur(1px)", opacity: 0.88 * fade, transform: `scale(${pulse}) rotate(${spin}deg)` }} />
      )}

      <div style={{ display: layers.typography ? "block" : "none", position: "absolute", left: spec.preset === "editorial" ? "27%" : "10%", right: "9%", top: "31%", transform: `translateY(${lift}px)`, opacity: fade }}>
        <div style={{ fontSize: Math.max(12, width * 0.015), letterSpacing: "0.23em", color: spec.accent, textTransform: "uppercase", marginBottom: "3.4%" }}>● &nbsp; An idea, made visible</div>
        <div style={{ fontSize: `clamp(36px, ${large}px, ${large * 1.45}px)`, lineHeight: 0.91, letterSpacing: "-0.065em", fontWeight: 800, maxWidth: "92%", overflowWrap: "break-word", textShadow: spec.preset === "neon" ? `0 0 25px ${spec.accent}40` : "none" }}>
          {spec.title.split(" ").map((word, index, words) => (
            <span key={`${word}-${index}`} style={{ display: "inline-block", marginRight: "0.18em", color: index === words.length - 1 && spec.preset !== "editorial" ? spec.accent : "#f5f5f1" }}>{word}</span>
          ))}
        </div>
        <div style={{ width: "100%", marginTop: "5%", maxWidth: "72%", display: "flex", gap: "4%" }}>
          <div style={{ width: "11%", paddingTop: 10 }}><div style={{ ...line(0.7), background: spec.accent }} /></div>
          <div style={{ fontSize: Math.max(13, width * 0.019), lineHeight: 1.45, color: "rgba(255,255,255,.7)", maxWidth: 610 }}>{spec.subtitle}</div>
        </div>
      </div>

      <div style={{ display: layers.footer ? "flex" : "none", position: "absolute", bottom: "9%", left: "9%", right: "9%", display: "flex", alignItems: "end", justifyContent: "space-between", opacity: fade }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: "48%" }}>
          <div style={{ ...line(0.22), width: "100%" }} />
          <span style={{ fontSize: Math.max(9, width * 0.01), color: "rgba(255,255,255,.5)", letterSpacing: "0.15em", textTransform: "uppercase" }}>DESIGNED TO MOVE</span>
        </div>
        <div style={{ display: "flex", gap: 7 }}>
          {[spec.accent, spec.secondary, "rgba(255,255,255,.28)"].map((color) => <div key={color} style={{ width: Math.max(8, width * 0.009), height: Math.max(8, width * 0.009), background: color, borderRadius: 99 }} />)}
        </div>
      </div>
    </AbsoluteFill>
  );
}
