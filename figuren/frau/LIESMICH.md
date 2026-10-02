# Königin von Blockwelt – realistische Frau im Schlafzimmer

Vorschau für Markus: https://claude.ai/artifact/S5V9LX49CBe5owL3jTBwnh

Markus hat sie am 29.09.2026 freigegeben („wenn es gut ist, dann kann man rein machen“). Stand 30.09.2026 abends: neue Befehle Holz hacken (`chop`) und Kämpfen mit Degen (`strike`), siehe „Neue Befehle“ unten. `frau.glb` und `frau.js` gehören zusammen, bitte beide ersetzen. Hinlegen, Schlafen und Aufstehen (`lie_down`, `sleep`, `get_up`) folgen als Nächstes im selben Paket; die Befehle dafür sind in `frau.js` schon drin und geben `false` zurück, solange die Clips fehlen.

## Was hier liegt

| Datei | Inhalt |
|---|---|
| `frau.glb` | Die Figur (5,8 MB): Körper, Kopf mit Gesichtsformen, Haare, 14 Bewegungen, Texturen als WebP |
| `frau.js` | Steuerung für three.js r128: Materialien (Haut, Haare, Augen), Bewegungen, Befehle, Axt und Degen, Blinzeln, Lächeln, Blick, Sprechen, Spiellicht |
| `GLTFLoader-r128.js` | Der passende GLTFLoader (three.js 0.128.0, examples/js), falls das Spiel noch keinen hat |
| `preview.html` | Quelltext der Vorschau-Seite (zeigt, wie `frau.js` benutzt wird) |
| `bilder/` | Drei Bilder von ihr (ganz, Gesicht, Seite), zum Anschauen ohne Vorschau |
| `quellen/` | Bauskripte (Blender, Texturen, GLB-Nachbearbeitung), nur zum Nachbauen |
| `LICENSE.md` | Lizenz und Herkunft (MIT, Microsoft Rocketbox) |

## Für den Bau-Thread: so kommt sie ins Spiel

Das Spiel nutzt three.js r128. Reihenfolge: `GLTFLoader-r128.js`, dann `frau.js` (beide als normale Skripte nach three.js).

```js
const frau = await Frau.load('frau.glb', { renderer, game: true, maxTexture: 1024 });   // oder ArrayBuffer statt URL
scene.add(frau.root);
frau.root.position.set(x, y, z);           // Füße bei y, 1 Einheit = 1 m
frau.root.rotation.y = blickrichtung;      // sie schaut in +Z
// jedes Bild:
const l = lightAt(x, y + 1.5, z);          // Himmels- und Lampenlicht wie bei den anderen Figuren
frau.setLight(l.x, l.y);
frau.update(dt, { lookAt: camera.position, speed: aktuelleGeschwindigkeitInMeterProSekunde });
```

- `game: true` rechnet ihr Licht wie `LIGHT_GLSL` im Spiel (Himmel mal skyF, Lampe mal blkF mit `uLamp`), dazu ein weiches Schlüssellicht aus Kamerasicht, damit sie in dunklen Räumen gut aussieht. Das Umgebungslicht kommt dabei nur vom HemisphereLight des Spiels (wie bei den Blöcken), deshalb ist sie draußen so hell wie ihre Umgebung. Geprüft mit Sonne 0.68, Hemisphere 0.55 und dem Sonnenschatten des Spiels (bias -0.0006, normalBias 0.04). Texturen werden dabei als Linear behandelt, weil das Spiel ohne sRGB-Ausgabe arbeitet.
- `speed` wählt die Bewegung selbst: unter 0,12 m/s stehen, bis 1,35 gehen (Clip 1,15 m/s), bis 2,1 schnell gehen (1,53 m/s), darüber laufen (2,77 m/s). Die Abspielgeschwindigkeit passt sich an. Ohne `speed` steuert man mit `setMode('idle'|'walk'|'walk_fast'|'run'|'talk')`.
- Gesten: `frau.play('wave'|'touch_hair'|'look_around')`. Im Stehen spielt sie von selbst alle 14 bis 32 Sekunden eine kleine Geste (`autoGestures: false` schaltet das ab).
- Sprechen: `frau.say(sekunden)` bewegt den Mund passend zu einer Sprechblase.
- Sitzen: `frau.sit()` und `frau.standUp()`. Sie setzt sich rückwärts auf einen Sitz, der 0,45 m hinter ihrem Standplatz steht, Sitzhöhe etwa 0,48 m (eine halbe Blockhöhe passt). Das Bett ist 1 m hoch, darauf passt diese Bewegung nicht; ein Stuhl, Sessel oder eine Stufe in halber Höhe schon.
- Blick: Kopf, Hals und Augen drehen sich zu `lookAt` (bis etwa 70 Grad zur Seite), sie blinzelt, macht kleine Blicksprünge und lächelt, wenn Markus näher als etwa 3 m ist und sie ihn ansieht.
- Folgen: wie bei James den Weg im Spiel berechnen und `root.position`/`rotation.y` setzen, `speed` mitgeben. Die Bewegungen laufen auf der Stelle (kein Rutschen durch eigene Wurzelbewegung).
- Nur laden, wenn sie gebraucht wird (Schlafzimmer in der Nähe oder sie folgt), und `frau.dispose()` beim Entfernen. `maxTexture: 1024` für schwache Geräte (Stufe Schnell/Ausgewogen), 0 für volle 2048er Texturen.
- Haare: bei Kantenglättung (antialias) nutzt `frau.js` alpha-to-coverage für weiche Haarkanten, sonst einen normalen Alpha-Test.
- Offline-Datei: `frau.glb` kann als Base64 in die HTML (etwa 7,6 MB Text) und dann per `Frau.load(arrayBuffer)` geladen werden. So macht es auch die Vorschau (`frau.glb.txt`).

