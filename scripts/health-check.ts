// Read-only check of the live app on Firebase Hosting, run after every deploy and by the weekly check:
// the pages answer 200 (the app is a single page, so any path gives index.html), the security headers are sent,
// HTML is never cached stale while hashed assets are cached for a year, and /api reaches the Cloud Run API.
// SITE_URL (or the first argument) is the origin. Exit 1 on failure. Standard: reops/standards/workflows.md
const site = (process.env.SITE_URL ?? process.argv[2] ?? "").replace(/\/+$/, "");
if (!/^https?:\/\//.test(site)) {
  console.error("Set SITE_URL (or pass the origin as the first argument).");
  process.exit(1);
}

const failures: string[] = [];

async function check(name: string, fn: () => Promise<string | null>) {
  try {
    const problem = await fn();
    console.log(`${problem ? "FAIL" : "ok  "} ${name}${problem ? `: ${problem}` : ""}`);
    if (problem) failures.push(name);
  } catch (err) {
    console.log(`FAIL ${name}: ${(err as Error).message}`);
    failures.push(name);
  }
}

const get = (path: string) => fetch(`${site}${path}`, { signal: AbortSignal.timeout(20_000) });

let html = "";
await check("pages answer 200", async () => {
  for (const path of ["/", "/login", "/transactions", "/no-such-page"]) {
    const res = await get(path);
    if (res.status !== 200) return `${path} answered ${res.status}`;
    html = await res.text();
  }
  return html.includes('id="root"') ? null : "the app's HTML is missing";
});

await check("security headers", async () => {
  const res = await get("/");
  const missing = [
    "content-security-policy",
    "x-content-type-options",
    "referrer-policy",
    "x-frame-options",
    "permissions-policy",
    "strict-transport-security",
  ].filter((name) => !res.headers.get(name));
  return missing.length ? `missing ${missing.join(", ")}` : null;
});

await check("caching", async () => {
  const page = await get("/");
  if (!/no-cache/.test(page.headers.get("cache-control") ?? "")) return "HTML may be cached stale";
  const asset = /\/assets\/[^"]+\.js/.exec(html)?.[0];
  if (!asset) return "no hashed script in the HTML";
  const res = await get(asset);
  return /max-age=31536000/.test(res.headers.get("cache-control") ?? "")
    ? null
    : `${asset} is not cached for a year`;
});

await check("API through /api", async () => {
  const res = await get("/api/health");
  if (res.status !== 200) return `/api/health answered ${res.status}`;
  const body = (await res.json()) as { status?: string };
  return body.status === "ok" ? null : `status ${body.status}`;
});

await check("NBP rates through /api", async () => {
  const res = await get("/api/rates");
  return res.status === 200 ? null : `/api/rates answered ${res.status}`;
});

if (failures.length) process.exit(1);
