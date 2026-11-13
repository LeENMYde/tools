#!/usr/bin/env node
/*
 * Aufgabenblätter einsammeln
 * ==========================
 * Aufruf im Hauptordner: node werkzeuge/blaetter-bauen.js
 *
 * Sucht alle .md-Dateien unter aufgabenblaetter/. Der Ordner bestimmt das Thema:
 *   aufgabenblaetter/elektro/ohmsches-gesetz/01-grundlagen.md  →  Thema elektro/ohmsches-gesetz.html
 * Schreibt aufgabenblaetter/liste.json (die Lernseite liest nur diese Liste) und trägt die Blätter
 * in sw.js ein (DATEIEN und STAND), damit sie offline da sind.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const WURZEL = path.resolve(__dirname, '..');
const ORDNER = path.join(WURZEL, 'aufgabenblaetter');
const rel = function (p) { return path.relative(WURZEL, p).split(path.sep).join('/'); };

function suche(ordner) {
  let aus = [];
  if (!fs.existsSync(ordner)) return aus;
  fs.readdirSync(ordner, { withFileTypes: true }).forEach(function (e) {
    const p = path.join(ordner, e.name);
    if (e.isDirectory()) aus = aus.concat(suche(p));
    else if (/\.md$/i.test(e.name) && !/^(liesmich|readme)\.md$/i.test(e.name)) aus.push(p);
  });
  return aus;
}

function kopf(text) {
  text = text.replace(/\r\n?/g, '\n').replace(/^﻿/, '');
  const daten = {};
  const vorn = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (vorn) {
    vorn[1].split('\n').forEach(function (z) { const m = /^([a-zäöü]+)\s*:\s*(.*)$/i.exec(z.trim()); if (m) daten[m[1].toLowerCase()] = m[2].trim(); });
    text = text.slice(vorn[0].length);
  }
  const h = /^#\s+(.+)$/m.exec(text);
  if (!daten.titel && h) daten.titel = h[1].replace(/\s*#+\s*$/, '').trim();
  daten.aufgaben = (text.match(/^#{2,4}\s+Aufgabe\b/gim) || []).length;
  daten.loesungen = (text.match(/^\s*:::\s*l(ö|oe|o)sung/gim) || []).length;
  return daten;
}

const fehler = [];
const blaetter = suche(ORDNER).sort().map(function (datei) {
  const r = rel(datei), teile = r.split('/');
  const thema = teile.slice(1, -1).join('/') + '.html';
  if (teile.length < 4) fehler.push(r + ': liegt nicht in einem Themenordner (aufgabenblaetter/<bereich>/<seite>/blatt.md)');
  else if (!fs.existsSync(path.join(WURZEL, thema))) fehler.push(r + ': Thema ' + thema + ' gibt es nicht');
  const d = kopf(fs.readFileSync(datei, 'utf8'));
  const stufe = /^(leicht|mittel|schwer)$/i.test(d.stufe || '') ? d.stufe.toLowerCase() : '';
  const eintrag = { datei: r, thema: thema, titel: (d.titel || path.basename(datei, '.md')).slice(0, 120) };
  if (stufe) eintrag.stufe = stufe;
  if (d.aufgaben) eintrag.aufgaben = d.aufgaben;
  if (d.loesungen) eintrag.loesungen = d.loesungen;
  if (d.beschreibung) eintrag.beschreibung = d.beschreibung.slice(0, 300);
  return eintrag;
}).filter(function (b) { return fs.existsSync(path.join(WURZEL, b.thema)); });

if (!fs.existsSync(ORDNER)) fs.mkdirSync(ORDNER);
fs.writeFileSync(path.join(ORDNER, 'liste.json'), JSON.stringify({ blaetter: blaetter }, null, 1) + '\n');
console.log(blaetter.length + ' Aufgabenblätter in aufgabenblaetter/liste.json');
fehler.forEach(function (f) { console.warn('Achtung: ' + f); });

// ---------- sw.js: Blätter und Bilder eintragen, STAND neu ----------
const swDatei = path.join(WURZEL, 'sw.js');
if (fs.existsSync(swDatei)) {
  let sw = fs.readFileSync(swDatei, 'utf8');
  const m = /const DATEIEN = \[\n([\s\S]*?)\n\];/.exec(sw);
  if (!m) { console.warn('sw.js: Liste DATEIEN nicht gefunden, bitte von Hand ergänzen'); process.exit(0); }
  const alle = function (o) { let a = []; if (!fs.existsSync(o)) return a; fs.readdirSync(o, { withFileTypes: true }).forEach(function (e) { const p = path.join(o, e.name); if (e.isDirectory()) a = a.concat(alle(p)); else if (!/^(liesmich|readme)\.md$/i.test(e.name)) a.push(rel(p)); }); return a; };
  const eigene = alle(ORDNER).sort();
  const liste = m[1].split(',\n').map(function (z) { return z.trim(); }).filter(function (z) { return z && z.indexOf('"aufgabenblaetter/') !== 0 && z.indexOf("'aufgabenblaetter/") !== 0; });
  const neu = liste.concat(eigene.map(function (p) { return JSON.stringify(p); }));
  sw = sw.replace(m[0], 'const DATEIEN = [\n  ' + neu.join(',\n  ') + '\n];');
  const h = crypto.createHash('sha1');
  neu.forEach(function (z) { const p = JSON.parse(z.replace(/^'(.*)'$/, '"$1"')); const f = path.join(WURZEL, p === './' ? 'index.html' : p); if (fs.existsSync(f) && fs.statSync(f).isFile()) h.update(fs.readFileSync(f)); });
  sw = sw.replace(/const STAND = '[^']*';/, "const STAND = '" + h.digest('hex').slice(0, 10) + "';");
  fs.writeFileSync(swDatei, sw);
  console.log('sw.js: ' + eigene.length + ' Dateien aus aufgabenblaetter/ eingetragen, STAND neu');
}
