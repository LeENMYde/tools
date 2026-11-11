/*
 * Baukasten für Auslegungsrechner
 * ===============================
 * Baut eine Rechnerseite im gemeinsamen Aufbau: Eingaben, Ansicht, Ergebnis,
 * Rechenweg und Formelsammlung. Die Seite liefert nur Felder, Rechnung und Zeichnung.
 *
 *   <main data-rechner></main>
 *   <script src="../assets/rechner.js"></script>
 *   <script>Rechner.seite({ titel, einleitung, gruppen, beispiel, rechne, ergebnis, weg, sammlung, bild })</script>
 *
 * Felder:  { k, tex, name, e, min, max, ganz, wahl: [[wert, text], …], wenn: function (e) {…}, hilfe }
 * Listen:  { k, name, zeile: 'Raum', max, spalten: [ wie Felder ], neu: function (i) { return {…}; } }
 * Eingaben werden über basis.js gemerkt und lassen sich teilen; Listen liegen dafür als JSON in einem versteckten Feld.
 *
 * Löser in jede Richtung (optional, auch mehrere als Liste):
 *   loeser: { titel, hilfe, felder: [ { k, tex, name, e, min, max, n } ], beispiel: { k: wert },
 *             gleichungen: [ { name, v: ['U', 'R', 'I'], f: function (x) { return [x.U, x.R * x.I]; },
 *                              loese: { k: function (x) {…} },      // geschlossene Lösung (sonst numerisch im Feldbereich)
 *                              weg: function (k, x) { return 'TeX'; } } ] }
 *   Bekannte Werte eintragen; jede Gleichung mit genau einer Unbekannten wird gelöst, bis nichts mehr geht.
 *   Sind alle Größen einer Gleichung gegeben, wird geprüft, ob sie zusammenpassen (sonst rot).
 */
