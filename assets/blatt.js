/*
 * Aufgabenblätter aus Markdown
 * ============================
 * Liest eine kleine, sichere Untermenge von Markdown und baut daraus DOM-Knoten (kein innerHTML mit Nutzertext).
 * Unterstützt: Überschriften (# bis ####), Absätze, **fett**, *kursiv*, `Code`, Listen (-, *, 1.), Tabellen (| a | b |),
 * Zitate (>), Trennlinie (---), Links und Bilder (nur relative Adressen oder https), Formeln $…$ und $$…$$ (KaTeX),
 * Lücken (___) und Lösungsblöcke:
 *   :::lösung
 *   Rechenweg …
 *   :::
 * Einbinden: <script src="assets/blatt.js"></script>, dann Blatt.baue(text, basisPfad) → DocumentFragment.
 */
(function () {
  'use strict';
  if (window.Blatt) return;

  const el = function (tag, klasse, text) { const e = document.createElement(tag); if (klasse) e.className = klasse; if (text !== undefined) e.textContent = text; return e; };

  // Adresse prüfen: nur https oder relativ (ohne javascript:, data: usw.), relative Pfade gegen den Ordner des Blatts
  function adresse(url, basis, bild) {
    url = String(url || '').trim();
    if (/^https:\/\//i.test(url)) return bild ? null : url;   // Bilder nur lokal, damit offline alles da ist
    if (/^[a-z][a-z0-9+.-]*:/i.test(url) || /^\/\//.test(url)) return null;
    if (url.charAt(0) === '#') return bild ? null : url;
    if (url.charAt(0) === '/') return url;
    return (basis || '') + url;
  }

  function formel(ziel, tex, block) {
    tex = String(tex).replace(/\\text\{\s*€\s*\}/g, '€').replace(/€/g, '\\text{€}');   // € aufrecht statt kursiv
    try { if (window.Formel && Formel.setze) { Formel.setze(ziel, tex, block); return; } } catch (x) { /* unten als Text */ }
    ziel.textContent = block ? tex : '$' + tex + '$'; ziel.classList.add('formel-text');
  }

  // ---------- Text innerhalb einer Zeile ----------
  const MUSTER = /(\$\$[^$]+\$\$|\$[^$\s][^$]*?\$|`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\*[^*\s][^*]*\*|!\[[^\]]*\]\([^)\s]+\)|\[[^\]]+\]\([^)\s]+\)|_{3,})/;
  function zeile(text, basis) {
    const frag = document.createDocumentFragment();
    let rest = String(text);
    let n = 0;
    while (rest && n++ < 2000) {
      const m = MUSTER.exec(rest);
      if (!m) { frag.append(document.createTextNode(rest)); break; }
      if (m.index) frag.append(document.createTextNode(rest.slice(0, m.index)));
      const t = m[0];
      if (t.slice(0, 2) === '$$') { const s = el('span', 'blatt-formel-block'); formel(s, t.slice(2, -2).trim(), true); frag.append(s); }
      else if (t.charAt(0) === '$') { const s = el('span'); formel(s, t.slice(1, -1), false); frag.append(s); }
      else if (t.charAt(0) === '`') frag.append(el('code', '', t.slice(1, -1)));
      else if (t.slice(0, 2) === '**' || (t.slice(0, 2) === '__' && t.length > 4 && /[^_]/.test(t))) { const b = el('strong'); b.append(zeile(t.slice(2, -2), basis)); frag.append(b); }
      else if (/^_{3,}$/.test(t)) { const s = el('span', 'blatt-luecke'); s.setAttribute('aria-label', 'Lücke'); frag.append(s); }
      else if (t.charAt(0) === '*') { const i = el('em'); i.append(zeile(t.slice(1, -1), basis)); frag.append(i); }
      else if (t.charAt(0) === '!') {
        const mm = /^!\[([^\]]*)\]\(([^)\s]+)\)$/.exec(t), u = adresse(mm[2], basis, true);
        if (u) { const img = el('img'); img.alt = mm[1]; img.src = u; img.loading = 'lazy'; frag.append(img); } else frag.append(document.createTextNode(mm[1]));
      } else {
        const mm = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(t), u = adresse(mm[2], basis, false);
        if (u) { const a = el('a'); a.href = u; if (/^https:/i.test(u)) { a.target = '_blank'; a.rel = 'noopener noreferrer'; } a.append(zeile(mm[1], basis)); frag.append(a); }
        else frag.append(document.createTextNode(mm[1]));
      }
      rest = rest.slice(m.index + t.length);
    }
    return frag;
  }

  // ---------- Blöcke ----------
  const zelle = function (z) { return z.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(function (x) { return x.trim(); }); };
  function bloecke(zeilen, basis, tiefe) {
    const frag = document.createDocumentFragment();
    let i = 0, absatz = [];
    const absatzEnde = function () {
      if (!absatz.length) return;
      const p = el('p');
      absatz.forEach(function (z, k) { if (k) p.append(/ {2}$|\\$/.test(absatz[k - 1]) ? el('br') : document.createTextNode(' ')); p.append(zeile(z.replace(/\\$/, '').trim(), basis)); });
      frag.append(p); absatz = [];
    };
    while (i < zeilen.length) {
      const z = zeilen[i], t = z.trim();
      if (!t) { absatzEnde(); i++; continue; }
      // Lösungsblock
      let m = /^:::\s*(l(?:ö|oe|o)sung|hinweis|tipp)\s*(.*)$/i.exec(t);
      if (m && tiefe < 4) {
        absatzEnde();
        const art = m[1].toLowerCase(), innen = []; i++;
        let offen = 1;
        while (i < zeilen.length) { const tt = zeilen[i].trim(); if (/^:::\s*\S/.test(tt)) offen++; else if (tt === ':::') { offen--; if (!offen) break; } innen.push(zeilen[i]); i++; }
        i++;
        const d = el('details', art === 'hinweis' || art === 'tipp' ? 'blatt-tipp' : 'blatt-loesung');
        d.append(el('summary', '', m[2].trim() || (art === 'hinweis' ? 'Hinweis' : art === 'tipp' ? 'Tipp' : 'Lösung')));
        const inhalt = el('div', 'blatt-innen'); inhalt.append(bloecke(innen, basis, tiefe + 1)); d.append(inhalt);
        frag.append(d); continue;
      }
      // Formelblock über mehrere Zeilen
      if (/^\$\$/.test(t) && !/^\$\$.+\$\$$/.test(t)) {
        absatzEnde();
        const innen = [t.slice(2)]; i++;
        while (i < zeilen.length && !/\$\$\s*$/.test(zeilen[i])) { innen.push(zeilen[i]); i++; }
        if (i < zeilen.length) innen.push(zeilen[i].replace(/\$\$\s*$/, ''));
        i++;
        const d = el('div', 'blatt-formel-block'); formel(d, innen.join('\n').trim(), true); frag.append(d); continue;
      }
      // Codeblock
      if (/^```/.test(t)) {
        absatzEnde(); const innen = []; i++;
        while (i < zeilen.length && !/^```/.test(zeilen[i].trim())) { innen.push(zeilen[i]); i++; }
        i++; const pre = el('pre'); pre.append(el('code', '', innen.join('\n'))); frag.append(pre); continue;
      }
      m = /^(#{1,4})\s+(.*?)\s*#*$/.exec(t);
      if (m) { absatzEnde(); const h = el('h' + Math.min(6, m[1].length + 1)); h.append(zeile(m[2], basis)); frag.append(h); i++; continue; }
      if (/^(-{3,}|\*{3,}|_{3,})$/.test(t.replace(/\s/g, ''))) { absatzEnde(); frag.append(el('hr')); i++; continue; }
      if (/^>/.test(t)) {
        absatzEnde(); const innen = [];
        while (i < zeilen.length && /^\s*>/.test(zeilen[i])) { innen.push(zeilen[i].replace(/^\s*>\s?/, '')); i++; }
        const q = el('blockquote'); q.append(bloecke(innen, basis, tiefe + 1)); frag.append(q); continue;
      }
      // Tabelle: Kopfzeile, Trennzeile |---|---|
      if (/^\|/.test(t) && i + 1 < zeilen.length && /^\s*\|?\s*:?-{2,}/.test(zeilen[i + 1]) && /\|/.test(zeilen[i + 1])) {
        absatzEnde();
        const kopf = zelle(t), ausr = zelle(zeilen[i + 1]).map(function (x) { return /^:-+:$/.test(x) ? 'center' : /-:$/.test(x) ? 'right' : ''; });
        const huelle = el('div', 'blatt-tabelle'), tab = el('table'), th = el('thead'), tr = el('tr');
        kopf.forEach(function (k, j) { const c = el('th'); c.append(zeile(k, basis)); if (ausr[j]) c.style.textAlign = ausr[j]; tr.append(c); });
        th.append(tr); tab.append(th); const tb = el('tbody'); i += 2;
        while (i < zeilen.length && /^\s*\|/.test(zeilen[i])) {
          const r = el('tr'); zelle(zeilen[i]).slice(0, kopf.length).forEach(function (k, j) { const c = el('td'); c.append(zeile(k, basis)); if (ausr[j]) c.style.textAlign = ausr[j]; r.append(c); });
          tb.append(r); i++;
        }
        tab.append(tb); huelle.append(tab); frag.append(huelle); continue;
      }
      // Listen (eine Ebene Einrückung für Unterpunkte)
      m = /^(\s*)([-*+]|\d{1,3}[.)])\s+(.*)$/.exec(z);
      if (m) {
        absatzEnde();
        const geordnet = /\d/.test(m[2]), liste = el(geordnet ? 'ol' : 'ul');
        if (geordnet && parseInt(m[2], 10) !== 1) liste.start = parseInt(m[2], 10);
        const einzug = m[1].length;
        let li = null;
        while (i < zeilen.length) {
          const zz = zeilen[i], mm = /^(\s*)([-*+]|\d{1,3}[.)])\s+(.*)$/.exec(zz);
          if (mm && mm[1].length <= einzug) {
            if (/\d/.test(mm[2]) !== geordnet) break;
            li = el('li'); const aufgabe = /^\[( |x)\]\s+/i.exec(mm[3]);
            if (aufgabe) { const c = el('input'); c.type = 'checkbox'; c.checked = aufgabe[1].toLowerCase() === 'x'; c.setAttribute('data-nicht-merken', ''); c.setAttribute('aria-label', 'erledigt'); li.append(c, document.createTextNode(' ')); li.append(zeile(mm[3].slice(aufgabe[0].length), basis)); }
            else li.append(zeile(mm[3], basis));
            liste.append(li); i++;
          } else if (li && zz.trim() && /^\s+/.test(zz) && /^\s*(\d{1,3}[.)]|[-*+])\s+/.test(zz)) {
            const unter = []; while (i < zeilen.length && /^\s+\S/.test(zeilen[i])) { unter.push(zeilen[i].replace(/^\s{1,4}/, '')); i++; }
            li.append(bloecke(unter, basis, tiefe + 1));
          } else if (li && zz.trim() && /^\s{2,}\S/.test(zz)) { li.append(document.createTextNode(' ')); li.append(zeile(zz.trim(), basis)); i++; }
          else break;
        }
        frag.append(liste); continue;
      }
      absatz.push(z); i++;
    }
    absatzEnde();
    return frag;
  }

  // Titel = erste Überschrift; Kopfzeilen der Form „Schlüssel: Wert“ zwischen --- am Anfang werden gelesen und entfernt
  function zerlege(text) {
    let t = String(text || '').replace(/\r\n?/g, '\n').replace(/^﻿/, '');
    const daten = {};
    const vorn = /^---\n([\s\S]*?)\n---\n/.exec(t);
    if (vorn) { vorn[1].split('\n').forEach(function (z) { const m = /^([a-zäöü]+)\s*:\s*(.*)$/i.exec(z.trim()); if (m) daten[m[1].toLowerCase()] = m[2].trim().slice(0, 200); }); t = t.slice(vorn[0].length); }
    const h = /^#\s+(.+)$/m.exec(t);
    if (!daten.titel && h) daten.titel = h[1].trim();
    return { daten: daten, text: t };
  }

  window.Blatt = {
    zerlege: zerlege,
    baue: function (text, basis) { const z = zerlege(text); return bloecke(z.text.slice(0, 200000).split('\n'), basis || '', 0); }
  };
})();
