# Zevio AI — Android APK + Windows EXE (Cloud edition)

This is the **Zevio AI-only** project extracted from the supplied ZIP. KhmerSRT website files are not included.

## Brand identity\n\nThe supplied purple-gradient Z logo is applied to the web/PWA icon assets, navbar, Apple touch icon, and Windows installer icon. Original and 1024px PNG copies are in `branding/`. For Android, use `frontend/public/icon-512.png` as the source image when generating Android launcher icons in Android Studio.\n\n## What is included

- Existing Zevio AI React interface: Chat, Homework Solver and Code Studio
- Existing Node.js/Express API backend
- Cloud GPU inference configuration (OpenAI-compatible vLLM endpoint)
- Android wrapper using Capacitor
- Windows desktop wrapper using Electron
- Render Docker deployment blueprint for the API

## Important: the cloud server is not created yet

The APK and EXE are application installers, not AI servers. Both apps call the same HTTPS Zevio API. That API then calls a cloud GPU inference endpoint. Because no cloud server URL or GPU instance exists yet, the apps cannot provide working AI responses until you deploy those services and configure the URL.

Architecture:

`Android APK / Windows EXE -> Zevio API (Node/Express) -> GPU inference endpoint (vLLM)`

Supabase is optional for the basic API setup. Keep all server credentials on the server. Never place GPU, Supabase service-role, Gemini, or Ollama secret keys in the mobile/desktop frontend.

## Cloudflare deployment (recommended cloud-only setup)

This package now includes a Cloudflare Worker that serves the built Zevio frontend and exposes:
- `GET /api/health`
- `POST /api/chat/stream`
- `POST /api/homework/solve`
- `POST /api/code/action`

The Worker calls Cloudflare Workers AI through the `AI` binding. It uses the model `@cf/meta/llama-3.3-70b-instruct-fp8-fast`. This avoids running your own GPU server or keeping an inference API key in the app.

### Deploy from Windows 10/11

1. Install Node.js LTS.
2. Extract this ZIP.
3. Open PowerShell in the extracted `Zevio-AI-Cloud-Apps` folder.
4. Install packages and sign in to your own Cloudflare account:

```powershell
npm install
npx wrangler login
```

5. In the Cloudflare dashboard, open **Workers & Pages → Workers AI** and enable/activate Workers AI for your account if prompted. Review usage and billing before enabling paid usage.
6. Deploy:

```powershell
npm run deploy:cloudflare
```

7. Wrangler prints a `https://...workers.dev` URL. Open it in a browser. The app should load.
8. Check `https://YOUR-WORKER-URL/api/health`. It should return `"status":"ok"` and show the selected Workers AI model.

### Configure Android and Windows app builds

After deployment, use the actual `workers.dev` URL as the build-time API base URL.

PowerShell:

```powershell
$env:VITE_ZEVIO_API_URL="https://YOUR-WORKER-URL.workers.dev"
npm run build:exe
```

For Android, use the same environment variable before running the Android build commands in the Android section below. Build the APK from Android Studio after syncing the Capacitor project.

### Cloudflare limitations in this starter

- Workers AI is cloud-hosted inference; it is not your own private GPU or a model trained specifically for Zevio.
- This starter Worker currently handles text chat, text homework questions, and code tasks. PDF/Word/image extraction from homework uploads is not implemented in this Cloudflare Worker yet; text files are read as text and other attachments receive a prompt to paste the question.
- The current Worker sends one completed model response as an SSE event; it is compatible with the existing app's event parser but is not token-by-token streaming.
- Add user authentication, abuse protection, and usage limits before sharing the public app. The starter routes are public.
- Workers AI has a daily free allocation and paid overage/usage rules that can change. Check the current pricing page before production use.

## 1. Deploy the cloud AI inference service (optional legacy self-hosted route)

The backend in this project expects an OpenAI-compatible vLLM endpoint. The included `gpu-server/` folder contains the starting Docker Compose configuration and setup notes.

