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

- The API key and custom endpoint are held in in-memory UI state and are not placed in local storage, cookies, a database, or application logs.
- When generating a composition, the key is sent to this app's same-origin API route and used to authenticate a single provider request.
- The route does not deliberately log request bodies or provider exceptions; provider error details are replaced with a generic message.
- Custom endpoints must use HTTPS and cannot target common localhost/private-network addresses. Only enter endpoints you trust; this is not a guarantee against every DNS or network-level attack.
- This is not a guarantee that the AI provider itself won't process request data. Review your provider's terms and policies.
- Do not paste keys into prompts. Clear the key in AI settings when finished; refreshing the page also clears it.

## Provider compatibility notes

- **Google Antigravity:** use the Google Gemini API option with a Gemini API key from Google AI Studio, or a separate OpenAI-compatible gateway you are authorized to use. This app does not reuse Antigravity consumer-account OAuth/session tokens. Google's Antigravity FAQ warns that routing its consumer login through third-party software can violate its Terms of Service and risk account suspension: https://www.antigravity.google/docs/faq/.
- **ChatGPT / Codex sign-in:** this version does not yet implement Sign in with ChatGPT or reuse local Codex CLI credentials. OpenAI's supported sign-in/plan-sharing flow requires an eligible registered integration; do not paste `~/.codex/auth.json` tokens into this app. For now, use an OpenAI API key or a provider endpoint you are authorized to use. See https://help.openai.com/en/articles/20001542-using-your-chatgpt-plan-in-other-apps-and-sites and https://developers.openai.com/siwc/token-sharing-open-source/codex-app-server.

## Export notes

Video rendering happens on the user's device. Keep the page open during export, and avoid switching apps on low-memory phones. If export is unavailable, update your browser or use Chrome/Edge on a desktop. Browser codec support varies; this MVP uses the renderer's default output format.

## License

This project uses Remotion. Review [Remotion's license and terms](https://www.remotion.dev/license) and confirm your usage qualifies before releasing a public commercial app. Other dependencies retain their respective licenses.
