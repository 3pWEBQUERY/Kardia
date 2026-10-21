# Bildsprache «Puls & Alpen»

Kardia bleibt flach (PRD 8.1): **keine Schatten, keine Verläufe, kein Blur, keine Emoji, Farben nur
über Tokens.** Lebendigkeit entsteht über Flächen, Linien, Typografie und echte Produktinhalte.

## Motiv

Ein Herzschlag (Kardia), dessen Spitze zum Gipfel wird, über Höhenlinien wie auf einer
Landeskarte. Komponenten in `apps/web/src/components/brand/`:

| Komponente | Einsatz |
| --- | --- |
| `AlpinePulse` | Hero-Hintergrund (Startseite, Einstiege). Inhalt oben/links, Berge unten. Pro Seite höchstens einmal (Pattern-ID). |
| `ContourField` | Ruhiger Hintergrund für Footer, CTA-Kacheln, Login-Panel (`tone`: brand, sand, accent). |
| `PulseLine` | Trenner/Akzent; Farbe über `text-*` (currentColor). |
| `KardiaMark`, `KardiaLogo` | Bildmarke (Kachel brand-950 + Pulslinie pulse-500) und Wortmarke. |
| `DEPARTMENT_ICONS` | Ein Lucide-Icon je Fachbereich. |

## Farben

- `brand-950 … brand-100`: Markenflächen, **in beiden Modi dunkel**. Text darauf nur `brand-100`
  (primär) und `brand-300` (sekundär) – Kontrast ≥ 4.5:1 ist getestet.
- `pulse-500`: Signalfarbe für Pulslinie, Gipfelpunkt, Haupt-CTA auf dunklen Flächen
  (Text darauf `brand-950`). Nicht für Fliesstext.
- `sand-100/200`: warme Abschnittsflächen im Wechsel mit `surface-0`/`surface-50`.
- `accent-*`: weiterhin Primäraktion im Produkt (Buttons, Links, Fokus).

## Typografie

`text-hero` (Startseiten-Hero), `text-display-l` (Abschnittstitel auf Einstiegsseiten),
danach `text-display`, `text-h1` … wie bisher. Kennzahlen mit `tabular`.

## Rhythmus der Einstiegsseiten

1. Hero auf `brand-950` mit `AlpinePulse`, Haupthandlung als helle Karte (Rahmen `brand-700`).
2. Wechsel heller Abschnitte (`surface-0`, `surface-50`, `sand-100`) mit grossen Titeln.
3. Ein farbiges Statement-Band (`accent-600`, Text `on-accent`).
4. Produktausschnitte mit echten Komponenten (Dienstrhythmus, Bedingungschips, Pass) statt Bildern.
5. Footer auf `brand-950` mit Höhenlinien und Wortmarke.

Tiefe nur über Rahmen (`line-200/300`, `brand-700/800`) und Flächenkontrast. Hover: Rahmenfarbe
oder Fläche wechseln, nie anheben. Animationen nur `k-pulse-draw`, `k-ping`, `k-marquee`;
alle respektieren `prefers-reduced-motion`.
