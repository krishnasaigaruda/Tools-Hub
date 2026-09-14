// Orbix Analytics — local live dashboard for the Orbix Studio GA4 property.
//
// Reads Google Analytics through the GA4 Data API with a service-account key
// and splits traffic into: Tools Hub homepage, each individual tool, and the
// Orbix Studio root site. No npm dependencies — needs Node 18+ (built-in fetch).
//
//   node server.js            real data (needs service-account.json, see README)
//   DEMO=1 node server.js     fake data, to preview the dashboard

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT) || 4321;
const PROPERTY_ID = process.env.GA_PROPERTY_ID || '553987762';
const KEY_FILE = process.env.GA_KEY_FILE || path.join(__dirname, 'service-account.json');
const DEMO = process.env.DEMO === '1';
const DEPLOY_DIR = path.join(__dirname, '..', 'deploy');

const TOOLS_HOST = 'toolshub.orbixstudio.dev';
const ORBIX_HOSTS = new Set(['orbixstudio.dev', 'www.orbixstudio.dev']);

const LIVE_CACHE_MS = 15 * 1000;     // realtime refresh floor, shared by all open tabs
const PERIOD_CACHE_MS = 60 * 1000;   // standard reports update slowly anyway

// ---------------------------------------------------------------------------
// Tool catalog, read from the deployed site so it never drifts out of date.
// GA's realtime API has no hostname or page path, only the page <title>, so
// titles are how live visitors get matched to a tool.
// ---------------------------------------------------------------------------
function decodeEntities(s) {
    return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").trim();
}

function loadCatalog() {
    const home = fs.readFileSync(path.join(DEPLOY_DIR, 'index.html'), 'utf8');
    const homeTitle = decodeEntities(home.match(/<title>([\s\S]*?)<\/title>/i)[1]);

    const byFile = new Map();
    const sectionRe = /<section class="section[^"]*"[^>]*>[\s\S]*?<h2[^>]*>([\s\S]*?)<\/h2>([\s\S]*?)<\/section>/g;
    let sec;
    while ((sec = sectionRe.exec(home))) {
        const category = decodeEntities(sec[1]);
        const tileRe = /<a class="tile" href="tools\/([^"#]+)[^"]*">[\s\S]*?<span class="tile-name">([\s\S]*?)<\/span>/g;
        let t;
        while ((t = tileRe.exec(sec[2]))) {
            const file = t[1];
            const name = decodeEntities(t[2]);
            if (!byFile.has(file)) byFile.set(file, { file, names: [], category });
            byFile.get(file).names.push(name);
        }
    }

    const tools = [];
    for (const entry of byFile.values()) {
        let title = null;
        try {
            const html = fs.readFileSync(path.join(DEPLOY_DIR, 'tools', entry.file), 'utf8');
            const m = html.match(/<title>([\s\S]*?)<\/title>/i);
            if (m) title = decodeEntities(m[1]);
        } catch { /* listed on the homepage but missing on disk */ }
        tools.push({
            file: entry.file,
            // clock.html hosts six tiles (Clock, Timer, …); show them as one tool.
            name: entry.names.length > 2 ? `${entry.names[0]} & ${entry.names.length - 1} more` : entry.names.join(' & '),
            tiles: entry.names,
            category: entry.category,
            title
        });
    }

    return {
        homeTitle,
        tools,
        byTitle: new Map(tools.filter(t => t.title).map(t => [t.title, t])),
        byFile: new Map(tools.map(t => [t.file, t]))
    };
}

let catalog = loadCatalog();

// ---------------------------------------------------------------------------
// Google auth: sign a JWT with the service-account key, swap it for a token.
// ---------------------------------------------------------------------------
let tokenCache = { token: null, expires: 0 };

