/* Lingua Latina — shared UI, home page and unit page */
(function () {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  const ROMAN = n => { const m = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]; let r = ''; for (const [v, s] of [[30, 'XXX'], [20, 'XX'], ...m]) { while (n >= v) { r += s; n -= v; } } return r; };

  /* ---------------- language ---------------- */
  const browserLang = (navigator.language || 'en').slice(0, 2);
  let lang = store.get('lat_lang', null) || (T[browserLang] ? browserLang : 'en');
  const t = k => (T[lang] && T[lang][k]) ?? T.en[k] ?? k;
  const CL = () => (lang === 'ko' ? 'ko' : 'en');           // content language
  const tx = o => (o == null ? '' : typeof o === 'string' ? o : (o[CL()] ?? o.en ?? ''));
  const termKo = s => { if (CL() !== 'ko') return s; const k = String(s).trim().toLowerCase(); return TERM_KO[k] || s; };

  /* ---------------- top bar ---------------- */
  const LAUREL = `<svg class="laurel" viewBox="0 0 64 64"><circle cx="32" cy="32" r="29" fill="#7a2016" stroke="#e9d29a" stroke-width="3"/><circle cx="32" cy="32" r="23" fill="none" stroke="#e9d29a" stroke-width="1" stroke-dasharray="2 3"/><text x="32" y="42" text-anchor="middle" font-family="Cinzel,Georgia,serif" font-size="28" font-weight="700" fill="#e9d29a">L</text></svg>`;

  function buildTopbar(crumb) {
    const el = $('#topbar');
    el.innerHTML = `<div class="wrap">
      <a class="brand" href="index.html">${LAUREL}<span>LINGUA LATINA</span></a>
      <span class="crumbs">${crumb || ''}</span><span class="spacer"></span>
      <div class="dropdown"><button class="tb-btn" id="audioBtn" title="${t('audioSettings')}">🔊 <span class="lbl">${t('pron')}</span></button>
        <div class="menu audio-panel" id="audioMenu"></div></div>
      <div class="dropdown"><button class="tb-btn" id="langBtn">🌐 <span>${LANGS.find(l => l.code === lang).label}</span> ▾</button>
        <div class="menu" id="langMenu">${LANGS.map(l => `<button data-l="${l.code}" class="${l.code === lang ? 'on' : ''}">${l.label}</button>`).join('')}</div></div>
    </div>`;
    const lm = $('#langMenu'), am = $('#audioMenu');
    $('#langBtn').onclick = e => { e.stopPropagation(); am.classList.remove('open'); lm.classList.toggle('open'); };
    $('#audioBtn').onclick = e => { e.stopPropagation(); lm.classList.remove('open'); renderAudio(); am.classList.toggle('open'); };
    am.onclick = e => e.stopPropagation();
    document.addEventListener('click', () => { lm.classList.remove('open'); am.classList.remove('open'); });
    $$('#langMenu button').forEach(b => b.onclick = () => { lang = b.dataset.l; store.set('lat_lang', lang); document.documentElement.lang = lang; render(); });
  }
  function renderAudio() {
    const am = $('#audioMenu');
    if (!TTS.supported || !TTS.voices.length) { am.innerHTML = `<div class="note">${t('noVoice')}</div><div class="note">${t('voiceNote')}</div>`; return; }
    am.innerHTML = `<label>${t('pronStyle')}</label>
      <div class="seg"><button data-s="classical" class="${TTS.style === 'classical' ? 'on' : ''}">${t('classical')}</button><button data-s="ecclesiastical" class="${TTS.style === 'ecclesiastical' ? 'on' : ''}">${t('ecclesiastical')}</button></div>
      <label>${t('voice')}</label><select id="voiceSel">${TTS.voices.map(v => `<option ${TTS.voice && v.name === TTS.voice.name ? 'selected' : ''}>${esc(v.name)} (${v.lang})</option>`).join('')}</select>
      <label>${t('speed')} <b id="rateV">${TTS.rate.toFixed(2)}×</b></label><input type="range" id="rate" min="0.5" max="1.3" step="0.05" value="${TTS.rate}">
      <div class="wrow"><button class="btn btn-red btn-sm" id="testV">▶ Salvē! Ego discipulus sum.</button></div>
      <div class="note">${t('voiceNote')}</div>`;
    $$('.seg button', am).forEach(b => b.onclick = () => { TTS.setStyle(b.dataset.s); renderAudio(); });
    $('#voiceSel').onchange = e => TTS.setVoice(TTS.voices[e.target.selectedIndex].name);
    $('#rate').oninput = e => { TTS.setRate(parseFloat(e.target.value)); $('#rateV').textContent = TTS.rate.toFixed(2) + '×'; };
    $('#testV').onclick = () => TTS.speak('Salvē! Ego discipulus sum. Gallia est omnis dīvīsa in partēs trēs.');
  }
  function speakBtn(btn, text, slow) {
    $$('.spk.playing').forEach(b => b.classList.remove('playing'));
    btn && btn.classList.add('playing');
    TTS.speak(text, { slow, onend: () => btn && btn.classList.remove('playing') });
    setTimeout(() => btn && btn.classList.remove('playing'), Math.max(2500, String(text).length * 110 / TTS.rate));
  }
  function toast(msg) {
    let el = $('.toast'); if (!el) { el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); }
    el.textContent = msg; el.classList.add('show'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('show'), 2200);
  }
  /* Latin text → clickable word spans */
  const latinWords = s => esc(s).replace(/([A-Za-zĀāĒēĪīŌōŪūȲȳëäüÆæŒœ]+)/g, '<span class="w">$1</span>');
  function wireWords(root) { $$('.w', root).forEach(w => w.onclick = e => { e.stopPropagation(); TTS.speak(w.textContent, { slow: true }); }); }

  /* ---------------- progress ---------------- */
  const progKey = u => 'lat_prog_' + u;
  const getProg = u => store.get(progKey(u), {});
  function saveProg(u, p, total) {
    store.set(progKey(u), p);
    const vals = Object.values(p);
    const sum = store.get('lat_sum', {});
    sum[u] = { done: vals.length, total, pts: vals.reduce((a, b) => a + (b.s || 0), 0), last: Date.now() };
    store.set('lat_sum', sum);
  }

  /* deterministic shuffle */
  function seeded(str) { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000; }; }
  function order(n, seed) { const r = seeded(seed), a = [...Array(n).keys()]; for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; }

  /* answer checking */
  const norm = s => String(s || '').toLowerCase().normalize('NFKC').replace(/[’'`]/g, "'").replace(/[^\p{L}\p{N}' ]+/gu, ' ').replace(/\s+/g, ' ').trim();
  function scoreWrite(text, groups) {
    const n = ' ' + norm(text) + ' ';
    const res = groups.map(g => g.some(alt => n.includes(norm(alt))));
    const ratio = res.filter(Boolean).length / groups.length;
    return { res, ratio, s: ratio >= 0.75 ? 1 : ratio >= 0.45 ? 0.5 : 0 };
  }
  function checkFill(input, answers) {
    const a = norm(input); if (!a) return false;
    const strip = s => s.replace(/^(the|a|an|to) /, '').replace(/ (of)$/, '');
    return answers.some(c => {
      const parts = String(c).split(/[,;\/]| or /).map(norm).filter(Boolean);
      return parts.concat([norm(c)]).some(p => {
        if (!p) return false;
        if (a === p || strip(a) === strip(p)) return true;
        if (CL() === 'ko') return a.length >= 2 && (a.includes(p) || p.includes(a));
        return (' ' + a + ' ').includes(' ' + strip(p) + ' ') || (strip(a).length >= 4 && strip(p).startsWith(strip(a)));
      });
    });
  }

  /* =================================================================
     HOME PAGE
     ================================================================= */
  const PARTS = [[1, 9, 'part1'], [10, 16, 'part2'], [17, 23, 'part3'], [24, 31, 'part4']];
  function renderHome() {
    document.title = 'Lingua Latina — ' + t('siteSub');
    buildTopbar('');
    const idx = window.UNITS_INDEX || [];
    const sum = store.get('lat_sum', {});
    const started = idx.filter(u => sum[u.unit]);
    const completed = idx.filter(u => sum[u.unit] && sum[u.unit].done >= sum[u.unit].total);
    const pcts = started.map(u => sum[u.unit].pts / Math.max(1, sum[u.unit].done));
    const avg = pcts.length ? Math.round(100 * pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0;
    const totalItems = idx.reduce((a, u) => a + u.total, 0), doneItems = started.reduce((a, u) => a + sum[u.unit].done, 0);
    const lastU = Object.entries(sum).sort((a, b) => (b[1].last || 0) - (a[1].last || 0))[0];
    $('#app').innerHTML = `
    <section class="hero"><div class="wrap">
      <h1>LINGUA LATINA</h1>
      <div class="sub">${t('siteSub')}</div>
      <p>${t('heroText')}</p>
      <div class="hero-cta">
        <a class="btn btn-gold" href="unit.html?u=${lastU ? lastU[0] : 1}">${lastU ? t('continueU') + ' · ' + t('unit') + ' ' + lastU[0] : t('start')} →</a>
        <a class="btn btn-ghost" href="#pron">🔊 ${t('pronTitle')}</a>
      </div>
      <div class="motto">NON SCHOLAE SED VITAE DISCIMUS</div>
    </div></section>
    <div class="wrap">
      <div class="stats">
        <div class="stat"><div class="k">${t('overall')}</div><div class="v">${Math.round(100 * doneItems / Math.max(1, totalItems))}%</div><div class="bar"><i style="width:${100 * doneItems / Math.max(1, totalItems)}%"></i></div></div>
        <div class="stat"><div class="k">${t('units')} ${t('completed')}</div><div class="v">${completed.length} / ${idx.length}</div><div class="bar"><i style="width:${100 * completed.length / Math.max(1, idx.length)}%"></i></div></div>
        <div class="stat"><div class="k">${t('avgScore')}</div><div class="v">${avg}%</div><div class="bar"><i style="width:${avg}%"></i></div></div>
      </div>
      ${t('contentNote') ? `<div class="notice">ℹ️ ${t('contentNote')}</div>` : ''}
      <div class="toolbar"><input class="search" id="q" placeholder="🔍 ${t('search')}"></div>
      <div id="unitList"></div>
      <section class="pronbox" id="pron">
        <h2>🔊 ${t('pronTitle')}</h2><div class="instr">${t('pronText')}</div>
        <div class="chips">${[['Caesar', 'KAI-sar'], ['Cicerō', 'KI-ke-roh'], ['vēnī, vīdī, vīcī', 'WAY-nee'], ['puella', ''], ['magnus', 'mang-nus'], ['gēns', 'gayns'], ['aqua', ''], ['amīcitia', ''], ['Rōma', ''], ['caelum', 'KAI-lum'], ['poena', 'POY-na'], ['philosophia', ''], ['Gallia est omnis dīvīsa in partēs trēs', ''], ['carpe diem', ''], ['ālea iacta est', ''], ['sum, es, est, sumus, estis, sunt', '']]
          .map(([w, h]) => `<button class="chip" data-t="${esc(w)}">${esc(w)}${h ? `<small>${h}</small>` : ''}</button>`).join('')}</div>
      </section>
    </div>
    <footer class="footer"><div class="wrap">Lingua Latina · 31 ${t('lessons')} · Based on the course book <i>Complete Latin</i> (G. Betts, Teach Yourself) · KCIS Latin class · 다인원격평생교육직업학원</div></footer>`;
    const list = () => {
      const q = norm($('#q').value);
      $('#unitList').innerHTML = PARTS.map(([a, b, key]) => {
        const us = idx.filter(u => u.unit >= a && u.unit <= b).filter(u => !q || norm([u.unit, tx(u.title), u.title.en, u.title.ko, ...u.topics.map(x => x.en + ' ' + x.ko)].join(' ')).includes(q));
        if (!us.length) return '';
        return `<div class="part"><h2>${t(key)}</h2></div><div class="grid">${us.map(u => {
          const s = sum[u.unit], pct = s ? Math.round(100 * s.done / u.total) : 0, sc = s && s.done ? Math.round(100 * s.pts / s.done) : null;
          return `<a class="ucard" href="unit.html?u=${u.unit}"><span class="roman">${ROMAN(u.unit)}</span>
            <span class="num">${t('unit').toUpperCase()} ${u.unit}</span><h3>${esc(tx(u.title))}</h3>
            <div class="topics">${u.topics.map(x => esc(tx(x))).join(' · ')}</div>
            <div class="meta"><span>✎ ${u.ex} · ? ${u.quiz}</span><div class="bar"><i style="width:${pct}%"></i></div>
            ${s ? `<span class="pill ${pct >= 100 ? 'done' : ''}">${sc}%</span>` : `<span class="pill">${t('notStarted')}</span>`}</div></a>`;
        }).join('')}</div>`;
      }).join('');
    };
    $('#q').oninput = list; list();
    $$('.chip').forEach(c => c.onclick = () => TTS.speak(c.dataset.t));
  }

  /* =================================================================
     UNIT PAGE
     ================================================================= */
  let U = null, tab = 'grammar';
  const unitNo = parseInt(new URLSearchParams(location.search).get('u') || '1', 10);

  function loadUnit(cb) {
    if (U) return cb();
    const s = document.createElement('script');
    s.src = `data/unit${String(unitNo).padStart(2, '0')}.js`;
    s.onload = () => { U = window.UNIT_DATA; cb(); };
    s.onerror = () => { $('#app').innerHTML = `<div class="wrap"><div class="card" style="margin-top:30px">Unit ${unitNo} not found. <a href="index.html">← ${t('home')}</a></div></div>`; };
    document.head.appendChild(s);
  }
  const allItems = () => {
    const out = [];
    U.exercises.forEach(ex => ex.items.forEach((it, i) => out.push(ex.id + ':' + i)));
    U.quiz.forEach((q, i) => out.push('quiz:' + i));
    return out;
  };

  function renderUnit() {
    loadUnit(() => {
      const total = allItems().length;
      document.title = `${t('unit')} ${U.unit} · ${tx(U.title)} — Lingua Latina`;
      buildTopbar(`${t('unit')} ${U.unit} · ${esc(tx(U.title))}`);
      const exCount = U.exercises.reduce((a, e) => a + e.items.length, 0);
      const h = location.hash.slice(1); if (['grammar', 'vocab', 'exercises', 'quiz', 'results'].includes(h)) tab = h;
      const tabs = [['grammar', '📜 ' + t('grammar'), U.grammar.length], ['vocab', '📚 ' + t('vocab'), U.vocab.length], ['exercises', '✍️ ' + t('exercises'), exCount], ['quiz', '🏛️ ' + t('quiz'), U.quiz.length], ['results', '🏆 ' + t('results'), '']];
      $('#app').innerHTML = `
      <section class="uhead"><div class="wrap">
        <div class="num">${t('unit').toUpperCase()} ${ROMAN(U.unit)} · ${U.unit} / 31</div>
        <h1>${esc(tx(U.title))}</h1><p>${esc(tx(U.summary))}</p>
        <nav class="tabs">${tabs.map(([k, l, c]) => `<button data-t="${k}" class="${k === tab ? 'on' : ''}">${l}${c !== '' ? `<span class="cnt">${c}</span>` : ''}</button>`).join('')}</nav>
      </div></section>
      <div class="wrap"><div class="layout"><aside class="toc" id="toc"></aside><main id="main"></main></div>
        <div class="unav">${U.unit > 1 ? `<a class="btn btn-line" href="unit.html?u=${U.unit - 1}">← ${t('prev')}</a>` : '<span></span>'}
        <a class="btn btn-line" href="index.html">🏛 ${t('home')}</a>
        ${U.unit < 31 ? `<a class="btn btn-red" href="unit.html?u=${U.unit + 1}">${t('next')} →</a>` : '<span></span>'}</div></div>
      <footer class="footer"><div class="wrap">Lingua Latina · ${t('unit')} ${U.unit} · <i>Complete Latin</i> (G. Betts) · ${total} ${t('items')}</div></footer>`;
      $$('.tabs button').forEach(b => b.onclick = () => { tab = b.dataset.t; history.replaceState(null, '', '#' + tab); $$('.tabs button').forEach(x => x.classList.toggle('on', x === b)); renderTab(); window.scrollTo({ top: $('.uhead').offsetHeight - 10, behavior: 'smooth' }); });
      renderTab();
    });
  }
  function renderTab() {
    const main = $('#main'), toc = $('#toc');
    if (tab === 'grammar') renderGrammar(main, toc);
    else if (tab === 'vocab') renderVocab(main, toc);
    else if (tab === 'exercises') renderExercises(main, toc);
    else if (tab === 'quiz') renderQuiz(main, toc);
    else renderResults(main, toc);
    wireWords(main);
  }
  const contentNote = () => t('contentNote') ? `<div class="notice">ℹ️ ${t('contentNote')}</div>` : '';

  /* ---- grammar ---- */
  function renderGrammar(main, toc) {
    toc.innerHTML = `<div class="h">${t('grammar')}</div>` + U.grammar.map((g, i) => `<a href="#g${i}">${i + 1}. ${esc(tx(g.title))}</a>`).join('') + (U.culture ? `<a href="#culture">🏺 ${t('culture')}</a>` : '');
    main.innerHTML = contentNote() + U.grammar.map((g, i) => {
      const tables = (g.tables || []).map(tb => {
        const noSpeak = tb.headers.map(hd => /meaning|english|translation|뜻|use|function|example sentence|note/i.test(hd));
        return `<div class="tablewrap"><table class="para">${tb.caption ? `<caption>${esc(tx(tb.caption))}</caption>` : ''}
          <thead><tr>${tb.headers.map(hd => `<th>${esc(termKo(hd))}</th>`).join('')}</tr></thead>
          <tbody>${tb.rows.map(r => `<tr>${r.map((c, ci) => ci === 0 ? `<td>${esc(termKo(c))}</td>` : (noSpeak[ci] || !/[a-zāēīōū]/i.test(c) ? `<td>${esc(c)}</td>` : `<td class="sp" title="${t('listen')}">${esc(c)}</td>`)).join('')}</tr>`).join('')}</tbody></table></div>`;
      }).join('');
      const ex = (g.examples || []).length ? `<h3>${t('examples')}</h3><ul class="examples">${g.examples.map(e => `<li><button class="spk" data-say="${esc(e.la)}">🔊</button><div><div class="ltxt">${latinWords(e.la)}</div><div class="tr">${esc(e[CL()] || e.en)}</div></div></li>`).join('')}</ul>` : '';
      return `<section class="card" id="g${i}"><h2><span class="n">${ROMAN(i + 1)}</span>${esc(tx(g.title))}</h2><div class="gbody">${tx(g.body)}</div>${tables}${ex}</section>`;
    }).join('') + (U.culture ? `<section class="card culture" id="culture"><h2>🏺 ${t('culture')}</h2><div class="gbody"><p>${esc(tx(U.culture))}</p></div></section>` : '');
    $$('td.sp', main).forEach(td => td.onclick = () => TTS.speak(td.textContent.replace(/[-–]/g, ''), { slow: true }));
    $$('.spk', main).forEach(b => b.onclick = () => speakBtn(b, b.dataset.say));
  }

  /* ---- vocab ---- */
  let vmode = 'list', fcI = 0;
  function renderVocab(main, toc) {
    toc.innerHTML = `<div class="h">${t('vocab')}</div><a href="#" id="vl">📋 ${t('list')}</a><a href="#" id="vf">🃏 ${t('flashcards')}</a>`;
    $('#vl').onclick = e => { e.preventDefault(); vmode = 'list'; renderTab(); };
    $('#vf').onclick = e => { e.preventDefault(); vmode = 'fc'; renderTab(); };
    const V = U.vocab;
    let html = contentNote() + `<section class="card"><div class="ex-head"><h2>📚 ${t('vocab')} <span class="pill">${V.length}</span></h2>
      <div class="vtools"><button class="mini ${vmode === 'list' ? 'on' : ''}" data-m="list">📋 ${t('list')}</button><button class="mini ${vmode === 'fc' ? 'on' : ''}" data-m="fc">🃏 ${t('flashcards')}</button></div></div>`;
    if (vmode === 'list') {
      html += `<div class="vlist">${V.map((v, i) => `<div class="vitem"><button class="spk" data-i="${i}">🔊</button><div><div class="lw">${esc(v.la)}</div><div class="m">${esc(v[CL()] || v.en)}</div></div></div>`).join('')}</div>`;
    } else {
      fcI = Math.min(fcI, V.length - 1);
      const v = V[fcI];
      html += `<div class="fc-wrap"><div class="fc" id="fc"><div class="fc-in"><div class="fc-f"><div class="lw">${esc(v.la)}</div><div class="instr" style="margin-top:12px">${t('flip')}</div></div><div class="fc-b">${esc(v[CL()] || v.en)}</div></div></div>
        <div class="fc-nav"><button class="btn btn-line btn-sm" id="fcp">←</button><span>${fcI + 1} / ${V.length}</span><button class="btn btn-line btn-sm" id="fcs">🔊</button><button class="btn btn-line btn-sm" id="fcn">→</button></div></div>`;
    }
    main.innerHTML = html + '</section>';
    $$('.vtools .mini', main).forEach(b => b.onclick = () => { vmode = b.dataset.m; renderTab(); });
    $$('.vitem .spk', main).forEach(b => b.onclick = () => speakBtn(b, V[b.dataset.i].word || V[b.dataset.i].la));
    if (vmode === 'fc') {
      $('#fc').onclick = () => $('#fc').classList.toggle('flip');
      $('#fcp').onclick = () => { fcI = (fcI - 1 + V.length) % V.length; renderTab(); };
      $('#fcn').onclick = () => { fcI = (fcI + 1) % V.length; renderTab(); };
      $('#fcs').onclick = () => TTS.speak(V[fcI].word || V[fcI].la);
    }
  }

  /* ---- exercises ---- */
  function exStats(ex, prog) {
    let done = 0, pts = 0; ex.items.forEach((_, i) => { const a = prog[ex.id + ':' + i]; if (a) { done++; pts += a.s; } });
    return { done, pts, n: ex.items.length };
  }
  function renderExercises(main, toc) {
    const prog = getProg(U.unit);
    toc.innerHTML = `<div class="h">${t('exercises')}</div>` + U.exercises.map((ex, i) => { const s = exStats(ex, prog); return `<a href="#ex${i}">${esc(tx(ex.title))} <span class="pill">${s.done}/${s.n}</span></a>`; }).join('');
    main.innerHTML = contentNote() + U.exercises.map((ex, ei) => {
      const s = exStats(ex, prog);
      const mode = store.get('lat_mode', 'choose');
      let body = '';
      if (ex.type === 'fill') body = `<div class="fillgrid">${ex.items.map((it, i) => fillItem(ex, it, i, prog)).join('')}</div>`;
      else if (ex.type === 'translate') body = ex.items.map((it, i) => transItem(ex, it, i, prog, mode)).join('');
      else body = ex.items.map((it, i) => mcqItem(ex, it, i, prog)).join('');
      const instr = ex.instructions ? tx(ex.instructions) : ex.type === 'fill' ? t('fillInstr') : ex.type === 'translate' ? t('exInstr') : '';
      return `<section class="card" id="ex${ei}" data-ex="${ei}"><div class="ex-head"><h2>✍️ ${esc(tx(ex.title))}</h2>
        <div style="display:flex;gap:8px;align-items:center">${ex.type === 'translate' ? `<div class="seg" style="width:auto"><button data-mode="choose" class="${mode === 'choose' ? 'on' : ''}">☑ ${t('choose')}</button><button data-mode="write" class="${mode === 'write' ? 'on' : ''}">✎ ${t('write')}</button></div>` : ''}
        <span class="ex-score">${Math.round(s.pts * 10) / 10} / ${s.n}</span><button class="mini" data-reset="${ei}">↺ ${t('reset')}</button></div></div>
        <p class="instr">${esc(instr)}</p>${body}
        ${ex.type === 'fill' ? `<div class="wrow"><button class="btn btn-red btn-sm" data-checkall="${ei}">✓ ${t('checkAll')}</button></div>` : ''}</section>`;
    }).join('');
    wireExercises(main);
  }
  function itemHead(it, key) {
    return `<div class="top"><span class="no-badge">${esc(it.n ?? '')}</span><div style="flex:1"><div class="latin">${latinWords(it.la)}</div>${it.source ? `<div class="src">— ${esc(it.source)}</div>` : ''}</div>
      <div class="acts"><button class="spk" data-say="${esc(it.la)}" title="${t('listen')}">🔊</button><button class="spk slow" data-say="${esc(it.la)}" data-slow="1" title="${t('slow')}">½×</button></div></div>`;
  }
  function itemTools(it) {
    const b = [];
    if (it.hint) b.push(`<button class="mini" data-show="hint">💡 ${t('hint')}</button>`);
    if (it.glossary && it.glossary.length) b.push(`<button class="mini" data-show="gloss">📖 ${t('words')}</button>`);
    return b.length ? `<div class="tools">${b.join('')}</div>
      ${it.hint ? `<div class="reveal hidden" data-r="hint">💡 ${esc(tx(it.hint))}</div>` : ''}
      ${it.glossary ? `<div class="reveal hidden" data-r="gloss"><div class="gloss">${it.glossary.map(g => `<span><b>${esc(g.la)}</b> ${esc(g[CL()] || g.en)}</span>`).join('')}</div></div>` : ''}` : '';
  }
  function transItem(ex, it, i, prog, mode) {
    const key = ex.id + ':' + i, a = prog[key];
    const cls = a ? (a.s === 1 ? 'ok' : a.s > 0 ? 'half' : 'no') : '';
    let inner = '';
    const ch = it.choices[CL()] || it.choices.en;
    if (mode === 'choose' || (a && a.m === 'c')) {
      const ord = order(ch.length, U.unit + key);
      inner = `<div class="opts">${ord.map((oi, k) => {
        let c = ''; if (a && a.m === 'c') { if (oi === 0) c = 'right'; else if (oi === a.c) c = 'wrong'; }
        return `<button class="opt ${c}" data-key="${key}" data-oi="${oi}" ${a && a.m === 'c' ? 'disabled' : ''}><span class="l">${'ABCD'[k]}</span><span>${esc(ch[oi])}</span></button>`;
      }).join('')}</div>`;
      if (a && a.m === 'c') inner += `<div class="fb ${a.s ? 'ok' : 'no'}">${a.s ? '✓ ' + t('correct') : '✗ ' + t('wrong')}<div class="model"><b>${t('modelAnswer')}:</b> ${esc(tx(it.model))}</div></div>`;
    } else {
      inner = `<textarea class="tr-in" data-key="${key}" placeholder="${t('yourTranslation')}">${esc(a && a.m === 'w' ? a.txt : '')}</textarea>
        <div class="wrow"><button class="btn btn-red btn-sm" data-wcheck="${key}">✓ ${t('check')}</button><button class="mini" data-showans="${key}">👁 ${t('showAnswer')}</button></div>
        <div class="wfb">${a && a.m === 'w' ? writeFeedback(it, a) : ''}</div>`;
    }
    return `<div class="item ${cls}" data-item="${key}">${itemHead(it, key)}${itemTools(it)}${inner}</div>`;
  }
  function writeFeedback(it, a) {
    const groups = (it.keywords[CL()] || it.keywords.en);
    const r = scoreWrite(a.txt, groups);
    const cls = r.s === 1 ? 'ok' : r.s > 0 ? 'half' : 'no';
    return `<div class="fb ${cls}">${r.s === 1 ? '✓ ' + t('correct') : r.s > 0 ? '◐ ' + t('partial') : '✗ ' + t('wrong')} · ${Math.round(r.ratio * 100)}%
      <div style="margin-top:4px">${t('keywords')}: ${groups.map((g, k) => `<span class="kw ${r.res[k] ? 'y' : 'n'}">${r.res[k] ? '✓' : '✗'} ${esc(g[0])}</span>`).join('')}</div>
      <div class="model"><b>${t('modelAnswer')}:</b> ${esc(tx(it.model))}</div></div>`;
  }
  function fillItem(ex, it, i, prog) {
    const key = ex.id + ':' + i, a = prog[key];
    const ans = it.answers[CL()] || it.answers.en;
    return `<div class="fillitem ${a ? (a.s ? 'ok' : 'no') : ''}" data-item="${key}"><div class="p"><span class="lw">${esc(it.prompt)}</span><button class="spk" data-say="${esc(it.word)}">🔊</button></div>
      <input class="fill-in" data-key="${key}" placeholder="${t('typeAnswer')}" value="${esc(a ? a.txt : '')}">
      ${a ? `<div class="ans">${a.s ? '✓' : '✗'} ${esc(ans.join(', '))}</div>` : ''}</div>`;
  }
  function mcqItem(ex, it, i, prog) {
    const key = ex.id + ':' + i, a = prog[key];
    const ord = order(it.choices.length, U.unit + key);
    return `<div class="item ${a ? (a.s ? 'ok' : 'no') : ''}" data-item="${key}">${itemHead(it, key)}
      <div class="qtext" style="margin-top:8px">${esc(tx(it.q))}</div>
      <div class="opts">${ord.map((oi, k) => { let c = ''; if (a) { if (oi === 0) c = 'right'; else if (oi === a.c) c = 'wrong'; } return `<button class="opt ${c}" style="font-family:var(--serif)" data-key="${key}" data-oi="${oi}" ${a ? 'disabled' : ''}><span class="l">${'ABCD'[k] || k + 1}</span><span>${esc(it.choices[oi])}</span></button>`; }).join('')}</div>
      ${a && it.explain ? `<div class="explain">${esc(tx(it.explain))}</div>` : ''}</div>`;
  }
  function findItem(key) {
    const [id, i] = key.split(':');
    if (id === 'quiz') return U.quiz[+i];
    return U.exercises.find(e => e.id === id).items[+i];
  }
  function record(key, ans) {
    const p = getProg(U.unit); p[key] = ans; saveProg(U.unit, p, allItems().length);
  }
  function rerenderKeepScroll() { const y = window.scrollY; renderTab(); window.scrollTo(0, y); }
  function wireExercises(main) {
    $$('.spk', main).forEach(b => b.onclick = () => speakBtn(b, b.dataset.say, !!b.dataset.slow));
    $$('[data-show]', main).forEach(b => b.onclick = () => { const r = $(`[data-r="${b.dataset.show}"]`, b.closest('.item')); r.classList.toggle('hidden'); b.classList.toggle('on'); });
    $$('.seg [data-mode]', main).forEach(b => b.onclick = () => { store.set('lat_mode', b.dataset.mode); rerenderKeepScroll(); });
    $$('.opt', main).forEach(b => b.onclick = () => {
      const key = b.dataset.key, oi = +b.dataset.oi;
      const isQuiz = key.startsWith('quiz:');
      const exType = isQuiz ? 'quiz' : U.exercises.find(e => e.id === key.split(':')[0]).type;
      record(key, { m: 'c', c: oi, s: oi === 0 ? 1 : 0 });
      if (oi === 0) toast('✓ ' + t('correct'));
      rerenderKeepScroll();
    });
    $$('[data-wcheck]', main).forEach(b => b.onclick = () => {
      const key = b.dataset.wcheck, it = findItem(key), txt = $(`textarea[data-key="${key}"]`, main).value;
      if (!txt.trim()) return;
      const r = scoreWrite(txt, it.keywords[CL()] || it.keywords.en);
      record(key, { m: 'w', txt, s: r.s });
      rerenderKeepScroll();
    });
    $$('[data-showans]', main).forEach(b => b.onclick = () => {
      const it = findItem(b.dataset.showans), box = $('.wfb', b.closest('.item'));
      box.innerHTML = `<div class="fb half"><div class="model"><b>${t('modelAnswer')}:</b> ${esc(tx(it.model))}</div></div>`;
    });
    $$('.fill-in', main).forEach(inp => inp.onkeydown = e => { if (e.key === 'Enter') checkFillKey(inp.dataset.key, inp.value); });
    $$('[data-checkall]', main).forEach(b => b.onclick = () => {
      const ex = U.exercises[+b.dataset.checkall], p = getProg(U.unit);
      $$(`[data-ex="${b.dataset.checkall}"] .fill-in`).forEach(inp => {
        const it = findItem(inp.dataset.key);
        if (inp.value.trim()) p[inp.dataset.key] = { m: 'f', txt: inp.value, s: checkFill(inp.value, it.answers[CL()] || it.answers.en) ? 1 : 0 };
      });
      saveProg(U.unit, p, allItems().length); rerenderKeepScroll();
    });
    $$('[data-reset]', main).forEach(b => b.onclick = () => {
      const ex = U.exercises[+b.dataset.reset], p = getProg(U.unit);
      ex.items.forEach((_, i) => delete p[ex.id + ':' + i]); saveProg(U.unit, p, allItems().length); rerenderKeepScroll();
    });
  }
  function checkFillKey(key, val) {
    const it = findItem(key);
    record(key, { m: 'f', txt: val, s: checkFill(val, it.answers[CL()] || it.answers.en) ? 1 : 0 });
    rerenderKeepScroll();
    const next = $$('.fill-in').find(x => !x.value); next && next.focus();
  }

  /* ---- quiz ---- */
  function renderQuiz(main, toc) {
    const prog = getProg(U.unit);
    let done = 0, pts = 0; U.quiz.forEach((_, i) => { const a = prog['quiz:' + i]; if (a) { done++; pts += a.s; } });
    toc.innerHTML = `<div class="h">${t('quiz')}</div>` + U.quiz.map((q, i) => `<a href="#q${i}">${prog['quiz:' + i] ? (prog['quiz:' + i].s ? '✅' : '❌') : '○'} Q${i + 1}</a>`).join('');
    main.innerHTML = contentNote() + `<section class="card"><div class="ex-head"><h2>🏛️ ${t('quiz')}</h2><div style="display:flex;gap:8px;align-items:center"><span class="ex-score">${pts} / ${U.quiz.length}</span><button class="mini" id="qreset">↺ ${t('reset')}</button></div></div>
      <p class="instr">${t('quizInstr')}</p>
      ${U.quiz.map((q, i) => {
        const key = 'quiz:' + i, a = prog[key], ch = q.choices[CL()] || q.choices.en, ord = order(ch.length, U.unit + key);
        return `<div class="item ${a ? (a.s ? 'ok' : 'no') : ''}" id="q${i}"><div class="qtext"><span class="qnum">Q${i + 1}</span>${tx(q.q)}</div>
          <div class="opts">${ord.map((oi, k) => { let c = ''; if (a) { if (oi === 0) c = 'right'; else if (oi === a.c) c = 'wrong'; } return `<button class="opt ${c}" data-key="${key}" data-oi="${oi}" ${a ? 'disabled' : ''}><span class="l">${'ABCDE'[k]}</span><span>${esc(ch[oi])}</span></button>`; }).join('')}</div>
          ${a ? `<div class="explain">${a.s ? '✓' : '✗'} ${tx(q.explain)}</div>` : ''}</div>`;
      }).join('')}</section>`;
    $('#qreset').onclick = () => { const p = getProg(U.unit); U.quiz.forEach((_, i) => delete p['quiz:' + i]); saveProg(U.unit, p, allItems().length); rerenderKeepScroll(); };
    wireExercises(main);
  }

  /* ---- results ---- */
  function renderResults(main, toc) {
    const prog = getProg(U.unit), total = allItems().length;
    const rows = U.exercises.map(ex => ({ name: tx(ex.title), ...exStats(ex, prog) }));
    let qd = 0, qp = 0; U.quiz.forEach((_, i) => { const a = prog['quiz:' + i]; if (a) { qd++; qp += a.s; } });
    rows.push({ name: t('quiz'), done: qd, pts: qp, n: U.quiz.length });
    const pts = rows.reduce((a, r) => a + r.pts, 0), done = rows.reduce((a, r) => a + r.done, 0);
    const pct = Math.round(100 * pts / Math.max(1, total));
    toc.innerHTML = `<div class="h">${t('results')}</div><a href="#" id="pr">🖨 ${t('printPage')}</a>`;
    $('#pr').onclick = e => { e.preventDefault(); print(); };
    main.innerHTML = `<section class="card" style="text-align:center"><h2 style="justify-content:center">🏆 ${t('resultsTitle')}</h2>
      <div class="ring" style="--p:${pct}"><div>${pct}%</div></div>
      <div style="font-size:18px;font-weight:600;color:var(--ink2)">${pct >= 90 ? t('perfect') : pct >= 60 ? t('good') : t('keepGoing')}</div>
      <p class="instr">${t('answered')}: ${done} / ${total} · ${t('score')}: ${Math.round(pts * 10) / 10} / ${total}</p></section>
      <section class="card"><table class="rtable"><thead><tr><th></th><th class="num">${t('answered')}</th><th class="num">${t('score')}</th><th class="num">%</th></tr></thead>
      <tbody>${rows.map(r => `<tr><td>${esc(r.name)}</td><td class="num">${r.done}/${r.n}</td><td class="num">${Math.round(r.pts * 10) / 10}</td><td class="num">${r.done ? Math.round(100 * r.pts / r.n) : 0}%</td></tr>`).join('')}
      <tr><th>${t('total')}</th><th class="num">${done}/${total}</th><th class="num">${Math.round(pts * 10) / 10}</th><th class="num">${pct}%</th></tr></tbody></table>
      <div class="wrow" style="justify-content:flex-end;margin-top:14px"><button class="btn btn-line btn-sm" id="ru">↺ ${t('resetUnit')}</button></div></section>`;
    $('#ru').onclick = () => { if (confirm(t('confirmReset'))) { saveProg(U.unit, {}, total); renderTab(); } };
  }

  /* ---------------- boot ---------------- */
  function render() {
    document.documentElement.lang = lang;
    if (document.body.dataset.page === 'unit') renderUnit(); else renderHome();
  }
  TTS.listeners.push(() => { const am = $('#audioMenu'); if (am && am.classList.contains('open')) renderAudio(); });
  document.addEventListener('DOMContentLoaded', render);
})();
