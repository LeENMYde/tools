/*
 * Gemeinsame Helfer für alle Seiten der Sammlung
 * ==============================================
 * Im <head> einbinden (ohne defer, damit das Farbthema sofort sitzt):
 *   <script src="../assets/basis.js"></script>
 *
 * Auf der Seite:
 *   <div id="seitenkopf" data-wurzel="../"></div>   → Kopfzeile mit Marke, Navigation, Hell/Dunkel
 *   <div id="seitenfuss" data-wurzel="../"></div>   → Fußzeile
 *   <span data-tex="Q = m \cdot c \cdot \Delta T"></span>          → Formel (KaTeX, im Text)
 *   <div data-tex-block="W = \frac{Q}{3600}"></div>                  → Formel als eigene Zeile
 *
 * In Skripten:
 *   Formel.setze(element, 'U = R \\cdot I', true)
 *   Thema.farbe('--text')     → aktuelle Farbe aus stil.css (z. B. für Canvas)
 *   document.addEventListener('themawechsel', …)
 *   Teilen.url('plan', objekt) / Teilen.lesen('plan') / Teilen.uebernehmen(…)   → Links zum Teilen (siehe unten)
 */
(function () {
  'use strict';

  // ---------- Farbthema ----------
  const SPEICHER = 'sammlung-thema';

  function gespeichertesThema() {
    try { return localStorage.getItem(SPEICHER); } catch (e) { return null; }
  }

  function aktuellesThema() {
    const gesetzt = document.documentElement.getAttribute('data-thema');
    if (gesetzt) return gesetzt;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dunkel' : 'hell';
  }

  function themaSetzen(thema, merken) {
    document.documentElement.setAttribute('data-thema', thema);
    if (merken) { try { localStorage.setItem(SPEICHER, thema); } catch (e) { /* privates Fenster */ } }
    document.dispatchEvent(new CustomEvent('themawechsel', { detail: thema }));
    schalterAktualisieren();
  }

  const vorher = gespeichertesThema();
  if (vorher === 'hell' || vorher === 'dunkel') document.documentElement.setAttribute('data-thema', vorher);

  if (window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const folgen = function () { if (!gespeichertesThema()) document.dispatchEvent(new CustomEvent('themawechsel', { detail: aktuellesThema() })); };
    if (mq.addEventListener) mq.addEventListener('change', folgen); else if (mq.addListener) mq.addListener(folgen);
  }

  window.Thema = {
    aktuell: aktuellesThema,
    setze: function (t) { themaSetzen(t, true); },
    // Wert einer CSS-Variablen aus stil.css, z. B. für Zeichnungen auf Canvas
    farbe: function (name) {
      return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    }
  };

  const MOND = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
  const SONNE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';

  function schalterAktualisieren() {
    document.querySelectorAll('.themenschalter').forEach(function (k) {
      const dunkel = aktuellesThema() === 'dunkel';
      k.innerHTML = dunkel ? SONNE : MOND;
      k.setAttribute('aria-label', dunkel ? 'Helles Design' : 'Dunkles Design');
      k.title = k.getAttribute('aria-label');
    });
  }


  // ---------- Formeln mit KaTeX ----------
  window.Formel = {
    setze: function (element, tex, block) {
      if (!window.katex) { element.textContent = tex; return; }
      try {
        window.katex.render(tex, element, {
          displayMode: !!block, throwOnError: false, strict: 'ignore', output: 'html',
          // \htmlClass{ergebnis}{…} erlaubt, damit Ergebnisse im Farbthema erscheinen
          trust: function (k) { return k.command === '\\htmlClass'; }
        });
      } catch (e) {
        element.textContent = tex;
      }
    },
    alle: function (wurzel) {
      (wurzel || document).querySelectorAll('[data-tex], [data-tex-block]').forEach(function (el) {
        const block = el.hasAttribute('data-tex-block');
        Formel.setze(el, el.getAttribute(block ? 'data-tex-block' : 'data-tex'), block);
      });
    },
    // Zahl für LaTeX: deutsches Komma ohne Zwischenraum, schmales Leerzeichen als Tausendertrenner
    zahl: function (text) {
      // erst das Komma, dann das Leerzeichen (sonst würde das Komma in \\, mit ersetzt)
      return String(text).replace(/,/g, '{,}').replace(/\u202F/g, '\\,').replace(/−/g, '-');
    }
  };


  // ---------- Favoriten: nur in diesem Browser gespeichert ----------
  // Liste von Pfaden relativ zur Startseite, z. B. "it/usv.html"; Ereignis „favoritenwechsel“ bei jeder Änderung
  const FAV_SPEICHER = 'favoriten-1';
  const FAV_MUSTER = /^[a-z0-9][a-z0-9-]{0,60}(\/[a-z0-9][a-z0-9-]{0,60})?\.html$/;
  let favNotfall = [];   // falls der Browser keinen Speicher erlaubt: wenigstens bis zum Neuladen
  function favLesen() {
    let a = null;
    try { a = JSON.parse(localStorage.getItem(FAV_SPEICHER) || 'null'); } catch (e) { a = null; }
    if (!Array.isArray(a)) a = favNotfall;
    return a.filter(function (p, i) { return typeof p === 'string' && FAV_MUSTER.test(p) && p !== 'index.html' && a.indexOf(p) === i; }).slice(0, 300);
  }
  function favSchreiben(a) {
    favNotfall = a.slice();
    try { localStorage.setItem(FAV_SPEICHER, JSON.stringify(a)); } catch (e) { /* privates Fenster */ }
    document.dispatchEvent(new CustomEvent('favoritenwechsel'));
  }
  // Pfad dieser Seite relativ zur Startseite (aus data-wurzel); null auf der Startseite
  function favPfadHier() {
    const kopf = document.getElementById('seitenkopf');
    const tiefe = ((kopf && kopf.getAttribute('data-wurzel')) || '').split('../').length - 1;
    const teile = location.pathname.split('/').filter(Boolean);
    let p = '';
    try { p = teile.slice(-(tiefe + 1)).map(decodeURIComponent).join('/'); } catch (e) { return null; }
    return FAV_MUSTER.test(p) && p !== 'index.html' ? p : null;
  }
  window.Favoriten = {
    liste: favLesen,
    ist: function (p) { return favLesen().indexOf(p) >= 0; },
    setze: function (p, an) {
      if (typeof p !== 'string' || !FAV_MUSTER.test(p)) return;
      const a = favLesen().filter(function (x) { return x !== p; });
      if (an) a.push(p);
      favSchreiben(a);
    },
    umschalten: function (p) { const an = !this.ist(p); this.setze(p, an); return an; },
    hier: favPfadHier
  };
  window.addEventListener('storage', function (ev) { if (ev.key === FAV_SPEICHER) document.dispatchEvent(new CustomEvent('favoritenwechsel')); });
  const STERN = '<svg viewBox="0 0 24 24" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z"/></svg>';
  window.Favoriten.stern = STERN;
  function favKnopfAktualisieren() {
    const p = favPfadHier();
    document.querySelectorAll('.favorit-schalter').forEach(function (k) {
      const an = !!p && favLesen().indexOf(p) >= 0;
      k.setAttribute('aria-pressed', String(an));
      k.setAttribute('aria-label', an ? 'Aus den Favoriten entfernen' : 'Zu den Favoriten hinzufügen');
      k.title = an ? 'Favorit – auf der Übersicht unter „Favoriten“' : 'Als Favorit merken';
    });
  }
  document.addEventListener('favoritenwechsel', favKnopfAktualisieren);

  // ---------- Kopf- und Fußzeile ----------
  function kopfBauen() {
    const ziel = document.getElementById('seitenkopf');
    if (!ziel) return;
    const wurzel = ziel.getAttribute('data-wurzel') || '';
    const hier = ziel.getAttribute('data-seite') || '';
    const haupt = document.querySelector('main');
    if (haupt && !haupt.id) haupt.id = 'inhalt';
    ziel.className = 'seite';
    ziel.innerHTML =
      '<a class="sprung" href="#' + (haupt ? haupt.id : 'inhalt') + '">Zum Inhalt</a>' +
      '<header class="seitenkopf">' +
        '<a class="marke" href="' + wurzel + 'index.html"><span class="marke-zeichen" aria-hidden="true">∑</span>Formeln &amp; Rechner</a>' +
        '<nav aria-label="Hauptnavigation">' +
          '<a href="' + wurzel + 'index.html"' + (hier === 'start' ? ' aria-current="page"' : '') + '>Übersicht</a>' +
          '<a class="optional" href="' + wurzel + 'index.html#bereiche">Bereiche</a>' +
          '<a class="optional" href="' + wurzel + 'projektmappe.html"' + (/projektmappe\.html$/.test(location.pathname) ? ' aria-current="page"' : '') + '>Projekte</a>' +
          '<button type="button" class="installieren" hidden>App installieren</button>' +
          (hier !== 'start' && favPfadHier() ? '<button type="button" class="favorit-schalter" aria-pressed="false">' + STERN + '</button>' : '') +
          '<button type="button" class="themenschalter"></button>' +
        '</nav>' +
      '</header>';
    ziel.querySelector('.themenschalter').addEventListener('click', function () {
      themaSetzen(aktuellesThema() === 'dunkel' ? 'hell' : 'dunkel', true);
    });
    schalterAktualisieren();
    const fav = ziel.querySelector('.favorit-schalter');
    if (fav) {
      fav.addEventListener('click', function () { const p = favPfadHier(); if (p) window.Favoriten.umschalten(p); });
      favKnopfAktualisieren();
    }
    const inst = ziel.querySelector('.installieren');
    if (installAngebot) inst.hidden = false;
    inst.addEventListener('click', function () {
      if (!installAngebot) return;
      installAngebot.prompt();
      installAngebot.userChoice.then(function () { installAngebot = null; inst.hidden = true; });
    });
  }

  // ---------- Als App installieren und offline nutzen ----------
  let installAngebot = null;
  window.addEventListener('beforeinstallprompt', function (ev) {
    ev.preventDefault();
    installAngebot = ev;
    document.querySelectorAll('.installieren').forEach(function (k) { k.hidden = false; });
  });
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', function () {
      const kopf = document.getElementById('seitenkopf');
      const wurzel = (kopf && kopf.getAttribute('data-wurzel')) || '';
      navigator.serviceWorker.register(wurzel + 'sw.js').catch(function () { /* ohne Offline-Speicher geht es auch */ });
    });
  }

  function fussBauen() {
    const ziel = document.getElementById('seitenfuss');
    if (!ziel) return;
    ziel.className = 'seite';
    ziel.innerHTML =
      '<footer class="seitenfuss">' +
        '<p class="haftung"><strong>Ohne Gewähr.</strong> Formeln, Tabellenwerte und Ergebnisse sind sorgfältig erstellt, können aber Fehler enthalten. ' +
        'Ergebnisse vor der Ausführung prüfen; maßgeblich sind die gültigen Normen, Herstellerangaben und die Fachplanung. ' +
        'Etwas passt nicht? Bitte melden an <a href="mailto:support@pr1m3.de?subject=' + encodeURIComponent('Hinweis zu: ' + document.title) + '">support@pr1m3.de</a>.</p>' +
        '<span>Läuft komplett offline, ohne externe Dateien' + (/^https?:$/.test(location.protocol) && 'serviceWorker' in navigator ? ', einmal geladen auch ohne Netz' : '') + '.</span>' +
        '<span>Formelsatz mit KaTeX (MIT-Lizenz), lokal in assets/katex.</span>' +
      '</footer>';
  }

  // ---------- Links zum Teilen: ein Muster für alle Seiten ----------
  // Format: seite.html#werte=z.<deflate-raw, base64url>   (ohne „z.“ unkomprimiert, für alte Browser)
  //  - steht hinter „#“ und geht nie an den Server; ein Anker der Seite bleibt erhalten: #reiter&werte=…
  //  - wird beim Laden sofort aus der Adresse genommen (vor den Skripten der Seite), damit Neuladen den eigenen Stand zeigt
  //  - vor dem Übernehmen wird der bisherige Stand gesichert („Vorherige Werte wiederherstellen“)
  //  - Inhalte werden geprüft; strukturierte Daten laufen durch Teilen.entschaerfen
  //  - alte Links mit ?werte=, ?plan=, ?anlage= funktionieren weiter
  const LINK_NAMEN = ['werte', 'plan', 'anlage', 'dach'];
  const linkRoh = {};
  (function linkAbholen() {
    let geaendert = false;
    function teile(t) {
      return (t ? t.split('&') : []).filter(function (x) {
        const i = x.indexOf('='), n = i > 0 ? x.slice(0, i) : '';
        if (LINK_NAMEN.indexOf(n) < 0) return true;
        if (!linkRoh[n]) linkRoh[n] = x.slice(i + 1);
        geaendert = true;
        return false;
      }).join('&');
    }
    const anker = teile(location.hash.slice(1)), suche = teile(location.search.slice(1));
    if (geaendert) { try { history.replaceState(null, '', location.pathname + (suche ? '?' + suche : '') + (anker ? '#' + anker : '')); } catch (e) { /* file:// u. a. */ } }
  })();
  // neuer Link in demselben Tab (nur der Teil hinter # ändert sich): Seite neu laden, dann greift linkAbholen
  window.addEventListener('hashchange', function () {
    if (location.hash.slice(1).split('&').some(function (x) { return LINK_NAMEN.indexOf(x.split('=')[0]) >= 0; })) location.reload();
  });
  function b64zuBytes(t) { const z = atob(t.replace(/-/g, '+').replace(/_/g, '/')); const b = new Uint8Array(z.length); for (let i = 0; i < z.length; i++) b[i] = z.charCodeAt(i); return b; }
  function bytesZuB64(b) { let z = ''; for (let i = 0; i < b.length; i += 8192) z += String.fromCharCode.apply(null, b.subarray(i, i + 8192)); return btoa(z).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function textZuB64(t) { return typeof TextEncoder !== 'undefined' ? bytesZuB64(new TextEncoder().encode(t)) : btoa(unescape(encodeURIComponent(t))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function b64ZuText(k) { return typeof TextDecoder !== 'undefined' ? new TextDecoder().decode(b64zuBytes(k)) : decodeURIComponent(escape(atob(k.replace(/-/g, '+').replace(/_/g, '/')))); }
  function packen(text) {
    if (typeof CompressionStream === 'undefined' || typeof Response === 'undefined') return Promise.resolve(textZuB64(text));
    return new Response(new Blob([text]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer()
      .then(function (ab) { return 'z.' + bytesZuB64(new Uint8Array(ab)); }, function () { return textZuB64(text); });
  }
  function entpacken(k) {
    try { k = decodeURIComponent(k); } catch (e) { /* schon roh */ }
    try {
      if (k.slice(0, 2) !== 'z.') return Promise.resolve(b64ZuText(k));
      if (typeof DecompressionStream === 'undefined') return Promise.reject(new Error('Dieser Browser kann komprimierte Links nicht entpacken.'));
      return new Response(new Blob([b64zuBytes(k.slice(2))]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
    } catch (e) { return Promise.reject(e); }
  }
  // Strukturierte Daten entschärfen: Texte ohne < > " ' ` und begrenzt, Listen und Tiefe begrenzt, keine gefährlichen Schlüssel
  function entschaerfen(w, tiefe) {
    tiefe = tiefe || 0;
    if (tiefe > 14) return null;
    if (typeof w === 'string') return w.replace(/[<>"'`]/g, '').slice(0, 300);
    if (typeof w === 'number') return isFinite(w) ? w : 0;
    if (typeof w === 'boolean' || w === null) return w;
    if (Array.isArray(w)) return w.slice(0, 5000).map(function (x) { return entschaerfen(x, tiefe + 1); });
    if (typeof w === 'object') {
      const o = {};
      Object.keys(w).slice(0, 300).forEach(function (k) { if (k === '__proto__' || k === 'constructor' || k === 'prototype' || k.length > 60) return; o[k] = entschaerfen(w[k], tiefe + 1); });
      return o;
    }
    return null;
  }
  function kopieren(url, melden) {
    const ok = function () { melden('Link kopiert (' + url.length.toLocaleString('de-DE') + ' Zeichen) – öffnet diese Seite mit genau diesem Stand.'); };
    if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) navigator.clipboard.writeText(url).then(ok, function () { window.prompt('Link kopieren:', url); });
    else window.prompt('Link kopieren:', url);
  }
  function lsLesen(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSchreiben(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* ohne Speicher */ } }
  window.Teilen = {
    namen: LINK_NAMEN,
    hat: function (name) { return Object.prototype.hasOwnProperty.call(linkRoh, name); },
    // Promise mit dem Objekt aus dem Link, null ohne Link; Fehler bei kaputtem Link
    lesen: function (name) {
      if (!this.hat(name)) return Promise.resolve(null);
      const roh = linkRoh[name]; delete linkRoh[name];
      return entpacken(roh).then(function (t) { if (t.length > 2000000) throw new Error('zu groß'); return JSON.parse(t); });
    },
    // Promise mit der fertigen Adresse; der aktuelle Anker der Seite bleibt erhalten
    url: function (name, objekt) {
      const anker = location.hash.slice(1);
      return packen(JSON.stringify(objekt)).then(function (k) { return location.href.split('#')[0].split('?')[0] + '#' + (anker ? anker + '&' : '') + name + '=' + k; });
    },
    // nur der Teil hinter „#“ ohne Komprimierung (für viele Links auf einmal, z. B. Projektmappe)
    urlSofort: function (pfad, name, text) { return pfad + '#' + name + '=' + textZuB64(text); },
    kopieren: kopieren,
    entschaerfen: function (w) { return entschaerfen(w, 0); },
    // bisherigen Stand unter schluessel sichern, bevor ein Link ihn ersetzt; true, wenn gesichert
    sichern: function (schluessel, neu) {
      const alt = lsLesen(schluessel);
      if (!alt || alt === neu) return false;
      lsSchreiben(schluessel + ':vorher', alt);
      return true;
    },
    vorher: function (schluessel) { return lsLesen(schluessel + ':vorher'); },
    vorherWeg: function (schluessel) { lsSchreiben(schluessel + ':vorher', null); },
    // Knopf „Vorherige … wiederherstellen“ (sichtbar, solange eine Sicherung da ist); wiederherstellen(text) übernimmt den Stand
    knopf: function (ziel, schluessel, wiederherstellen, was) {
      const k = document.createElement('button');
      k.type = 'button'; k.className = 'knopf-leise vorher-knopf'; k.setAttribute('data-nicht-merken', '');
      k.textContent = 'Vorherige ' + (was || 'Werte') + ' wiederherstellen';
      const zeigen = function () { k.hidden = !lsLesen(schluessel + ':vorher'); };
      k.addEventListener('click', function () {
        const t = lsLesen(schluessel + ':vorher'); if (!t) { zeigen(); return; }
        if (!window.confirm('Vorherige ' + (was || 'Werte') + ' wiederherstellen? Der Stand aus dem Link wird ersetzt.')) return;
        lsSchreiben(schluessel + ':vorher', null);
        wiederherstellen(t); zeigen();
      });
      ziel.append(k); zeigen();
      return { zeigen: zeigen };
    }
  };

  // ---------- Eingaben merken und als Link teilen ----------
  // Auf Seiten mit <main data-merken>: eingetragene Werte, Einheiten und gewählte Modi
  // bleiben im Browser und lassen sich als Link weitergeben (?werte=…).
  const merkSchluessel = 'eingaben:' + location.pathname.replace(/\/index\.html$/, '/');
  function steuerelemente(haupt) {
    return Array.prototype.slice.call(haupt.querySelectorAll('input, select, textarea')).filter(function (el) {
      return el.type !== 'file' && el.type !== 'button' && el.type !== 'submit' && !el.closest('[data-nicht-merken]') && !el.closest('.nicht-merken');
    });
  }
  function schluessel(el, i) { return el.id ? '#' + el.id : el.name ? '@' + el.name : i; }
  // gegeben ist ein Feld auch, wenn es im Löser als Widerspruch markiert ist (dort werden nur eingetragene Werte so markiert)
  function istGegeben(feld) { return feld.classList.contains('gegeben') || (feld.classList.contains('widerspruch') && !!feld.closest('.loeser')); }
  function zustandLesen(haupt) {
    const z = { modi: [], werte: {} };
    haupt.querySelectorAll('button[aria-pressed="true"]').forEach(function (k) {
      const t = k.textContent.trim().replace(/\s+/g, ' ');
      if (t && t.length < 80) z.modi.push(t);
    });
    steuerelemente(haupt).forEach(function (el, i) {
      const feld = el.closest('.feld');
      let w;
      if (el.type === 'checkbox' || el.type === 'radio') w = el.checked;
      else if (feld && el.tagName === 'INPUT' && el.type !== 'range') w = istGegeben(feld) ? el.value : '';
      else w = el.value;
      z.werte[schluessel(el, i)] = w;
    });
    return z;
  }
  function zustandSetzen(haupt, z) {
    if (!z || !z.werte) return;
    // 1. Modi (Knöpfe) wie gespeichert drücken
    (z.modi || []).forEach(function (t) {
      const k = Array.prototype.slice.call(haupt.querySelectorAll('button[aria-pressed]')).filter(function (b) { return b.textContent.trim().replace(/\s+/g, ' ') === t; })[0];
      if (k && k.getAttribute('aria-pressed') !== 'true') k.click();
    });
    // 2. Auswahlfelder und Haken, dann 3. Zahlen (Einheit zuerst, damit die Zahl richtig gelesen wird)
    [function (el) { return el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'radio'; },
     function (el) { return !(el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'radio'); }].forEach(function (passt) {
      steuerelemente(haupt).forEach(function (el, i) {
        if (!passt(el)) return;
        const k = schluessel(el, i);
        if (!(k in z.werte)) return;
        const w = z.werte[k];
        if (el.type === 'checkbox' || el.type === 'radio') {
          if (el.checked === !!w) return;
          el.checked = !!w;
        } else {
          const feld = el.closest('.feld');
          const jetzt = feld && el.tagName === 'INPUT' && el.type !== 'range' ? (istGegeben(feld) ? el.value : '') : el.value;
          if (jetzt === w) return;
          el.value = w;
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }
        el.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
  }
  // gemerkter Zustand: { modi: [Text, …], werte: { Schlüssel: Text | true/false } } – streng geprüft
  function zustandPruefen(z) {
    if (!z || typeof z !== 'object' || !z.werte || typeof z.werte !== 'object' || Array.isArray(z.werte)) return null;
    const o = { modi: [], werte: {} };
    (Array.isArray(z.modi) ? z.modi : []).slice(0, 60).forEach(function (t) { if (typeof t === 'string' && t.length < 80) o.modi.push(t); });
    Object.keys(z.werte).slice(0, 3000).forEach(function (k) {
      if (k.length > 120 || k === '__proto__') return;
      const w = z.werte[k];
      if (typeof w === 'boolean') o.werte[k] = w;
      else if (typeof w === 'string' || typeof w === 'number') o.werte[k] = String(w).slice(0, 400000);
    });
    return o;
  }
  function merkenEinrichten() {
    const haupt = document.querySelector('main[data-merken]');
    if (!haupt) return;
    let uhr = 0, bereit = false, vorherKnopf = null;
    const sofort = function () { try { localStorage.setItem(merkSchluessel, JSON.stringify(zustandLesen(haupt))); } catch (e) { /* ohne Speicher */ } };
    const sichern = function () {
      if (!bereit) return;
      clearTimeout(uhr);
      uhr = setTimeout(sofort, 400);
    };
    if (!druckLinkQuelle) Teilen.druckLink(function () { return Teilen.url('werte', zustandLesen(haupt)); });
    haupt.addEventListener('input', sichern, true);
    haupt.addEventListener('change', sichern, true);
    haupt.addEventListener('click', function (ev) { if (ev.target.closest('button')) sichern(); }, true);
    window.addEventListener('pagehide', function () { if (bereit) { clearTimeout(uhr); sofort(); } });
    const held = document.querySelector('.held');
    let leiste = null;
    const melden = function (t) { if (!leiste) return; const m = leiste.querySelector('.teilen-meldung'); m.textContent = t; setTimeout(function () { if (m.textContent === t) m.textContent = ''; }, 5000); };
    const setzen = function (z) { try { zustandSetzen(haupt, z); } catch (e) { /* Seite hat sich geändert, dann eben Beispielwerte */ } };
    // Wiederherstellen, nachdem die Seite sich selbst aufgebaut hat: zuerst Link, sonst Speicher
    setTimeout(function () {
      Teilen.lesen('werte').then(function (z) {
        z = zustandPruefen(z);
        if (!z) {
          let g = null; try { g = JSON.parse(localStorage.getItem(merkSchluessel) || 'null'); } catch (e) { g = null; }
          setzen(zustandPruefen(g)); bereit = true; return;
        }
        const gesichert = Teilen.sichern(merkSchluessel, JSON.stringify(z));
        setzen(z); bereit = true; sofort();
        if (vorherKnopf) vorherKnopf.zeigen();
        melden('Werte aus dem Link übernommen und gespeichert.' + (gesichert ? ' Deine vorherigen Werte sind gesichert.' : ''));
      }).catch(function () {
        let g = null; try { g = JSON.parse(localStorage.getItem(merkSchluessel) || 'null'); } catch (e) { g = null; }
        setzen(zustandPruefen(g)); bereit = true;
        melden('Der Link ist unvollständig oder beschädigt – es gelten die gespeicherten Werte.');
      });
    }, 0);
    // Knopf zum Teilen
    if (held) {
      leiste = document.createElement('div');
      leiste.className = 'teilen-leiste';
      leiste.innerHTML = '<button type="button" class="knopf teilen">Link mit diesen Werten kopieren</button><span class="teilen-meldung" aria-live="polite"></span>';
      held.append(leiste);
      leiste.querySelector('button').addEventListener('click', function () {
        Teilen.url('werte', zustandLesen(haupt)).then(function (url) { Teilen.kopieren(url, melden); });
      });
      vorherKnopf = Teilen.knopf(leiste, merkSchluessel, function (t) {
        let z = null; try { z = zustandPruefen(JSON.parse(t)); } catch (e) { z = null; }
        if (!z) return;
        setzen(z); sofort(); melden('Vorherige Werte wiederhergestellt.');
      });
      // Knopf vor die Meldung
      leiste.insertBefore(leiste.querySelector('.vorher-knopf'), leiste.querySelector('.teilen-meldung'));
    }
  }

  // ---------- QR-Code (ISO/IEC 18004, Byte-Modus, Version 1–40) für den Link auf dem Ausdruck ----------
  const QRCode = (function () {
  function utf8(t) {
    const b = [];
    for (let i = 0; i < t.length; i++) {
      let c = t.charCodeAt(i);
      if (c >= 0xD800 && c <= 0xDBFF && i + 1 < t.length) { c = 0x10000 + ((c - 0xD800) << 10) + (t.charCodeAt(++i) - 0xDC00); }
      if (c < 0x80) b.push(c); else if (c < 0x800) b.push(0xC0 | c >> 6, 0x80 | c & 63);
      else if (c < 0x10000) b.push(0xE0 | c >> 12, 0x80 | c >> 6 & 63, 0x80 | c & 63);
      else b.push(0xF0 | c >> 18, 0x80 | c >> 12 & 63, 0x80 | c >> 6 & 63, 0x80 | c & 63);
    }
    return b;
  }
  // Rechnen im Galoiskörper GF(256)
  function gf(prim) {
    const exp = [], log = []; let x = 1;
    for (let i = 0; i < 255; i++) { exp[i] = x; log[x] = i; x <<= 1; if (x & 256) x ^= prim; }
    for (let i = 255; i < 512; i++) exp[i] = exp[i - 255];
    return { mul: function (a, b) { return a && b ? exp[log[a] + log[b]] : 0; }, exp: exp };
  }

  // ===== QR-Code (ISO/IEC 18004), Byte-Modus, Version 1 bis 40 =====
  const QR_ECC = {
    L: [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    M: [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
    Q: [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    H: [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30]
  };
  const QR_BLOECKE = {
    L: [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
    M: [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
    Q: [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
    H: [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81]
  };
  const QR_FORMAT = { L: 1, M: 0, Q: 3, H: 2 };
  const GQ = gf(0x11D);
  function rohModule(v) { let r = (16 * v + 128) * v + 64; if (v >= 2) { const n = Math.floor(v / 7) + 2; r -= (25 * n - 10) * n - 55; if (v >= 7) r -= 36; } return r; }
  function datenWorte(v, s) { return Math.floor(rohModule(v) / 8) - QR_ECC[s][v] * QR_BLOECKE[s][v]; }
  function rsTeiler(grad, feld, start) {
    const r = []; for (let i = 0; i < grad - 1; i++) r.push(0); r.push(1);
    let wurzel = feld.exp[start];
    for (let i = 0; i < grad; i++) { for (let j = 0; j < r.length; j++) { r[j] = feld.mul(r[j], wurzel); if (j + 1 < r.length) r[j] ^= r[j + 1]; } wurzel = feld.mul(wurzel, 2); }
    return r;
  }
  function rsRest(daten, teiler, feld) {
    const r = teiler.map(function () { return 0; });
    daten.forEach(function (b) { const f = b ^ r.shift(); r.push(0); teiler.forEach(function (c, i) { r[i] ^= feld.mul(c, f); }); });
    return r;
  }
  function qr(text, stufe) {
    stufe = QR_ECC[stufe] ? stufe : 'M';
    const daten = utf8(text);
    let v = 1;
    for (; v <= 40; v++) if (4 + (v <= 9 ? 8 : 16) + 8 * daten.length <= datenWorte(v, stufe) * 8) break;
    if (v > 40) return null;
    const bits = [];
    function anhaengen(wert, n) { for (let i = n - 1; i >= 0; i--) bits.push((wert >>> i) & 1); }
    anhaengen(4, 4); anhaengen(daten.length, v <= 9 ? 8 : 16); daten.forEach(function (b) { anhaengen(b, 8); });
    const kap = datenWorte(v, stufe) * 8;
    anhaengen(0, Math.min(4, kap - bits.length)); anhaengen(0, (8 - bits.length % 8) % 8);
    for (let p = 0xEC; bits.length < kap; p ^= 0xEC ^ 0x11) anhaengen(p, 8);
    const worte = []; for (let i = 0; i < bits.length; i += 8) { let b = 0; for (let j = 0; j < 8; j++) b = b << 1 | bits[i + j]; worte.push(b); }
    // Fehlerkorrektur und Verschachtelung
    const nb = QR_BLOECKE[stufe][v], ne = QR_ECC[stufe][v], roh = Math.floor(rohModule(v) / 8), kurz = nb - roh % nb, kl = Math.floor(roh / nb), teiler = rsTeiler(ne, GQ, 0), bl = [];
    for (let i = 0, k = 0; i < nb; i++) { const d = worte.slice(k, k + kl - ne + (i < kurz ? 0 : 1)); k += d.length; const e = rsRest(d, teiler, GQ); if (i < kurz) d.push(0); bl.push(d.concat(e)); }
    const alle = [];
    for (let i = 0; i < bl[0].length; i++) for (let j = 0; j < bl.length; j++) if (i !== kl - ne || j >= kurz) alle.push(bl[j][i]);
    // Muster zeichnen
    const g = v * 4 + 17, m = [], fn = [];
    for (let y = 0; y < g; y++) { m.push([]); fn.push([]); for (let x = 0; x < g; x++) { m[y].push(false); fn[y].push(false); } }
    function setze(x, y, d) { m[y][x] = d; fn[y][x] = true; }
    for (let i = 0; i < g; i++) { setze(6, i, i % 2 === 0); setze(i, 6, i % 2 === 0); }
    [[3, 3], [g - 4, 3], [3, g - 4]].forEach(function (c) { for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const d = Math.max(Math.abs(dx), Math.abs(dy)), x = c[0] + dx, y = c[1] + dy; if (x >= 0 && x < g && y >= 0 && y < g) setze(x, y, d !== 2 && d !== 4); } });
    const pos = [];
    if (v > 1) { const n = Math.floor(v / 7) + 2, s = v === 32 ? 26 : Math.ceil((v * 4 + 4) / (n * 2 - 2)) * 2; pos.push(6); for (let p = g - 7; pos.length < n; p -= s) pos.splice(1, 0, p); }
    pos.forEach(function (a, i) { pos.forEach(function (b, j) { if ((i === 0 && j === 0) || (i === 0 && j === pos.length - 1) || (i === pos.length - 1 && j === 0)) return; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) setze(a + dx, b + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1); }); });
    function format(maske) {
      const d = QR_FORMAT[stufe] << 3 | maske; let r = d; for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
      const b = (d << 10 | r) ^ 0x5412, bit = function (i) { return ((b >>> i) & 1) !== 0; };
      for (let i = 0; i <= 5; i++) setze(8, i, bit(i));
      setze(8, 7, bit(6)); setze(8, 8, bit(7)); setze(7, 8, bit(8));
      for (let i = 9; i < 15; i++) setze(14 - i, 8, bit(i));
      for (let i = 0; i < 8; i++) setze(g - 1 - i, 8, bit(i));
      for (let i = 8; i < 15; i++) setze(8, g - 15 + i, bit(i));
      setze(8, g - 8, true);
    }
    format(0);
    if (v >= 7) { let r = v; for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1F25); const b = v << 12 | r; for (let i = 0; i < 18; i++) { const d = ((b >>> i) & 1) !== 0, a = g - 11 + i % 3, c = Math.floor(i / 3); setze(a, c, d); setze(c, a, d); } }
    // Datenmodule im Zickzack
    let i = 0;
    for (let rechts = g - 1; rechts >= 1; rechts -= 2) {
      if (rechts === 6) rechts = 5;
      for (let s = 0; s < g; s++) for (let j = 0; j < 2; j++) {
        const x = rechts - j, hoch = ((rechts + 1) & 2) === 0, y = hoch ? g - 1 - s : s;
        if (!fn[y][x] && i < alle.length * 8) { m[y][x] = ((alle[i >>> 3] >>> (7 - (i & 7))) & 1) !== 0; i++; }
      }
    }
    const MASKE = [function (x, y) { return (x + y) % 2 === 0; }, function (x, y) { return y % 2 === 0; }, function (x) { return x % 3 === 0; }, function (x, y) { return (x + y) % 3 === 0; },
      function (x, y) { return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; }, function (x, y) { return x * y % 2 + x * y % 3 === 0; }, function (x, y) { return (x * y % 2 + x * y % 3) % 2 === 0; }, function (x, y) { return ((x + y) % 2 + x * y % 3) % 2 === 0; }];
    function maskieren(k) { for (let y = 0; y < g; y++) for (let x = 0; x < g; x++) if (!fn[y][x] && MASKE[k](x, y)) m[y][x] = !m[y][x]; }
    function strafe() {
      let s = 0, dunkel = 0;
      function zeile(get) {
        let lauf = 1;
        for (let k = 1; k <= g; k++) { if (k < g && get(k) === get(k - 1)) lauf++; else { if (lauf >= 5) s += 3 + lauf - 5; lauf = 1; } }
        for (let k = 0; k + 11 <= g; k++) {
          const a = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0], b = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
          let pa = true, pb = true; for (let t = 0; t < 11; t++) { const w = get(k + t) ? 1 : 0; if (w !== a[t]) pa = false; if (w !== b[t]) pb = false; }
          if (pa) s += 40; if (pb) s += 40;
        }
      }
      for (let y = 0; y < g; y++) zeile(function (x) { return m[y][x]; });
      for (let x = 0; x < g; x++) zeile(function (y) { return m[y][x]; });
      for (let y = 0; y < g - 1; y++) for (let x = 0; x < g - 1; x++) { const c = m[y][x]; if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) s += 3; }
      for (let y = 0; y < g; y++) for (let x = 0; x < g; x++) if (m[y][x]) dunkel++;
      return s + (Math.ceil(Math.abs(dunkel * 20 - g * g * 10) / (g * g)) - 1) * 10;
    }
    let beste = 0, min = Infinity;
    for (let k = 0; k < 8; k++) { maskieren(k); format(k); const p = strafe(); if (p < min) { min = p; beste = k; } maskieren(k); }
    maskieren(beste); format(beste);
    return { matrix: m, rand: 4, info: 'QR-Code Version ' + v + ' (' + g + ' × ' + g + '), Fehlerkorrektur ' + stufe };
  }
    return { matrix: function (text, stufe) { return qr(text, stufe); } };
  })();
  window.QRCode = QRCode;

  // ---------- QR-Code mit dem Link zum Stand auf der ersten Druckseite ----------
  // Quelle: Seiten mit data-merken automatisch, Planer melden sich mit Teilen.druckLink(function () { return Teilen.url(…); }).
  // Der Code wird nach Änderungen vorbereitet, weil der Druck nicht auf Promises wartet.
  let druckLinkQuelle = null, druckQr = null, druckQrUhr = null, druckQrStand = '';
  const QR_MODUL_MM = 0.33, QR_MIN_MM = 22;
  Teilen.druckLink = function (quelle) { druckLinkQuelle = quelle; druckQrPlanen(); };
  function druckQrElement() {
    if (druckQr) return druckQr;
    druckQr = document.createElement('div');
    druckQr.className = 'druck-qr';
    druckQr.setAttribute('aria-hidden', 'true');
    // Seiten mit eigenem Druckbild (Protokolle): Code rechts oben umflossen, damit er nichts überdeckt
    const eigen = document.querySelector('main[data-eigenes-pdf]');
    if (eigen) { druckQr.classList.add('am-ende'); eigen.insertBefore(druckQr, eigen.firstChild); } else document.body.append(druckQr);
    return druckQr;
  }
  function druckQrPlanen() { clearTimeout(druckQrUhr); druckQrUhr = setTimeout(druckQrJetzt, 700); }
  function druckQrJetzt() {
    clearTimeout(druckQrUhr);
    if (!druckLinkQuelle || !/^https?:$/.test(location.protocol)) return Promise.resolve();
    let p;
    try { p = Promise.resolve(druckLinkQuelle()); } catch (e) { p = Promise.reject(e); }
    return p.then(function (url) {
      if (typeof url !== 'string' || !url || url === druckQrStand) return;
      druckQrStand = url;
      const el = druckQrElement();
      el.innerHTML = '';
      let q = QRCode.matrix(url, 'M');
      if (!q || q.matrix.length > 97) q = QRCode.matrix(url, 'L');          // ab Version 21 lieber mehr Platz für Daten
      if (!q) {
        el.className = 'druck-qr zu-lang' + (el.parentNode.tagName === 'MAIN' ? ' am-ende' : '');
        el.textContent = 'Stand zu groß für einen QR-Code (' + url.length.toLocaleString('de-DE') + ' Zeichen) – Link kopieren oder als Datei speichern.';
        document.body.style.setProperty('--qr-breite', '42mm');
        return;
      }
      const g = q.matrix.length, r = 4, n = g + 2 * r, mm = Math.max(QR_MIN_MM, n * QR_MODUL_MM);
      let d = '';
      for (let y = 0; y < g; y++) {
        let x = 0;
        while (x < g) {
          if (!q.matrix[y][x]) { x++; continue; }
          let l = 1; while (x + l < g && q.matrix[y][x + l]) l++;
          d += 'M' + (x + r) + ' ' + (y + r) + 'h' + l + 'v1h-' + l + 'z';
          x += l;
        }
      }
      el.className = 'druck-qr' + (el.parentNode.tagName === 'MAIN' ? ' am-ende' : '');
      el.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + n + ' ' + n + '" shape-rendering="crispEdges" style="width:' + mm.toFixed(1) + 'mm;height:' + mm.toFixed(1) + 'mm"><rect width="' + n + '" height="' + n + '" fill="#fff"/><path fill="#000" d="' + d + '"/></svg><span>Scannen öffnet diesen Stand</span>';
      document.body.style.setProperty('--qr-breite', mm.toFixed(1) + 'mm');
    }).catch(function () { /* ohne Link kein Code */ });
  }
  window.addEventListener('load', druckQrPlanen);
  ['input', 'change', 'click', 'pointerup', 'keyup'].forEach(function (art) { document.addEventListener(art, druckQrPlanen, true); });
  window.addEventListener('beforeprint', function () { if (druckQr) document.body.classList.add('mit-druck-qr'); });

  // ---------- PDF-Export (über den Druckdialog „Als PDF speichern“) ----------
  // Jede Seite mit <main> bekommt einen Knopf; Kopf mit Bauvorhaben, Bearbeiter und Datum,
  // Bedienelemente werden ausgeblendet, eingeklappte Bereiche geöffnet. Eigene Lösung: <main data-eigenes-pdf>.
  const PDF_SPEICHER = 'pdf-angaben';
  function pdfAngaben() { try { return JSON.parse(localStorage.getItem(PDF_SPEICHER) || '{}') || {}; } catch (e) { return {}; } }
  function heute() { const d = new Date(); return ('0' + d.getDate()).slice(-2) + '.' + ('0' + (d.getMonth() + 1)).slice(-2) + '.' + d.getFullYear(); }
  function pdfEinrichten() {
    const haupt = document.querySelector('main');
    const held = document.querySelector('.held');
    if (!haupt || !held || haupt.hasAttribute('data-eigenes-pdf') || document.getElementById('seitenkopf') && document.getElementById('seitenkopf').getAttribute('data-seite') === 'start') return;
    // Kopf für den Druck
    const kopf = document.createElement('div');
    kopf.className = 'druckkopf';
    kopf.setAttribute('aria-hidden', 'true');
    haupt.insertBefore(kopf, haupt.firstChild);
    const kopfFuellen = function () {
      const a = pdfAngaben(), titel = (held.querySelector('h1') || {}).textContent || document.title;
      kopf.innerHTML = '';
      const z = function (k, v) { const d = document.createElement('div'); const b = document.createElement('b'); b.textContent = k; d.append(b, document.createTextNode(' ' + v)); kopf.append(d); };
      const t = document.createElement('div'); t.className = 'druckkopf-titel'; t.textContent = titel.trim(); kopf.append(t);
      z('Datum:', heute());
      z('Bauvorhaben:', a.projekt || '—');
      z('Bearbeiter:', a.bearbeiter || '—');
      if (a.firma) z('Firma:', a.firma);
      const q = document.createElement('div'); q.className = 'druckkopf-quelle'; q.textContent = 'Formeln & Rechner · ' + location.host + location.pathname.replace(/\/[^/]*$/, '/') ; kopf.append(q);
    };
    // Knopf und kleines Formular
    let leiste = held.querySelector('.teilen-leiste');
    if (!leiste) { leiste = document.createElement('div'); leiste.className = 'teilen-leiste'; held.append(leiste); }
    const knopf = document.createElement('button');
    knopf.type = 'button'; knopf.className = 'knopf pdf-knopf'; knopf.textContent = 'PDF erstellen';
    knopf.setAttribute('aria-expanded', 'false');
    leiste.insertBefore(knopf, leiste.firstChild);
    const form = document.createElement('div');
    form.className = 'pdf-form'; form.hidden = true;
    form.innerHTML = '<label>Bauvorhaben <input type="text" data-k="projekt" data-nicht-merken autocomplete="off"></label>' +
      '<label>Bearbeiter <input type="text" data-k="bearbeiter" data-nicht-merken autocomplete="name"></label>' +
      '<label>Firma <input type="text" data-k="firma" data-nicht-merken autocomplete="organization"></label>' +
      '<label class="pdf-haken"><input type="checkbox" data-h="weg"> Rechenweg mitdrucken</label>' +
      '<label class="pdf-haken"><input type="checkbox" data-h="sammlung"> Formelsammlung mitdrucken</label>' +
      '<button type="button" class="knopf-haupt">Als PDF speichern</button>' +
      '<span class="pdf-hinweis">Im Druckdialog „Als PDF speichern“ wählen. Ohne Bedienknöpfe, mit Kopf und Seitenzahlen.</span>';
    leiste.after(form);
    const a0 = pdfAngaben();
    const haken = function () { const a = pdfAngaben(); document.body.classList.toggle('druck-ohne-weg', a.weg === false); document.body.classList.toggle('druck-ohne-sammlung', a.sammlung !== true); };
    form.querySelectorAll('input[data-h]').forEach(function (i) {
      const k = i.getAttribute('data-h');
      i.checked = k === 'weg' ? a0.weg !== false : a0.sammlung === true;
      i.addEventListener('change', function () { const a = pdfAngaben(); a[k] = i.checked; try { localStorage.setItem(PDF_SPEICHER, JSON.stringify(a)); } catch (e) { /* ohne Speicher */ } haken(); });
    });
    haken();
    form.querySelectorAll('input[data-k]').forEach(function (i) {
      i.value = a0[i.getAttribute('data-k')] || '';
      i.addEventListener('input', function () { const a = pdfAngaben(); a[i.getAttribute('data-k')] = i.value.slice(0, 120); try { localStorage.setItem(PDF_SPEICHER, JSON.stringify(a)); } catch (e) { /* ohne Speicher */ } });
    });
    knopf.addEventListener('click', function () { form.hidden = !form.hidden; knopf.setAttribute('aria-expanded', String(!form.hidden)); if (!form.hidden) form.querySelector('input').focus(); });
    form.querySelector('.knopf-haupt').addEventListener('click', function () { druckQrJetzt().then(function () { window.print(); }); });
    // vor und nach dem Druck
    let geoeffnet = [], titelAlt = document.title;
    window.addEventListener('beforeprint', function () {
      kopfFuellen();
      geoeffnet = [];
      document.querySelectorAll('main details:not([open])').forEach(function (d) { d.open = true; geoeffnet.push(d); });
      titelAlt = document.title;
      const a = pdfAngaben();
      document.title = titelAlt.replace(/ – Formeln & Rechner$/, '') + (a.projekt ? ' – ' + a.projekt : '') + ' – ' + heute();   // Dateiname des PDFs
      document.dispatchEvent(new CustomEvent('vordruck'));
    });
    window.addEventListener('afterprint', function () {
      geoeffnet.forEach(function (d) { d.open = false; });
      document.title = titelAlt;
      document.dispatchEvent(new CustomEvent('nachdruck'));
    });
    kopfFuellen();
  }

  document.addEventListener('DOMContentLoaded', function () {
    kopfBauen();
    fussBauen();
    Formel.alle();
    merkenEinrichten();
    pdfEinrichten();
  });
})();
