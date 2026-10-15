// The Myles Survey: serves the survey page and stores everyone's answers.
// Storage: Postgres when DATABASE_URL is set (recommended on Railway),
// otherwise a JSON file in DATA_DIR (mount a Railway volume at /data to keep it).
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const RESULTS_KEY = process.env.RESULTS_KEY || 'changeme';
const PUBLIC = path.join(__dirname, 'docs');
const DATA_DIR = process.env.DATA_DIR || (fs.existsSync('/data') ? '/data' : path.join(__dirname, 'data'));
const FILE = path.join(DATA_DIR, 'responses.json');

let pool = null;
async function initStore() {
  if (process.env.DATABASE_URL) {
    const { Pool } = require('pg');
    pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.PGSSL === 'off' ? false : { rejectUnauthorized: false } });
    await pool.query('CREATE TABLE IF NOT EXISTS responses (id SERIAL PRIMARY KEY, data JSONB NOT NULL, created_at TIMESTAMPTZ DEFAULT now())');
    console.log('Storing responses in Postgres');
  } else {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, '[]');
    console.log('Storing responses in', FILE);
  }
}
async function save(row) {
  if (pool) return pool.query('INSERT INTO responses (data) VALUES ($1)', [row]);
  const all = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  all.push(row);
  fs.writeFileSync(FILE, JSON.stringify(all, null, 2));
}
async function list() {
  if (pool) return (await pool.query('SELECT data FROM responses ORDER BY created_at DESC')).rows.map(r => r.data);
  return JSON.parse(fs.readFileSync(FILE, 'utf8')).reverse();
}

