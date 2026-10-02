# Hinweis für den Bau-Thread „Minecraft-Klon spielbar machen“

**Nachtrag 02.10.2026:** Markus hat entschieden, dass diese Sitzung ab jetzt alle weiteren Teile baut (Häuser, Gutshof, Version 12 bis 20), Schritt für Schritt nach `BAUPLAN.md`. Häuser (H1) und Gutshof (H2) sind inzwischen ebenfalls auf diesem Branch fertig. Bitte schau dir den Stand an, bevor du selbst weiterbaust, und sprich mit Markus ab, wer was macht.

Markus hat am 29.09.2026 abends, während alle Projekt-Threads auf das Nutzungslimit gewartet haben, eine zweite Claude-Sitzung außerhalb des Projekts gestartet. Diese Sitzung hat **nur die zwei noch nicht begonnenen Teile von Version 11, Teil 2** gebaut:

- **H3: Marktplatz mit Brunnen**
- **H4: Felder mit Windmühle**

H1 (Häuser der Oststadt und Neustadt) und H2 (Gutshof mit Pferden) wurden **nicht** angefasst, ebenso wenig `main`, die Frau im Schlafzimmer und alles andere. Gearbeitet wurde nur auf diesem Branch (`claude/hallo-3zyiof`), abgezweigt von `main` bei Commit `14c177a`.

Bitte **H3 und H4 nicht noch einmal bauen lassen**, sondern von hier übernehmen. Wenn dir etwas nicht gefällt, verwirf es einfach und baue H3/H4 wie geplant. Markus hat ausdrücklich gewollt, dass der Bau-Thread ungestört weitermachen kann.

## Wo der Code steht

Alles steht in `index.html` in **einem zusammenhängenden Abschnitt**, direkt vor `// ---------- Version 11: Namen der neuen Gebiete ----------`:

```
// ==================== Version 11, Teil 2: Marktplatz mit Brunnen (H3) und Felder mit Windmühle (H4) – Anfang ====================
…
// ==================== Version 11, Teil 2: Marktplatz und Felder – Ende ====================
```

Außerhalb davon gibt es **genau eine geänderte Zeile**, den Haken in `updateEnts`:

```js
else if (e.kind === "staff") staffThink(e, dt);
else if (e.think) e.think(e, dt, dp);   // Version 11: Leute mit eigenem Tagesablauf (Markt, Felder)
else personThink(e, dt);
```

So übernimmst du es: den Abschnitt von „Anfang“ bis „Ende“ in deine Datei an dieselbe Stelle kopieren (vor die Gebietsnamen, damit „Das Müllerhaus“ und „Die Windmühle“ vor „Die Felder“ in `AREAS` stehen), dazu die eine Zeile in `updateEnts`. Mit `git diff 14c177a claude/hallo-3zyiof -- index.html` siehst du genau diese beiden Stellen.

## Nummernbereiche (bitte mit GUIDE.md abgleichen)

Die Nummernbereiche aus deinem GUIDE.md kannte diese Sitzung nicht. Deshalb stehen alle Nummern an **einer** Stelle am Anfang des Abschnitts:

```js
const MF_B = 900, MF_T = 230;
```

- Blöcke: `MF_B` bis `MF_B + 111` (also 900 bis 1011)
- Atlas-Kacheln: `MF_T` bis `MF_T + 25` (also 230 bis 255)

Überschneidet sich das mit den Bereichen von H1/H2, genügt es, diese zwei Zahlen zu ändern. Alles andere rechnet von dort aus. Ohne diesen Branch hat kein Spielstand diese Nummern.

## Was drin ist

**Marktplatz (MARKT, x 78–114, z 268–304), nur innerhalb des Rechtecks:**
- Neue Blöcke: Kopfsteinpflaster und helles Pflaster als Stern und Ring um den Brunnen, Randsteine, freie Einmündungen der Straßen.
- **Kronenbrunnen:** achteckiges Becken aus dunklem Marmor, Marmorschale, darüber die neue geformte „Goldene Brunnenschale“ (drei Blöcke breit, mit Wasser) und die Krone als Modell. Wasserspiele über `JETS`: aus der Krone in die Goldschale, weiter in die Marmorschale, ins Becken, dazu vier Wasserspeier. Vier Laternen auf dem Beckenrand, acht Bänke mit Blick aufs Wasser.
- **12 Marktstände**, jeder mit Pfosten, Theke mit Leintuch und schräger, gestreifter Markise (neue Blöcke in 4 Farben mit je 5 Stufen, drehbar). An jedem Stand Kisten, Fässer oder Säcke und Waren als Modelle: Gemüse, Obst, Bäcker, Metzger (hängende Würste), Käse, Fisch (auf Eis), Blumen, Töpfer, Tuch, Wein, Honig und Kerzen (mit Bienenkorb), Gewürze.
- Maibaum (weiß-blau, grüner Wipfel, zwei Kränze mit Bändern, vier Zunftzeichen), drei Linden mit Rundbank und Buchsbäumen, 16 Laternenmasten, Blumenbeete.

