# Bauplan Blockwelt (Branch `claude/hallo-3zyiof`)

Markus hat am 02.10.2026 entschieden, dass diese Sitzung alle weiteren Versionen baut, Schritt für Schritt nach Plan. Jeder Schritt wird fertig gebaut, im Browser getestet (keine Fehler, Bilder angesehen), dann gespeichert und auf GitHub hochgeladen. So geht bei einer Unterbrechung nichts verloren.

Stand der Haken: [x] fertig, [~] in Arbeit, [ ] offen.

## Version 11, Teil 2: das große Land wird bewohnt
- [x] Marktplatz mit Kronenbrunnen, 12 Ständen, Händlern und Kunden
- [x] Felder mit Windmühle, Müllerhaus, Bauern
- [x] Häuser der Oststadt und der Neustadt (50 Häuser mit Einrichtung, Betten, Truhe, Gärten, Gehwegen)
- [x] Gutshof: Gutshaus, Pferdestall mit Pferden, Reitplatz, Scheune, Weiden mit Kühen, Schafen, Schweinen und Hühnern, 8 Leute

## Version 12: Schloss voller Räume
- [ ] Gemäldegang zwischen Vorsaal und Thronsaal, Türen links und rechts in neue Räume
- [ ] Treppenhaus bis hinauf in den Glasraum mit Sessel für den Sonnenuntergang
- [ ] Bibliothek mit Bibliothekar, Waffenkammer, großer Keller mit vielen Räumen (manche leer)
- [ ] Schlafzimmer und Speisesaal direkt vom Thronsaal erreichbar
- [ ] Platz für die Königin (die Figur aus dem Figuren-Thread wird eingebaut, sobald das Paket vorliegt)
- [ ] Jedes Möbelstück einzeln gestaltet

## Version 13: Inventar und Handwerk
- [ ] Inventar mit Stapeln, Werkbank mit Rezepten (3 x 3), Ofen
- [ ] Alle Werkzeuge wie in Minecraft (Holz, Stein, Eisen, Gold, Diamant): Axt, Spitzhacke, Schaufel, Hacke, Schwert
- [ ] Blockmenü auf Minecraft-Niveau (Reiter, Suche)
- [ ] Eine Truhe in jedem Haus, die unbegrenzte Truhe neben dem Thron

## Version 14: Lebendiges Dorf
- [ ] Etwa 100 Bewohner mit Haus, Beruf (an der Kleidung erkennbar) und Tagesablauf, 10 ohne festen Beruf
- [ ] 17:30 Uhr alle zurück, das Mauertor schließt sich von selbst
- [ ] 18:00 Uhr Abgaben-Zug: sammeln, zum Thronsaal gehen, Abgaben selbst in die Truhe legen (nichts taucht einfach auf)

## Version 15: Befehle und Gäste
- [ ] Befehlskreis (Taste Q, am Handy „Befehle“) für James, Bewohner, Köche, Dienerinnen, Wachen, auch mit Mengen („bringt 50 Holz“)
- [ ] Seltene Gäste; ein Bote läuft zum König und erzählt, wie weit er laufen musste

## Version 16: Mauer und Schutz
- [ ] Begehbare Mauer, Sensor-Kanonen rundum, die nachts Monster draußen erledigen
- [ ] Alarmglocke in der Dorfmitte, alle laufen heim, Schutzschild über dem Schloss

## Version 17: Endlose Welt und Karte
- [ ] Land ohne Ende hinter der Mauer, Höhlen, eigenes Schiff auf dem See
- [ ] Abenteurer mit Schatzkarten zu einem überraschenden Ziel
- [ ] Karte, die sich selbst zeichnet; per Klick Leute hinschicken

## Version 18: Armee und Magie
- [ ] Über 1000 Leute anwerben, jeder Ritter oder Magier, Training im Hof
- [ ] Truppen über die Karte schicken; Zauber für den König: Schild und Feuer

## Version 19: Fremde Dörfer und Reisen
- [ ] Fremde Dörfer zum Handeln, Überfallen oder Einnehmen; fremde Könige und Bündnisse
- [ ] Straßen zwischen den Schlössern, Pferde, Kutsche mit James als Kutscher

## Version 20: Das Königreich wächst
- [ ] Gesetze und Abgaben vom Thron, Zufriedenheit der Bauern, Nachwuchs
- [ ] Neuer Mauerring außen, bevor der alte fällt
- [ ] Ritterturnier, Jahrmarkt und Feuerwerk

## Regeln beim Bauen
- Jeder Teil steht als eigener, beschrifteter Abschnitt in `index.html`. Änderungen am alten Code werden hier unten aufgeschrieben.
- Neue Blöcke und Kacheln bekommen feste Nummernbereiche (unten), damit sich nichts überschneidet.
- Alte Spielstände müssen weiterlaufen.
- Nach jedem Teil: im Browser testen, Bilder ansehen, speichern, hochladen, diesen Plan abhaken.

## Nummernbereiche
| Teil | Blöcke | Kacheln |
| --- | --- | --- |
| Markt und Felder | 900–1011 | 230–255 |
| Häuser und Gutshof | 700–759 | 150–169 |

## Änderungen am alten Code (außerhalb der eigenen Abschnitte)
- `updateEnts`: `else if (e.think) e.think(e, dt, dp);` für Leute mit eigenem Tagesablauf
