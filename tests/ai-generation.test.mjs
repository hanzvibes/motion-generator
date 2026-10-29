import test from "node:test";
import assert from "node:assert/strict";
import { buildSystemPrompt, buildUserPrompt, parseJsonObject } from "../lib/ai-generation.mjs";

test("system prompt documents every supported motion field and bounds", () => {
  const prompt = buildSystemPrompt();
  for (const field of ["eyebrow", "title", "subtitle", "background", "accent", "secondary", "preset", "durationSeconds", "titleStartFrame", "titleTravel"]) {
    assert.match(prompt, new RegExp(field));
  }
  assert.match(prompt, /4 through 15/);
  assert.match(prompt, /six-digit hex/);
});

test("user prompt trims creative direction and frames it as design input", () => {
  const prompt = buildUserPrompt("  A calm launch for a running shoe.  ");
  assert.match(prompt, /<creative_direction>\nA calm launch for a running shoe\.\n<\/creative_direction>/);
  assert.match(prompt, /Avoid generic filler copy/);
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

test("extracts one object from provider prose and preserves braces in strings", () => {
  assert.deepEqual(parseJsonObject('Result follows: {"title":"A {better} idea","subtitle":"say \\"go\\""} done.'), {
    title: "A {better} idea",
    subtitle: 'say "go"',
  });
});

test("rejects missing, malformed, and non-object JSON", () => {
  for (const value of ["", "no json", '{"title":', '[1,2,3]', 'null']) {
    assert.throws(() => parseJsonObject(value), { message: "invalid_model_json" });
  }
});
