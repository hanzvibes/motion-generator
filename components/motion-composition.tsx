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
  const currentSeconds = frame / fps;
  const graphElements = spec.elements ?? [];
  const activeScene = spec.scenes?.find((scene) => currentSeconds >= scene.startSeconds && currentSeconds < scene.endSeconds);
  const sceneStartFrame = activeScene ? Math.round(activeScene.startSeconds * fps) : spec.titleStartFrame;
  const sceneEndFrame = activeScene ? Math.round(activeScene.endSeconds * fps) : Math.round(spec.durationSeconds * fps);
  const renderSpec = activeScene ? { ...spec, title: activeScene.title, subtitle: activeScene.subtitle, eyebrow: activeScene.eyebrow, preset: activeScene.preset, accent: activeScene.accent, secondary: activeScene.secondary, titleTravel: activeScene.titleTravel, titleStartFrame: sceneStartFrame } : spec;
  const sceneFadeIn = Math.min(12, Math.max(4, Math.round(fps * 0.35)));
  const sceneFadeOut = Math.min(8, Math.max(3, Math.round(fps * 0.2)));
  const sceneOpacity = activeScene ? interpolate(frame, [sceneStartFrame, sceneStartFrame + sceneFadeIn, Math.max(sceneStartFrame + sceneFadeIn, sceneEndFrame - sceneFadeOut), sceneEndFrame], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : spec.scenes?.length ? 0 : 1;
  const activeTextElements = graphElements.filter((element) => element.type === "text" && currentSeconds >= (element.startSeconds ?? 0) && currentSeconds <= (element.endSeconds ?? spec.durationSeconds));
  const normalizeCopy = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();
  const hasSceneCopy = (value: string) => activeTextElements.some((element) => normalizeCopy(element.text ?? "") === normalizeCopy(value));
  const showSceneEyebrow = !!activeScene && !!activeScene.eyebrow && !hasSceneCopy(activeScene.eyebrow);
  const showSceneTitle = !!activeScene && !!activeScene.title && !hasSceneCopy(activeScene.title);
  const showSceneSubtitle = !!activeScene && !!activeScene.subtitle && !hasSceneCopy(activeScene.subtitle);
  const animationFrame = Math.max(0, frame - renderSpec.titleStartFrame);
  const intro = renderSpec.titleEasing === "spring" ? spring({ frame: animationFrame, fps, config: { damping: 18, stiffness: 100, mass: 0.8 } }) : interpolate(animationFrame, [0, 24], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: renderSpec.titleEasing === "ease-in" ? Easing.in(Easing.cubic) : renderSpec.titleEasing === "ease-out" ? Easing.out(Easing.cubic) : Easing.linear });
  const fade = interpolate(frame, [renderSpec.titleStartFrame, renderSpec.titleStartFrame + 18, renderSpec.titleStartFrame + 42], [0, 1, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lift = interpolate(intro, [0, 1], [renderSpec.titleTravel, 0]);
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
      <AbsoluteFill style={{ display: layers.background && !graphElements.length ? "block" : "none", opacity: 0.2, backgroundImage: "linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px)", backgroundSize: `${width / 18}px ${width / 18}px`, maskImage: "linear-gradient(to bottom, black, transparent 88%)" }} />
      <AbsoluteFill style={{ display: layers.background && !graphElements.length ? "block" : "none", opacity: 0.32, background: `radial-gradient(ellipse at 80% 18%, ${renderSpec.secondary}55, transparent 42%), radial-gradient(ellipse at 8% 88%, ${renderSpec.accent}18, transparent 36%)` }} />
      {!graphElements.length && <div style={{ position: "absolute", inset: "6.5%", border: "1px solid rgba(255,255,255,.13)", borderRadius: 8 }} />}
      {!graphElements.length && <div style={{ position: "absolute", top: "9%", left: "9%", right: "9%", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: Math.max(10, width * 0.012), letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,.62)" }}>
        <span>{renderSpec.eyebrow}</span>
        <span>FRAME 01 — {String(Math.max(1, Math.round(frame / fps))).padStart(2, "0")}s</span>
      </div>}

      {!graphElements.length && layers.graphics && renderSpec.preset === "orbit" && (
        <>
          <div style={{ position: "absolute", width: "51%", aspectRatio: "1", left: "25%", top: "15%", border: `1px solid ${renderSpec.accent}8a`, borderRadius: "50%", transform: `rotate(${spin}deg) scale(${pulse})`, opacity: fade * sceneOpacity }} />
          <div style={{ position: "absolute", width: "37%", aspectRatio: "1", left: "32%", top: "22%", border: "1px solid rgba(255,255,255,.28)", borderRadius: "50%", transform: `rotate(${-spin * 1.4}deg)`, opacity: fade * sceneOpacity }} />
          <div style={{ position: "absolute", width: "14%", aspectRatio: "1", left: `${43 + Math.sin(frame / 25) * 13}%`, top: `${37 + Math.cos(frame / 25) * 12}%`, borderRadius: "50%", background: renderSpec.accent, boxShadow: `0 0 90px ${renderSpec.accent}88`, opacity: fade * sceneOpacity }} />
        </>
      )}
      {!graphElements.length && layers.graphics && renderSpec.preset === "neon" && (
        <>
          <div style={{ position: "absolute", width: "56%", height: "48%", left: "22%", top: "22%", border: `2px solid ${renderSpec.accent}`, borderRadius: 22, transform: `rotate(${spin / 4}deg) scale(${pulse})`, boxShadow: `0 0 30px ${renderSpec.accent}60, inset 0 0 30px ${renderSpec.accent}18`, opacity: fade * sceneOpacity }} />
          <div style={{ position: "absolute", width: "43%", height: "36%", left: "28.5%", top: "28%", border: `1px solid ${renderSpec.secondary}`, borderRadius: 16, transform: `rotate(${-spin / 3}deg)`, opacity: fade * sceneOpacity }} />
        </>
      )}
      {!graphElements.length && layers.graphics && renderSpec.preset === "editorial" && (
        <div style={{ position: "absolute", left: "9%", top: "28%", width: "14%", height: "32%", background: renderSpec.accent, opacity: fade * sceneOpacity, transform: `translateY(${lift * 0.3}px)` }} />
      )}
      {!graphElements.length && layers.graphics && renderSpec.preset === "kinetic" && (
        <div style={{ position: "absolute", right: "-4%", top: "19%", width: "30%", aspectRatio: "1", borderRadius: "50%", background: `linear-gradient(135deg, ${renderSpec.accent}, ${renderSpec.secondary})`, filter: "blur(1px)", opacity: 0.88 * fade * sceneOpacity, transform: `scale(${pulse}) rotate(${spin}deg)` }} />
      )}

      {!graphElements.length && <div style={{ display: layers.typography ? "block" : "none", position: "absolute", left: renderSpec.preset === "editorial" ? "27%" : "10%", right: "9%", top: "31%", transform: `translateY(${lift}px)`, opacity: fade * sceneOpacity }}>
        <div style={{ fontSize: Math.max(12, width * 0.015), letterSpacing: "0.23em", color: renderSpec.accent, textTransform: "uppercase", marginBottom: "3.4%" }}>● &nbsp; An idea, made visible</div>
        <div style={{ fontSize: `clamp(36px, ${large}px, ${large * 1.45}px)`, lineHeight: 0.91, letterSpacing: "-0.065em", fontWeight: 800, maxWidth: "92%", overflowWrap: "break-word", textShadow: renderSpec.preset === "neon" ? `0 0 25px ${renderSpec.accent}40` : "none" }}>
          {renderSpec.title.split(" ").map((word, index, words) => (
            <span key={`${word}-${index}`} style={{ display: "inline-block", marginRight: "0.18em", color: index === words.length - 1 && renderSpec.preset !== "editorial" ? renderSpec.accent : "#f5f5f1" }}>{word}</span>
          ))}
        </div>
        <div style={{ width: "100%", marginTop: "5%", maxWidth: "72%", display: "flex", gap: "4%" }}>
          <div style={{ width: "11%", paddingTop: 10 }}><div style={{ ...line(0.7), background: renderSpec.accent }} /></div>
          <div style={{ fontSize: Math.max(13, width * 0.019), lineHeight: 1.45, color: "rgba(255,255,255,.7)", maxWidth: 610 }}>{renderSpec.subtitle}</div>
        </div>
      </div>}

      {!graphElements.length && <div style={{ display: layers.footer ? "flex" : "none", position: "absolute", bottom: "9%", left: "9%", right: "9%", alignItems: "end", justifyContent: "space-between", opacity: fade * sceneOpacity }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: "48%" }}>
          <div style={{ ...line(0.22), width: "100%" }} />
          <span style={{ fontSize: Math.max(9, width * 0.01), color: "rgba(255,255,255,.5)", letterSpacing: "0.15em", textTransform: "uppercase" }}>DESIGNED TO MOVE</span>
        </div>
        <div style={{ display: "flex", gap: 7 }}>
          {[renderSpec.accent, renderSpec.secondary, "rgba(255,255,255,.28)"].map((color) => <div key={color} style={{ width: Math.max(8, width * 0.009), height: Math.max(8, width * 0.009), background: color, borderRadius: 99 }} />)}
        </div>
      </div>}
      {layers.typography && activeScene && (showSceneEyebrow || showSceneTitle || showSceneSubtitle) && <div style={{ position: "absolute", left: "9%", right: "9%", top: "29%", opacity: sceneOpacity, pointerEvents: "none" }}>
        {showSceneEyebrow && <div style={{ marginBottom: "3%", fontSize: Math.max(9, width * 0.01), letterSpacing: "0.2em", textTransform: "uppercase", color: activeScene.accent }}>{activeScene.eyebrow}</div>}
        {showSceneTitle && <div style={{ maxWidth: "94%", fontSize: `clamp(30px, ${Math.min(100, width * 0.057)}px, 100px)`, fontWeight: 800, lineHeight: 0.94, letterSpacing: "-0.055em", color: "#f5f5f1", overflowWrap: "anywhere", textShadow: `0 0 30px ${activeScene.accent}20` }}>{activeScene.title}</div>}
        {showSceneSubtitle && <div style={{ maxWidth: "72%", marginTop: "4%", fontSize: Math.max(13, Math.min(34, width * 0.018)), lineHeight: 1.4, color: "rgba(245,245,241,.76)" }}>{activeScene.subtitle}</div>}
      </div>}
      {graphElements.map((element, index) => {
        const start = element.startSeconds ?? 0;
        const end = element.endSeconds ?? spec.durationSeconds;
        if (currentSeconds < start || currentSeconds > end || end <= start) return null;
        const layer = element.layer ?? (element.type === "text" ? "typography" : "graphics");
        if ((layer === "typography" && !layers.typography) || (layer === "graphics" && !layers.graphics)) return null;
        const localFrame = Math.max(0, frame - Math.round(start * fps));
        const durationFrames = Math.max(1, Math.round((end - start) * fps));
        const progress = interpolate(localFrame, [0, Math.min(24, durationFrames)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
        const motion = element.motion ?? "none";
        const motionOpacity = motion === "fade" ? progress : 1;
        const translateY = motion === "rise" ? interpolate(progress, [0, 1], [height * 0.06, 0]) : motion === "drift" ? Math.sin(frame / 18 + element.x) * height * 0.012 : motion === "bounce" ? interpolate(spring({ frame: localFrame, fps, config: { damping: 8, stiffness: 150 } }), [0, 1], [height * 0.08, 0]) : 0;
        const translateX = motion === "slide-left" ? interpolate(progress, [0, 1], [width * 0.12, 0]) : motion === "slide-right" ? interpolate(progress, [0, 1], [-width * 0.12, 0]) : 0;
        const scale = motion === "scale" || motion === "zoom" ? interpolate(progress, [0, 1], [motion === "zoom" ? 1.25 : 0.72, 1]) : 1;
        const rotation = (element.rotation ?? 0) + (motion === "rotate" ? interpolate(progress, [0, 1], [-24, 0]) : 0);
        const fill = element.gradientTo ? `linear-gradient(${element.gradientAngle ?? 135}deg, ${element.color}, ${element.gradientTo})` : element.color;
        const style: CSSProperties = {
          position: "absolute", left: `${element.x}%`, top: `${element.y}%`,
          width: `${element.width}%`, height: element.type === "text" ? "auto" : `${element.height}%`,
          color: element.color,
          background: ["rect", "circle", "ellipse", "triangle"].includes(element.type) ? fill : "transparent",
          borderRadius: element.type === "circle" || element.type === "ellipse" ? "50%" : element.borderRadius ? `${element.borderRadius}%` : 0,
          border: element.strokeColor && (element.type === "rect" || element.type === "circle" || element.type === "ellipse") ? `${element.strokeWidth ?? 1}px solid ${element.strokeColor}` : undefined,
          borderTop: element.type === "line" ? `${element.strokeWidth ?? 2}px solid ${element.strokeColor ?? element.color}` : undefined,
          clipPath: element.type === "triangle" ? "polygon(50% 0%, 0% 100%, 100% 100%)" : undefined,
          fontSize: element.fontSize ? `${element.fontSize}px` : `clamp(12px, ${width * 0.04}px, 80px)`,
          fontWeight: element.type === "text" ? 700 : undefined, lineHeight: 1.05,
          whiteSpace: "pre-wrap", overflowWrap: "anywhere",
          opacity: (element.opacity ?? 1) * motionOpacity,
          filter: element.blur ? `blur(${element.blur}px)` : undefined,
          transform: `translate(${translateX}px, ${translateY}px) rotate(${rotation}deg) scale(${scale})`,
          transformOrigin: "center center", boxSizing: "border-box",
        };
        if (element.type === "text") return <div key={element.id} style={style}>{element.text ?? ""}</div>;
        if (element.type === "path" || element.type === "triangle") {
          const gradientId = `motion-element-gradient-${index}`;
          const pathData = element.type === "triangle" ? "M 50 0 L 100 100 L 0 100 Z" : element.pathData ?? "M 10 50 L 90 10 L 90 90 Z";
          return <div key={element.id} style={style} aria-hidden="true"><svg viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="none"><defs>{element.gradientTo && <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor={element.color} /><stop offset="100%" stopColor={element.gradientTo} /></linearGradient>}</defs><path d={pathData} fill={element.gradientTo ? `url(#${gradientId})` : element.color} stroke={element.strokeColor} strokeWidth={element.strokeWidth ?? 0} strokeLinejoin="round" strokeLinecap="round" /></svg></div>;
        }
        return <div key={element.id} style={style} />;
      })}
    </AbsoluteFill>
  );
}
