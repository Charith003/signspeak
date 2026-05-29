# SignSpeak ASL

SignSpeak ASL is a browser-based American Sign Language learning and recognition demo. It uses local MediaPipe Hands assets, a geometry-based ASL classifier, text-to-speech feedback, practice lessons, achievements, and session history tools to help users practice supported static signs.

## Features

- Live hand tracking with MediaPipe Hands running from local assets.
- Geometry-based ASL sign classification without a trained custom model.
- Auto text-to-speech feedback with configurable speech rate and pitch.
- Current sentence builder, session history, copy action, and JSON export.
- Sign guide with filters for letters and words.
- Practice library with level filters and expandable lesson drills.
- Achievement library with category filters, tiers, points, and unlock tips.
- Keyboard shortcuts for common actions.

## Requirements

- Node.js 18 or newer is recommended.
- npm 9 or newer is recommended.
- A modern browser with camera access.
- A webcam or camera device.

## Quickstart

```bash
npm install
npm run dev
```

Then open the local Vite URL shown in your terminal, usually:

```text
http://localhost:5173
```

Allow camera permission when your browser asks. The app needs camera access to detect hands.

## Available Scripts

```bash
npm run dev
```

Starts the Vite development server with host binding.

```bash
npm run build
```

Builds the production app into `dist/`.

```bash
npm run preview
```

Serves the production build locally for a final smoke test.

## Local MediaPipe Assets

The app serves MediaPipe files from `public/mediapipe/` so recognition can work without loading those runtime assets from a CDN after install. Keep these files in place when building or deploying the app.

Important folders:

- `public/mediapipe/hands/` — MediaPipe Hands runtime files and WASM assets.
- `public/mediapipe/camera_utils/` — camera helper script.

## Keyboard Shortcuts

| Key | Action |
| --- | --- |
| `T` | Toggle Auto TTS |
| `C` | Clear the current sentence |
| `H` | Clear session history |
| `S` | Toggle settings |
| `P` | Open Practice tab |
| `A` | Open Awards tab |

## Development Workflow

1. Create a focused branch.
2. Make one small-to-medium improvement.
3. Run `npm run build`.
4. Commit with a clear message.
5. Open a pull request with summary and testing notes.

Example:

```bash
git checkout -b docs/readme-quickstart
npm run build
git add README.md
git commit -m "docs: add quickstart guide"
```

## Troubleshooting

### Camera does not start

- Confirm that the browser has camera permission.
- Close other apps that may be using the camera.
- Try reloading the page.
- Use `https` or `localhost`; many browsers block camera access on insecure origins.

### No hand is detected

- Keep your full hand inside the camera frame.
- Use a bright, plain background.
- Hold each sign steady for about one second.
- Avoid fast transitions while the app stabilizes recognition.

### Build fails after moving between operating systems

Native packages such as esbuild can install platform-specific binaries. If `node_modules` was copied between Windows/macOS/Linux, reinstall dependencies on the current platform:

```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

## Project Structure

```text
src/App.jsx                     Main app UI and state orchestration
src/App.module.css              App-specific styles
src/hooks/useHandTracking.js    MediaPipe setup, frame loop, sentence/history logic
src/hooks/aslClassifier.js      Geometry-based ASL classifier and smoother
src/data/practiceLibrary.js     Practice lesson data
src/data/achievementLibrary.js  Achievement data
public/mediapipe/               Local MediaPipe runtime assets
```

## Current Testing

The current validation command is:

```bash
npm run build
```

A future contribution should add a test runner such as Vitest and unit tests for classifier helpers, preference sanitizers, and UI utilities.