const YN = v => (v === 'Yes' || v === 'No' ? v : null);
const ONE_OF = list => v => (list.includes(v) ? v : null);
const LONG = ONE_OF(['1 month','3 months','6 months','1 year','2 years','5 years','10 years','Forever','∞ INFINITY ∞']);
const SAT = ONE_OF(['Unsatisfied','Satisfied','Very satisfied']);
const BF = ONE_OF(['Very unsatisfied','Standard','Very satisfied']);
const LIKELVL = ONE_OF(['Not much','Sub par','Decent','A lot','Tons','Most ever']);
const VIOL = ONE_OF(['Never','Sometimes','Decent amount','Always']);
function clean(b) {
  const like = Math.round(Number(b.like));
  const kisses = Math.round(Number(b.kisses));
  const sweetness = Math.round(Number(b.sweetness));
  if (!(sweetness >= 1 && sweetness <= 10)) return null;
  if (!(like >= 1 && like <= 100) || !(kisses >= 0 && kisses <= 9999)) return null;
  const row = { like, likeLevel: LIKELVL(b.likeLevel), sweetness, moreDates: YN(b.moreDates), singing: YN(b.singing), disturbing: YN(b.disturbing), backrooms: YN(b.backrooms), heartopia: YN(b.heartopia), howLong: LONG(b.howLong), hair: SAT(b.hair), boyfriend: BF(b.boyfriend), nuts: SAT(b.nuts), violence: VIOL(b.violence), adore: ONE_OF(['Yes','.. ok'])(b.adore), kisses };
  if (Object.values(row).some(v => v === null)) return null;
  row.why = String(b.why || '').slice(0, 1000);
  row.sweetest = String(b.sweetest || '').slice(0, 1000);
  row.at = new Date().toISOString();
  return row;
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.css': 'text/css', '.js': 'text/javascript' };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function resultsPage(rows) {
  const card = r => `<div class="r"><p class="when">${esc(new Date(r.at).toLocaleString('en-US', { timeZone: 'America/Phoenix' }))}</p>
    <div><span>How much she likes Myles</span><b>${esc(r.like)} / 100</b></div>
    <div><span>How much she likes him</span><b>${esc(r.likeLevel)}</b></div>
    <div><span>Sweetness</span><b>${esc(r.sweetness)} / 10</b></div>
    <div><span>More dates?</span><b>${esc(r.moreDates)}</b></div>
    <div><span>Is his singing annoying?</span><b>${esc(r.singing)}</b></div>
    <div><span>Thinks he's disturbing?</span><b>${esc(r.disturbing)}</b></div>
    <div><span>Escape the Backrooms together?</span><b>${esc(r.backrooms)}</b></div>
    <div><span>Heartopia duo?</span><b>${esc(r.heartopia)}</b></div>
    <div><span>How long she wants to date him</span><b>${esc(r.howLong)}</b></div>
    <div><span>Playing with his hair</span><b>${esc(r.hair)}</b></div>
    <div><span>His boyfriend behavior</span><b>${esc(r.boyfriend)}</b></div>
    <div><span>These nuts</span><b>${esc(r.nuts)}</b></div>
    <div><span>Violence rate</span><b>${esc(r.violence)}</b></div>
    <div><span>Adores him?</span><b>${esc(r.adore)}</b></div>
    <div><span>Why she likes you</span><b>${esc(r.why || '—')}</b></div>
    <div><span>Sweetest thing you've done</span><b>${esc(r.sweetest || '—')}</b></div>
    <div><span>Kisses on sight</span><b>${esc(r.kisses)}</b></div></div>`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Myles Survey Results</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@800&family=Nunito:wght@600;800&display=swap">
<style>body{margin:0;background:#fff4f6;color:#3a1530;font-family:Nunito,system-ui,sans-serif}
main{max-width:560px;margin:0 auto;padding:40px 16px;display:flex;flex-direction:column;gap:16px}
h1{font-family:"Bricolage Grotesque",system-ui,sans-serif;font-size:40px;margin:0}h1 em{font-style:normal;color:#ff3d71}
.r{background:#fff;border:1.5px solid #f3d3dd;border-radius:20px;padding:16px 18px;display:flex;flex-direction:column;gap:8px}
.r div{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid #f3d3dd;padding-bottom:8px}.r div:last-child{border:none;padding:0}
span{color:#8a6478;font-weight:600}b{font-weight:800}.when{margin:0;color:#ff3d71;font-weight:800;font-size:13px}.muted{color:#8a6478}
@media (prefers-color-scheme:dark){body{background:#1c0f18;color:#ffe8ef}.r{background:#2a1724;border-color:#3f2335}.r div{border-color:#3f2335}span,.muted{color:#c79bb0}}</style></head>
<body><main><h1><em>Myles</em> Survey Results</h1><p class="muted">${rows.length} response${rows.length === 1 ? '' : 's'}</p>
${rows.length ? rows.map(card).join('') : '<p class="muted">No answers yet. Send her the link!</p>'}</main></body></html>`;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    if (req.method === 'POST' && url.pathname === '/api/responses') {
      let body = '';
      for await (const chunk of req) { body += chunk; if (body.length > 10000) return res.writeHead(413).end(); }
      const row = clean(JSON.parse(body || '{}'));
      if (!row) return res.writeHead(400, { 'Content-Type': 'application/json' }).end('{"error":"invalid"}');
      await save(row);
      return res.writeHead(201, { 'Content-Type': 'application/json' }).end('{"ok":true}');
    }
    if (url.pathname === '/results') {
      const k = url.searchParams.get('key') || '';
      const ok = k.length === RESULTS_KEY.length && crypto.timingSafeEqual(Buffer.from(k), Buffer.from(RESULTS_KEY));
      if (!ok) return res.writeHead(401, { 'Content-Type': 'text/plain' }).end('Add ?key=YOUR_RESULTS_KEY to the URL.');
      return res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }).end(resultsPage(await list()));
    }
    if (url.pathname === '/health') return res.writeHead(200).end('ok');
    const rel = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname).replace(/^\/+/, '');
    const file = path.join(PUBLIC, rel);
    if (!file.startsWith(PUBLIC + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return res.writeHead(404).end('Not found');
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'public, max-age=300' });
    fs.createReadStream(file).pipe(res);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) res.writeHead(500).end('Server error');
  }
});

initStore().then(() => server.listen(PORT, () => console.log('Listening on', PORT)))
  .catch(e => { console.error('Storage failed to start:', e); process.exit(1); });
