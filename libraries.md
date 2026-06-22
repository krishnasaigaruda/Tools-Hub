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
| DM Sans | calculator.html, color-picker.html, graph-plotter.html |
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
| Leaflet | 1.9.4 | BSD 2-Clause | YES | |
| Leaflet Routing Machine | 3.2.12 | ISC | YES | |
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
| Photon (Komoot) | Apache 2.0 (software), ODbL (data) | YES, with limits | Must attribute OpenStreetMap. High traffic = run your own instance |
| Nominatim (OpenStreetMap) | GPLv3 (software), ODbL (data) | YES, with limits | Max 1 req/sec. Must show "© OpenStreetMap contributors". Public instance not for production commercial use |
| Overpass API | AGPL v3 (software), ODbL (data) | YES for querying | Must attribute OpenStreetMap. AGPL only applies if you modify/deploy the server |
| Wikipedia API | CC BY-SA 4.0 | YES | Must attribute authors. Share-alike applies to redistributed content |
| Wiktionary API | CC BY-SA 3.0 / GFDL | YES | Must attribute authors. Share-alike applies to redistributed content |
| Lingva Translate TTS | AGPL-3.0 (server) | YES | Open-source TTS API with CORS support. Replaced Sound of Text API for MP3 download |
| OpenStreetMap Tiles | ODbL (data), CC BY-SA 2.0 (tiles) | YES for data, **NO for public tile servers** | Must show "© OpenStreetMap contributors". Public tile servers are not for commercial use — use a paid tile provider |
| Desmos Graphing Calculator API (v1.11) | Proprietary (free for non-commercial use) | **NO** without agreement | Used in graph-plotter.html. Free on public **non-commercial** sites with attribution. Currently using Desmos's public **demo** API key (testing only). Commercial use requires a partnership/license from Desmos — see https://www.desmos.com/api. Requires internet |

---

## CDN Providers

| Provider | Libraries Served |
|----------|-----------------|
| cdnjs (Cloudflare) | Font Awesome, FileSaver.js, html2pdf.js, JSZip, PDF.js, PDF-lib |
| jsDelivr | Three.js, QRCode, OpenType.js, ExcelJS, Tesseract.js, Currency API |
| unpkg | Leaflet, Leaflet Routing Machine |
| Google APIs | Google Fonts |
| desmos.com | Desmos Graphing Calculator API |

---

## Commercial Use Summary

### All Clear (no issues)
- All 12 JavaScript libraries — MIT, BSD, Apache 2.0, ISC
- Font Awesome Free
- All Google Fonts
- Currency API

### OK but Need Attribution
- **OpenStreetMap data** (Nominatim, Overpass, Photon, tiles) — must display "© OpenStreetMap contributors"
- **Wikipedia / Wiktionary content** — must attribute authors, share-alike on redistributed content
- **PDF.js & Tesseract.js** — must include Apache 2.0 license/NOTICE

### NOT Free for Commercial Use
- **Desmos Graphing Calculator API** (graph-plotter.html) — free only for public **non-commercial** sites. Currently uses Desmos's public demo API key (testing only). Any commercial use requires a license/partnership from Desmos. Either get an agreement + your own API key, or swap back to the previous self-built canvas plotter (in git history) for a fully MIT-clean commercial build.

### OK but Public APIs Not for Heavy Commercial Traffic
- **Nominatim** — max 1 req/sec, no SLA, run your own for production
- **Overpass API** — no SLA, run your own for production
- **Photon (Komoot)** — will throttle heavy usage
- **OSM tile servers** — explicitly not for commercial production, use a paid provider (Mapbox, Stadia Maps, etc.)

### Fixed
- ~~**Sound of Text API**~~ — Replaced with Lingva Translate TTS API (open-source, CORS-friendly, no "personal use only" restriction)
- **OSM public tile servers** — Already using CartoDB, Esri, and OpenTopoMap tiles instead (no issue)

---

## Summary

- **Total HTML files**: 67
- **Total unique libraries**: 16
- **No package.json** — all dependencies loaded via CDN
- **14 out of 16 libraries** are fully clear for commercial use
- **One commercial-use blocker**: the Desmos Graphing Calculator API (graph-plotter.html) is free for non-commercial use only and currently uses Desmos's demo key. Get a Desmos license or revert to the self-built plotter before any commercial release.
- Sound of Text API removed, OSM tiles were already using commercial-friendly providers
