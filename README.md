# Motion Studio

An AI-assisted motion graphics editor built with **Next.js + Remotion**. Generate a motion direction from a text prompt, adjust the composition live, then export from the browser.

## Features

- Four motion directions: kinetic type, orbit, neon pulse, and editorial.
- Remotion Player preview with editable title, supporting copy, palette, duration, and visual preset.
- Bring your own provider API key for OpenAI, Anthropic, or Google Gemini.
- Browser-based export using Remotion's `@remotion/web-renderer`; no server-side video render infrastructure required.
- Responsive dark editor UI designed for desktop and mobile.
- No account system or database in this MVP.

## Requirements

- Node.js 20.9+
- A modern browser. Browser export uses WebCodecs, so support depends on the browser and device.
- An API key and model ID from one supported AI provider to use AI generation. Manual editing and preview work without a key.

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

- The API key is held in in-memory UI state and is not placed in local storage, cookies, a database, or application logs.
- When generating a composition, the key is sent to this app's same-origin API route and used to authenticate a single provider request.
- The route does not deliberately log request bodies or provider exceptions; provider error details are replaced with a generic message.
- This is not a guarantee that the AI provider itself won't process request data. Review your provider's terms and policies.
- Do not paste keys into prompts. Clear the key in AI settings when finished; refreshing the page also clears it.

## Export notes

Video rendering happens on the user's device. Keep the page open during export, and avoid switching apps on low-memory phones. If export is unavailable, update your browser or use Chrome/Edge on a desktop. Browser codec support varies; this MVP uses the renderer's default output format.

## License

This project uses Remotion. Review [Remotion's license and terms](https://www.remotion.dev/license) and confirm your usage qualifies before releasing a public commercial app. Other dependencies retain their respective licenses.
