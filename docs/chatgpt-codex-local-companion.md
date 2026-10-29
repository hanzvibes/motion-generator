# ChatGPT / Codex support: local companion

## Status

**Architecture decision documented; OAuth runtime is not implemented yet.** The deployed Vercel app must not collect, store, or proxy ChatGPT-plan OAuth tokens.

## Why this is local-first

OpenAI's official Sign in with ChatGPT DevKit is intended for open-source apps running in a user's own environment. Its local SDK handles OAuth, credential storage, account profiles, model discovery, and Responses API streaming. The official terms require persistent authentication tokens to remain local and under the user's control; requests must originate from the user's local runtime or a remote runtime controlled by that user.

Therefore, Motion Studio's Vercel serverless route must **not** receive a ChatGPT/Codex access or refresh token, store one in Vercel environment variables, or use a shared remote token vault.

Official references:
- https://github.com/openai/sign-in-with-chatgpt-devkit
- https://developers.openai.com/siwc/quickstart
- https://developers.openai.com/siwc/token-sharing-open-source/codex-app-server
- https://openai.com/policies/sign-in-with-chatgpt-terms/
- https://help.openai.com/en/articles/20001542-using-your-chatgpt-plan-in-other-apps-and-sites

## Intended architecture

```text
Browser UI (hosted on Vercel)
  |  user-approved prompt/spec request
  v
Local companion (Node.js, on the user's device)
  |  official SIWC / Codex app-server integration
  |  OAuth credentials stored locally by the supported SDK
  v
OpenAI Responses API using eligible ChatGPT plan authorization
```

The local companion is responsible for authentication and provider requests. Vercel only serves the editor and must never receive the OAuth tokens.

## Required implementation sequence

1. Add a local Node.js companion as a separate process/package; target Node.js 22.12+ as required by the official DevKit example.
2. Integrate the official `@siwc/local` APIs (or the documented Codex app-server flow) rather than reverse-engineering Codex CLI files or asking users to paste tokens.
3. Keep credentials in the official local credential store; never log tokens or send them to the hosted app.
4. Expose only a narrow localhost API for connection status and motion-spec generation. Bind to loopback only, validate requests, restrict browser origins, and require a per-session pairing secret to mitigate cross-origin abuse.
5. In the browser, add an explicit “Local ChatGPT / Codex” provider option and show disconnected / connected / unavailable states. If the companion is unavailable, explain that ChatGPT-plan generation requires the companion; do not silently route through Vercel.
6. Validate returned JSON against the existing motion schema before applying it to the editor.
7. Test OAuth cancellation, expired/revoked credentials, unavailable companion, malformed model output, network errors, and successful generation.

## Current behavior / fallback

The existing Vercel app continues to support the current OpenAI API-key, Anthropic, Gemini, and custom OpenAI-compatible provider flows. This document does not claim that ChatGPT OAuth or Codex-plan generation is already working.

Do not add a “Sign in with ChatGPT” button until the local runtime integration is implemented and tested. Sign-in identity alone does not grant permission to use a ChatGPT plan for inference; plan-use authorization and eligibility are separate.