(function () {
  'use strict';

  function lies(t) {
    const s = String(t).trim().replace(/\s/g, '').replace(',', '.').replace('−', '-');
    return s === '' || s === '-' ? NaN : Number(s);
  }
  // Zahl deutsch formatiert, n Nachkommastellen; nie NaN oder Infinity im Text
  function zahl(w, n) {
    if (typeof w !== 'number' || !isFinite(w)) return '–';
    n = n || 0;
    const t = (Math.round(w * Math.pow(10, n)) / Math.pow(10, n)).toFixed(n).replace('.', ',').replace('-', '−');
    const p = t.split(',');
    p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return p.join(',').replace(/^−(0(,0*)?)$/, '$1');
  }
  // Zahl mit sinnvoller Genauigkeit (3 gültige Stellen, höchstens n Nachkommastellen)
  function rund(w, max) {
    if (!isFinite(w)) return '–';
    const a = Math.abs(w), n = a >= 100 ? 0 : a >= 10 ? 1 : a >= 1 ? 2 : 3;
    return zahl(w, Math.min(n, max === undefined ? 3 : max));
  }
  function tz(w, n) { return Formel.zahl(zahl(w, n)); }
  function E(t) { return '\\htmlClass{ergebnis}{' + t + '}'; }
  function F(t) { return '\\htmlClass{fehlertext}{' + t + '}'; }
  function EF(ok) { return ok ? E : F; }
  function kopie(o) { return JSON.parse(JSON.stringify(o)); }
  function knoten(tag, klasse, text) {
    const k = document.createElement(tag);
    if (klasse) k.className = klasse;
    if (text !== undefined) k.textContent = text;
    return k;
  }
  function farbe(n) { return Thema.farbe(n); }
  // gleichmäßige Werte für Wahlfelder: Zahlenwerte als Zahl speichern
  function wahlWert(v) { return /^-?\d+(\.\d+)?(e-?\d+)?$/i.test(v) ? Number(v) : v; }   // auch 1e-7

  let zaehler = 0;

  function seite(K) {
    const haupt = document.querySelector('main[data-rechner]') || document.querySelector('main');
    haupt.classList.add('seite');
    haupt.setAttribute('data-merken', '');
    const id = function (n) { return 'r' + (++zaehler) + '-' + n; };

    // ---------- Gerüst ----------
    const held = knoten('section', 'held');
    const h1 = knoten('h1'); h1.append(knoten('span', 'unterstrichen', K.titel)); held.append(h1);
    if (K.einleitung) held.append(knoten('p', '', K.einleitung));
    haupt.append(held);

    const oben = knoten('div', 'rechnen' + (K.bild ? '' : ' ohne-bild'));
    const tEin = knoten('section', 'tafel'); const hEin = knoten('h2', '', 'Was ist bekannt?'); hEin.id = id('werte');
    tEin.setAttribute('aria-labelledby', hEin.id); tEin.append(hEin);
    if (K.hilfe) tEin.append(knoten('p', 'hilfe', K.hilfe));
    const felderZiel = knoten('div'); tEin.append(felderZiel);
    const kBsp = knoten('button', 'knopf-leise', 'Beispielwerte wiederherstellen'); kBsp.type = 'button'; tEin.append(kBsp);
    oben.append(tEin);

    let cv = null, cx = null, bildHinweis = null, kAnim = null, zusatzBild = null;
    if (K.bild) {
      const tBild = knoten('section', 'tafel bild-tafel'); const hB = knoten('h2', '', K.bild.titel || 'Ansicht'); hB.id = id('bild');
      tBild.setAttribute('aria-labelledby', hB.id); tBild.append(hB);
      cv = knoten('canvas', 'rechner-bild'); cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', K.bild.label || K.titel);
      cx = cv.getContext('2d'); tBild.append(cv);
      zusatzBild = knoten('div', 'bild-zusatz'); tBild.append(zusatzBild);
      const st = knoten('div', 'steuerung');
      if (K.bild.animiert) { kAnim = knoten('button', 'knopf', '■ Anhalten'); kAnim.type = 'button'; kAnim.setAttribute('data-nicht-merken', ''); st.append(kAnim); }
      bildHinweis = knoten('span', 'zustand'); st.append(bildHinweis);
      tBild.append(st);
      oben.append(tBild);
    }
    haupt.append(oben);

    const tErg = knoten('section', 'tafel abstand'); const kz = knoten('div', 'kopf-zeile');
    const hErg = knoten('h2', '', 'Ergebnis'); hErg.id = id('ergebnis'); tErg.setAttribute('aria-labelledby', hErg.id);
    const urteilEl = knoten('span', 'urteil'); urteilEl.setAttribute('aria-live', 'polite');
    kz.append(hErg, urteilEl); tErg.append(kz);
    const melEl = knoten('div', 'meldungen'), kachEl = knoten('div', 'kacheln'), nwEl = knoten('ul', 'nachweise'), zusEl = knoten('div', 'zusatz');
    tErg.append(melEl, kachEl, nwEl, zusEl);
    haupt.append(tErg);
    (K.loeser ? (Array.isArray(K.loeser) ? K.loeser : [K.loeser]) : []).forEach(function (L) { loeserBauen(L, haupt, id); });
    // weitere Abschnitte der Seite (z. B. eine zweite Simulation): { titel, bauen: function (tafel, h2) {…} }
    (K.zusatz || []).forEach(function (Z) {
      const t = knoten('section', 'tafel abstand zusatz-tafel' + (Z.klasse ? ' ' + Z.klasse : '')); const h = knoten('h2', '', Z.titel); h.id = id('zusatz');
      t.setAttribute('aria-labelledby', h.id); t.append(h); haupt.append(t); Z.bauen(t, h);
    });

    const zwei = knoten('div', 'zwei');
    const tWeg = knoten('section', 'tafel'); const hW = knoten('h2', '', 'So wird gerechnet'); hW.id = id('weg'); tWeg.setAttribute('aria-labelledby', hW.id);
    const wegEl = knoten('ol', 'weg');
    tWeg.append(hW, knoten('p', 'hilfe', 'Die Schritte mit deinen Zahlen.'), wegEl);
    const tSam = knoten('section', 'tafel'); const hS = knoten('h2', '', 'Formelsammlung'); hS.id = id('formeln'); tSam.setAttribute('aria-labelledby', hS.id);
    const samEl = knoten('div', 'formelsammlung');
    tSam.append(hS, knoten('p', 'hilfe', 'Alle Formeln und Tabellenwerte, die der Rechner verwendet.'), samEl);
    if (K.quellen) { const q = knoten('p', 'quellen', K.quellen); tSam.append(q); }
    zwei.append(tWeg, tSam);
    haupt.append(zwei);
    // statische Abschnitte der Seite (häufige Fragen) ans Ende
    Array.prototype.slice.call(haupt.children).filter(function (c) { return c.classList.contains('seo-info'); }).forEach(function (c) { haupt.append(c); });

    // ---------- Eingaben ----------
    let e = kopie(K.beispiel);
    const felder = {};      // k → { el, f, zeile }
    const listen = {};      // k → { versteckt, aufbauen }
    const sichtbar = [];    // [zeile oder gruppe, wenn]

    function zeigeWert(k) {
      const x = felder[k]; if (!x) return;
      x.el.value = x.f.wahl ? String(e[k]) : String(Math.round(e[k] * 10000) / 10000).replace('.', ',');
      x.zeile.classList.remove('widerspruch');
    }
    function einFeld(f, ziel) {
      const zeile = knoten('div', 'feld gegeben');
      const fid = id('f-' + f.k);
      const lab = document.createElement('label'); lab.htmlFor = fid;
      const sym = knoten('span', 'symbol'); if (f.tex) Formel.setze(sym, f.tex);
      lab.append(sym, knoten('span', 'name', f.name)); zeile.append(lab);
      let el;
      if (f.wahl) {
        el = document.createElement('select');
        f.wahl.forEach(function (w) { const o = knoten('option', '', w[1]); o.value = String(w[0]); el.append(o); });
        el.addEventListener('change', function () {
          e[f.k] = wahlWert(el.value);
          if (f.bei) f.bei(e, el.value, setzeWerte);
          rechnen();
        });
        zeile.append(el, knoten('span'));
        zeile.classList.add('mit-wahl');
      } else {
        el = document.createElement('input'); el.type = 'text'; el.inputMode = 'decimal'; el.autocomplete = 'off';
        el.addEventListener('input', function () {
          const w = lies(el.value);
          const ok = isFinite(w) && w >= f.min && w <= f.max;
          zeile.classList.toggle('widerspruch', !ok);
          el.setAttribute('aria-invalid', ok ? 'false' : 'true');
          if (!ok) { el.title = 'Erlaubt: ' + zahl(f.min, 3) + ' bis ' + zahl(f.max, 3) + ' ' + (f.e || ''); return; }
          el.title = '';
          e[f.k] = f.ganz ? Math.round(w) : w;
          if (f.bei) f.bei(e, w, setzeWerte);
          rechnen();
        });
        el.addEventListener('blur', function () { zeigeWert(f.k); el.setAttribute('aria-invalid', 'false'); });
        zeile.append(el, knoten('span', 'einheit', f.e || ''));
      }
      el.id = fid;
      if (f.hilfe) zeile.title = f.hilfe;
      felder[f.k] = { el: el, f: f, zeile: zeile };
      if (f.wenn) sichtbar.push([zeile, f.wenn]);
      ziel.append(zeile);
    }
    // Werte von außen setzen (z. B. Vorlagen) und anzeigen
    function setzeWerte(o) { Object.keys(o).forEach(function (k) { e[k] = o[k]; zeigeWert(k); }); }

    function eineListe(L, ziel) {
      const versteckt = document.createElement('input'); versteckt.type = 'hidden'; versteckt.id = id('l-' + L.k);
      const box = knoten('div', 'liste'); box.setAttribute('data-nicht-merken', '');
      const neuK = knoten('button', 'knopf', '+ ' + (L.zeile || 'Zeile') + ' hinzufügen'); neuK.type = 'button'; neuK.setAttribute('data-nicht-merken', '');
      function speichern() { versteckt.value = JSON.stringify(e[L.k]); }
      function pruefeZeile(z, i) {
        const neu = L.neu(i), o = {};
        L.spalten.forEach(function (s) {
          let w = z && z[s.k] !== undefined ? z[s.k] : neu[s.k];
          if (s.wahl) { if (!s.wahl.some(function (x) { return String(x[0]) === String(w); })) w = neu[s.k]; w = s.text ? w : wahlWert(String(w)); }
          else if (s.text) w = String(w).slice(0, 40);
          else { w = Number(w); if (!isFinite(w) || w < s.min || w > s.max) w = neu[s.k]; if (s.ganz) w = Math.round(w); }
          o[s.k] = w;
        });
        return o;
      }
      function aufbauen() {
        box.innerHTML = '';
        e[L.k].forEach(function (z, i) {
          const karte = knoten('fieldset', 'listen-zeile');
          const lg = knoten('legend'); lg.append(knoten('span', '', (L.zeile || 'Zeile') + ' ' + (i + 1)));
          const weg = knoten('button', 'entfernen', '×'); weg.type = 'button'; weg.setAttribute('aria-label', (L.zeile || 'Zeile') + ' ' + (i + 1) + ' entfernen');
          weg.disabled = e[L.k].length <= (L.min || 1);
          weg.addEventListener('click', function () { e[L.k].splice(i, 1); speichern(); aufbauen(); rechnen(); });
          lg.append(weg); karte.append(lg);
          L.spalten.forEach(function (s) {
            const lab = knoten('label', 'listen-feld' + (s.breit ? ' breit' : ''));
            lab.append(knoten('span', 'listen-name', s.name + (s.e ? ' (' + s.e + ')' : '')));
            let el;
            if (s.wahl) {
              el = document.createElement('select');
              s.wahl.forEach(function (w) { const o = knoten('option', '', w[1]); o.value = String(w[0]); el.append(o); });
              el.value = String(z[s.k]);
              el.addEventListener('change', function () { z[s.k] = s.text ? el.value : wahlWert(el.value); speichern(); rechnen(); });
            } else {
              el = document.createElement('input'); el.type = 'text'; el.autocomplete = 'off';
              if (!s.text) el.inputMode = 'decimal'; else el.className = 'text';
              el.value = s.text ? z[s.k] : String(Math.round(z[s.k] * 10000) / 10000).replace('.', ',');
              el.addEventListener('input', function () {
                if (s.text) { z[s.k] = el.value.slice(0, 40); speichern(); rechnen(); return; }
                const w = lies(el.value), ok = isFinite(w) && w >= s.min && w <= s.max;
                lab.classList.toggle('widerspruch', !ok); el.setAttribute('aria-invalid', ok ? 'false' : 'true');
                if (!ok) return;
                z[s.k] = s.ganz ? Math.round(w) : w; speichern(); rechnen();
              });
              el.addEventListener('blur', function () { if (!s.text) { el.value = String(Math.round(z[s.k] * 10000) / 10000).replace('.', ','); lab.classList.remove('widerspruch'); } });
            }
            lab.append(el); karte.append(lab);
          });
          box.append(karte);
        });
        neuK.disabled = e[L.k].length >= (L.max || 30);
      }
      neuK.addEventListener('click', function () {
        const letzte = e[L.k][e[L.k].length - 1];
        e[L.k].push(pruefeZeile(L.kopieren && letzte ? Object.assign({}, letzte, L.neu(e[L.k].length)) : null, e[L.k].length));
        speichern(); aufbauen(); rechnen();
        const f = box.querySelector('.listen-zeile:last-child input, .listen-zeile:last-child select'); if (f) f.focus();
      });
      // Wiederherstellen aus Merken oder Teilen-Link
      versteckt.addEventListener('input', function () {
        let a = null; try { a = JSON.parse(versteckt.value); } catch (x) { a = null; }
        if (!Array.isArray(a) || !a.length) return;
        e[L.k] = a.slice(0, L.max || 30).map(pruefeZeile);
        aufbauen(); rechnen();
      });
      ziel.append(versteckt, box, neuK);
      listen[L.k] = { aufbauen: aufbauen, speichern: speichern };
    }

    K.gruppen.forEach(function (g) {
      const fs = knoten('fieldset', 'gruppe'); fs.style.setProperty('--farbe', g.farbe || 'var(--linie)');
      fs.append(knoten('legend', '', g.titel));
      if (g.hilfe) fs.append(knoten('p', 'gruppen-hilfe', g.hilfe));
      if (g.liste) eineListe(g.liste, fs);
      (g.felder || []).forEach(function (f) { einFeld(f, fs); });
      if (g.wenn) sichtbar.push([fs, g.wenn]);
      felderZiel.append(fs);
    });
    function alleZeigen() {
      Object.keys(felder).forEach(zeigeWert);
      Object.keys(listen).forEach(function (k) { listen[k].speichern(); listen[k].aufbauen(); });
    }
    kBsp.addEventListener('click', function () { e = kopie(K.beispiel); alleZeigen(); rechnen(); });

    // ---------- Ergebnis-Bausteine ----------
    const H = {
      urteil: function (ok, text) {
        urteilEl.textContent = text || (ok ? 'reicht' : 'reicht nicht');
        urteilEl.className = 'urteil' + (ok === true ? ' gut' : ok === false ? ' schlecht' : '');
      },
      meldung: function (text, fehler) { const d = knoten('div', 'hinweis' + (fehler ? ' fehler' : ''), text); melEl.append(d); },
      kacheln: function (liste) {
        liste.forEach(function (k) {
          if (!k) return;
          const d = knoten('div', 'kachel'); d.style.setProperty('--farbe', k[2] || 'var(--linie)');
          d.append(knoten('div', 'wert', k[0]), knoten('small', '', k[1])); kachEl.append(d);
        });
      },
      nachweise: function (liste) {
        liste.forEach(function (n) {
          if (!n) return;
          const li = knoten('li', n[0] === true ? 'gut' : n[0] === false ? 'schlecht' : 'info');
          li.append(knoten('span', 'marke-n', n[0] === true ? '✓' : n[0] === false ? '✕' : 'i'), knoten('span', 'was', n[1]), knoten('span', 'wie', n[2] || ''));
          nwEl.append(li);
        });
      },
      // zeilen: Arrays von Texten; opt.zahl: Spalten rechtsbündig; opt.klasse(i): Zeilenklasse
      tabelle: function (titel, kopf, zeilen, opt) {
        opt = opt || {};
        if (titel) zusEl.append(knoten('h3', 'zwischen', titel));
        const rahmen = knoten('div', 'rahmen'), t = knoten('table', 'tabelle' + (opt.breit ? ' breit' : ''));
        const th = knoten('thead'), tr0 = knoten('tr');
        kopf.forEach(function (k, i) { tr0.append(knoten('th', (opt.zahl || []).indexOf(i) >= 0 ? 'zahl' : '', k)); });
        th.append(tr0); t.append(th);
        const tb = knoten('tbody');
        zeilen.forEach(function (z, j) {
          const tr = knoten('tr', opt.klasse ? opt.klasse(j) || '' : '');
          z.forEach(function (w, i) { tr.append(knoten('td', (opt.zahl || []).indexOf(i) >= 0 ? 'zahl' : '', w)); });
          tb.append(tr);
        });
        t.append(tb); rahmen.append(t); zusEl.append(rahmen);
        if (opt.fuss) zusEl.append(knoten('p', 'tabellen-fuss', opt.fuss));
      },
      absatz: function (text, titel) { if (titel) zusEl.append(knoten('h3', 'zwischen', titel)); zusEl.append(knoten('p', 'absatz', text)); },
      element: function (el) { zusEl.append(el); }
    };

    function schritt(t, tex) {
      const li = knoten('li'); const b = knoten('div', 'rechnung');
      Formel.setze(b, tex, false);
      li.append(knoten('div', 'titel', t), b); return li;
    }
    (K.sammlung || []).forEach(function (x) {
      const s = knoten('section'); s.append(knoten('h3', '', x[0]));
      const b = knoten('div', 'formelblock'); Formel.setze(b, x[1], true); s.append(b);
      if (x[2]) s.append(knoten('p', '', x[2]));
      samEl.append(s);
    });

    // ---------- Rechnen ----------
    let r = null;
    function rechnen() {
      sichtbar.forEach(function (s) { s[0].hidden = !s[1](e); });
      melEl.innerHTML = ''; kachEl.innerHTML = ''; nwEl.innerHTML = ''; zusEl.innerHTML = ''; wegEl.innerHTML = '';
      urteilEl.textContent = ''; urteilEl.className = 'urteil';
      try {
        r = K.rechne(e);
        K.ergebnis(r, e, H);
        (K.weg ? K.weg(r, e) : []).forEach(function (s) { if (s) wegEl.append(schritt(s[0], s[1])); });
      } catch (x) {
        r = null;
        melEl.innerHTML = ''; kachEl.innerHTML = ''; nwEl.innerHTML = ''; zusEl.innerHTML = '';
        H.meldung('Mit diesen Eingaben lässt sich nicht rechnen. Bitte Werte prüfen.', true);
        if (window.console) console.warn(x);
      }
      if (cv) zeichnen(letzteZeit);
      if (K.nachher) K.nachher(r, e);
    }

    // ---------- Zeichnung ----------
    let B = 600, Hh = 300, dpr = 1, laeuft = !!(K.bild && K.bild.animiert), letzteZeit = 0;
    const bewegungAus = false;
    function groesse() {
      if (!cv) return;
      B = Math.max(200, cv.parentElement.clientWidth - 40);
      dpr = window.devicePixelRatio || 1;
      Hh = Math.round(K.bild.hoehe ? K.bild.hoehe(B, e) : Math.max(220, Math.min(360, B * 0.55)));
      cv.width = Math.round(B * dpr); cv.height = Math.round(Hh * dpr);
      cv.style.width = '100%'; cv.style.height = Hh + 'px';
      B = cv.clientWidth || B;
      cv.width = Math.round(B * dpr);
    }
    function zeichnen(t) {
      if (!cv || !r) return;
      letzteZeit = t;
      const h = Math.round(K.bild.hoehe ? K.bild.hoehe(B, e) : Hh);
      if (h !== Hh) groesse();
      cx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx.clearRect(0, 0, B, Hh);
      cx.fillStyle = farbe('--flaeche2'); cx.fillRect(0, 0, B, Hh);
      try { K.bild.zeichne(cx, B, Hh, t, r, e); } catch (x) { if (window.console) console.warn(x); }
      if (bildHinweis && K.bild.hinweis) bildHinweis.textContent = K.bild.hinweis(r, e);
    }
    function schleife(t) { if (laeuft && !bewegungAus) zeichnen(t); requestAnimationFrame(schleife); }
    if (cv) {
      if (kAnim) kAnim.addEventListener('click', function () { laeuft = !laeuft; kAnim.textContent = laeuft ? '■ Anhalten' : '▶ Abspielen'; zeichnen(performance.now()); });
      let uhr = 0;
      window.addEventListener('resize', function () { clearTimeout(uhr); uhr = setTimeout(function () { groesse(); zeichnen(performance.now()); }, 60); });
      document.addEventListener('themawechsel', function () { zeichnen(performance.now()); });
      window.addEventListener('beforeprint', function () { zeichnen(letzteZeit); });
    }

    alleZeigen();
    groesse();
    rechnen();
    if (cv) { zeichnen(0); requestAnimationFrame(schleife); }
    return { werte: function () { return e; }, neu: rechnen, setze: function (o) { setzeWerte(o); rechnen(); }, bildZusatz: zusatzBild };
  }

  // ---------- Löser in jede Richtung ----------
  // Nullstelle von g im Bereich [a, b]: Raster (logarithmisch, wenn möglich) und Halbierung
  function nullstelle(g, a, b) {
    const N = 400, log = a > 0 && b / a > 50;
    const t = function (i) { return log ? a * Math.pow(b / a, i / N) : a + (b - a) * i / N; };
    let x0 = t(0), g0 = g(x0);
    if (g0 === 0) return x0;
    for (let i = 1; i <= N; i++) {
      const x1 = t(i), g1 = g(x1);
      if (g1 === 0) return x1;
      if (isFinite(g0) && isFinite(g1) && (g0 < 0) !== (g1 < 0)) {
        let lo = x0, hi = x1, glo = g0;
        for (let k = 0; k < 90; k++) {
          const m = log ? Math.sqrt(lo * hi) : (lo + hi) / 2, gm = g(m);
          if (!isFinite(gm)) break;
          if ((gm < 0) === (glo < 0)) { lo = m; glo = gm; } else hi = m;
        }
        // keine Polstelle: der Wert muss klein sein
        const xm = (lo + hi) / 2, gm = g(xm);
        if (isFinite(gm) && Math.abs(gm) <= 1e-6 * (Math.abs(g0) + Math.abs(g1)) + 1e-9) return xm;
      }
      x0 = x1; g0 = g1;
    }
    return NaN;
  }
  function loeserBauen(L, haupt, id) {
    const t = knoten('section', 'tafel abstand loeser'); const h = knoten('h2', '', L.titel || 'In jede Richtung rechnen'); h.id = id('loeser');
    t.setAttribute('aria-labelledby', h.id);
    const kz = knoten('div', 'kopf-zeile'); const urt = knoten('span', 'urteil'); urt.setAttribute('aria-live', 'polite');
    kz.append(h, urt); t.append(kz);
    t.append(knoten('p', 'hilfe', L.hilfe || 'Bekannte Werte eintragen, der Rest wird berechnet. Felder leeren, um eine andere Größe auszurechnen.'));
    const innen = knoten('div', 'loeser-innen'), feldBox = knoten('div', 'loeser-felder'), wegBox = knoten('div', 'loeser-weg');
    const ol = knoten('ol', 'weg'); wegBox.append(ol);
    const LW = {}, LEL = {}, FD = {};
    L.felder.forEach(function (fd) {
      FD[fd.k] = fd; LW[fd.k] = null;
      const zeile = knoten('div', 'feld'), lab = document.createElement('label'), fid = id('l-' + fd.k);
      lab.htmlFor = fid; const sym = knoten('span', 'symbol'); if (fd.tex) Formel.setze(sym, fd.tex); lab.append(sym, knoten('span', 'name', fd.name));
      const el = document.createElement('input'); el.id = fid; el.type = 'text'; el.inputMode = 'decimal'; el.autocomplete = 'off';
      const x = knoten('button', 'leeren', '×'); x.type = 'button'; x.setAttribute('aria-label', fd.name + ' leeren'); x.setAttribute('data-nicht-merken', '');
      el.addEventListener('input', function () {
        const w = lies(el.value);
        if (el.value.trim() === '') { LW[fd.k] = null; loesen(); return; }
        if (!isFinite(w) || w < fd.min || w > fd.max) {
          zeile.className = 'feld widerspruch'; el.setAttribute('aria-invalid', 'true');
          el.title = 'Erlaubt: ' + zahl(fd.min, 4) + ' bis ' + zahl(fd.max, 4) + ' ' + (fd.e || '');
          return;
        }
        el.title = ''; LW[fd.k] = w; loesen();
      });
      el.addEventListener('blur', function () { if (LW[fd.k] === null && zeile.classList.contains('widerspruch')) { el.value = ''; loesen(); } });
      x.addEventListener('click', function () { LW[fd.k] = null; el.value = ''; loesen(); el.focus(); });
      zeile.append(lab, el, knoten('span', 'einheit', fd.e || ''), x);
      feldBox.append(zeile); LEL[fd.k] = { z: zeile, e: el };
    });
    const knoepfe = knoten('div', 'stepper');
    const kB = knoten('button', 'knopf-leise', 'Beispiel'), kL = knoten('button', 'knopf-leise', 'Alle Felder leeren');
    kB.type = kL.type = 'button'; kB.setAttribute('data-nicht-merken', ''); kL.setAttribute('data-nicht-merken', '');
    knoepfe.append(kB, kL);
    innen.append(feldBox, wegBox); t.append(innen, knoepfe);
    haupt.append(t);
    function setze(o) {
      Object.keys(LW).forEach(function (k) {
        const w = o && o[k] !== undefined ? o[k] : null;
        LW[k] = w; LEL[k].e.value = w === null ? '' : String(w).replace('.', ',');
      });
      loesen();
    }
    kB.addEventListener('click', function () { setze(L.beispiel || {}); });
    kL.addEventListener('click', function () { setze({}); });
    function stellen(k, w) { return FD[k].n !== undefined ? FD[k].n : (Math.abs(w) >= 100 ? 0 : Math.abs(w) >= 10 ? 1 : Math.abs(w) >= 1 ? 2 : 3); }
    function loesen() {
      const x = {}, q = {}, weg = [], wid = {};
      Object.keys(LW).forEach(function (k) { if (LW[k] !== null) { x[k] = LW[k]; q[k] = 'g'; } });
      const benutzt = [];
      let weiter = true, runden = 0;
      while (weiter && runden++ < 50) {
        weiter = false;
        L.gleichungen.forEach(function (G, gi) {
          if (benutzt[gi]) return;
          const offen = G.v.filter(function (k) { return x[k] === undefined; });
          if (offen.length !== 1) return;
          const k = offen[0], fd = FD[k];
          let w = NaN;
          if (G.loese && G.loese[k]) { try { w = G.loese[k](x); } catch (e) { w = NaN; } }
          if (!isFinite(w)) {
            w = nullstelle(function (v) { const y = Object.assign({}, x); y[k] = v; const r = G.f(y); return r[0] - r[1]; }, fd.min, fd.max);
          }
          benutzt[gi] = true;
          if (!isFinite(w) || w < fd.min * (1 - 1e-9) - 1e-12 || w > fd.max * (1 + 1e-9) + 1e-12) {
            G.v.forEach(function (v) { if (q[v] === 'g') wid[v] = true; });
            weg.push([G.name + ': keine Lösung', '\\text{' + (fd.name + ' läge außerhalb von ' + zahl(fd.min, 4) + ' bis ' + zahl(fd.max, 4) + ' ' + (fd.e || '')).replace(/[{}\\$&#%_^~]/g, ' ') + '}']);
            return;
          }
          x[k] = w; q[k] = 'b'; weiter = true;
          let tex = '';
          try { tex = G.weg ? G.weg(k, x) : ''; } catch (e) { tex = ''; }
          weg.push([fd.name + (G.name ? ' (' + G.name + ')' : ''), tex || ((fd.tex || k) + ' = ' + E(tz(w, stellen(k, w)) + (fd.e ? '\\,\\text{' + fd.e.replace(/%/g, '\\%') + '}' : '')))]);
        });
      }
      // Gleichungen, deren Größen alle feststehen, aber nicht zum Rechnen benutzt wurden: passen sie?
      L.gleichungen.forEach(function (G, gi) {
        if (benutzt[gi] || !G.v.every(function (k) { return x[k] !== undefined; })) return;
        const r = G.f(x), d = Math.abs(r[0] - r[1]) / Math.max(Math.abs(r[0]), Math.abs(r[1]), 1e-12);
        if (!(d <= (L.toleranz || 0.005))) {
          G.v.forEach(function (v) { if (q[v] === 'g') wid[v] = true; });
          weg.push([(G.name || 'Gleichung') + ' passt nicht', '\\text{Die gegebenen Werte widersprechen sich um ' + zahl(d * 100, 1) + '\\,\\%.}']);
        }
      });
      const offen = L.felder.filter(function (fd) { return x[fd.k] === undefined; });
      if (!weg.length) weg.push([Object.keys(q).length ? 'Noch zu wenig Angaben' : 'Noch nichts eingetragen', '\\text{Weitere bekannte Werte eintragen.}']);
      L.felder.forEach(function (fd) {
        const k = fd.k, el = LEL[k];
        el.z.className = 'feld' + (wid[k] ? ' widerspruch' : q[k] === 'g' ? ' gegeben' : q[k] === 'b' ? ' berechnet' : '');
        el.e.setAttribute('aria-invalid', wid[k] ? 'true' : 'false');
        if (q[k] === 'b') el.e.value = zahl(x[k], stellen(k, x[k])).replace(/\s/g, ''); else if (q[k] !== 'g') el.e.value = '';
      });
      const n = Object.keys(wid).length;
      urt.textContent = n ? 'Widerspruch' : offen.length ? offen.length + ' offen' : 'vollständig';
      urt.className = 'urteil' + (n ? ' schlecht' : offen.length ? '' : ' gut');
      ol.innerHTML = '';
      weg.forEach(function (s) { const li = knoten('li'), b = knoten('div', 'rechnung'); Formel.setze(b, s[1], false); li.append(knoten('div', 'titel', s[0]), b); ol.append(li); });
      if (L.nachher) L.nachher(x, q);
    }
    setze(L.beispiel || {});
  }

  // ---------- Zeichenhilfen ----------
  const Z = {
    pfeil: function (cx, x1, y1, x2, y2, kopf) {
      kopf = kopf || 7;
      const a = Math.atan2(y2 - y1, x2 - x1);
      cx.beginPath(); cx.moveTo(x1, y1); cx.lineTo(x2, y2); cx.stroke();
      cx.beginPath(); cx.moveTo(x2, y2);
      cx.lineTo(x2 - kopf * Math.cos(a - 0.4), y2 - kopf * Math.sin(a - 0.4));
      cx.lineTo(x2 - kopf * Math.cos(a + 0.4), y2 - kopf * Math.sin(a + 0.4));
      cx.closePath(); cx.fill();
    },
    text: function (cx, t, x, y, ausr, groesse, fett, f) {
      cx.fillStyle = f || farbe('--text');
      cx.font = (fett === false ? '' : '600 ') + (groesse || 12) + 'px ' + (farbe('--technik') || 'sans-serif');
      cx.textAlign = ausr || 'left'; cx.textBaseline = 'middle';
      cx.fillText(t, x, y);
    },
    // Farbe zwischen kalt (0) und warm (1)
    waerme: function (a) {
      a = Math.max(0, Math.min(1, a));
      const s = [[43, 123, 185], [110, 111, 166], [228, 87, 46], [242, 165, 65]];
      const p = a * (s.length - 1), i = Math.min(s.length - 2, Math.floor(p)), f = p - i;
      const c = s[i].map(function (v, j) { return Math.round(v + (s[i + 1][j] - v) * f); });
      return 'rgb(' + c.join(',') + ')';
    },
    // Achsen für Diagramme: gibt Umrechnung zurück
    achsen: function (cx, x0, y0, b, h, xa, xb, ya, yb, opt) {
      opt = opt || {};
      const X = function (v) { return x0 + (v - xa) / (xb - xa) * b; };
      const Y = function (v) { return y0 + h - (v - ya) / (yb - ya) * h; };
      cx.strokeStyle = farbe('--linie'); cx.lineWidth = 1;
      const sx = opt.xSchritt || (xb - xa) / 5, sy = opt.ySchritt || (yb - ya) / 4;
      cx.font = '11px ' + farbe('--technik'); cx.fillStyle = farbe('--leise');
      for (let v = Math.ceil(xa / sx) * sx, n = 0; v <= xb + 1e-9 && n < 60; v += sx, n++) {
        cx.beginPath(); cx.moveTo(X(v), y0); cx.lineTo(X(v), y0 + h); cx.stroke();
        cx.textAlign = 'center'; cx.textBaseline = 'top'; cx.fillText(zahl(v, opt.xStellen || 0), X(v), y0 + h + 4);
      }
      for (let v = Math.ceil(ya / sy) * sy, n = 0; v <= yb + 1e-9 && n < 60; v += sy, n++) {
        cx.beginPath(); cx.moveTo(x0, Y(v)); cx.lineTo(x0 + b, Y(v)); cx.stroke();
        cx.textAlign = 'right'; cx.textBaseline = 'middle'; cx.fillText(zahl(v, opt.yStellen || 0), x0 - 4, Y(v));
      }
      if (opt.xName) { cx.textAlign = 'right'; cx.textBaseline = 'top'; cx.fillText(opt.xName, x0 + b, y0 + h + 18); }
      if (opt.yName) { cx.textAlign = 'left'; cx.textBaseline = 'bottom'; cx.fillText(opt.yName, x0, y0 - 4); }
      return { X: X, Y: Y };
    }
  };

  window.Rechner = { seite: seite, zahl: zahl, rund: rund, tz: tz, E: E, F: F, EF: EF, lies: lies, farbe: farbe, Z: Z };
})();
