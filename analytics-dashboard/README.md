# Orbix Analytics

A private, live dashboard for your Google Analytics property **Orbix Studio Root (553987762)**. It shows:

- **Live now**: people on the site in the last 30 minutes, split into the Tools Hub homepage, each tool, and Orbix Studio.
- **Today / 7 days / 28 days**: page views and users for every tool, the Tools Hub homepage, and each Orbix Studio page.
- **Tile clicks**: which tools people click on the Tools Hub homepage.

It runs only on your Mac (`localhost`), so your stats stay private. There are no packages to install; you just need **Node 18 or newer**.

---

## Preview it now (fake data)

```bash
cd analytics-dashboard
npm run demo
```

Open **http://localhost:4321**.

---

## Connect your real Google Analytics (one-time, ~5 minutes)

Google only lets a server read Analytics data with a private key, so you create a read-only "service account" for this app.

1. **Create a Google Cloud project**
   Go to <https://console.cloud.google.com/projectcreate>, name it `orbix-analytics`, and click **Create**.

2. **Turn on the Analytics Data API**
   Open <https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com>, make sure your new project is selected at the top, and click **Enable**.

3. **Create a service account and key**
   - Go to <https://console.cloud.google.com/iam-admin/serviceaccounts> → **Create service account**.
   - Name it `dashboard`, click **Create and continue**, then **Done**. It doesn't need any Cloud roles.
   - Click the new account → **Keys** tab → **Add key → Create new key → JSON**.
   - A `.json` file downloads. Rename it to **`service-account.json`** and move it into this `analytics-dashboard/` folder. It's already in `.gitignore`; never share or commit it.

4. **Give it read access to Analytics**
   - Copy the service account's email. It looks like `dashboard@orbix-analytics.iam.gserviceaccount.com`.
   - In Google Analytics, go to **Admin → Property access management → + → Add users**.
   - Paste the email, choose the **Viewer** role, uncheck "Notify", and click **Add**.

5. **Run it**
   ```bash
   cd analytics-dashboard
   npm start
   ```
   Open **http://localhost:4321**.

### Optional: see clicks per tool

The homepage sends a `tool_click` event with the tool's name. To break clicks down by tool, register that name once:

**GA → Admin → Custom definitions → Create custom dimension**
- Dimension name: `Tool name`
- Scope: **Event**
- Event parameter: `tool_name`

Clicks per tool start appearing within about 24 hours. Until then, the dashboard shows the total click count, and tool **opens** (page views) work immediately.

---

## How it tells the sites apart

| Report | Tools Hub | Orbix Studio |
|---|---|---|
| Live (last 30 min) | Page title matches the Tools Hub homepage or a tool page | Any other page title |
| Today / 7d / 28d | Hostname `toolshub.orbixstudio.dev` | Hostname `orbixstudio.dev` |

Google's live API doesn't provide hostnames, so live numbers match on page titles. The tool list and titles are read from `../deploy/` each time the dashboard loads, so new tools show up automatically.

**Live "per page" counts:** someone who opens two pages within 30 minutes counts on both, so the per-site live numbers can add up to slightly more than the overall total.

## Settings

| Environment variable | Default | Meaning |
|---|---|---|
| `PORT` | `4321` | Local port |
| `GA_PROPERTY_ID` | `553987762` | GA4 property to read |
| `GA_KEY_FILE` | `./service-account.json` | Path to the key |
| `DEMO` | unset | `1` = fake data |

Live data refreshes every 15 seconds and reports every 60 seconds, well within Google's free API limits.
