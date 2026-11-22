# BROWSER FINGERPRINT — DIGITAL IDENTITY INVESTIGATION

An interactive, single-page cybersecurity and digital forensics demonstration that reveals how much information a website can discover about a visitor through browser fingerprinting and public browser APIs.

The experience unfolds as an intelligence investigation with progressive storytelling through scrolling, culminating in an on-screen classified FBI-style digital forensics case report (**"SUBJECT DIGITAL FOOTPRINT"**).

---

## Technical Stack & Constraints

- **Pure HTML5, CSS3, Vanilla JavaScript (ES modules)**.
- **Zero Frameworks**: No React, Vue, Angular, or libraries.
- **Zero Backend / Serverless**: Operates 100% locally in the visitor's browser.
- **Zero Persistent Storage**: Strictly no cookies, no `localStorage`, no `sessionStorage`. All state is held in-memory and discarded upon navigation or refresh.
- **Zero Unprompted Data Transmission**: Completely private. The only external request is an optional geo-IP query gated behind explicit user opt-in consent.
- **Zero File Exports / Downloads**: The FBI-style investigation dossier exists entirely inside the web interface as an interactive forensic artifact.
- **Deployable to Netlify**: Pure static site with zero build requirements.

---

## Project Architecture

```text
browser-fingerprint/
│
├── index.html                           # Semantic HTML5 layout & section containers
├── README.md                            # Documentation and architecture guide
│
├── css/
│   ├── variables.css                    # Design tokens (cyber dark palette, typography, spacing)
│   ├── main.css                         # Reset, base typography, custom scrollbar
│   ├── layout.css                       # Sticky HUD, containers, timeline, grid systems
│   ├── components.css                   # Intel cards, status badges, consent gate, FBI dossier
│   ├── animations.css                   # Scan lines, pulse effects, reduced-motion overrides
│   └── responsive.css                   # Mobile and tablet responsive layouts
│
└── js/
    ├── app.js                           # Master entry point & orchestration
    │
    ├── core/
    │   ├── state.js                     # Centralized in-memory reactive state manager
    │   ├── scanner.js                   # Progressive scan queue coordinator
    │   └── utilities.js                 # SHA-256 hasher, formatters, sanitizers
    │
    ├── collectors/
    │   ├── browser.js                   # User-Agent, Client Hints, engine, DNT, GPC
    │   ├── device.js                    # Hardware concurrency, RAM estimate, touch points
    │   ├── network.js                   # Connection API, timezone, consented IP lookup
    │   ├── display.js                   # Resolutions, viewport, pixel ratio, color gamut
    │   ├── graphics.js                  # WebGL 1/2, unmasked GPU silicon, 2D Canvas hash
    │   ├── audio.js                     # Silent OfflineAudioContext dynamics compressor hash
    │   └── privacy.js                   # Passive permission queries, storage checks, ad-block heuristic
    │
    ├── analysis/
    │   ├── fingerprint.js               # Canonical signal serialization & local SHA-256 hash
    │   ├── consistency.js               # Cross-signal verification (Timezone vs IP, OS vs UA)
    │   └── risk-assessment.js           # Illustrative exposure score & hardening advice
    │
    └── ui/
        ├── navigation.js                # Smooth scrolling, sticky HUD progress bar
        ├── animations.js                # Number counters & IntersectionObserver triggers
        ├── sections.js                  # Dynamic card rendering & IP consent gate
        └── investigation-report.js      # Classified FBI-style forensics dossier builder
```

---

## Investigation Flow (Sections 01 to 09)

1. **SECTION 01 — Introduction**: "HOW MUCH DOES YOUR BROWSER KNOW ABOUT YOU?" with prominent "START MY INVESTIGATION" CTA.
2. **SECTION 02 — What Is Browser Fingerprinting?**: Clear educational briefing on combinatorial entropy, stateless identification, and fraud/tracking use cases.
3. **SECTION 03 — Network & Location Intelligence**: Connection tier, latency, timezone, and explicit consent authorization gate for external IP lookup.
4. **SECTION 04 — Browser Intelligence**: Client hints, operating platform, language hierarchy, DNT/GPC headers, and PDF viewer capabilities.
5. **SECTION 05 — Device & Hardware Intelligence**: Physical display bounds, CPU logical cores, approximate RAM, unmasked WebGL GPU silicon model, 2D canvas hash, and silent audio DSP dynamics.
6. **SECTION 06 — Browser Environment & Privacy**: Passive permission queries (notifications, geolocation without prompting), client storage APIs, and cosmetic content-blocker heuristics.
7. **SECTION 07 — Fingerprint Analysis**: Local synthesis of signals into a 64-hex deterministic SHA-256 hash and visual matrix representation.
8. **SECTION 08 — Digital Privacy Assessment**: Illustrative exposure classification score (0–100) and browser hardening recommendations.
9. **SECTION 09 — Final FBI-Style Digital Investigation Report**: The climax of the experience — a classified digital forensics case dossier (*SUBJECT DIGITAL FOOTPRINT*) with timestamps, stamps, evidence tables, and categorized findings.

---

## Verification & Deployment

### Static Verification
To verify code syntax across all ES modules without running a server or installing packages:
```powershell
Get-ChildItem -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }
```

### Netlify Deployment
This repository is completely static. Simply drag and drop the folder into the Netlify dashboard, or push to GitHub and deploy with build command left empty and publish directory set to `.`.
