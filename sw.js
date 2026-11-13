/*
 * Offline-Speicher für die ganze Sammlung
 * ========================================
 * Seiten: erst aus dem Netz (damit Änderungen sofort ankommen), ohne Netz aus dem Speicher.
 * Bilder, Schriften, Skripte: sofort aus dem Speicher, im Hintergrund aufgefrischt.
 * Neue Seite? Unten in DATEIEN eintragen und STAND ändern.
 */
const STAND = '9d9a8ee22d';
const SPEICHER = 'rechner-' + STAND;
const DATEIEN = [
  "./",
  "index.html",
  "arbeitsschutz/bildschirmarbeit.html",
  "arbeitsschutz/gefahrstoffe-luft.html",
  "arbeitsschutz/heben-tragen.html",
  "arbeitsschutz/klima-hitze.html",
  "arbeitsschutz/laerm-vibration.html",
  "arbeitsschutz/leiter-geruest.html",
  "arbeitsschutz/uv-sonne.html",
  "assets/basis.js",
  "assets/blatt.js",
  "assets/katex/fonts/KaTeX_AMS-Regular.woff2",
  "assets/katex/fonts/KaTeX_Caligraphic-Bold.woff2",
  "assets/katex/fonts/KaTeX_Caligraphic-Regular.woff2",
  "assets/katex/fonts/KaTeX_Fraktur-Bold.woff2",
  "assets/katex/fonts/KaTeX_Fraktur-Regular.woff2",
  "assets/katex/fonts/KaTeX_Main-Bold.woff2",
  "assets/katex/fonts/KaTeX_Main-BoldItalic.woff2",
  "assets/katex/fonts/KaTeX_Main-Italic.woff2",
  "assets/katex/fonts/KaTeX_Main-Regular.woff2",
  "assets/katex/fonts/KaTeX_Math-BoldItalic.woff2",
  "assets/katex/fonts/KaTeX_Math-Italic.woff2",
  "assets/katex/fonts/KaTeX_SansSerif-Bold.woff2",
  "assets/katex/fonts/KaTeX_SansSerif-Italic.woff2",
  "assets/katex/fonts/KaTeX_SansSerif-Regular.woff2",
  "assets/katex/fonts/KaTeX_Script-Regular.woff2",
  "assets/katex/fonts/KaTeX_Size1-Regular.woff2",
  "assets/katex/fonts/KaTeX_Size2-Regular.woff2",
  "assets/katex/fonts/KaTeX_Size3-Regular.woff2",
  "assets/katex/fonts/KaTeX_Size4-Regular.woff2",
  "assets/katex/fonts/KaTeX_Typewriter-Regular.woff2",
  "assets/katex/katex.min.css",
  "assets/katex/katex.min.js",
  "assets/rechner.css",
  "assets/rechner.js",
  "assets/stil.css",
  "assets/symbol-192.png",
  "assets/symbol-512.png",
  "assets/symbol-apple.png",
  "assets/symbol-maskable.png",
  "assets/taschenrechner.js",
  "aufgabenblaetter/elektro/ohmsches-gesetz/01-grundlagen.md",
  "aufgabenblaetter/geld/mehrwertsteuer-skonto/01-brutto-netto-skonto.md",
  "aufgabenblaetter/liste.json",
  "brandschutz/brandmeldeanlage.html",
  "brandschutz/brandsimulation.html",
  "brandschutz/feuerloescher.html",
  "brandschutz/fluchtwege.html",
  "dach/absturz.html",
  "dach/dachrinne.html",
  "dach/gaubenwange.html",
  "dach/kehle-grat.html",
  "dach/schneefang.html",
  "dach/schornsteinverwahrung.html",
  "dach/sparren-lattung.html",
  "dach/wind-schneelast.html",
  "elektro/batteriespeicher.html",
  "elektro/beleuchtung.html",
  "elektro/blitzschutz.html",
  "elektro/erdung.html",
  "elektro/koerperstrom.html",
  "elektro/kompensation.html",
  "elektro/leitungsdimensionierung.html",
  "elektro/messung-anleitung.html",
  "elektro/motor.html",
  "elektro/ohmsches-gesetz.html",
  "elektro/pv-dach.html",
  "elektro/pv-notstrom.html",
  "elektro/pv-string.html",
  "elektro/pv-verschaltung.html",
  "elektro/pv-verschattung.html",
  "elektro/schleifenimpedanz.html",
  "elektro/selektivitaet.html",
  "elektro/spannungsfall.html",
  "elektro/transformator.html",
  "elektro/wallbox.html",
  "elektro/warmwasser.html",
  "favicon.png",
  "geld/amortisation.html",
  "geld/angebot.html",
  "geld/aufmass-abrechnung.html",
  "geld/brutto-netto.html",
  "geld/energiekosten.html",
  "geld/fahrzeugkosten.html",
  "geld/inflation.html",
  "geld/kredit.html",
  "geld/leasing-kauf.html",
  "geld/maschinenstundensatz.html",
  "geld/mehrwertsteuer-skonto.html",
  "geld/stromkosten.html",
  "geld/stundensatz.html",
  "geld/ueberstunden-urlaub.html",
  "geld/zinseszins-sparplan.html",
  "heizung/abgasmessung.html",
  "heizung/ausdehnungsgefaess.html",
  "heizung/co2-lueftung.html",
  "heizung/feuchte-schimmel.html",
  "heizung/fussbodenheizung.html",
  "heizung/heizlast.html",
  "heizung/hydraulischer-abgleich.html",
  "heizung/u-wert.html",
  "heizung/waermepumpe-simulation.html",
  "heizung/waermepumpe.html",
  "heizung/wohnungslueftung.html",
  "it/backup.html",
  "it/datenrate.html",
  "it/homelab-server.html",
  "it/homelab.html",
  "it/netzwerkkabel-poe.html",
  "it/paketreise.html",
  "it/passwort.html",
  "it/rack-strom.html",
  "it/raid.html",
  "it/serverraum-klima.html",
  "it/subnetz.html",
  "it/usv.html",
  "it/verfuegbarkeit.html",
  "it/verschluesselung.html",
  "it/wlan.html",
  "it/zahlensysteme.html",
  "lernen.html",
  "manifest.webmanifest",
  "mechanik/energieumsatz.html",
  "mechanik/flaschenzug-anschlagmittel.html",
  "mechanik/gangschaltung.html",
  "mechanik/kraefte.html",
  "mechanik/schrauben-duebel.html",
  "mechanik/sport-bewegung.html",
  "projektmappe.html",
  "protokolle/elektro-pruefung.js",
  "protokolle/elektro.html",
  "protokolle/elektro.js",
  "protokolle/felder.js",
  "protokolle/gefaehrdungsbeurteilung.html",
  "protokolle/it-ausbau.js",
  "protokolle/it-pruefung.js",
  "protokolle/it-sicherheit.html",
  "protokolle/it-sicherheit.js",
  "protokolle/protokoll.css",
  "sanitaer/abwasser.html",
  "sanitaer/gasleitung.html",
  "sanitaer/regenwasser.html",
  "sanitaer/trinkwasser-rohrnetz.html",
  "sanitaer/trinkwasserschutz.html"
];