async function getAccessToken() {
    if (tokenCache.token && Date.now() < tokenCache.expires - 60_000) return tokenCache.token;

    const key = JSON.parse(fs.readFileSync(KEY_FILE, 'utf8'));
    const now = Math.floor(Date.now() / 1000);
    const b64 = obj => Buffer.from(JSON.stringify(obj)).toString('base64url');
    const unsigned = b64({ alg: 'RS256', typ: 'JWT' }) + '.' + b64({
        iss: key.client_email,
        scope: 'https://www.googleapis.com/auth/analytics.readonly',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600
    });
    const signature = crypto.sign('RSA-SHA256', Buffer.from(unsigned), key.private_key).toString('base64url');

    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: `${unsigned}.${signature}`
        })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`Google sign-in failed: ${json.error_description || json.error}`);

    tokenCache = { token: json.access_token, expires: Date.now() + json.expires_in * 1000 };
    return tokenCache.token;
}

async function ga(method, body) {
    const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY_ID}:${method}`, {
        method: 'POST',
        headers: { authorization: `Bearer ${await getAccessToken()}`, 'content-type': 'application/json' },
        body: JSON.stringify(body)
    });
    const json = await res.json();
    if (!res.ok) {
        const msg = json.error?.message || res.statusText;
        const err = new Error(msg);
        if (res.status === 403) err.hint = 'Add the service account email as a Viewer in GA → Admin → Property access management.';
        throw err;
    }
    return (json.rows || []).map(r => ({
        dims: (r.dimensionValues || []).map(v => v.value),
        mets: (r.metricValues || []).map(v => Number(v.value))
    }));
}

// ---------------------------------------------------------------------------
// Live (last 30 minutes)
// ---------------------------------------------------------------------------
function classifyTitle(title) {
    if (title === catalog.homeTitle) return { site: 'toolshub', kind: 'home' };
    const tool = catalog.byTitle.get(title);
    if (tool) return { site: 'toolshub', kind: 'tool', tool };
    if (/tools hub/i.test(title)) return { site: 'toolshub', kind: 'other' };
    return { site: 'orbix', kind: 'page' };
}

async function fetchLive() {
    const [total, trend, screens, events] = await Promise.all([
        ga('runRealtimeReport', { metrics: [{ name: 'activeUsers' }] }),
        ga('runRealtimeReport', { dimensions: [{ name: 'minutesAgo' }], metrics: [{ name: 'activeUsers' }], limit: 30 }),
        ga('runRealtimeReport', { dimensions: [{ name: 'unifiedScreenName' }], metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }], limit: 250 }),
        ga('runRealtimeReport', { dimensions: [{ name: 'eventName' }], metrics: [{ name: 'eventCount' }], limit: 50 })
    ]);

    const perMinute = Array(30).fill(0);
    for (const r of trend) {
        const ago = Number(r.dims[0]);
        if (ago >= 0 && ago < 30) perMinute[ago] = r.mets[0];
    }

    return {
        totalUsers: total[0]?.mets[0] || 0,
        perMinute: perMinute.reverse(), // oldest → newest
        screens: screens.map(r => ({ title: r.dims[0], users: r.mets[0], views: r.mets[1] })),
        toolClicks: events.find(r => r.dims[0] === 'tool_click')?.mets[0] || 0
    };
}

function shapeLive(raw) {
    const toolshub = { users: 0, homeUsers: 0, tools: {} };
    const orbix = { users: 0, pages: [] };

    for (const s of raw.screens) {
        const c = classifyTitle(s.title);
        if (c.site === 'toolshub') {
            toolshub.users += s.users;
            if (c.kind === 'home') toolshub.homeUsers += s.users;
            if (c.kind === 'tool') toolshub.tools[c.tool.file] = { users: s.users, views: s.views };
        } else {
            orbix.users += s.users;
            orbix.pages.push({ name: s.title || '(not set)', users: s.users, views: s.views });
        }
    }
    orbix.pages.sort((a, b) => b.users - a.users);

    return { totalUsers: raw.totalUsers, perMinute: raw.perMinute, toolClicks: raw.toolClicks, toolshub, orbix };
}

// ---------------------------------------------------------------------------
// Period reports (today / 7 days / 28 days)
// ---------------------------------------------------------------------------
const RANGES = {
    today: { startDate: 'today', endDate: 'today' },
    '7d': { startDate: '6daysAgo', endDate: 'today' },
    '28d': { startDate: '27daysAgo', endDate: 'today' }
};

async function fetchPeriod(range) {
    const dateRanges = [RANGES[range]];
    const [bySite, byPage, clicks, clicksByTool] = await Promise.all([
        ga('runReport', { dateRanges, dimensions: [{ name: 'hostName' }], metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }] }),
        ga('runReport', { dateRanges, dimensions: [{ name: 'hostName' }, { name: 'pagePath' }], metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }], limit: 1000 }),
        ga('runReport', {
            dateRanges, metrics: [{ name: 'eventCount' }],
            dimensionFilter: { filter: { fieldName: 'eventName', stringFilter: { value: 'tool_click' } } }
        }),
        // Needs the "tool_name" custom dimension registered in GA (see README).
        ga('runReport', {
            dateRanges, dimensions: [{ name: 'customEvent:tool_name' }], metrics: [{ name: 'eventCount' }],
            dimensionFilter: { filter: { fieldName: 'eventName', stringFilter: { value: 'tool_click' } } }, limit: 200
        }).catch(() => null)
    ]);
    return { bySite, byPage, clicks, clicksByTool };
}

function shapePeriod(raw, range) {
    const toolshub = { users: 0, views: 0, homeViews: 0, homeUsers: 0, tools: {} };
    const orbix = { users: 0, views: 0, pages: [] };

    for (const r of raw.bySite) {
        const [host] = r.dims;
        if (host === TOOLS_HOST) { toolshub.users += r.mets[0]; toolshub.views += r.mets[1]; }
        else if (ORBIX_HOSTS.has(host)) { orbix.users += r.mets[0]; orbix.views += r.mets[1]; }
    }

    for (const r of raw.byPage) {
        const [host, pagePath] = r.dims;
        const [views, users] = r.mets;
        if (host === TOOLS_HOST) {
            const clean = pagePath.split('?')[0];
            if (clean === '/' || clean === '/index.html') {
                toolshub.homeViews += views; toolshub.homeUsers += users;
            } else if (clean.startsWith('/tools/')) {
                const file = clean.slice('/tools/'.length);
                const t = toolshub.tools[file] || (toolshub.tools[file] = { views: 0, users: 0 });
                t.views += views; t.users += users;
            }
        } else if (ORBIX_HOSTS.has(host)) {
            orbix.pages.push({ name: pagePath, views, users });
        }
    }
    orbix.pages.sort((a, b) => b.views - a.views);

    const clicksByTool = raw.clicksByTool
        ? Object.fromEntries(raw.clicksByTool.filter(r => r.dims[0] && r.dims[0] !== '(not set)').map(r => [r.dims[0], r.mets[0]]))
        : null;

    return {
        range,
        toolshub,
        orbix,
        toolClicks: { total: raw.clicks[0]?.mets[0] || 0, byTool: clicksByTool }
    };
}

// ---------------------------------------------------------------------------
// Demo data — lets you preview the dashboard before connecting Google.
// ---------------------------------------------------------------------------
function demoLive() {
    const rnd = n => Math.floor(Math.random() * n);
    const t = Date.now() / 60000;
    const perMinute = Array.from({ length: 30 }, (_, i) => Math.max(0, Math.round(9 + 5 * Math.sin((t - 29 + i) / 4) + rnd(4))));
    const tools = {};
    for (const tool of catalog.tools) {
        const u = Math.random() < 0.45 ? 0 : rnd(6);
        if (u) tools[tool.file] = { users: u, views: u + rnd(4) };
    }
    const toolUsers = Object.values(tools).reduce((a, b) => a + b.users, 0);
    const homeUsers = 3 + rnd(6);
    const orbixPages = [
        { name: 'Orbix Studio — Free Online Tools That Run in Your Browser', users: 4 + rnd(6), views: 8 + rnd(8) },
        { name: 'About — Orbix Studio', users: rnd(3), views: rnd(5) },
        { name: 'Contact — Orbix Studio', users: rnd(2), views: rnd(3) }
    ].filter(p => p.users);
    const orbixUsers = orbixPages.reduce((a, b) => a + b.users, 0);
    return {
        totalUsers: perMinute[29] + toolUsers + homeUsers,
        perMinute,
        toolClicks: 10 + rnd(20),
        toolshub: { users: toolUsers + homeUsers, homeUsers, tools },
        orbix: { users: orbixUsers, pages: orbixPages }
    };
}

function demoPeriod(range) {
    const scale = { today: 1, '7d': 6.2, '28d': 24 }[range];
    const rnd = n => Math.floor(Math.random() * n);
    const tools = {};
    const clicks = {};
    catalog.tools.forEach((tool, i) => {
        const base = Math.max(1, Math.round((60 / (1 + i * 0.35)) * scale * (0.6 + Math.random() * 0.8)));
        tools[tool.file] = { views: base, users: Math.round(base * 0.7) };
        clicks[tool.tiles[0]] = Math.round(base * 0.55);
    });
    const toolViews = Object.values(tools).reduce((a, b) => a + b.views, 0);
    const homeViews = Math.round(420 * scale);
    return {
        range,
        toolshub: { users: Math.round((homeViews + toolViews) * 0.42), views: homeViews + toolViews, homeViews, homeUsers: Math.round(homeViews * 0.8), tools },
        orbix: {
            users: Math.round(310 * scale), views: Math.round(520 * scale),
            pages: [
                { name: '/', views: Math.round(380 * scale), users: Math.round(260 * scale) },
                { name: '/about', views: Math.round(90 * scale), users: Math.round(70 * scale) },
                { name: '/contact', views: Math.round(50 * scale) + rnd(10), users: Math.round(40 * scale) }
            ]
        },
        toolClicks: { total: Object.values(clicks).reduce((a, b) => a + b, 0), byTool: clicks }
    };
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------
const cache = new Map();

async function cached(key, ttl, load) {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < ttl) return hit.value;
    const value = await load();
    cache.set(key, { at: Date.now(), value });
    return value;
}

function setupProblem() {
    if (DEMO) return null;
    if (!fs.existsSync(KEY_FILE)) {
        return `No Google key found at ${path.relative(process.cwd(), KEY_FILE) || KEY_FILE}. Follow the setup steps in analytics-dashboard/README.md, or run "npm run demo" to preview with fake data.`;
    }
    return null;
}

function sendJson(res, status, body) {
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    res.end(JSON.stringify(body));
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    try {
        if (url.pathname === '/' || url.pathname === '/index.html') {
            res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
            return fs.createReadStream(path.join(__dirname, 'public', 'index.html')).pipe(res);
        }

        if (url.pathname.startsWith('/api/')) {
            const problem = setupProblem();
            if (problem) return sendJson(res, 503, { error: 'setup', message: problem });

            if (url.pathname === '/api/catalog') {
                catalog = loadCatalog();
                return sendJson(res, 200, {
                    demo: DEMO,
                    propertyId: PROPERTY_ID,
                    tools: catalog.tools.map(({ file, name, tiles, category }) => ({ file, name, tiles, category }))
                });
            }

            if (url.pathname === '/api/live') {
                const data = await cached('live', LIVE_CACHE_MS, async () => DEMO ? demoLive() : shapeLive(await fetchLive()));
                return sendJson(res, 200, { ...data, demo: DEMO, generatedAt: new Date().toISOString() });
            }

            if (url.pathname === '/api/period') {
                const range = RANGES[url.searchParams.get('range')] ? url.searchParams.get('range') : 'today';
                const data = await cached(`period:${range}`, PERIOD_CACHE_MS, async () => DEMO ? demoPeriod(range) : shapePeriod(await fetchPeriod(range), range));
                return sendJson(res, 200, { ...data, demo: DEMO, generatedAt: new Date().toISOString() });
            }
        }

        res.writeHead(404, { 'content-type': 'text/plain' });
        res.end('Not found');
    } catch (err) {
        console.error(err);
        sendJson(res, 502, { error: 'google', message: err.message, hint: err.hint });
    }
});

// Bound to localhost only: your analytics stay on this machine.
server.listen(PORT, '127.0.0.1', () => {
    console.log(`\n  Orbix Analytics ${DEMO ? '(DEMO DATA) ' : ''}→ http://localhost:${PORT}\n`);
    console.log(`  Property ${PROPERTY_ID} · ${catalog.tools.length} tools loaded from deploy/\n`);
});
