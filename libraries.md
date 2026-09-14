# Libraries Used in Tools-Hub

## Icon Libraries

| Library | Version | License | Commercial Use | Notes |
|---------|---------|---------|----------------|-------|
| Font Awesome (Free) | 6.5.1 | Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT | YES | Attribution embedded in CDN files already |

---

## Fonts (Google Fonts)

All Google Fonts below are licensed under **SIL Open Font License 1.1** — fully OK for commercial use.

| Font Family | Used In |
|-------------|---------|
| Inter | Tools.html |
| JetBrains Mono | Most tools |
| Outfit | Most tools |
| DM Sans | calculator.html, color-picker.html |
| Space Grotesk | typing-test.html |
| IBM Plex Sans | pdf-tools.html (unused) |
| IBM Plex Mono | typing-test.html, pdf-tools.html (unused) |

---

## JavaScript Libraries

| Library | Version | License | Commercial Use | Notes |
|---------|---------|---------|----------------|-------|
| Three.js | 0.160.0 | MIT | YES | |
| QRCode Generator | 1.4.4 | MIT | YES | |
| OpenType.js | 1.3.4 | MIT | YES | |
| ExcelJS | 4.4.0 | MIT | YES | |
| FileSaver.js | 2.0.5 | MIT | YES | |
| html2pdf.js | 0.10.1 | MIT | YES | |
| JSZip | 3.10.1 | MIT / GPLv3 (dual) | YES | Use under MIT to avoid copyleft |
| PDF.js | 3.11.174 | Apache 2.0 | YES | Must include license and NOTICE file |
| PDF-lib | 1.17.1 | MIT | YES | |
| Tesseract.js | 5 | Apache 2.0 | YES | Must include license and NOTICE file |

---

## External APIs

| API | License | Commercial Use | Important Conditions |
|-----|---------|----------------|----------------------|
| Currency API (FawazAhmed0) | CC0 (Public Domain) | YES | No guarantees of availability |
| Wikipedia API | CC BY-SA 4.0 | YES | Must attribute authors. Share-alike applies to redistributed content |
| Wiktionary API | CC BY-SA 3.0 / GFDL | YES | Must attribute authors. Share-alike applies to redistributed content |
| Lingva Translate TTS | AGPL-3.0 (server) | YES | Open-source TTS API with CORS support. Replaced Sound of Text API for MP3 download |

---

## CDN Providers

| Provider | Libraries Served |
|----------|-----------------|
| cdnjs (Cloudflare) | Font Awesome, FileSaver.js, html2pdf.js, JSZip, PDF.js, PDF-lib |
| jsDelivr | Three.js, QRCode, OpenType.js, ExcelJS, Tesseract.js, Currency API |
| Google APIs | Google Fonts |

---

## Commercial Use Summary

### All Clear (no issues)
- All 10 JavaScript libraries — MIT, Apache 2.0 (JSZip used under MIT)
- Font Awesome Free
- All Google Fonts
- Currency API

### OK but Need Attribution
- **Wikipedia / Wiktionary content** — must attribute authors, share-alike on redistributed content
- **PDF.js & Tesseract.js** — must include Apache 2.0 license/NOTICE


### Fixed
- ~~**Desmos Graphing Calculator API**~~ — Removed. Desmos's API terms count any public production site as commercial use, which needs a paid plan. The Graph Plotter (later rebuilt on function-plot) is now in `unused/`.
- ~~**Sound of Text API**~~ — Replaced with Lingva Translate TTS API (open-source, CORS-friendly, no "personal use only" restriction)

---

## Unused Tools

These are in `unused/` and not published, so their dependencies don't apply to the live site:

| Tool | Dependencies (only relevant if the tool is brought back) |
|------|------------------------------------------------------------|
| map.html | Leaflet 1.9.4 (BSD 2-Clause), Leaflet Routing Machine 3.2.12 (ISC) via unpkg; OpenStreetMap data (ODbL, must show "© OpenStreetMap contributors"); Nominatim (max 1 req/sec, public instance not for production), Overpass API and Photon (Komoot) — no SLA, throttled for heavy use; CartoDB / Esri / OpenTopoMap tiles |
| pdf-tools.html | PDF.js, PDF-lib, IBM Plex fonts |
| graph-plotter.html | function-plot 1.25.4 (MIT) via jsDelivr — no API key |

---

## Summary

- **Total unique libraries**: 13 (10 JavaScript libraries, Font Awesome, Google Fonts, Currency API)
- **No package.json** — all dependencies loaded via CDN
- **All libraries in published tools are clear for commercial use** (some need attribution or NOTICE files)
- Desmos removed; the Graph Plotter and the Map tool (Leaflet + OpenStreetMap services) moved to `unused/`
- Sound of Text API removed, OSM tiles were already using commercial-friendly providers