self.addEventListener('install', function (ev) {
  ev.waitUntil(caches.open(SPEICHER).then(function (c) { return c.addAll(DATEIEN); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (ev) {
  ev.waitUntil(caches.keys().then(function (namen) {
    return Promise.all(namen.filter(function (n) { return n.indexOf('rechner-') === 0 && n !== SPEICHER; }).map(function (n) { return caches.delete(n); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (ev) {
  const anfrage = ev.request;
  if (anfrage.method !== 'GET' || new URL(anfrage.url).origin !== self.location.origin) return;
  const seite = anfrage.mode === 'navigate' || (anfrage.headers.get('accept') || '').indexOf('text/html') >= 0;
  if (seite) {
    ev.respondWith(fetch(anfrage).then(function (antwort) {
      const kopie = antwort.clone();
      caches.open(SPEICHER).then(function (c) { c.put(anfrage, kopie); });
      return antwort;
    }).catch(function () {
      return caches.match(anfrage, { ignoreSearch: true }).then(function (t) { return t || caches.match('index.html'); });
    }));
    return;
  }
  ev.respondWith(caches.match(anfrage).then(function (treffer) {
    const frisch = fetch(anfrage).then(function (antwort) {
      if (antwort.ok) { const kopie = antwort.clone(); caches.open(SPEICHER).then(function (c) { c.put(anfrage, kopie); }); }
      return antwort;
    }).catch(function () { return treffer; });
    return treffer || frisch;
  }));
});