## Neue Befehle: Holz hacken und Kämpfen (30.09.2026)

Echte Bewegungsaufnahmen (CMU Motion Capture), auf ihr Skelett übertragen. Axt und Degen baut `frau.js` selbst als kleine Modelle (keine zusätzliche Datei); sie hält die Axt mit beiden Händen, den Degen in der rechten Hand, die Finger schließen sich um den Griff.

```js
frau.setMode('chop');     // Holz hacken, Schleife 1,8 s, Axt erscheint von selbst
frau.setMode('strike');   // Degenstoß mit Ausfallschritt, Schleife 0,83 s, Degen erscheint von selbst
frau.setMode('idle');     // Arbeit beenden, Werkzeug verschwindet
frau.onHit = arbeit => { /* 'chop' oder 'strike': Moment des Treffers, z. B. Splitter, Ton, Schaden */ };
frau.state;               // 'idle', 'walk', 'chop', 'strike', 'sit', ... (später auch 'lying', 'sleep', 'getting_up')
```

- `play('chop')` und `play('strike')` machen dasselbe wie `setMode` (gleiche Schnittstelle wie bei den Gesten). Eine Geste wie `play('wave')` geht nur, wenn sie nicht arbeitet (gibt sonst `false` zurück).
- Treffer: `chop` bei 0,925 s jeder Runde (erster Treffer 0,9 s nach dem Befehl, danach alle 1,8 s), `strike` bei 0,23 s (alle 0,83 s). `onHit` kommt genau dann, auch wenn das Spiel langsam läuft.
- Wo es trifft (vom Ursprung zwischen ihren Füßen, sie schaut nach +Z): Die Axt trifft etwa 0,75 bis 0,85 m vor ihr in 0,35 bis 0,5 m Höhe, leicht rechts. Für einen Baumstamm-Block also so stellen, dass seine Seite etwa 0,8 m vor ihr liegt (Blockmitte 1,3 m). Die Degenspitze kommt beim Stoß 1,7 m weit nach vorne, in 1,4 m Höhe (Gegner-Mitte etwa 1,3 bis 1,5 m vor ihr). Beim Ausholen ist die Axt bis 2,2 m hoch.
- Mit `update(dt, { speed })`: Bei der Arbeit geht sie erst ab 0,5 m/s los (etwa von Baum zu Baum, das Werkzeug bleibt in der Hand) und arbeitet weiter, sobald sie steht. Beim Losgehen und Anhalten wird weich übergeblendet.
- Werkzeug: `frau.setTool('auto')` (Standard: Axt bei `chop`, Degen bei `strike`, sonst keins), `setTool(null)` blendet es aus, `setTool('axe')` oder `setTool('rapier')` erzwingt eins (etwa James-artig mit Axt zum Baum laufen).
- Blick: Bei der Arbeit dreht sie den Kopf nur leicht zu `lookAt`; beim Kämpfen am besten den Gegner als `lookAt` geben.
- `sit()` beendet eine Arbeit von selbst (Werkzeug verschwindet, sie setzt sich).

## Technische Daten

- Höhe 1,73 m, Ursprung zwischen den Füßen, schaut nach +Z, Y ist oben.
- 3 Meshes (Körper 13.928, Kopf 10.356, Haare 732 Punkte), ein Skelett mit 80 Knochen (3ds-Max-Biped „Bip01“, in three.js `Bip01_Head` usw.).
- 14 Gesichtsformen (Blinzeln, Lächeln, Kiefer, Augenbrauen, Mundformen für Sprache).
- Clips: idle, idle_breathe, touch_hair, look_around, wave, talk, walk, walk_fast, run, sit, sit_down, stand_up, chop, strike (Daten in `quellen/clips.json` und in `gltf.scene.userData.clips`, bei chop und strike mit den Trefferzeiten `hits`).
- Texturen: Körper und Kopf 2048 (Farbe, Normalen), Rauheit 1024, Haare 2048 mit Alpha. Rotkanal der Rauheitskarte = Hautmaske für den Hautshader. Schatten in Falten sind als Vertexfarbe eingebacken (COLOR_0).
