import test from "node:test";
import assert from "node:assert/strict";
import { buildSystemPrompt, buildUserPrompt, parseJsonObject } from "../lib/ai-generation.mjs";

test("system prompt documents supported motion fields and bounds", () => {
  const prompt = buildSystemPrompt();
  for (const field of ["eyebrow", "title", "subtitle", "background", "accent", "secondary", "preset", "durationSeconds", "titleStartFrame", "titleTravel"]) {
    assert.match(prompt, new RegExp(field));
  }
  assert.match(prompt, /4 through 60/);
  assert.match(prompt, /six-digit hex/);
  assert.match(prompt, /required array of 1 to 256 independently animated visual primitives/);
  assert.match(prompt, /no external rendering API or assets are needed/);
  assert.match(prompt, /triangle, path/);
  assert.match(prompt, /slide-left, slide-right, rotate, bounce, zoom/);
});

test("system prompt favors relevant scenes over a fixed template", () => {
  const prompt = buildSystemPrompt();
  for (const field of ["scenes", "startSeconds", "endSeconds", "preset", "titleTravel"]) {
    assert.match(prompt, new RegExp(field));
  }
  assert.match(prompt, /Use one scene for a simple title card/);
  assert.match(prompt, /keep its text exactly aligned with that scene field/);
  assert.match(prompt, /Do not add scenes just to fill the timeline/);
  assert.match(prompt, /legacy fallback style/);
});

test("user prompt trims creative direction and frames it as design input", () => {
  const prompt = buildUserPrompt("  A calm launch for a running shoe.  ");
  assert.match(prompt, /<creative_direction>\nA calm launch for a running shoe\.\n<\/creative_direction>/);
  assert.match(prompt, /Avoid generic filler copy/);
});

test("revision prompt includes current composition and preserves unmentioned details", () => {
  const prompt = buildUserPrompt("Change only the color to red.", { title: "Launch", accent: "#c6ff55" });
  assert.match(prompt, /Change only the color to red/);
  assert.match(prompt, /<current_composition>/);
  assert.match(prompt, /"title":"Launch"/);
  assert.match(prompt, /"accent":"#c6ff55"/);
  assert.match(prompt, /preserve all unmentioned content/);
});

test("current composition can be replaced when the user describes a new concept", () => {
  const prompt = buildUserPrompt("Now make a completely different event teaser for a boxing match.", { title: "Finance app", accent: "#c6ff55" });
  assert.match(prompt, /treat it as a new brief and replace the old concept/);
  assert.match(prompt, /latest creative direction/);
});

test("parses a plain JSON object", () => {
  assert.deepEqual(parseJsonObject('{"title":"Hello","durationSeconds":8}'), {
    title: "Hello",
    durationSeconds: 8,
  });
});

test("parses JSON in a markdown fence", () => {
  assert.deepEqual(parseJsonObject('```json\n{"title":"Hello"}\n```'), { title: "Hello" });
});

test("extracts one object from provider prose and preserves braces and quotes in strings", () => {
  const expected = { title: "A {better} idea", subtitle: 'say "go"' };
  assert.deepEqual(parseJsonObject("Result follows: " + JSON.stringify(expected) + " done."), expected);
});

test("rejects missing, malformed, and non-object JSON", () => {
  for (const value of ["", "no json", '{"title":', '[1,2,3]', 'null']) {
    assert.throws(() => parseJsonObject(value), { message: "invalid_model_json" });
  }
});
