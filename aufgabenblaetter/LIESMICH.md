# Aufgabenblätter

Jedes Thema der Lernseite kann eigene Aufgabenblätter haben. Sie stehen als Markdown-Dateien hier und erscheinen auf `lernen.html` unter „Aufgabenblätter“, sobald es zu einem gewählten Thema mindestens eins gibt.

## Neues Blatt anlegen

1. Datei im Ordner des Themas anlegen. Der Ordner entspricht dem Pfad der Rechnerseite ohne `.html`:
   `aufgabenblaetter/elektro/ohmsches-gesetz/02-gemischte-schaltung.md` gehört zu `elektro/ohmsches-gesetz.html`.
2. Im Hauptordner `node werkzeuge/blaetter-bauen.js` ausführen. Das schreibt `aufgabenblaetter/liste.json` und trägt die Blätter in `sw.js` ein (offline).

Ohne Node: Eintrag in `liste.json` von Hand ergänzen (`datei`, `thema`, `titel`). Online erscheint das Blatt dann sofort, offline erst nach dem nächsten Lauf des Werkzeugs.

## Aufbau einer Datei

```
---
titel: Ohmsches Gesetz – Grundlagen
stufe: leicht
beschreibung: Ein Satz für die Übersicht
---
# Überschrift des Blatts

## Aufgabe 1 – Heizstab
Text mit Formel $U = R \cdot I$ und Lücke ___

:::lösung
Rechenweg und Ergebnis
:::
```

Der Kopf zwischen den `---` ist freiwillig. `stufe` ist `leicht`, `mittel` oder `schwer`. Ohne `titel` gilt die erste `#`-Überschrift.

Möglich sind: Überschriften `#` bis `####`, **fett**, *kursiv*, Listen (`-`, `1.`, `- [ ]`), Tabellen, Zitate `>`, Trennlinie `---`, Links, Bilder (nur Dateien im Repo, z. B. `![Schaltung](schaltung.svg)` im selben Ordner), Formeln `$…$` und `$$…$$` (KaTeX), Lücken `___` sowie die Blöcke `:::lösung`, `:::tipp` und `:::hinweis`, die zum Aufklappen sind.

Lösungen sind zuerst verborgen. Auf der Lernseite lassen sie sich einzeln oder alle zusammen zeigen, und das Blatt lässt sich mit oder ohne Lösungen drucken.
