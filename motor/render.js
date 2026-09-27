// Uso:
//   node motor/render.js projetos/NOME            -> PRÉVIA: gera projetos/NOME/previa/contato.jpg (quadros-chave numa imagem só)
//   node motor/render.js projetos/NOME --final    -> VÍDEO FINAL: gera projetos/NOME/saida/NOME-vN.mp4 com trilha
//   node motor/render.js projetos/NOME --tempos 1.5,6,12   -> prévia só desses tempos
//   Opções: --sem-trilha   --trilha arquivo.mp3 (usa música própria)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const http = require('http');

const RAIZ = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const proj = (args.find(a => !a.startsWith('--')) || '').replace(/\/$/, '');
if (!proj || !fs.existsSync(path.join(RAIZ, proj, 'projeto.json')) && !fs.existsSync(path.join(RAIZ, proj, 'cena.html'))) {
  console.error('Informe a pasta do projeto, ex: node motor/render.js projetos/meu-cliente'); process.exit(1);
}
const opt = n => { const i = args.indexOf(n); return i >= 0 ? (args[i + 1] || true) : null; };
const FINAL = args.includes('--final');
const nome = path.basename(proj);
const dirP = path.join(RAIZ, proj);

const TIPOS = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.html': 'text/html', '.json': 'application/json', '.ttf': 'font/ttf', '.js': 'text/javascript' };
const servidor = () => new Promise(r => { const s = http.createServer((q, res) => {
  const f = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]));
  if (!f.startsWith(RAIZ)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': TIPOS[path.extname(f).toLowerCase()] || 'application/octet-stream' }); res.end(d); });
}).listen(0, () => r(s)); });

(async () => {
  try { execSync('ffmpeg -version', { stdio: 'ignore' }); } catch { console.error('FFmpeg não encontrado. Instale em ffmpeg.org'); process.exit(1); }
  const srv = await servidor(); const porta = srv.address().port;
  const nav = await chromium.launch(); const pg = await nav.newPage({ viewport: { width: 1080, height: 1920 } });
  const erros = []; pg.on('pageerror', e => erros.push(e.message)); pg.on('console', m => { if (m.type() === 'error') erros.push(m.text()); });
  const custom = fs.existsSync(path.join(dirP, 'cena.html'));
  await pg.goto(custom ? `http://localhost:${porta}/${proj}/cena.html` : `http://localhost:${porta}/motor/modelo.html?p=${encodeURIComponent(proj)}`);
  const info = await pg.evaluate(() => window.ready);
  if (erros.length) { console.error('ERROS NA PÁGINA:\n' + erros.join('\n')); }
  const DUR = info.duracao;

  // extrai quadros dos vídeos (uma vez, fica em cache)
  const quadros = {};
  for (const v of info.videos || []) {
    const src = path.join(dirP, v); const cache = path.join(dirP, '.cache', v.replace(/[^\w.-]/g, '_'));
    if (!fs.existsSync(cache) || !fs.readdirSync(cache).length) {
      fs.mkdirSync(cache, { recursive: true });
      console.log(`Extraindo quadros de ${v}...`);
      execSync(`ffmpeg -loglevel error -y -i "${src}" -vf "scale=1080:-2:flags=lanczos,unsharp=5:5:0.6" -r 30 -q:v 3 "${cache}/%04d.jpg"`);
    }
    quadros[v] = { pasta: path.relative(RAIZ, cache).split(path.sep).join('/'), n: fs.readdirSync(cache).length };
  }
  await pg.evaluate(q => { window.QUADROS = q; }, quadros);
  const render = t => pg.evaluate(async t => { await window.render(t); }, t);

  if (!FINAL) {
    // tempos: meio de cada cena + um momento de transição
    let tempos = opt('--tempos') ? String(opt('--tempos')).split(',').map(Number) : null;
    if (!tempos) { const c = [0, ...info.cortes, DUR]; tempos = [];
      for (let i = 0; i < c.length - 1; i++) tempos.push(+(c[i] + Math.min(1.6, (c[i + 1] - c[i]) * .7)).toFixed(2));
      if (info.cortes[0]) tempos.push(+(info.cortes[0] + .25).toFixed(2)); }
    const dir = path.join(dirP, 'previa'); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
    for (const [i, t] of tempos.entries()) {
      await render(t);
      await pg.evaluate(t => { let e = document.getElementById('__rot'); if (!e) { e = document.createElement('div'); e.id = '__rot';
        e.style.cssText = 'position:absolute;left:20px;top:20px;z-index:99;background:#e11;color:#fff;font:600 44px sans-serif;padding:6px 16px;border-radius:10px'; document.getElementById('stage').appendChild(e); }
        e.textContent = t.toFixed(2) + 's'; }, t);
      await pg.screenshot({ path: path.join(dir, `q${String(i).padStart(2, '0')}.jpg`), type: 'jpeg', quality: 80 });
      await pg.evaluate(() => document.getElementById('__rot')?.remove());
    }
    const col = Math.min(6, tempos.length), lin = Math.ceil(tempos.length / col);
    execSync(`ffmpeg -loglevel error -y -i "${dir}/q%02d.jpg" -vf "scale=300:-1,tile=${col}x${lin}:padding=6:color=white" -frames:v 1 "${dir}/contato.jpg"`);
    console.log(`PRÉVIA: ${path.relative(RAIZ, dir)}/contato.jpg  (${tempos.length} quadros: ${tempos.join('s, ')}s)  | duração ${DUR.toFixed(1)}s`);
  } else {
    const tmp = path.join(dirP, '.cache', 'quadros-final'); fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp, { recursive: true });
    const N = Math.round(DUR * 30); const t0 = Date.now();
    for (let f = 0; f < N; f++) { await render(f / 30); await pg.screenshot({ path: `${tmp}/f${String(f).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 94 });
      if (f % 60 === 0) process.stdout.write(`\rRenderizando ${f}/${N}`); }
    console.log(`\rRenderizado ${N} quadros em ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    const saida = path.join(dirP, 'saida'); fs.mkdirSync(saida, { recursive: true });
    let v = 1; while (fs.existsSync(path.join(saida, `${nome}-v${v}.mp4`))) v++;
    const arq = path.join(saida, `${nome}-v${v}.mp4`);
    let audio = '';
    if (opt('--trilha')) audio = `-i "${path.resolve(String(opt('--trilha')))}"`;
    else if (!args.includes('--sem-trilha')) { const w = path.join(dirP, '.cache', 'trilha.wav'); require('./trilha.js')(DUR, info.cortes, Math.max(0, DUR - 2.5), w); audio = `-i "${w}"`; }
    execSync(`ffmpeg -loglevel error -y -framerate 30 -i "${tmp}/f%04d.jpg" ${audio} -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -movflags +faststart ${audio ? `-c:a aac -b:a 192k -af "afade=t=out:st=${Math.max(0, DUR - 1)}:d=1,loudnorm=I=-16:TP=-1.5" -shortest` : ''} "${arq}"`);
    fs.rmSync(tmp, { recursive: true, force: true });
    console.log(`VÍDEO FINAL: ${path.relative(RAIZ, arq)}  (${DUR.toFixed(1)}s)`);
  }
  await nav.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
