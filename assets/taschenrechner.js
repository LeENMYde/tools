/*
 * Taschenrechner als Fenster über der Seite
 * =========================================
 * Einbinden: <script src="assets/taschenrechner.js"></script> (nach basis.js).
 * Wissenschaftlich (Grad/Bogenmaß, Winkel-, Log- und Potenzfunktionen), eigener Ausdrucksleser ohne eval,
 * Verlauf, Tastatur. „Übernehmen“ trägt das Ergebnis in das zuletzt benutzte Zahlenfeld der Seite ein.
 */
(function () {
  'use strict';
  if (window.Taschenrechner) return;

  const lies = function (k, s) { try { const v = JSON.parse(localStorage.getItem(k)); return v === null || v === undefined ? s : v; } catch (x) { return s; } };
  const schreib = function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (x) { /* egal */ } };

  // ---------- Ausdruck lesen (rekursiver Abstieg) ----------
  const FUNK = {
    sin: 1, cos: 1, tan: 1, asin: 1, acos: 1, atan: 1, ln: 1, log: 1, sqrt: 1, cbrt: 1, exp: 1, abs: 1
  };
  function zerlege(t) {
    const s = String(t).replace(/\s+/g, '').replace(/×|·|\*/g, '*').replace(/÷|:|\//g, '/').replace(/−|–/g, '-').replace(/√/g, 'sqrt').replace(/∛/g, 'cbrt').replace(/π/g, 'pi');
    const z = []; let i = 0;
    while (i < s.length) {
      const c = s[i];
      const m = /^(\d+(?:[.,]\d*)?|[.,]\d+)(?:[eE][-+]?\d+)?/.exec(s.slice(i));
      if (m) { z.push({ t: 'n', v: parseFloat(m[0].replace(',', '.')) }); i += m[0].length; continue; }
      const w = /^[a-zA-Z]+/.exec(s.slice(i));
      if (w) {
        let wort = w[0].toLowerCase();
        // längstes bekanntes Wort zuerst, Rest weiter zerlegen (z. B. „pie“ = pi · e)
        let gef = null; ['asin', 'acos', 'atan', 'sqrt', 'cbrt', 'sin', 'cos', 'tan', 'exp', 'abs', 'log', 'ans', 'ln', 'pi', 'e'].some(function (k) { if (wort.indexOf(k) === 0) { gef = k; return true; } return false; });
        if (!gef) throw new Error('unbekannt: ' + w[0]);
        z.push(FUNK[gef] ? { t: 'f', v: gef } : { t: 'k', v: gef }); i += gef.length; continue;
      }
      if ('+-*/^()%²³!'.indexOf(c) >= 0) { z.push({ t: 'o', v: c }); i++; continue; }
      throw new Error('Zeichen: ' + c);
    }
    return z;
  }
  function rechne(text, opt) {
    const z = zerlege(text); let p = 0;
    const sieh = function () { return z[p]; };
    const ist = function (v) { return z[p] && z[p].t === 'o' && z[p].v === v; };
    const grad = opt.grad, rad = function (x) { return grad ? x * Math.PI / 180 : x; }, zurueck = function (x) { return grad ? x * 180 / Math.PI : x; };
    const fn = {
      sin: function (x) { const r = Math.sin(rad(x)); return Math.abs(r) < 1e-15 ? 0 : r; }, cos: function (x) { const r = Math.cos(rad(x)); return Math.abs(r) < 1e-15 ? 0 : r; },
      tan: function (x) { if (grad && Math.abs(((x % 180) + 180) % 180 - 90) < 1e-12) return NaN; const r = Math.tan(rad(x)); return Math.abs(r) < 1e-15 ? 0 : r; },
      asin: function (x) { return zurueck(Math.asin(x)); }, acos: function (x) { return zurueck(Math.acos(x)); }, atan: function (x) { return zurueck(Math.atan(x)); },
      ln: Math.log, log: Math.log10, sqrt: Math.sqrt, cbrt: Math.cbrt, exp: Math.exp, abs: Math.abs
    };
    function ausdruck() { let v = term(); while (ist('+') || ist('-')) { const o = z[p++].v, w = term(); v = o === '+' ? v + w : v - w; } return v; }
    function startetFaktor() { const t = sieh(); return t && (t.t === 'n' || t.t === 'k' || t.t === 'f' || (t.t === 'o' && t.v === '(')); }
    function term() {
      let v = vorzeichen();
      for (;;) {
        if (ist('*') || ist('/')) { const o = z[p++].v, w = vorzeichen(); v = o === '*' ? v * w : v / w; }
        else if (startetFaktor()) v = v * vorzeichen();   // 2π, 3(4+1), (2)(3)
        else break;
      }
      return v;
    }
    function vorzeichen() { if (ist('-')) { p++; return -vorzeichen(); } if (ist('+')) { p++; return vorzeichen(); } return potenz(); }
    function potenz() { const b = nachsatz(); if (ist('^')) { p++; return Math.pow(b, vorzeichen()); } return b; }
    function nachsatz() {
      let v = grund();
      for (;;) {
        if (ist('²')) { p++; v = v * v; } else if (ist('³')) { p++; v = v * v * v; }
        else if (ist('%')) { p++; v = v / 100; }
        else if (ist('!')) { p++; if (v < 0 || v > 170 || v % 1) return NaN; let f = 1; for (let k = 2; k <= v; k++) f *= k; v = f; }
        else break;
      }
      return v;
    }
    function grund() {
      const t = sieh(); if (!t) throw new Error('fehlt');
      if (t.t === 'n') { p++; return t.v; }
      if (t.t === 'k') { p++; return t.v === 'pi' ? Math.PI : t.v === 'e' ? Math.E : opt.ans; }
      if (t.t === 'f') { p++; const a = ist('(') ? (p++, klammerRest()) : nachsatz(); return fn[t.v](a); }
      if (ist('(')) { p++; return klammerRest(); }
      throw new Error('unerwartet');
    }
    function klammerRest() { const v = ausdruck(); if (ist(')')) p++; return v; }   // fehlende Klammer am Ende zu
    const v = ausdruck();
    if (p < z.length) throw new Error('Rest');
    return v;
  }
  const zahlText = function (v, gruppen) {
    if (!isFinite(v)) return isNaN(v) ? 'nicht definiert' : (v > 0 ? '∞' : '−∞');
    if (v === 0) return '0';
    const a = Math.abs(v);
    let s;
    if (a >= 1e12 || a < 1e-7) s = v.toExponential(8).replace(/\.?0+e/, 'e').replace('e+', 'e').replace('.', ',').replace('e', ' · 10^');
    else {
      s = String(parseFloat(v.toPrecision(12)));
      if (/e/.test(s)) s = v.toFixed(10).replace(/0+$/, '');
      const t = s.split('.');
      if (gruppen) t[0] = t[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
      s = t.join(',');
    }
    return s.replace(/^-/, '−');
  };
  const feldText = function (v) { return String(parseFloat(v.toPrecision(12))).replace(/e\+?/, 'e').replace('.', ','); };

  // ---------- Oberfläche ----------
  const STIL = '' +
    '.tr-knopf{position:fixed;right:16px;bottom:16px;z-index:60;width:54px;height:54px;border-radius:50%;border:none;background:var(--text);color:var(--grund);box-shadow:0 6px 20px -6px rgba(0,0,0,.45);cursor:pointer;display:flex;align-items:center;justify-content:center}' +
    '.tr-knopf svg{width:26px;height:26px}' +
    '.tr-knopf[aria-expanded="true"]{opacity:0;pointer-events:none}' +
    '.tr-fenster{position:fixed;z-index:61;right:16px;bottom:16px;width:340px;max-width:calc(100vw - 32px);background:var(--flaeche);color:var(--text);border:1px solid var(--linie);border-radius:18px;box-shadow:0 18px 50px -12px rgba(0,0,0,.45);padding:10px 12px 12px;display:flex;flex-direction:column;gap:8px;max-height:calc(100vh - 32px);overflow:auto}' +
    '.tr-fenster[hidden]{display:none}' +
    '.tr-kopf{display:flex;align-items:center;gap:6px}' +
    '.tr-kopf b{flex:1;font-family:var(--technik);font-size:1rem}' +
    '.tr-klein{border:1px solid var(--linie);background:var(--flaeche2);color:var(--text);border-radius:999px;padding:4px 10px;font-size:.82rem;cursor:pointer}' +
    '.tr-klein[aria-pressed="true"]{background:var(--text);color:var(--grund);border-color:var(--text)}' +
    '.tr-zu{width:32px;height:32px;border-radius:50%;border:none;background:none;color:var(--leise);font-size:1.3rem;cursor:pointer;line-height:1}' +
    '.tr-zu:hover{background:var(--flaeche2);color:var(--text)}' +
    '.tr-anzeige{background:var(--flaeche2);border-radius:12px;padding:8px 10px;display:flex;flex-direction:column;gap:2px;min-width:0}' +
    '.tr-ausdruck{width:100%;border:none;background:none;color:var(--text);font:600 1.15rem var(--technik);text-align:right;padding:0;outline:none;min-width:0}' +
    '.tr-ergebnis{font:600 1.6rem var(--technik);text-align:right;color:var(--ergebnis);min-height:1.9rem;overflow-x:auto;white-space:nowrap}' +
    '.tr-ergebnis.tr-fehler{color:var(--fehler);font-size:1rem}' +
    '.tr-tasten{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}' +
    '.tr-tasten button{min-height:42px;border:1px solid var(--linie);border-radius:10px;background:var(--flaeche);color:var(--text);font:600 1.02rem var(--technik);cursor:pointer;padding:0;touch-action:manipulation}' +
    '.tr-tasten button:hover{border-color:var(--leise)}' +
    '.tr-tasten button:active{transform:scale(.96)}' +
    '.tr-tasten .tr-z{background:var(--flaeche2)}' +
    '.tr-tasten .tr-op{color:var(--kalt)}' +
    '.tr-tasten .tr-f{font-size:.88rem;font-weight:500}' +
    '.tr-tasten .tr-gleich{background:var(--text);color:var(--grund);border-color:var(--text)}' +
    '.tr-tasten .tr-weg{color:var(--fehler)}' +
    '.tr-tasten button[aria-pressed="true"]{background:var(--text);color:var(--grund)}' +
    '.tr-fuss{display:flex;gap:6px;flex-wrap:wrap;align-items:center}' +
    '.tr-fuss .tr-uebernehmen{flex:1 1 auto}' +
    '.tr-verlauf{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2px;max-height:110px;overflow:auto;font-size:.85rem}' +
    '.tr-verlauf button{width:100%;text-align:right;border:none;background:none;color:var(--leise);cursor:pointer;padding:3px 4px;border-radius:6px;font:inherit}' +
    '.tr-verlauf button:hover{background:var(--flaeche2);color:var(--text)}' +
    '.tr-verlauf b{color:var(--text);font-family:var(--technik)}' +
    '@media (max-width:560px){.tr-fenster{left:0;right:0;bottom:0;width:auto;max-width:none;border-radius:18px 18px 0 0;border-bottom:none;padding:10px 12px calc(12px + env(safe-area-inset-bottom))}.tr-tasten button{min-height:48px;font-size:1.08rem}.tr-tasten .tr-f{font-size:.92rem}.tr-knopf{right:12px;bottom:12px}}' +
    '@media print{.tr-knopf,.tr-fenster{display:none!important}}';

  const SYMBOL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><rect x="5" y="2.5" width="14" height="19" rx="2.5"/><rect x="8" y="5.5" width="8" height="3.5" rx=".8"/><path d="M8.5 13h.01M12 13h.01M15.5 13h.01M8.5 16.5h.01M12 16.5h.01M15.5 16.5h.01"/></svg>';

  // [Beschriftung, Einfügen, Klasse, Beschriftung mit 2nd, Einfügen mit 2nd, Name für Vorleser]
  const TASTEN = [
    ['2nd', '#2nd', 'tr-f', null, null, 'Zweitfunktion'], ['(', '(', 'tr-op'], [')', ')', 'tr-op'], ['%', '%', 'tr-op', null, null, 'Prozent'], ['⌫', '#weg', 'tr-weg', null, null, 'Zeichen löschen'],
    ['sin', 'sin(', 'tr-f', 'sin⁻¹', 'asin(', 'Sinus'], ['cos', 'cos(', 'tr-f', 'cos⁻¹', 'acos(', 'Kosinus'], ['tan', 'tan(', 'tr-f', 'tan⁻¹', 'atan(', 'Tangens'], ['π', 'π', 'tr-f', 'e', 'e', 'Pi'], ['C', '#leer', 'tr-weg', null, null, 'Alles löschen'],
    ['√', '√(', 'tr-f', '∛', '∛(', 'Wurzel'], ['x²', '²', 'tr-f', 'x³', '³', 'Quadrat'], ['xʸ', '^', 'tr-f', 'ʸ√x', '^(1÷', 'Potenz'], ['log', 'log(', 'tr-f', '10ˣ', '10^', 'Zehnerlogarithmus'], ['÷', '÷', 'tr-op', null, null, 'geteilt'],
    ['7', '7', 'tr-z'], ['8', '8', 'tr-z'], ['9', '9', 'tr-z'], ['ln', 'ln(', 'tr-f', 'eˣ', 'e^', 'natürlicher Logarithmus'], ['×', '×', 'tr-op', null, null, 'mal'],
    ['4', '4', 'tr-z'], ['5', '5', 'tr-z'], ['6', '6', 'tr-z'], ['1/x', '#kehr', 'tr-f', 'n!', '!', 'Kehrwert'], ['−', '−', 'tr-op', null, null, 'minus'],
    ['1', '1', 'tr-z'], ['2', '2', 'tr-z'], ['3', '3', 'tr-z'], ['Ans', 'Ans', 'tr-f', null, null, 'letztes Ergebnis'], ['+', '+', 'tr-op', null, null, 'plus'],
    ['±', '#vz', 'tr-f', null, null, 'Vorzeichen'], ['0', '0', 'tr-z'], [',', ',', 'tr-z', null, null, 'Komma'], ['EE', 'E', 'tr-f', null, null, 'mal zehn hoch'], ['=', '#gleich', 'tr-gleich', null, null, 'ist gleich']
  ];

  let feld = null;   // zuletzt benutztes Zahlenfeld der Seite
  const zielFeld = function () { if (feld && document.contains(feld) && !feld.disabled) return feld; return document.querySelector('[data-rechner-ziel]:not([disabled])'); };
  document.addEventListener('focusin', function (e) {
    const t = e.target;
    if (t && t.tagName === 'INPUT' && !t.closest('.tr-fenster') && /^(text|number|search|)$/.test(t.type || '') && !t.readOnly && !t.disabled && t.type !== 'search') feld = t;
  });

  function baue() {
    const stil = document.createElement('style'); stil.textContent = STIL; document.head.append(stil);
    const knopf = document.createElement('button'); knopf.type = 'button'; knopf.className = 'tr-knopf'; knopf.innerHTML = SYMBOL;
    knopf.setAttribute('aria-label', 'Taschenrechner öffnen'); knopf.setAttribute('aria-expanded', 'false'); knopf.setAttribute('aria-controls', 'tr-fenster'); knopf.title = 'Taschenrechner';
    const f = document.createElement('div'); f.className = 'tr-fenster'; f.id = 'tr-fenster'; f.hidden = true; f.setAttribute('role', 'dialog'); f.setAttribute('aria-label', 'Taschenrechner');
    f.innerHTML = '<div class="tr-kopf"><b>Taschenrechner</b><button type="button" class="tr-klein tr-winkel" aria-pressed="false" title="Winkel in Grad oder Bogenmaß">DEG</button><button type="button" class="tr-zu" aria-label="Taschenrechner schließen">×</button></div>' +
      '<div class="tr-anzeige"><input class="tr-ausdruck" type="text" aria-label="Rechnung" autocomplete="off" spellcheck="false" data-nicht-merken placeholder="0"><output class="tr-ergebnis" aria-live="polite"></output></div>' +
      '<div class="tr-tasten"></div>' +
      '<div class="tr-fuss"><button type="button" class="knopf tr-uebernehmen" hidden>Ergebnis übernehmen</button></div>' +
      '<ul class="tr-verlauf" aria-label="Verlauf"></ul>';
    document.body.append(knopf, f);

    const aus = f.querySelector('.tr-ausdruck'), erg = f.querySelector('.tr-ergebnis'), tasten = f.querySelector('.tr-tasten'), verlaufEl = f.querySelector('.tr-verlauf'), winkel = f.querySelector('.tr-winkel'), ueber = f.querySelector('.tr-uebernehmen');
    const beruehrung = window.matchMedia && matchMedia('(pointer: coarse)').matches;
    if (beruehrung) aus.setAttribute('inputmode', 'none');   // eigene Tasten statt Bildschirmtastatur
    let grad = lies('rechner-grad', true) !== false, ans = 0, zweit = false, fertig = false, letztes = NaN;
    let verlauf = lies('rechner-verlauf', []); if (!Array.isArray(verlauf)) verlauf = [];
    verlauf = verlauf.filter(function (x) { return x && typeof x.a === 'string' && isFinite(x.v); }).slice(0, 8);
    if (verlauf.length) ans = verlauf[0].v;

    const knoepfe = TASTEN.map(function (t) {
      const b = document.createElement('button'); b.type = 'button'; b.className = t[2] || ''; b.textContent = t[0]; if (t[5]) b.setAttribute('aria-label', t[5]);
      if (t[1] === '#2nd') b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () { taste(t); if (!beruehrung) aus.focus(); });
      tasten.append(b); return [b, t];
    });
    function zweitSetzen(an) { zweit = an; knoepfe.forEach(function (k) { const t = k[1]; if (t[1] === '#2nd') k[0].setAttribute('aria-pressed', an ? 'true' : 'false'); else if (t[3]) k[0].textContent = an ? t[3] : t[0]; }); }
    function winkelZeigen() { winkel.textContent = grad ? 'DEG' : 'RAD'; winkel.setAttribute('aria-pressed', grad ? 'false' : 'true'); winkel.title = grad ? 'Winkel in Grad – umschalten auf Bogenmaß' : 'Winkel im Bogenmaß – umschalten auf Grad'; }
    winkelZeigen();

    function vorschau() {
      const t = aus.value.trim(); erg.classList.remove('tr-fehler');
      if (!t) { erg.textContent = ''; letztes = NaN; ueberZeigen(); return; }
      try { const v = rechne(t, { grad: grad, ans: ans }); letztes = v; erg.textContent = (fertig ? '' : '= ') + zahlText(v, true); if (!isFinite(v)) erg.classList.add('tr-fehler'); }
      catch (x) { letztes = NaN; erg.textContent = ''; }
      ueberZeigen();
    }
    function ueberZeigen() { ueber.hidden = !(zielFeld() && isFinite(letztes)); }
    function einfuegen(s) {
      if (fertig) { fertig = false; if (/^[0-9,πe(√∛]|^Ans|^sin|^cos|^tan|^log|^ln|^a/.test(s)) aus.value = ''; else if (isFinite(letztes)) aus.value = 'Ans'; }
      const a = aus.selectionStart === null ? aus.value.length : aus.selectionStart, b = aus.selectionEnd === null ? a : aus.selectionEnd;
      aus.value = aus.value.slice(0, a) + s + aus.value.slice(b); const pos = a + s.length; try { aus.setSelectionRange(pos, pos); } catch (x) { /* egal */ }
      vorschau();
    }
    function gleich() {
      const t = aus.value.trim(); if (!t) return;
      try {
        const v = rechne(t, { grad: grad, ans: ans });
        if (!isFinite(v)) { erg.textContent = isNaN(v) ? 'nicht definiert' : 'unendlich (÷ 0 oder zu groß)'; erg.classList.add('tr-fehler'); return; }
        ans = v; letztes = v; fertig = true;
        verlauf.unshift({ a: t.slice(0, 120), v: v }); verlauf = verlauf.slice(0, 8); schreib('rechner-verlauf', verlauf); verlaufZeigen();
        erg.classList.remove('tr-fehler'); erg.textContent = zahlText(v, true); ueberZeigen();
      } catch (x) { erg.textContent = 'Eingabe prüfen'; erg.classList.add('tr-fehler'); }
    }
    function taste(t) {
      let w = zweit && t[4] ? t[4] : t[1];
      if (w === '#2nd') { zweitSetzen(!zweit); return; }
      if (zweit) zweitSetzen(false);
      if (w === '#gleich') { gleich(); return; }
      if (w === '#leer') { aus.value = ''; fertig = false; vorschau(); return; }
      if (w === '#weg') { if (fertig) { fertig = false; } const a = aus.selectionStart, b = aus.selectionEnd; if (a !== null && a !== b) { aus.value = aus.value.slice(0, a) + aus.value.slice(b); try { aus.setSelectionRange(a, a); } catch (x) { /* egal */ } } else { const pos = a === null ? aus.value.length : a; const vor = aus.value.slice(0, pos).replace(/(asin\(|acos\(|atan\(|sin\(|cos\(|tan\(|log\(|ln\(|√\(|∛\(|Ans|.)$/, ''); aus.value = vor + aus.value.slice(pos); try { aus.setSelectionRange(vor.length, vor.length); } catch (x) { /* egal */ } } vorschau(); return; }
      if (w === '#vz') { const t2 = aus.value.trim(); if (fertig && isFinite(letztes)) { aus.value = '−(Ans)'; fertig = false; } else if (/^−\(.*\)$/.test(t2)) aus.value = t2.slice(2, -1); else if (t2) aus.value = '−(' + t2 + ')'; else aus.value = '−'; vorschau(); return; }
      if (w === '#kehr') { const t2 = aus.value.trim(); if (fertig) { aus.value = '1÷Ans'; fertig = false; } else aus.value = t2 ? '1÷(' + t2 + ')' : '1÷'; vorschau(); return; }
      einfuegen(w);
    }
    function verlaufZeigen() {
      verlaufEl.innerHTML = '';
      verlauf.forEach(function (x) {
        const li = document.createElement('li'), b = document.createElement('button'); b.type = 'button'; b.title = 'Ergebnis einsetzen';
        b.append(document.createTextNode(x.a + ' = ')); const st = document.createElement('b'); st.textContent = zahlText(x.v, true); b.append(st);
        b.addEventListener('click', function () { einfuegen(feldText(x.v)); });
        li.append(b); verlaufEl.append(li);
      });
      verlaufEl.hidden = !verlauf.length;
    }
    verlaufZeigen();

    function oeffnen() { f.hidden = false; knopf.setAttribute('aria-expanded', 'true'); ueberZeigen(); if (!beruehrung) aus.focus(); else f.querySelector('.tr-zu').focus(); }
    function schliessen() { f.hidden = true; knopf.setAttribute('aria-expanded', 'false'); knopf.focus(); }
    knopf.addEventListener('click', oeffnen);
    f.querySelector('.tr-zu').addEventListener('click', schliessen);
    winkel.addEventListener('click', function () { grad = !grad; schreib('rechner-grad', grad); winkelZeigen(); vorschau(); });
    aus.addEventListener('input', function () { fertig = false; vorschau(); });
    aus.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || (e.key === '=' && !e.ctrlKey)) { e.preventDefault(); gleich(); }
      else if (e.key === 'Escape') { e.preventDefault(); schliessen(); }
      else if (fertig && e.key.length === 1 && '+-*/^%²'.indexOf(e.key) >= 0) { aus.value = 'Ans'; try { aus.setSelectionRange(3, 3); } catch (x) { /* egal */ } fertig = false; }
      else if (fertig && e.key.length === 1 && /[0-9.,(a-zπ]/i.test(e.key)) { aus.value = ''; fertig = false; }
    });
    f.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.preventDefault(); schliessen(); } });
    ueber.addEventListener('click', function () {
      const feld = zielFeld(); if (!feld || !isFinite(letztes)) return;
      feld.value = feldText(letztes); feld.dispatchEvent(new Event('input', { bubbles: true })); feld.dispatchEvent(new Event('change', { bubbles: true }));
      schliessen(); try { feld.focus(); } catch (x) { /* egal */ }
    });
    window.Taschenrechner = { oeffnen: oeffnen, schliessen: schliessen, rechne: function (t, g) { return rechne(t, { grad: g !== false, ans: ans }); } };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', baue); else baue();
})();
