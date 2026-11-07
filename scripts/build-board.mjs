// Generates board.svg: a railway departure board of your most recently pushed public repos.
const USER = process.env.GH_USER || "theashleygirl";
const token = process.env.GITHUB_TOKEN;
const headers = { "User-Agent": "departure-board", Accept: "application/vnd.github+json", ...(token && { Authorization: `Bearer ${token}` }) };
const api = async (p) => { const r = await fetch(`https://api.github.com${p}`, { headers }); if (!r.ok) throw new Error(`${p}: ${r.status}`); return r.json(); };

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const clip = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

const [user, repos] = await Promise.all([
  api(`/users/${USER}`),
  api(`/users/${USER}/repos?sort=pushed&per_page=100&type=owner`),
]);
const rows = repos.filter((r) => !r.archived).slice(0, 6);
const days = (d) => (Date.now() - new Date(d)) / 864e5;
const status = (d) => (days(d) < 14 ? ["On time", "#4ade80"] : days(d) < 60 ? ["Delayed", "#fbbf24"] : ["Terminated", "#f87171"]);
const hhmm = (d) => new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });
const langs = [...new Set(rows.map((r) => r.language).filter(Boolean))];
const plat = (r) => (r.language ? langs.indexOf(r.language) + 1 : "-");
const years = Math.floor(days(user.created_at) / 365.25);

const W = 760, rowH = 40, top = 92, H = top + rows.length * rowH + 64;
const body = rows.map((r, i) => {
  const y = top + i * rowH, [st, col] = status(r.pushed_at);
  return `<g transform="translate(0 ${y})">
  <rect x="16" y="0" width="${W - 32}" height="${rowH - 4}" fill="#0b1220" opacity="${i % 2 ? 0.55 : 0.85}"/>
  <text x="32" y="25" class="amber">${hhmm(r.pushed_at)}</text>
  <text x="112" y="25" class="white">${esc(clip(r.name, 24).toUpperCase())}</text>
  <text x="440" y="25" class="dim">${esc(clip(r.language || "Mixed", 12))}</text>
  <text x="580" y="25" class="amber">${plat(r)}</text>
  <text x="${W - 32}" y="25" text-anchor="end" fill="${col}" class="status">${st.toUpperCase()}</text>
</g>`;
}).join("\n");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Departure board of recent repositories">
<style>
  text{font-family:'Courier New',monospace;font-size:17px;letter-spacing:1px}
  .amber{fill:#fbbf24}.white{fill:#e5e7eb}.dim{fill:#94a3b8}.status{font-size:14px;font-weight:bold}
  .hd{font-size:12px;fill:#64748b}.title{font-size:22px;font-weight:bold;fill:#fbbf24}
  @keyframes blink{50%{opacity:.25}}.blink{animation:blink 1.6s steps(1) infinite}
</style>
<rect width="${W}" height="${H}" rx="14" fill="#020617"/>
<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="13" fill="none" stroke="#1e293b" stroke-width="2"/>
<text x="32" y="38" class="title">DEPARTURES</text>
<text x="${W - 32}" y="38" text-anchor="end" class="amber">${hhmm(new Date())}<tspan class="blink"> ●</tspan></text>
<text x="32" y="74" class="hd">TIME</text><text x="112" y="74" class="hd">DESTINATION</text>
<text x="440" y="74" class="hd">LANGUAGE</text><text x="580" y="74" class="hd">PLAT</text>
<text x="${W - 32}" y="74" text-anchor="end" class="hd">STATUS</text>
${body}
<text x="32" y="${H - 22}" class="dim" style="font-size:13px">${esc(user.public_repos)} SERVICES RUNNING · ${esc(user.followers)} PASSENGERS · ${years} YEARS ON THE NETWORK</text>
</svg>`;
import { writeFileSync } from "node:fs";
writeFileSync("board.svg", svg);
console.log(`wrote board.svg (${rows.length} rows)`);
