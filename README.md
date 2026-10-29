# Motion Studio

An AI-assisted motion graphics editor built with **Next.js + Remotion**. Generate a motion direction from a text prompt, adjust the composition live, then export from the browser.

## Features

- Four motion directions: kinetic type, orbit, neon pulse, and editorial.
- Remotion Player preview with editable title, supporting copy, palette, duration, and visual preset.
- Bring your own provider API key for OpenAI, Anthropic, or Google Gemini.
- Custom OpenAI-compatible endpoint support for hosted gateways and compatible model servers reachable over public HTTPS.
- Browser-based export using Remotion's `@remotion/web-renderer`; no server-side video render infrastructure required.
- Responsive dark editor UI designed for desktop and mobile.
- No account system or database in this MVP.

## Requirements

- Node.js 20.9+
- A modern browser. Browser export uses WebCodecs, so support depends on the browser and device.
- An API key and model ID from one supported AI provider to use AI generation. For a custom OpenAI-compatible provider, enter its public HTTPS base URL and model ID; API key is optional only when that endpoint explicitly allows unauthenticated requests. Manual editing and preview work without a key.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

Run checks:

```bash
npm run typecheck
npm run build
```

## Deploy to Vercel

1. Import this repository into Vercel.
2. Keep the framework preset as **Next.js**.
3. Use the default install and build commands.
4. Deploy. No AI key is required as a Vercel environment variable because users provide their own key inside the editor.

## BYOK privacy

- The API key is held in in-memory UI state only and is not saved to local storage, cookies, a database, or application logs. Provider, model, and custom endpoint preferences are saved to this browser only when the user explicitly chooses Save settings.
- When generating a composition, the key is sent to this app's same-origin API route and used to authenticate a single provider request.
- The route does not deliberately log request bodies or provider exceptions; provider error details are replaced with a generic message.
- Custom endpoints must use HTTPS, resolve only to public IP addresses, and cannot redirect requests. The server rechecks DNS before requests and blocks common non-public IPv4/IPv6 ranges, but DNS rebinding and infrastructure-level risks cannot be ruled out completely. Only use endpoints you control or trust.
- This is not a guarantee that the AI provider itself won't process request data. Review your provider's terms and policies.
- API keys saved by older versions are removed from local storage when the editor next loads. Do not paste keys into prompts. Clear the key in AI settings when finished; refreshing the page also clears it.

## Provider compatibility notes

- **Google Antigravity:** use the Google Gemini API option with a Gemini API key from Google AI Studio, or a separate OpenAI-compatible gateway you are authorized to use. This app does not reuse Antigravity consumer-account OAuth/session tokens. Google's Antigravity FAQ warns that routing its consumer login through third-party software can violate its Terms of Service and risk account suspension: https://www.antigravity.google/docs/faq/.
- **ChatGPT / Codex sign-in:** the hosted Vercel backend does not accept or store ChatGPT-plan OAuth tokens. Official plan-backed usage requires a user-controlled local runtime and separate plan-use authorization; do not paste `~/.codex/auth.json` tokens into this app. The local-companion architecture and implementation checklist are documented in [docs/chatgpt-codex-local-companion.md](docs/chatgpt-codex-local-companion.md). This integration is not implemented yet. For now, use an OpenAI API key or a provider endpoint you are authorized to use. See https://help.openai.com/en/articles/20001542-using-your-chatgpt-plan-in-other-apps-and-sites and https://developers.openai.com/siwc/token-sharing-open-source/codex-app-server.

## Export notes

Video rendering happens on the user's device. Keep the page open during export, and avoid switching apps on low-memory phones. If export is unavailable, update your browser or use Chrome/Edge on a desktop. Browser codec support varies; this MVP uses the renderer's default output format.

## License

This project uses Remotion. Review [Remotion's license and terms](https://www.remotion.dev/license) and confirm your usage qualifies before releasing a public commercial app. Other dependencies retain their respective licenses.


## Editing workflow features

- **Local project library:** save snapshots, restore older versions, duplicate a project, or export/import portable JSON files. The library is stored in this browser only; clearing site data removes it. API keys are never included in project snapshots.
- **Custom motion presets:** save the current composition as a reusable preset and apply or delete it later. Presets are local to the current browser.
- **Layer visibility:** toggle the background/grid, motion graphics, typography, and footer independently. These visibility choices affect both preview and browser export.
- **Title easing:** choose Spring, Ease In, Ease Out, or Linear for the title entrance. The preview and export share the same composition logic.
- **Undo/redo:** history controls cover composition-spec edits.

The Social Media Canvas supports landscape (16:9), portrait (9:16), and square (1:1) output. Export remains browser/device-based; format and codec availability depend on browser support.


## Independent Remotion composition engine

- AI composition uses a scene graph rather than depending on the four legacy visual presets.
- The editor supports up to 256 positioned elements and up to 20 timed scenes per project as practical safety bounds.
- Elements include text, rectangles, circles, ellipses, lines, triangles, and custom SVG vector paths.
- Per-element controls include position, size, timing, fill and gradient colors, stroke, opacity, rotation, blur, layer assignment, ordering, and entrance motion.
- Canvas edit mode lets you drag elements to reposition them or use arrow keys to nudge the selected element. Element timing is visible as selectable clips in the timeline.
- Entrance motion includes fade, rise, scale, zoom, drift, horizontal slides, rotate-in, and bounce.
- Element coordinates are percentages of the canvas, so compositions adapt to landscape, portrait, and square output. Preview and browser export share the same Remotion composition component.
- Rendering runs locally in the browser; no third-party video-rendering service or remote asset library is required. An AI provider is only needed to generate or revise a composition. Existing projects without a scene graph continue to use the legacy preset renderer.
- “Independent” does not mean literally unlimited: browser memory, device performance, codec support, export duration, the element/scene safety bounds, and Remotion's own runtime/license remain practical limits.
