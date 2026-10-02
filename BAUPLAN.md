# Bauplan Blockwelt (Branch `claude/hallo-3zyiof`)

Markus hat am 02.10.2026 entschieden, dass diese Sitzung alle weiteren Versionen baut, Schritt für Schritt nach Plan. Jeder Schritt wird fertig gebaut, im Browser getestet (keine Fehler, Bilder angesehen), dann gespeichert und auf GitHub hochgeladen. So geht bei einer Unterbrechung nichts verloren.

Stand der Haken: [x] fertig, [~] in Arbeit, [ ] offen.

## Version 11, Teil 2: das große Land wird bewohnt
- [x] Marktplatz mit Kronenbrunnen, 12 Ständen, Händlern und Kunden
- [x] Felder mit Windmühle, Müllerhaus, Bauern
- [x] Häuser der Oststadt und der Neustadt (50 Häuser mit Einrichtung, Betten, Truhe, Gärten, Gehwegen)
- [x] Gutshof: Gutshaus, Pferdestall mit Pferden, Reitplatz, Scheune, Weiden mit Kühen, Schafen, Schweinen und Hühnern, 8 Leute

## Version 12: Schloss voller Räume
- [x] Gemäldegang (der Vorsaal mit den acht Gemälden) mit Türen links in die Waffenkammer und rechts in den Musik- und Spielsalon
- [x] Treppenhaus aus dem Arbeitszimmer hinauf in den Glasraum mit Sessel für den Sonnenuntergang
- [x] Bibliothek mit Bibliothekar Gottfried (Leitern, Sessel, Schreibtisch, eigenes Bett), Waffenkammer, großer Keller mit Weinkeller, Vorratskeller, Kerker, Holzlager und leeren Räumen
- [x] Königliches Schlafgemach mit Ankleidezimmer und königlicher Speisesaal, beide durch Türen direkt aus dem Thronsaal
- [~] Zimmer der Königin ist eingerichtet; die Figur aus dem Figuren-Thread kommt hinein, sobald das Paket auf dem Branch liegt (Ordner `figuren/frau/`)
- [x] Jedes Möbelstück einzeln gestaltet: Himmelbetten, Sessel, Sofas, Thronsessel, Kleiderschränke, Schminktisch, Marmorkamine mit Spiegel, Flügel, Harfe, Schach, Billard, Weinregale, Kandelaber, Kronleuchter, Wandleuchter, Vorhänge, Waffenständer, Teleskop, Büsten, Rüstungen
- [x] Vier Gästezimmer und Salon neu eingerichtet
- [x] Extra: Treppen steigt man ohne Springen hinauf (Stufen bis ein Block hoch, wie in Minecraft)

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
| Häuser und Gutshof | 700–759 | keine neuen |
| Version 12: Schloss voller Räume | 760–899 | 150–169 |

## Änderungen am alten Code (außerhalb der eigenen Abschnitte)
- `updateEnts`: `else if (e.think) e.think(e, dt, dp);` für Leute mit eigenem Tagesablauf
- Spieler (`step`, `stepUp`, `placeCamera`, Figur des Spielers): Stufen bis ein Block hoch werden ohne Springen erstiegen, die Kamera gleitet mit `P.camLift` weich nach. Möbel (`SHAPE`), Truhen, Fässer, Öfen, Theken, Werkbank, Regale und Goldgeländer bleiben Hindernisse.
