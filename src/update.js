const path = require("path");
const fetch = require("node-fetch");
const fs = require("fs");

const ORG = "Janky-Development";
const API = `https://api.github.com/orgs/${ORG}`;
const RAW = "assets"; // relative: the README sits next to assets/
const THEME = "tokyonight";
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const getJSON = async (url) => {
    // A token lifts the 60 req/hour anonymous limit, which shared CI runners burn through fast.
    const headers = process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {};
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`${url} -> ${res.status}`);
    return res.json();
};

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Terminal window in the same style as assets/banner.svg. `rows` are raw SVG, y relative to the window.
const win = (x, w, h, title, rows) => `
  <g transform="translate(${x} 0)">
    <rect width="${w}" height="${h}" rx="12" fill="#1a1b27"/>
    <path d="M0 12a12 12 0 0 1 12-12h${w - 24}a12 12 0 0 1 12 12v24H0z" fill="#24283b"/>
    <circle cx="24" cy="18" r="6" fill="#f7768e"/><circle cx="46" cy="18" r="6" fill="#e0af68"/><circle cx="68" cy="18" r="6" fill="#9ece6a"/>
    <text x="${w / 2}" y="23" text-anchor="middle" font-size="13" fill="#565f89">${esc(title)}</text>${rows}
  </g>`;

const svg = (w, h, body) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" font-family="ui-monospace,SFMono-Regular,Menlo,Consolas,monospace" font-size="14">${body}\n</svg>\n`;

const kv = (pairs) =>
    pairs
        .map(([k, v], i) => `\n    <text x="24" y="${68 + i * 26}"><tspan fill="#7aa2f7">${esc(k.padEnd(10))}</tspan><tspan fill="#565f89">: </tspan><tspan fill="#c0caf5">${esc(v)}</tspan></text>`)
        .join("");

const writeAsset = (name, content) => fs.writeFileSync(path.join(__dirname, "..", "assets", name), content);