**Felder (FELD, x 20–236, z 342–392):**
- 15 Äcker zwischen Feldwegen: Weizen (2×), Sonnenblumen, Lavendel, Raps, Mais, Kürbisse, Kartoffeln, Karotten, Kohl, Rote Bete, Melonen, ein Stoppelfeld mit Heuballen und ein Obstgarten mit Apfelbäumen und Bienenkörben. Neue Pflanzen: Sonnenblume und Mais (je zwei Blöcke hoch), Lavendel, Raps, Kohlkopf.
- Bewässerungsgräben, Hecke rundherum, Mohn, Kornblumen und Kamille an den Rändern, Vogelscheuchen, Leiterwagen.
- **Mühlenhof** (x 100–131, z 343–365): Hügel mit einer **Holländer-Windmühle mit Umgang** (Bruchstein, Backstein, Reet, Haube aus Holzschindeln, Tür nach Norden, Mahlraum mit Mühlstein und Säcken). Die **Flügel drehen sich** als eigenes Modell aus Atlas-Kacheln (`makeSails`), dazu ein leises Knarren. Daneben das **Müllerhaus** (Fachwerk, Reetdach, Schornstein mit Rauch, zwei Betten, Tisch, Ofen), ein Ziehbrunnen mit Trog und ein Geräteschuppen mit Werkzeug.

**30 neue Leute** (eigene Modelle über `defPerson`, Beruf an der Kleidung erkennbar, jeder zweite sagt „Majestät“):
- 12 Händler, je einer an seinem Stand. Sie verkaufen, räumen hinten die Kisten und rufen ihre Waren aus, wenn der König vorbeikommt.
- 8 Kunden aus der Neustadt. Sie kaufen an den Ständen, schauen in den Brunnen, schöpfen Wasser und sitzen auf den Bänken.
- 8 Bauern, Mägde, ein Imker und eine Gärtnerin auf ihren Äckern, mit Sense, Hacke, Heugabel, Korb und Gießkanne. Sie mähen, hacken, pflücken und gießen.
- Müller Matthias und Müllerin Johanna. Tagsüber arbeiten sie in der Mühle, am Brunnen und im Haus, nachts schlafen sie in ihren Betten.

Tagesablauf: Händler etwa 7 bis 19 Uhr, Kunden etwa 8 bis 18:30 Uhr, Bauern etwa 6:30 bis 18 Uhr. Morgens kommen sie über die Straßen herein, abends gehen sie hinaus. Bis Version 14 heißt „heim“: Sie gehen die Straße hinaus und sind fort, sobald der König mehr als 50 Blöcke weg ist. Morgens erscheinen sie nur auf der Straße, 38 bis 80 Blöcke vom König entfernt, also nie vor seinen Augen. Ist er weit weg, stehen sie gleich an ihrem Platz. Solange sie fort sind, warten sie unsichtbar unter ihrem Arbeitsplatz, damit sie mitdenken, sobald der König in die Nähe kommt.

## Für Version 14 schon eingetragen (`PLACES11`)

- `wells`: Marktbrunnen und Ziehbrunnen, jeweils `{ name, water: [x,y,z], stand: [[x,y,z], …] }`
- `work`: 12 Stände und alle Feldplätze, jeweils `{ name, spot: [x,y,z], yaw, zone: "markt" | "felder" }`
- `fields`: 15 Äcker, jeweils `{ x0, x1, z0, z1, crop, name }`
- `homes`: Müllerhaus `{ name, door, beds, chest }`
- `sights`: Marktbrunnen, Maibaum, Windmühle, Müllerhaus, Lavendel- und Sonnenblumenfeld

Hattest du im GUIDE.md ein anderes Format vorgesehen, sind das nur ein paar Zeilen am Ende von `buildMarket11`, `buildFields11` und `buildMillHouse11`.

## Getestet

- In Chromium (ohne Grafikkarte) geladen: keine Fehler in der Konsole, Welt fertig nach etwa 9,5 s (vorher etwa 9,7 s).
- Bilder bei Tag, Abend, Nacht und Morgen angesehen. Der Tagesablauf wurde mit gezählten Zuständen geprüft: abends sind alle fort, nachts liegen die Müllersleute im Bett, morgens kommen alle wieder, und niemand bleibt hängen.
- Die Wegsuche vom Straßenende zum Markt dauert unter 1 ms.
- Ohne Grafikkarte sinkt die Bildrate an Markt und Feldern (viele Pflanzen und Figuren). Die Spiel-Logik ist dabei zu 94 % im Leerlauf, die Zeit geht also ins Zeichnen. Auf einer echten Grafikkarte sollte das kein Problem sein, und die Grafikstufe regelt sich ohnehin selbst.

## Was noch fehlt oder zu bedenken ist

- H1 sollte seine Häuser **außerhalb** des Rechtecks MARKT bauen (wie im Plan). Die Straßen hinaus (Hauptstraße und Querstraße) sollten frei bleiben, darüber kommen und gehen die Leute.
- Die Karte im Arbeitszimmer zeichnet Markt, Felder und Mühle von selbst mit. Eine eigene Beschriftung „Windmühle“ gibt es noch nicht (das wäre eine Zeile in `labelMapArt`).
- Das README auf diesem Branch hat oben einen kurzen Abschnitt „Vorschau: Marktplatz und Felder“. Beim Veröffentlichen von Teil 2 kannst du ihn in deinen eigenen Text übernehmen.