- Provision a cloud GPU instance from a provider that supports NVIDIA GPUs and vLLM.
- Follow `gpu-server/README-GPU-SETUP.md`.
- For the included Qwen 7B model configuration, the original project documentation recommends a GPU with around 16 GB VRAM.
- Keep the inference port private where possible. Do not expose an unauthenticated vLLM endpoint to the public internet.
- Record the HTTPS inference URL and its API key. The URL usually ends in `/v1`.

Cloud GPU hosting may incur charges. Review pricing and get a parent/guardian's approval before starting a paid instance.

## 2. Deploy the Zevio API

The API can be deployed as a Docker web service. `render.yaml` is included as a starting deployment blueprint.

In your hosting dashboard, set these server-side environment variables:

- `VLLM_BASE_URL` = your GPU inference endpoint, ending in `/v1`
- `VLLM_API_KEY` = the GPU endpoint's key (or the value required by your endpoint)
- `DEFAULT_MODEL` = `Qwen/Qwen2.5-7B-Instruct`
- `CODER_MODEL` = `Qwen/Qwen2.5-Coder-7B-Instruct`
- `MATH_MODEL` = `Qwen/Qwen2.5-Math-7B-Instruct`
- `VISION_MODEL` = `Qwen/Qwen2-VL-7B-Instruct`
- `NODE_ENV` = `production`

Deploy the API and copy its public HTTPS base URL, for example `https://your-zevio-api.example.com` (use your actual URL, not this example).

Check the service health at:

`https://YOUR-BACKEND-DOMAIN/api/health`

The health endpoint should report that inference is online before you build the installers.

## 3. Configure the app to use your API

On Windows, open `frontend/.env.production.example`, save a copy named `.env.production`, and replace the placeholder:

```env
VITE_ZEVIO_API_URL=https://YOUR-BACKEND-DOMAIN
```

Use the real API base URL with no trailing slash. Do not put any API keys in this file.

## 4. Build the Windows EXE installer

Requirements: Windows 10/11 64-bit, Node.js 20 LTS or newer, and npm.

Open PowerShell in the project folder:

```powershell
npm install
npm run build:exe
```

The installer will be written under:

`release/Zevio AI Setup 1.0.0.exe`

Run the EXE to install Zevio AI. The installer is built on Windows; this source package does not contain a prebuilt EXE.

## 5. Build the Android APK

Requirements: Node.js 20 LTS or newer, Android Studio, Android SDK, and a compatible JDK (use the JDK version required by your installed Android Gradle Plugin).

In PowerShell in the project folder:

```powershell
npm install
npm run build:web
npm run android:init
npm run android:sync
npm run android:open
```

Android Studio opens the generated `android/` project. Select **Build > Build Bundle(s) / APK(s) > Build APK(s)**.

The debug APK is normally created at:

`android/app/build/outputs/apk/debug/app-debug.apk`

For a Play Store release, create and securely store your own signing key in Android Studio, then build a signed release APK or AAB. Never share the signing key or its password.

## 6. Test before sharing

- Open `/api/health` and confirm the inference service is online.
- Install the APK on an Android test device and launch it.
- Install the EXE on Windows and launch it.
- Test Chat, Homework Solver, Code Studio, file uploads, and network loss.
- Confirm the app only sends requests to your HTTPS Zevio API.
- Do not publish until the cloud API is protected with appropriate authentication, rate limits, and usage limits.

## Security cleanup performed in this package

- The original backend `.env` file was intentionally excluded.
- The original built frontend/backend output and all `node_modules` folders were excluded.
- Hard-coded default Gemini/Ollama client keys and a hard-coded backend AI key were removed from source.
- The example environment file contains placeholders only.

**Note:** This is a prepared source/build package, not compiled APK/EXE installers. A real backend URL and a running cloud inference service are required before building production installers that can connect to AI.