const ordinal = (n) => n + (n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th");

const main = async () => {
    const date = new Date();
    const dd = date.getDate();
    const mm = date.getMonth() + 1;
    const flair = mm === 12 ? "❄" : "✨";

    const [org, repos] = await Promise.all([getJSON(API), getJSON(`${API}/repos?type=public&per_page=100`)]);

    const earned = repos.reduce((n, r) => n + r.stargazers_count, 0);
    const counts = {};
    for (const r of repos) if (!r.fork && r.language) counts[r.language] = (counts[r.language] || 0) + 1;
    const langs = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const colors = ["#7aa2f7", "#bb9af7", "#9ece6a", "#e0af68", "#f7768e", "#7dcfff"];
    const max = langs[0] ? langs[0][1] : 1;
    const bars = langs
        .map(([name, n], i) => {
            const y = 68 + i * 26;
            return `\n    <text x="24" y="${y}" fill="#c0caf5">${esc(name)}</text><rect x="150" y="${y - 12}" width="${Math.round((n / max) * 520)}" height="14" rx="3" fill="${colors[i]}"/><text x="${150 + Math.round((n / max) * 520) + 10}" y="${y}" fill="#565f89">${n}</text>`;
        })
        .join("");
    const langSvg = svg(800, 68 + langs.length * 26 + 8, win(0, 800, 68 + langs.length * 26 + 8, "~/repos: languages", bars));

    fs.mkdirSync(path.join(__dirname, "..", "assets"), { recursive: true });

    // GitHub strips inline CSS, so the circle is an SVG clip with the logo embedded (SVGs in <img> can't load external images).
    const avatarRes = await fetch(`${org.avatar_url}${org.avatar_url.includes("?") ? "&" : "?"}s=280`);
    if (!avatarRes.ok) throw new Error(`avatar -> ${avatarRes.status}`);
    const avatarB64 = (await avatarRes.buffer()).toString("base64");
    writeAsset(
        "avatar.svg",
        `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="140" height="140" viewBox="0 0 140 140">
  <defs><clipPath id="c"><circle cx="70" cy="70" r="66"/></clipPath></defs>
  <image href="data:image/png;base64,${avatarB64}" xlink:href="data:image/png;base64,${avatarB64}" width="140" height="140" clip-path="url(#c)" preserveAspectRatio="xMidYMid slice"/>
  <circle cx="70" cy="70" r="66" fill="none" stroke="#f4c430" stroke-width="3"/>
</svg>
`,
    );
    writeAsset("langs.svg", langSvg);

    // Art and screenshots live on the Janky Dev site (Janky-Frontend/public), so they are linked, not copied.
    const SITE = "https://janky.fpp.wtf";
    const plugins = [
        {
            name: "FakePlayerPlugin 2.0",
            art: "fpp-2-0",
            blurb: "The rewrite nobody asked for but everybody needed. Same idea as Origin, planned this time instead of improvised. Better pathing, better performance, doesn't fall over if two fake players exist at once.",
            tags: ["npc", "testing", "paper", "purpur", "folia"],
            shots: [["pve-mob-farms", "PvE mob farms"], ["find-and-mine", "Find and mine"], ["bot-rental", "Bot rental"]],
            links: [["Modrinth", "https://modrinth.com/plugin/fake-player-plugin-fpp", "modrinth", "1bd96a"], ["Site", `${SITE}/plugins/fakeplayerplugin-2-0`, "googlechrome", "7aa2f7"]],
            repo: "Fake-Player-plugin-2.0",
        },
        {
            name: "FakePlayerPlugin Origin",
            art: "fpp-origin",
            blurb: "The original fake-player spawner. Built in a weekend, held together by hope and a few try/catch blocks we're not proud of. Still running because nobody wants to be the one who breaks it.",
            tags: ["npc", "testing", "pvp", "pathfinding"],
            shots: [["pathfinding-walk-doors-parkour", "Pathfinding"], ["group-pvp", "Group PvP"], ["difficulty-tiers", "Difficulty tiers"]],
            links: [["Site", `${SITE}/plugins/fakeplayerplugin-origin`, "googlechrome", "7aa2f7"]],
        },
        {
            name: "Scripted SMP Core",
            art: "ssmp-core",
            blurb: "The plugin nobody sees but everything depends on. The backbone of our SMP server: teams, nicknames, proximity chat, death tracking, recording mode and admin tools in one place.",
            tags: ["core", "smp", "utility"],
            shots: [["teams-glow", "Teams"], ["proximity-chat", "Proximity chat"], ["recording-mode", "Recording mode"]],
            links: [["BuiltByBit", "https://builtbybit.com/resources/scripted-smp-core.112306/", "googlechrome", "e0af68"], ["Site", `${SITE}/plugins/scripted-smp-core`, "googlechrome", "7aa2f7"]],
            repo: "Scripted-SMP-Core-Public",
        },
    ];
    const badge = (label, color, logo) =>
        `<img src="https://img.shields.io/badge/-${encodeURIComponent(label).replace(/-/g, "--")}-1a1b27?style=for-the-badge${logo ? `&logo=${logo}&logoColor=${color}` : ""}" alt="${label}" />`;
    const cell = (pl) => {
        const links = pl.links.map(([label, url, logo, color]) => `<a href="${url}">${badge(label, color, logo)}</a>`).join(" ");
        return `<td width="33%" valign="top">
<a href="${pl.links[pl.links.length - 1][1]}"><img src="${SITE}/assets/plugins/${pl.art}-icon-512.png" alt="" width="72" align="left" /></a>
<h3>${pl.name}</h3>
<p>${pl.blurb}</p>
<p>${pl.tags.map((t) => `<code>${t}</code>`).join(" ")}</p>
<img src="${SITE}/media/${pl.art}/${pl.shots[0][0]}.webp" alt="${pl.shots[0][1]}" width="100%" />
<p>${links}</p>
</td>`;
    };

    const ago = (iso) => {
        const d = Math.max(0, Math.floor((Date.now() - new Date(iso)) / 864e5));
        return d === 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`;
    };
    const recent = repos
        .filter((r) => !r.fork)
        .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at))
        .slice(0, 5)
        .map((r) => `| [${r.name}](${r.html_url}) | ${r.language || "-"} | ⭐ ${r.stargazers_count} | ${ago(r.pushed_at)} |`)
        .join("\n");

    const text = `<div align="center">

<img src="${RAW}/banner.svg" alt="Janky Development" width="100%" />

**we build plugins. they mostly work.** ${flair}

<a href="https://janky.fpp.wtf"><img src="https://img.shields.io/badge/-Website-1a1b27?style=for-the-badge&logo=googlechrome&logoColor=f4c430" alt="Website" /></a>
<a href="https://discord.gg/pzFQWA4TXq"><img src="https://img.shields.io/badge/-Discord-1a1b27?style=for-the-badge&logo=discord&logoColor=5865F2" alt="Discord" /></a>
<img src="https://img.shields.io/github/followers/${ORG}?style=for-the-badge&labelColor=1a1b27&color=7aa2f7" alt="Followers" />
<img src="https://img.shields.io/badge/stars%20earned-${earned}-e0af68?style=for-the-badge&labelColor=1a1b27" alt="Stars earned" />

</div>

<table><tr>
<td width="140" valign="middle"><img src="${RAW}/avatar.svg" alt="Janky Development" width="120" /></td>
<td valign="middle">

Janky Dev isn't a studio: no investors, no Jira board silently judging us. A small crew of coders (me, me, me and mostly me) building Minecraft plugins for a server we actually play on. If it's useful to you too, take it.

</td>
</tr></table>

## 🔌 Plugins

<table><tr>
${plugins.map(cell).join("\n")}
</tr></table>

## 🧭 How we operate

- **Build it for our own server first.** Everything here started as something we needed.
- **Ship once it stops crashing,** not once it's "done".
- **Write real documentation,** and get a logo that isn't Comic Sans (in progress).

## 🛠 Latest activity

| Repo | Language | Stars | Last push |
| ---- | -------- | ----- | --------- |
${recent}

## 📊 Languages

<img src="${RAW}/langs.svg" alt="top languages" width="100%" />

<div align="center">

<!-- Last updated on ${date.toString()} ;-;-->
<sub>last updated ${ordinal(dd)} ${MONTHS[date.getMonth()]} ${date.getFullYear()} using magic · <a href="https://github.com/${ORG}">@${ORG}</a></sub>

</div>
`;

    fs.writeFileSync(path.join(__dirname, "..", "README.md"), text);
};

main().catch((err) => {
    // Fail loudly and leave the existing README untouched.
    console.error(err);
    process.exit(1);
});
