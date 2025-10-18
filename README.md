RPN Calculator (Vite + HTML/JS)

This repository contains a fully static RPN calculator website built with vanilla HTML/CSS/JavaScript and Vite for local development and builds.

Credit: The majority of the code in this project was written by JUNIE AI (an autonomous programmer by JetBrains).

Repository: https://github.com/pjcunningham/rpn.calc

Requirements
- Node.js 18+ (or any currently supported LTS)
- A package manager: pnpm (recommended) or npm

Install
- pnpm: pnpm install
- npm: npm install

Run (development)
- pnpm dev
- npm run dev

Then open your browser at:
- http://localhost:5173/ (Home)
- http://localhost:5173/help.html (Help)
- http://localhost:5173/about.html (About)

Build for production
- pnpm build
- npm run build

The production build is emitted to the dist/ directory.

Preview a production build locally
- pnpm preview
- npm run preview

This serves the built site from dist/ at a local URL (typically http://localhost:4173/).

What you should see
- Home page hosts a stacked RPN calculator with a green-on-black 1980s console aesthetic by default.
- Help and About pages provide supporting information and links back to Home.

Project structure (key files)
- index.html — Home (calculator UI)
- help.html — Help page
- about.html — About page
- src/app.js — All calculator logic and UI behavior
- src/styles.css — Base styles and skins
- package.json — Vite scripts
- dist/ — Production build output (generated)

Using the RPN calculator
- Entry: Type a number in the entry field and press Enter to push it to the stack.
- Operations: +, −, ×, ÷ operate on the top two numbers of the stack (X and Y). Results replace them on the stack.
- Stack ops: Swap (swap top two), Drop (drop X), Clear (clear stack and entry).
- Keyboard shortcuts:
  - Enter: push entry to stack
  - +, -, *, /: arithmetic on top two
  - Digits and .: type into entry
- Display: The stack is shown with the top (X) at the bottom line, HP-48 style.
- Edge cases: If there aren’t enough operands or you divide by zero, a brief status message is shown.

Advanced modes
- Modes: Basic, Scientific, and Programmer. Use the "Mode" button at the top of the keypad to cycle between modes.
- Scientific functions:
  - Angle mode: RAD/DEG/GRAD button on the keypad (visible only in Scientific mode) cycles units. In DEG mode, trig inputs are in degrees and inverse trig outputs are returned in degrees. In GRAD mode, trig inputs/outputs use gradians (400 grads = 360°). Default is RAD and your choice is remembered.
  - Trig: sin, cos, tan; Hyperbolic: sinh, cosh, tanh
  - Inverse trig: asin, acos, atan; Inverse hyperbolic: asinh, acosh, atanh (domain-checked)
  - Logs/exp/roots: ln, log10, eˣ, sqrt, ∛x
  - Powers/others: x², x³, 1/x, y^x, x√y, x! (factorial)
- Programmer functions (32-bit integers):
  - Binary: AND (&), OR (|), XOR, NOR, NAND, XNOR, SHL (<<), SHR (>>)
  - Unary: NOT (~)
  - Notes: Programmer ops coerce operands to 32-bit signed integers and mask results to 32-bit. Shift counts use b & 31.
- Error handling: domain errors (e.g., ln(x<=0), sqrt(x<0), asin/acos(|x|>1)) and divide by zero show a brief status message.

Command entry
- Besides clicking buttons, you can type commands into the entry and press Enter:
  - Basic: +, -, *, /, swap, drop, clear, enter
    - Word aliases: plus/add/addition, minus/subtract/subtraction, times/multiply/multiplication, divide/division/over
  - Scientific: sin, cos, tan, sinh, cosh, tanh, asin, acos, atan, asinh, acosh, atanh, ln, log, log10, exp, sqrt/root, cbrt/cube root/∛, inverse/inv/1/x/recip, square/sq/x^2, cube/cubed/x^3/x³, pow/^/y^x, nroot/nthroot/rootn/x√y, factorial/fact/!/n!/x!
  - Programmer: and/& , or/| , xor , not/~ , nor , nand , xnor , shl/<< , shr/>>

Implementation notes
- Fully static site: no server-side code is required. Everything runs in the browser.
- Vite is used for:
  - Fast local dev server with HMR
  - Building and optimizing assets into dist/
- Assets are referenced relative to the project root. After build, files in dist/ can be hosted on any static host (GitHub Pages, Netlify, Vercel static, S3, etc.).

Links (dev server)
- http://localhost:5173/ (Home)
- http://localhost:5173/help.html (Help)
- http://localhost:5173/about.html (About)

View modes
- Horizontal: single-column layout (default).
- Vertical: two columns split 50/50; left shows stack and entry (entry pinned at the bottom), right shows buttons.

Skins
- Use the Skin dropdown in the top bar to switch between:
  - Green (classic CRT green-on-black)
  - Amber (1980s amber phosphor)
  - Windows 3.1 (light gray with navy accents)
  - Apple (Modern) — light, clean, blue accents
  - Commodore 64 (blue background, light blue text)
  - BSOD (blue screen, white text)
  - USSR NIXIE (1970s Nixie tube orange glow)
  - Sinclair LED (early Sinclair Cambridge LED look)
  - HP-48SX LCD (dot-matrix green/gray LCD)
  - Sonnet 18 (Shakespeare parchment & ink)

Persistence
- The calculator remembers your UI preferences between sessions using browser localStorage.
  - rpn.mode: 0 = Basic, 1 = Scientific, 2 = Programmer.
  - rpn.view: "horizontal" or "vertical".
  - rpn.skin: one of "green", "amber", "win31", "apple", "c64", "bsod", "nixie", "sinclair", "hp48", "sonnet18".
  - rpn.angle: "rad", "deg", or "grad".
- These are loaded on page open and updated whenever you change Mode, View, Skin, or Angle.
- To reset, you can switch modes/views/skins via the UI, or clear the site’s localStorage via your browser dev tools.

Notes for Safari users
- If you type just localhost:5173 without the scheme, some versions may not resolve correctly. Always use the full URL including http://.
