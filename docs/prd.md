# Kardia – PRD Medizin-Stellenplattform Schweiz

Oct 20, 2026 · @Alexander

## 1. Zusammenfassung & Vision

Kardia (Arbeitstitel) ist die erste Schweizer Stellenplattform für Gesundheitsberufe, die Arbeitsbedingungen statt Inseratetext vergleichbar macht: pro Station, schichtgenau, verifiziert und ohne Personalvermittler. Gesucht wird nach Lebensmodell ("80 %, keine Nächte, Dienstplan 6 Wochen im Voraus"), nicht nach Stichwort.

**Kernversprechen:** Die Flexibilität und Transparenz der Temporärarbeit, aber in einer Festanstellung – direkt beim Arbeitgeber, ohne Vermittlungsaufschlag.

**Was es so noch nicht gibt** – die Kombination aus fünf Bausteinen in einem Produkt:

1. **Stationsprofil** – strukturierte Arbeitsbedingungen pro Station (Lohnband, Schichtmodell, Dienstplan-Vorlauf, Wochenenden, Betreuungsschlüssel), nicht nur pro Institution.
2. **Lebensmodell-Suche** – Filter nach Schichten, Wochentagen, Pensum-Verteilung und Planbarkeit.
3. **Qualifikations-Pass** – einmal verifizierte Diplome und Registereinträge, danach Ein-Klick-Bewerbung.
4. **Umgekehrter Marktplatz** – Fachpersonen legen anonym ihre Bedingungen fest, Arbeitgeber machen Angebote.
5. **Flex-Pool** – interne Springerpools und Einzelschichten der Arbeitgeber, direkt buchbar statt über Temporärfirmen.

Ergänzt wird das durch Weiterbildungs-Suche für Ärztinnen und Ärzte, echte Team-Einblicke, Pfade für Wiedereinsteigende und internationale Fachkräfte sowie KI-Strukturierung mit Claude Haiku 5.5.

**Zielbild in 3 Jahren:** Kardia ist in der Deutschschweiz der Standard, an dem Gesundheitsarbeitgeber ihre Arbeitsbedingungen messen lassen – vergleichbar mit dem, was Bewertungsplattformen für Hotels wurden.

**Stack (fix):** Next.js (App Router) · Railway Hosting · Railway PostgreSQL · Railway Bucket · Claude Haiku 5.5 · PWA-fähig ab Release 1, native App später.

## 2. Problem & Marktkontext

Der Schweizer Gesundheitsarbeitsmarkt ist ein Arbeitnehmermarkt, aber alle bestehenden Portale behandeln ihn wie einen Arbeitgebermarkt: Sie listen Inseratetext und verschweigen genau die Bedingungen, wegen derer Fachpersonen den Beruf oder die Festanstellung verlassen.

**Bedarf.** Laut Obsan-Versorgungsbericht steigt der Bedarf bis 2029 um rund 43'400 diplomierte Pflegefachpersonen HF/FH und 27'100 FaGe ([RRB Solothurn 2026/777](https://rrb.so.ch/beschlussnummer/2026_777/download/2283caae463d43c1840fa2e626128652/)). Während sich der übrige Schweizer Arbeitsmarkt entspannt, bleibt das Gesundheitswesen angespannt ([frontaliers-grandest.eu](https://frontaliers-grandest.eu/de/?p=63863)).

**Fragmentierung.** Neben Generalisten (jobs.ch, jobup.ch, Indeed) existieren über zehn Nischenportale – carejobs.ch, hospital-jobs.ch, spitalstellenmarkt.ch, praxisstellen.ch, medtalents.ch, fmhjob.ch, spitexjobs.ch, dentalstellen.ch, psychjob.ch ([Kanton St. Gallen](https://www.hallo.sg.ch/en/arbeit-finanzen/arbeitsstelle/arbeitssuche/_jcr_content/pdfonthefly.ocFile/arbeitssuche-en.pdf)). Der reichweitenstärkste Akteur, Medi-Karriere, ist ein DACH-Aggregator der praktischArzt-Gruppe und übernimmt Inserate anderer Portale ([medi-karriere.ch](https://medi-karriere.ch)).

**Temporärarbeit als Symptom.** Pflegende wechseln in die Temporärarbeit wegen weniger Druck, mehr Lohn und selbst wählbarer Arbeitszeiten ([SRF](https://www.srf.ch/news/wirtschaft/arbeit-auf-zeit-spitaeler-bauen-immer-mehr-temporaerstellen-ab)). Für Spitäler kostet das bis zu 75 % mehr ([SRF](https://www.srf.ch/news/schweiz/fachkraeftemangel-temporaerfirmen-machen-spitaelern-bauchschmerzen)). Die 35 Institutionen des VZK wollten ab Sommer 2025 auf temporäres Pflegefachpersonal verzichten ([Kantonsrat ZH](https://parlzhcdws.cmicloud.ch/parlzh5/cdws/Files/58cff922267344b6aeebdff191c400ac-332/1/pdf)), und Spitäler bauen interne Springerpools auf ([SRF](https://www.srf.ch/news/wirtschaft/arbeit-auf-zeit-spitaeler-bauen-immer-mehr-temporaerstellen-ab)).

**Regulierung.** Das Bundesgesetz über die Arbeitsbedingungen in der Pflege (BGAP, Geschäft 25.054) ist im Parlament; die SGK-S ist im September 2026 einstimmig eingetreten ([Parlament](https://www.parlament.ch/press-releases/Pages/mm-sgk-s-2026-09-02.aspx?lang=1031)). Arbeitsbedingungen werden damit zur Pflicht- und Vergleichsgrösse.

**Die drei Kernprobleme, die Kardia löst:**

| Wer | Problem heute | Kardia-Antwort |
| --- | --- | --- |
| Fachperson | Inserate verschweigen Lohn, Schichten, Planbarkeit; Vergleich nur per Telefon | Stationsprofil + Lebensmodell-Suche |
| Fachperson | Bewerbung kostet Stunden, Diplome werden jedes Mal neu geprüft | Qualifikations-Pass + Ein-Klick-Bewerbung |
| Arbeitgeber | Lücken werden über Agenturen mit hohem Aufschlag gefüllt | Flex-Pool + umgekehrter Marktplatz, direkt und ohne Vermittler |

## 3. Ziele, Nicht-Ziele und KPIs

Kardia misst Erfolg an besetzten Stellen und vollständigen Stationsprofilen, nicht an Seitenaufrufen.

**Produktziele**

1. Fachpersonen finden eine passende Stelle anhand harter Bedingungen in unter 5 Minuten.
2. Arbeitgeber besetzen Stellen direkt, ohne Personalvermittler.
3. Jede aktive Stelle hat ein vollständiges Stationsprofil (alle Pflichtfelder gefüllt).
4. Kardia wird die Referenz für vergleichbare Arbeitsbedingungen im Schweizer Gesundheitswesen.

**Nicht-Ziele (bewusst ausgeschlossen)**

- Kein eigener Personalverleih: Kardia ist nie Arbeitgeber und stellt niemanden temporär an.
- Keine Inserate von Personalvermittlern im Standard-Feed (Regeln siehe Modul C).
- Keine Lohnabrechnung, keine Zeiterfassung, kein vollständiges Dienstplan-Tool (Schnittstelle statt Nachbau).
- Keine KI-generierten Bewerbungsschreiben oder Inseratetexte.
- Keine Berufe ausserhalb des Gesundheitswesens.

**KPIs**

| KPI | Definition | Ziel 12 Monate nach Launch |
| --- | --- | --- |
| Profil-Vollständigkeit | Anteil aktiver Stellen mit allen Pflichtfeldern | ≥ 90 % |
| Bewerbungen pro Stelle | Qualifizierte Bewerbungen (Pass-Match ≥ 70 %) je Stelle | ≥ 4 |
| Time-to-Hire | Tage von Veröffentlichung bis Status "angestellt" | ≤ 30 |
| Ein-Klick-Quote | Anteil Bewerbungen über Qualifikations-Pass | ≥ 60 % |
| Antwortquote Arbeitgeber | Bewerbungen mit Statusänderung innert 5 Arbeitstagen | ≥ 85 % |
| Angebotsannahme Marktplatz | Angenommene Angebote / gesendete Angebote | ≥ 15 % |
| Flex-Schichten besetzt | Besetzte / ausgeschriebene Pool-Schichten | ≥ 70 % |
| Zahlende Arbeitgeber | Institutionen mit aktivem Abo | 120 |
| Wöchentlich aktive Fachpersonen | Login + mindestens eine Suche oder Aktion | 8'000 |

Alle KPIs werden aus Ereignissen in der eigenen Datenbank berechnet (Tabelle `Event`, siehe Datenmodell); keine Drittanbieter-Tracker.

## 4. Zielgruppen & Personas

Kardia hat drei Nutzerrollen: Fachperson, Arbeitgeber und Plattform-Admin. Die Personas decken die Berufsgruppen ab, die in Release 1 bis 3 bedient werden.

| Persona | Profil | Hauptbedürfnis | Wichtigste Module |
| --- | --- | --- | --- |
| Lea, 29, Dipl. Pflegefachfrau HF | Akutspital, 90 %, denkt an Temporärarbeit | Planbare Dienste, keine Nächte mehr, fairer Lohn | A, B, C, E |
| Marco, 42, FaGe | Langzeitpflege, 2 Kinder | Teilzeit an fixen Tagen, Nähe zum Wohnort | A, B |
| Dr. Sara, 31, Assistenzärztin | 2. Weiterbildungsjahr Innere Medizin | Anerkannte Weiterbildungsstelle für den FMH-Titel | F, D |
| Nadine, 45, Wiedereinsteigerin | 8 Jahre Pause, Diplom HF | Sicherer Wiedereinstieg mit Einarbeitung | H, A |
| Jonas, 34, Pflegefachmann aus DE | Deutsches Examen, SRK-Anerkennung offen | Wissen, was er wo arbeiten darf und wann | H, D |
| Ursula, 52, Leiterin Pflege | Regionalspital, 14 offene Stellen | Stellen direkt besetzen, Agenturkosten senken | A, C, E, Arbeitgeber-Cockpit |
| Reto, 38, HR-Recruiter | Spitalgruppe, 3 Standorte | Weniger Prüfaufwand, schnelle Rückmeldung | D, Pipeline |
| Praxis Dr. Keller | Hausarztpraxis, sucht MPA 60 % | Einfaches Inserat in 10 Minuten | A, KI-Strukturierung |

**Berufsgruppen nach Release**

- **R1:** Pflege (Dipl. Pflegefachperson HF/FH, FaGe, AGS, Pflegehelfer/in SRK), Langzeitpflege und Spitex.
- **R2:** Ärztinnen und Ärzte (Assistenz-, Ober-, Leitende Ärzte), MPA.
- **R3:** Therapie (Physio, Ergo, Logopädie), MTRA, BMA, Rettungsdienst, OP-Fachpersonen (TOA), Hebammen.

**Regionen:** Start Kanton Zürich, danach Deutschschweiz. Romandie und Tessin ab R3 (UI bereits ab R1 viersprachig vorbereitet: DE, FR, IT, EN).

## 5. Produktprinzipien & Positionierung

Positionierung in einem Satz: **"Kardia zeigt dir, wie es sich auf einer Station arbeiten lässt – bevor du dich bewirbst."**

**Sieben Prinzipien, die jede Produktentscheidung prüfen:**

1. **Fakten vor Werbung.** Jede Angabe ist ein strukturiertes Feld mit Einheit. Freitext ist nur Ergänzung, nie Ersatz.
2. **Station vor Institution.** Bedingungen unterscheiden sich zwischen IPS und Geriatrie desselben Spitals; das Profil hängt an der Station.
3. **Direkt vor vermittelt.** Kardia verbindet Fachperson und Arbeitgeber ohne Zwischenhändler.
4. **Anonym bis zur Zustimmung.** Fachpersonen sind für Arbeitgeber nie identifizierbar, bevor sie es aktiv freigeben.
5. **Einmal prüfen, überall nutzen.** Verifizierte Qualifikationen werden nie zweimal hochgeladen.
6. **KI strukturiert, Menschen entscheiden.** Die KI wandelt Text in Felder und schlägt Matches vor; sie schreibt keine Bewerbungen und trifft keine Entscheidungen.
7. **Ruhige Oberfläche.** Ein Gesundheitsberuf ist anstrengend genug; die UI ist sachlich, dicht und ohne Effekthascherei.

**Abgrenzung zum Wettbewerb**

| Merkmal | Generalisten (jobs.ch, jobup) | Nischenportale (carejobs, praxisstellen u. a.) | Medi-Karriere | Kardia |
| --- | --- | --- | --- | --- |
| Fokus Gesundheit | Nein | Ja, je ein Segment | Ja, DACH | Ja, alle Berufe CH |
| Strukturierte Arbeitsbedingungen | Nein | Nein | Nein | Pflicht, pro Station |
| Suche nach Schichten und Planbarkeit | Nein | Nein | Nein | Ja |
| Agentur-Inserate gekennzeichnet | Nein | Teilweise | Nein | Ausgeschlossen bzw. markiert |
| Verifizierte Qualifikationen | Nein | Nein | Nein | Ja |
| Arbeitgeber bewerben sich | Nein | Nein | Nein | Ja |
| Einzelschichten direkt buchbar | Nein | Nein | Nein | Ja |

Die Angaben zu Mitbewerbern beruhen auf öffentlich sichtbaren Funktionen und sind vor Launch per Testkonto zu verifizieren (offene Frage Q-1).

## 6. Funktionsumfang

Kardia besteht aus neun Produktmodulen (A–I) plus Arbeitgeber-Cockpit und Admin-Konsole. Jedes Modul hat ein Release (R1–R3) und prüfbare Akzeptanzkriterien (AK).

### A · Stationsprofil (R1)

Jede Stelle gehört zu genau einer Station; die Station trägt die Arbeitsbedingungen. Eine Stelle erbt alle Felder der Station und darf einzelne überschreiben.

| Feld | Typ / Einheit | Pflicht |
| --- | --- | --- |
| Fachbereich | Enum (IPS, Notfall, Chirurgie, Medizin, Geriatrie, Psychiatrie, Pädiatrie, Onkologie, OP, Langzeit, Spitex, Rehabilitation, Praxis …) | Ja |
| Lohnband | CHF brutto/Jahr bei 100 %, min–max, 13 Monatslöhne ja/nein | Ja |
| Schichtzulagen | CHF/Stunde Nacht, % Sonntag, CHF Pikett/Tag | Ja |
| Schichtmodell | Mehrfachauswahl: Früh, Spät, Nacht, Tag-12h, Geteilter Dienst, nur Werktage | Ja |
| Dienstplan-Vorlauf | Wochen (ganzzahlig) | Ja |
| Wochenenden pro Monat | Anzahl bei 100 % (Durchschnitt) | Ja |
| Wunschfrei-Regel | Anzahl garantierte Wunschfrei-Tage pro Monat | Ja |
| Pensum-Spanne | % min–max, Schritt 10 | Ja |
| Mindestdienste pro Woche | Anzahl (für Teilzeit-Planbarkeit) | Nein |
| Betreuungsschlüssel | Patient:innen pro diplomierte Fachperson, je Tag und Nacht | Ja (Akut/Langzeit) |
| Skill-Grade-Mix | % HF/FH, % FaGe, % Hilfspersonal | Nein |
| Einarbeitung | Wochen mit Bezugsperson | Ja |
| Ferien | Wochen bei 100 %, nach Alter gestaffelt | Ja |
| Weiterbildung | CHF/Jahr Budget und Tage/Jahr | Nein |
| Kinderbetreuung | Kita intern / Beitrag CHF/Monat / keine | Nein |
| Arbeitsort | Adresse, Koordinaten, Parkplatz ja/nein | Ja |
| GAV | Name des GAV oder "kein GAV" | Ja |

- **AK-A1** Eine Stelle kann nicht veröffentlicht werden, solange ein Pflichtfeld leer ist.
- **AK-A2** Jedes Feld zeigt im Profil Quelle und Datum der letzten Bestätigung ("bestätigt von Arbeitgeber am …").
- **AK-A3** Ein Arbeitgeber muss jedes Stationsprofil spätestens alle 180 Tage bestätigen; sonst wird es als "veraltet" markiert und im Ranking zurückgestuft.
- **AK-A4** Lohnbänder mit einer Spanne grösser als 40 % des Minimums werden abgelehnt.

### B · Lebensmodell-Suche (R1)

Fachpersonen suchen über Bedingungen. Jede Bedingung ist entweder **Muss** oder **Wunsch**. Ergebnisse zeigen pro Bedingung, ob sie erfüllt ist – eine Zeile mit klaren Zuständen statt eines undurchsichtigen Match-Scores.

- Filter: alle Felder aus A plus Beruf, Pensum, Startdatum, Pendelzeit.
- **Pendelzeit** mit ÖV oder Auto ab Wohnadresse, in Minuten. ÖV über die offene Fahrplan-API der Schweiz (opentransportdata.swiss), Auto über OSRM (selbst gehostet auf Railway). Berechnung asynchron, Ergebnis gecacht pro Adresse–Station-Paar für 30 Tage.
- **Bedingungszeile** pro Treffer: z. B. "Keine Nächte ✓ · Dienstplan 6 Wo ✓ · Lohn ≥ 95k ✓ · Pendelzeit 34 min (Wunsch 30) ✗" – sortiert nach erfüllten Muss-Bedingungen, dann Wünschen.
- **Gespeicherte Suchen** mit Benachrichtigung per E-Mail oder Web Push (sofort, täglich, wöchentlich).
- **Kartenansicht** mit Stationen als Punkte; Liste und Karte teilen denselben Filterzustand in der URL.

* **AK-B1** Ein Treffer, der eine Muss-Bedingung verletzt, wird nie angezeigt.
* **AK-B2** Filterzustand ist vollständig in der URL abgebildet und teilbar.
* **AK-B3** Suchantwort p95 < 300 ms bei 50'000 aktiven Stellen (ohne Pendelzeit, die nachgeladen wird).

### C · Agenturfrei & Flex-Pool (R1 agenturfrei, R2 Flex-Pool)

**Agenturfrei.** Nur Organisationen, die selbst Arbeitgeber der ausgeschriebenen Stelle sind, dürfen inserieren.

- Registrierung mit UID (Unternehmens-Identifikationsnummer); Abgleich gegen das öffentliche UID-Register.
- Abgleich gegen das öffentliche SECO-Verzeichnis bewilligter Vermittlungs- und Verleihbetriebe; Treffer werden manuell geprüft.
- Inserate ohne konkrete Station und Adresse sind technisch nicht möglich (siehe AK-A1).
- Personalvermittler können in R3 optional in einem getrennten, klar beschrifteten Bereich zugelassen werden (Entscheid offen, Q-4).

**Flex-Pool.** Arbeitgeber veröffentlichen einzelne Schichten oder Kurzeinsätze für ihren **eigenen** Springerpool. Mitglieder des Pools sind beim Arbeitgeber angestellt (Rahmenvertrag im Stundenlohn); Kardia ist reine Software.

1. Arbeitgeber legt Pool an und lädt Fachpersonen ein (oder nimmt Bewerbungen über eine Pool-Stelle an).
2. Arbeitgeber veröffentlicht eine Schicht: Station, Datum, Dienst, Stundenlohn, Anforderungen.
3. Pool-Mitglieder sehen offene Schichten in der App und buchen mit einem Tipp; Regel "wer zuerst bestätigt" oder "Arbeitgeber wählt aus" pro Pool einstellbar.
4. Bestätigung an beide Seiten; Kalender-Export (ICS) für die Fachperson.
5. Absage bis X Stunden vorher (pro Pool definiert); danach nur über den Arbeitgeber.

- **AK-C1** Eine Organisation mit Treffer im SECO-Verzeichnis kann ohne Admin-Freigabe keine Stelle veröffentlichen.
- **AK-C2** Eine Schicht kann nie von zwei Personen gleichzeitig gebucht werden (Transaktion mit Zeilensperre, siehe Architektur).
- **AK-C3** Kardia speichert keinen Arbeitsvertrag und tritt in keinem Dokument als Arbeitgeber auf.

### D · Qualifikations-Pass (R1 manuell, R2 teilautomatisiert)

Der Pass bündelt alle Nachweise einer Fachperson. Er wird einmal geprüft und bei jeder Bewerbung als verifizierter Block mitgeschickt.

- **Inhalte:** Diplome und Abschlüsse, Anerkennungsentscheide (SRK, MEBEKO), Registereintrag mit Registernummer, Berufserfahrung nach Fachbereich in Jahren, Sprachen mit Niveau (A1–C2), Weiterbildungen (NDS, CAS, MAS), Arbeitsbewilligung (nur Ja/Nein "in der Schweiz arbeitsberechtigt", ohne Status-Details).
- **Verifikation R1:** Upload als PDF/JPG in den Railway Bucket (privat), Prüfung durch Kardia-Team in der Admin-Konsole, Abgleich der Registernummer in den öffentlichen Berufsregistern (MedReg für Ärztinnen und Ärzte; GesReg bzw. NAREG für weitere Gesundheitsberufe – Zuordnung je Beruf: Q-2).
- **Verifikation R2:** Automatischer Registerabgleich, sofern eine maschinenlesbare Abfrage zulässig ist; KI-Vorprüfung der Dokumente (Typ, Name, Datum, Aussteller) mit Claude Haiku 5.5, Entscheid bleibt beim Menschen.
- **Status pro Nachweis:** `eingereicht` → `in Prüfung` → `verifiziert` | `abgelehnt (Grund)` | `abgelaufen`.
- **Ein-Klick-Bewerbung:** Bewerbung = Pass (verifizierte Felder) + optional 500 Zeichen persönliche Nachricht. Kein Motivationsschreiben-Zwang.
- **AK-D1** Arbeitgeber sehen die Originaldokumente nur nach ausdrücklicher Freigabe pro Bewerbung; sonst nur den Status "verifiziert".
- **AK-D2** Verifizierte Felder sind für die Fachperson nicht mehr editierbar, ohne dass der Status auf "eingereicht" zurückfällt.
- **AK-D3** Bearbeitungszeit der manuellen Prüfung ≤ 2 Arbeitstage (SLA, im Admin-Dashboard gemessen).

### E · Umgekehrter Marktplatz (R2)

Fachpersonen veröffentlichen ein anonymes Verfügbarkeitsprofil mit ihren Bedingungen. Arbeitgeber suchen darin und senden strukturierte Angebote.

- **Anonymes Profil:** Beruf, Fachbereich, Erfahrung in Jahren, Region (Bezirk, nicht Adresse), Pensum, Muss-Bedingungen, frühester Start, Pass-Status. Kein Name, kein Foto, kein Geburtsjahr, keine aktuellen Arbeitgeber.
- **Sperrliste:** Fachperson sperrt Institutionen (z. B. aktuellen Arbeitgeber); gesperrte Institutionen sehen das Profil nicht.
- **Angebot:** muss eine konkrete Stelle mit Stationsprofil referenzieren und einen konkreten Jahreslohn (nicht Band) enthalten. Felder: Lohn, Pensum, Start, Freitext ≤ 600 Zeichen, Gültigkeit 14 Tage.
- **Kontingent:** Angebote pro Arbeitgeber und Monat je nach Abo (siehe Pricing); maximal 1 offenes Angebot pro Arbeitgeber und Fachperson.
- **Annahme:** Erst bei "Interesse" gibt die Fachperson Name und Kontakt frei; danach Chat im Bewerbungs-Thread.
- **AK-E1** Kein API-Endpunkt liefert identifizierende Daten eines anonymen Profils vor dessen Freigabe (Test im CI).
- **AK-E2** Ein Angebot unter dem Minimum des Lohnbands der referenzierten Station wird abgelehnt.
- **AK-E3** Fachpersonen können Angebote mit einem Tipp ablehnen; der Grund ist optional und wird dem Arbeitgeber aggregiert (nicht einzeln) angezeigt.

### F · Weiterbildungs-Suche für Ärztinnen und Ärzte (R2)

Assistenzärztinnen und -ärzte suchen nach anrechenbarer Weiterbildung, nicht nach Ort. Kardia verknüpft jede ärztliche Stelle mit der anerkannten Weiterbildungsstätte.

- Felder pro Stelle: Facharzttitel (Liste der eidg. Weiterbildungstitel), Weiterbildungsstätten-Kategorie, maximal anrechenbare Jahre, Rotationen, Anzahl Assistenzstellen, wöchentliche Soll-Arbeitszeit in Stunden, strukturierte Weiterbildung in Stunden/Woche.
- Suche "Was fehlt mir noch?": Ärztin erfasst bereits absolvierte Jahre je Bereich; Kardia zeigt Stellen, die die verbleibende Lücke schliessen.
- Datenbasis: Angaben der Arbeitgeber, abgeglichen mit dem öffentlichen SIWF-Register der Weiterbildungsstätten (Nutzungsbedingungen klären: Q-3).
- **AK-F1** Eine Arztstelle ohne Weiterbildungsstätten-Angabe wird als "keine anerkannte Weiterbildung" gekennzeichnet.
- **AK-F2** Abweichungen zwischen Arbeitgeberangabe und Register werden im Admin-Dashboard gemeldet.

### G · Team-Einblicke & Realitäts-Check (R2)

Der Realitäts-Check ist das Merkmal, das es in keinem Stellenportal gibt: Mitarbeitende einer Station bestätigen oder widersprechen jeder einzelnen Angabe des Stationsprofils.

- **Realitäts-Check:** Verifizierte Mitarbeitende (siehe unten) beantworten pro Feld "stimmt" / "stimmt nicht" + optional den aus ihrer Sicht korrekten Wert. Ab 5 Antworten pro Feld wird ein Abgleich angezeigt ("Dienstplan-Vorlauf: Arbeitgeber 6 Wo · Team 4 Wo, 7 Antworten"). Unter 5 Antworten wird nichts angezeigt (Anonymitätsschutz).
- **Verifizierung Mitarbeitende:** Bestätigung per E-Mail an eine Domain der Institution, oder Einladung durch den Arbeitgeber (dann gekennzeichnet als "vom Arbeitgeber eingeladen").
- **Stationsvideos:** max. 60 Sekunden, MP4/MOV-Upload, serverseitig transkodiert (H.264, 720p, Untertitel-Datei WebVTT Pflicht). Maximal 5 Videos pro Station.
- **Frag das Team:** asynchrone Fragen an freiwillige Stations-Botschafter:innen; öffentliche Antworten nach Moderation sichtbar, Antwortzeit wird angezeigt.
- **AK-G1** Kein Realitäts-Check-Wert ist einer Person zuordenbar; Mindestanzahl 5 wird serverseitig erzwungen.
- **AK-G2** Arbeitgeber können Realitäts-Check-Werte nicht löschen oder ausblenden, nur kommentieren.
- **AK-G3** Videos ohne Untertitel-Datei werden nicht veröffentlicht.

### H · Wiedereinstieg & internationale Fachkräfte (R2)

- **Comeback-Pfad:** Stationen markieren sich als "wiedereinstiegsfreundlich" mit Pflichtangaben: Einarbeitung in Wochen, begleitete Dienste, Refresher-Kurse (Anbieter, Dauer, Kosten-Übernahme in CHF).
- **Anerkennungs-Tracker:** Checkliste je Herkunftsabschluss und Zielberuf (z. B. Pflege DE → SRK-Anerkennung; Arzt EU → MEBEKO). Schritte, Unterlagen, offizielle Links, eigener Fortschritt. Inhalte werden redaktionell gepflegt und mit Prüfdatum versehen; keine Rechtsberatung.
- **Suchfilter:** "Anerkennung läuft – Anstellung als … bis Abschluss möglich" (Arbeitgeberangabe pro Stelle).
- **Grundsatz:** Kardia betreibt keine aktive Anwerbung im Ausland (Haltung gemäss WHO-Verhaltenskodex zur internationalen Rekrutierung von Gesundheitspersonal; Formulierung juristisch prüfen, Q-6).

### I · KI-Strukturierung (R1)

KI-Funktionen sind in Abschnitt 9 vollständig spezifiziert. Kurzfassung: Inserat-Import und Strukturierung, Dokument-Vorprüfung, semantische Suche, Zusammenfassung von Realitäts-Check-Freitexten – alles mit Claude Haiku 5.5 und immer mit menschlicher Bestätigung.

### Arbeitgeber-Cockpit (R1, erweitert R2)

- **Organisation:** Institution → Standorte → Stationen → Stellen; Rollen pro Mitglied (Owner, Recruiter, Stationsleitung, Viewer).
- **Pipeline:** Bewerbungen pro Stelle in Spalten `Neu` → `Gesichtet` → `Gespräch` → `Angebot` → `Angestellt` | `Abgesagt`. Absage mit Grund aus fester Liste; Fachperson erhält Status sofort.
- **Benchmark (R2):** Jede Station sieht ihre Werte im Vergleich zum Median ihres Fachbereichs und ihrer Region ("Dienstplan-Vorlauf 3 Wo · Median Region Zürich IPS 5 Wo"). Anzeige erst ab 8 Vergleichsstationen.
- **Flex-Pool-Verwaltung:** Pool-Mitglieder, offene/gebuchte Schichten, Export CSV.
- **Team:** Einladung per E-Mail, SSO (SAML/OIDC) ab Abo "Spitalgruppe".

### Admin-Konsole (R1)

- Prüfqueue Qualifikations-Pass (Dokument links, Felder rechts, Registerlink, Entscheid mit Grund).
- Prüfqueue Organisationen (UID, SECO-Treffer, Domain).
- Moderation: Fragen, Antworten, Videos, gemeldete Inhalte.
- Redaktion: Anerkennungs-Tracker, Enum-Listen (Fachbereiche, Berufe, Titel).
- Audit-Log: jede Admin-Aktion mit Person, Zeit, Objekt, Vorher/Nachher.

## 7. UX-Konzept

Die UX übersetzt Bedingungen in Bilder des Arbeitsalltags: Eine Fachperson sieht nicht "Schichtbetrieb", sondern wie ihre nächsten vier Wochen auf dieser Station aussehen würden.

### 7.1 Fünf Interaktionsmuster, die Kardia einzigartig machen

1. **Dienstrhythmus-Vorschau.** Jede Station hinterlegt einen Muster-Dienstplan über 4 Wochen (28 Tage × Dienstcode F/S/N/T/frei, Pflichtfeld ab R2). Die UI zeigt ihn als schmalen Kalenderstreifen mit 28 Zellen; Wochenenden sind durch eine feine vertikale Linie getrennt. Bei Teilzeit wird der Streifen auf das gewählte Pensum skaliert (z. B. 60 % = 12 Dienste). So wird Planbarkeit in 2 Sekunden sichtbar.
2. **Bedingungszeile.** Pro Suchtreffer eine Zeile mit allen Muss- und Wunsch-Bedingungen als Text-Chips mit Zustand (erfüllt, nicht erfüllt, unbekannt). Kein Prozent-Score, keine Sterne.
3. **Stellen-Vergleich.** Bis zu 4 Stellen nebeneinander, Zeilen = Felder des Stationsprofils. Die beste Ausprägung je Zeile ist fett; identische Zeilen lassen sich mit einem Schalter ausblenden ("nur Unterschiede").
4. **Realitäts-Check inline.** Neben jedem Profilfeld steht, falls vorhanden, der Team-Wert in kleiner Schrift. Abweichungen werden mit einem Warn-Token markiert, nie versteckt.
5. **Befehlspalette (Cmd/Ctrl + K).** Für Recruiter: Stelle, Bewerbung, Station oder Aktion per Tastatur finden und ausführen. Pipeline vollständig per Tastatur bedienbar (J/K navigieren, 1–6 Status setzen).

### 7.2 Informationsarchitektur

| Bereich | Seiten |
| --- | --- |
| Öffentlich | Start, Suche (Liste/Karte), Station, Institution, Ratgeber Anerkennung, Für Arbeitgeber, Preise |
| Fachperson | Suche, Merkliste & Vergleich, Bewerbungen, Qualifikations-Pass, Marktplatz-Profil & Angebote, Schichten (Flex-Pool), Einstellungen |
| Arbeitgeber | Übersicht, Stellen, Stationen, Pipeline, Marktplatz-Suche, Flex-Pool, Benchmark, Team & Einstellungen, Abrechnung |
| Admin | Prüfqueues, Moderation, Redaktion, Organisationen, Audit-Log |

**Navigation:** Desktop mit linker Seitenleiste (240 px, einklappbar auf 64 px). Mobile mit unterer Leiste, max. 4 Einträge + "Mehr". Öffentliche Seiten mit oberer Leiste.

### 7.3 Kernflows

**Fachperson – erster Besuch bis Bewerbung (Ziel < 5 Minuten)**

1. Startseite: drei Fragen statt Suchfeld – Beruf, Pensum, "Was darf auf keinen Fall sein?" (Mehrfachauswahl: Nächte, Wochenenden, geteilte Dienste, kurzfristige Planänderungen).
2. Ergebnisse sofort, ohne Konto.
3. Station öffnen: Dienstrhythmus-Vorschau, Lohnband, Realitäts-Check, Pendelzeit.
4. "Bewerben" → Konto per Passkey oder E-Mail-Link (kein Passwort).
5. Pass anlegen: Diplom hochladen; KI liest Felder vor, Person bestätigt.
6. Bewerbung abschicken (Pass + optionale Nachricht). Status-Updates per Push und E-Mail.

**Arbeitgeber – Inserat in 10 Minuten**

1. Bestehendes Inserat per URL, PDF oder Text einfügen.
2. KI füllt das Stationsprofil vor; jedes vorgeschlagene Feld ist markiert als "aus Text übernommen" mit dem zugehörigen Textausschnitt.
3. Fehlende Pflichtfelder werden als Liste gezeigt und direkt erfragt.
4. Vorschau so, wie Fachpersonen sie sehen; Veröffentlichen.

### 7.4 UX-Regeln

- Jede Liste hat einen definierten Leerzustand mit nächster Handlung (z. B. "Keine Treffer. Pendelzeit auf 45 min erhöhen ergäbe 12 Treffer").
- Jeder Fehler nennt Ursache und Lösung in einem Satz; keine Codes ohne Erklärung.
- Ladezustände als Skeleton in Endform, nie Spinner über 300 ms.
- Optimistische Updates nur bei umkehrbaren Aktionen (Merken, Status ändern); nie bei Buchung einer Schicht oder Annahme eines Angebots.
- Alle Zahlen mit Schweizer Formatierung: Tausender mit Apostroph (95'000), CHF vor dem Betrag, Datum TT.MM.JJJJ, 24-Stunden-Zeit.
- Barrierefreiheit: WCAG 2.2 AA, vollständige Tastaturbedienung, sichtbarer Fokusrahmen, Mindestgrösse Touch-Ziel 44 × 44 px.

## 8. Designsystem "Kardia UI"

Kardia UI ist flach, typografiegetrieben und dicht: Tiefe entsteht nur durch 1-px-Linien und Flächenkontrast, nie durch Schatten oder Verläufe. Die Regeln werden im CI technisch erzwungen, nicht nur dokumentiert.

### 8.1 Harte Regeln (CI-geprüft)

- **Verboten:** `box-shadow`, `text-shadow`, `linear-gradient`, `radial-gradient`, `conic-gradient`, `backdrop-filter`, Glassmorphism, Emoji in der UI. Durchsetzung: Stylelint-Regel `declaration-property-value-disallowed-list`; in Tailwind sind alle `shadow-*`- und `bg-gradient-*`-Utilities aus dem Theme entfernt.
- **Elevation** (Dropdown, Dialog, Popover) = Fläche `surface-0` + 1 px Rand `line-300` + bei Dialogen eine Abdeckung `overlay` mit 40 % Deckkraft.
- **Fokus** = 2 px Outline in `accent-600` mit 2 px Abstand, auf jedem interaktiven Element.
- **Farben nur über Tokens**; Hex-Werte ausserhalb der Token-Datei schlagen den Lint fehl.
- Eine Akzentfarbe pro Ansicht für die primäre Handlung; alles andere neutral.

### 8.2 Farb-Tokens

| Token | Hell | Dunkel | Verwendung |
| --- | --- | --- | --- |
| `surface-0` | #FFFFFF | #0F1215 | Karten, Eingabefelder |
| `surface-50` | #F7F8FA | #15191D | Seitenhintergrund |
| `surface-100` | #EEF0F3 | #1C2126 | Hover, Tabellenkopf |
| `line-200` | #E3E6EB | #262C33 | Trennlinien |
| `line-300` | #CDD2DA | #353C45 | Ränder von Feldern und Karten |
| `ink-900` | #0E1116 | #F2F4F7 | Primärtext |
| `ink-700` | #3A4250 | #C3C9D2 | Sekundärtext |
| `ink-500` | #6B7383 | #8E96A3 | Hinweise, Metadaten |
| `accent-600` | #0F6B5E | #4FB3A3 | Primäraktion, Links, Fokus |
| `accent-700` | #0A5249 | #7CCABD | Hover/Pressed Primär |
| `accent-50` | #E8F3F1 | #12302C | Ausgewählt, Akzentfläche |
| `ok-600` | #1F7A3D | #5CC07E | Bedingung erfüllt, verifiziert |
| `warn-600` | #A15C00 | #E3A13B | Abweichung Realitäts-Check, veraltet |
| `critical-600` | #B42318 | #F07A70 | Fehler, Muss-Bedingung verletzt |
| `overlay` | #0E1116 @ 40 % | #000000 @ 60 % | Abdeckung hinter Dialogen |

Kontrast geprüft gegen `surface-0` (hell): `accent-600` 6.4:1, `ink-500` 4.8:1, `warn-600` 5.2:1 – alle ≥ WCAG AA 4.5:1. Dunkelmodus folgt `prefers-color-scheme` und ist manuell umschaltbar.

### 8.3 Typografie

- **Schrift:** Geist Sans für UI und Text, Geist Mono für Zahlen in Tabellen, Codes und IDs. Beide unter SIL Open Font License, selbst gehostet über `next/font` (keine Google-Fonts-Anfrage zur Laufzeit).
- **Ziffern:** `font-variant-numeric: tabular-nums` in allen Tabellen, Lohnbändern und Zeiten.

| Stufe | Grösse / Zeilenhöhe | Gewicht | Einsatz |
| --- | --- | --- | --- |
| Display | 40 / 48 | 600 | Nur Startseite |
| H1 | 32 / 40 | 600 | Seitentitel |
| H2 | 24 / 32 | 600 | Abschnitte |
| H3 | 20 / 28 | 600 | Kartentitel |
| Body | 16 / 24 | 400 | Fliesstext |
| Body-S | 14 / 20 | 400 | Tabellen, Formulare |
| Caption | 13 / 18 | 500 | Labels, Chips |
| Micro | 12 / 16 | 500 | Metadaten, Zeitstempel |

### 8.4 Raum, Raster, Form

- Abstände in 4-px-Schritten: 4, 8, 12, 16, 24, 32, 48, 64.
- Raster: 12 Spalten, Spaltenabstand 24 px, Inhaltsbreite max. 1280 px; Fliesstext max. 68 Zeichen.
- Breakpoints: 640, 768, 1024, 1280 px.
- Radien: 6 px Steuerelemente, 10 px Karten und Dialoge, 999 px nur für Status-Chips, 0 px für Tabellen.
- Linienstärke: 1 px überall; 2 px nur für Fokus und aktive Reiter.
- Icons: Lucide, 20 px, Strichstärke 1.75 px, immer mit Textlabel oder `aria-label`.
- Bewegung: 120 ms (Hover, Zustände), 200 ms (Dialoge, Panels), Kurve `cubic-bezier(0.2, 0, 0, 1)`; bei `prefers-reduced-motion` 0 ms.

### 8.5 Komponenten

Basis: Radix UI Primitives (Zugänglichkeit, Fokusführung) mit eigener Gestaltung; keine vorgefertigte Komponentenbibliothek mit fremdem Look.

| Komponente | Varianten / Besonderheit |
| --- | --- |
| Button | primary (accent-Fläche), secondary (Rand line-300), ghost, danger; Höhen 32 / 40 / 48 px |
| Input, Select, Combobox | Höhe 40 px, Label immer sichtbar über dem Feld, Einheit als Suffix ("CHF", "%", "Wo") |
| Bedingungs-Chip | Zustände erfüllt / nicht erfüllt / unbekannt, Icon + Text, nie nur Farbe |
| Dienstrhythmus-Streifen | 28 Zellen, Dienstcode als Buchstabe, Wochenend-Trenner, Legende |
| Profil-Feldzeile | Label · Arbeitgeberwert · Team-Wert · Bestätigungsdatum |
| Vergleichstabelle | Sticky erste Spalte, "nur Unterschiede"-Schalter |
| Pipeline-Spalte | Kopf mit Anzahl, Karten mit Pass-Status, Tastatursteuerung |
| Datentabelle | Sortierbar, Spaltenauswahl, Zeilenhöhe 44 px, Zebra aus |
| Dialog, Sheet | Sheet von rechts (Desktop) bzw. unten (Mobile) |
| Toast | Unten links, 6 s, mit Rückgängig bei umkehrbaren Aktionen |
| Leerzustand | Satz + eine Handlung, keine Illustration |

Das Designsystem lebt als eigenes Paket `@kardia/ui` mit Storybook und visuellen Regressionstests (Playwright-Screenshots im CI).

## 9. KI mit Claude Haiku 5.5

KI wandelt bei Kardia unstrukturierte Eingaben in geprüfte Felder um; sie erzeugt keine Texte, die Menschen als ihre eigenen versenden. Modell: `claude-haiku-5-5` über die Anthropic API (Alternative für Datenresidenz: Amazon Bedrock mit EU-Inferenzprofil, siehe Q-7). Listenpreis für Prompts bis 100'000 Tokens: USD 0.10 pro Million Input- und USD 0.50 pro Million Output-Tokens; darüber USD 0.50 bzw. 2.50 ([techenclave](https://techenclave.com/news/items/claude-haiku-5-5-launches-with-0-10-input-pricing-for-shorter-prompts)). Alle Kardia-Prompts bleiben deutlich unter 100'000 Tokens.

### 9.1 Anwendungsfälle

| ID | Funktion | Eingabe | Ausgabe | Mensch bestätigt |
| --- | --- | --- | --- | --- |
| KI-1 | Inserat-Strukturierung | Inseratetext, PDF oder URL-Inhalt (max. 20'000 Zeichen) | Stationsprofil-Felder als JSON, je Feld Belegstelle und Konfidenz | Arbeitgeber, Feld für Feld |
| KI-2 | Suchsatz zu Filter | Freitext ("IPS Zürich, keine Nächte, ab März, 80 %") | Filterobjekt nach Suchschema | Fachperson sieht erkannte Filter als Chips und kann sie entfernen |
| KI-3 | Dokument-Vorprüfung | Diplom-Scan (Bild/PDF) + erfasste Pass-Daten | Dokumenttyp, Name, Aussteller, Datum, Abweichungen | Admin entscheidet |
| KI-4 | Moderation | Fragen, Antworten, Realitäts-Check-Freitext | Kategorie (ok, personenbezogen, beleidigend, Werbung) + Begründung | Admin bei allem ausser "ok" |
| KI-5 | Team-Zusammenfassung | ≥ 5 Freitexte einer Station zu einem Feld | 2 Sätze neutrale Zusammenfassung, nur aus den Texten | Wird als "KI-Zusammenfassung" gekennzeichnet |
| KI-6 | Übersetzung | Freitextfelder eines Stationsprofils | FR, IT, EN | Arbeitgeber kann jede Übersetzung bearbeiten |

### 9.2 Technische Umsetzung

- SDK `@anthropic-ai/sdk`; jeder Aufruf läuft im Worker-Dienst (nie im Browser, nie im Request-Pfad der Suche ausser KI-2).
- **Strukturierte Ausgabe** über Tool Use mit JSON-Schema; Antwort wird zusätzlich mit Zod validiert. Ungültig → 1 Wiederholung mit Fehlermeldung im Prompt → danach Fehlerstatus, kein Raten.
- **Grundregel im System-Prompt:** "Gib nur Werte aus, die wörtlich oder eindeutig im Text stehen. Fehlt ein Wert, gib null zurück." Jeder Wert aus KI-1 trägt `evidence` (Textausschnitt ≤ 200 Zeichen); Werte ohne Beleg werden verworfen.
- **Prompt Caching** für System-Prompt und Schema (stabiler Präfix).
- **Timeouts:** KI-2 1'500 ms (bei Überschreitung: klassische Stichwortsuche), übrige 30 s.
- **Protokoll:** Tabelle `AiRun` mit Funktion, Modell, Input-/Output-Tokens, Kosten, Dauer, Status, Hash der Eingabe. Rohtexte werden nach 30 Tagen gelöscht.

Beispiel Ausgabeschema KI-1 (gekürzt):

```json
{
  "department": { "value": "ICU", "evidence": "Intensivstation (IPS)", "confidence": 0.97 },
  "salaryMinChf": { "value": 88000, "evidence": "Jahreslohn ab CHF 88'000", "confidence": 0.92 },
  "salaryMaxChf": { "value": null, "evidence": null, "confidence": 0 },
  "shiftTypes": { "value": ["EARLY", "LATE", "NIGHT"], "evidence": "Früh-, Spät- und Nachtdienst", "confidence": 0.95 },
  "rosterLeadWeeks": { "value": null, "evidence": null, "confidence": 0 }
}
```

### 9.3 Qualität & Kosten

- **Goldset:** 200 echte, anonymisierte Inserate mit manuell erfassten Soll-Feldern. Freigabe von KI-1 erst bei ≥ 95 % Feldgenauigkeit und 0 % erfundenen Werten (Wert ohne Beleg im Text). Nächtlicher Lauf im CI.
- **Kostenschätzung** (Listenpreise oben):

| Funktion | Tokens je Aufruf (In / Out) | Aufrufe pro Monat | Kosten USD/Monat |
| --- | --- | --- | --- |
| KI-1 Inserat | 6'000 / 1'500 | 10'000 | ca. 14 |
| KI-2 Suchsatz | 1'500 / 200 | 500'000 | ca. 125 |
| KI-3 Dokument | 3'000 / 400 | 5'000 | ca. 2.50 |
| KI-4/5/6 | 2'000 / 500 | 30'000 | ca. 14 |

Budgetgrenze im Code: pro Organisation max. 200 KI-1-Aufrufe pro Tag; globaler Tageskosten-Alarm bei USD 25.

### 9.4 Grenzen

- Keine KI-generierten Bewerbungsschreiben, Inseratetexte oder Bewertungen.
- Kein automatisches Ablehnen von Bewerbungen und keine automatisierte Einzelentscheidung über Personen (revDSG Art. 21).
- An das Modell gehen nur die für die Aufgabe nötigen Daten; bei KI-3 wird das Dokument ohne weitere Profildaten übermittelt.

## 10. Technische Architektur

Kardia läuft als ein Railway-Projekt in der Region EU West mit vier eigenen Diensten (Web, Worker, Postgres, Bucket) und einem Routing-Dienst; es gibt keinen Redis und keine separate Suchmaschine – Postgres trägt Daten, Suche und Job-Queue.

### 10.1 Stack (verbindlich)

| Schicht | Technologie | Begründung |
| --- | --- | --- |
| Framework | Next.js 16.4.x (aktuell 16.4.2), App Router, TypeScript strict, `output: "standalone"` | 16.x ist die aktive LTS-Linie ([nextjs.org](https://nextjs.org/llms.txt)); Version beim Projektstart pinnen |
| UI | React Server Components, Server Actions für Mutationen, Tailwind CSS v4 mit CSS-Variablen, Radix Primitives | Wenig Client-JS, Tokens zentral |
| Datenbank | Railway PostgreSQL 16+, Prisma ORM 7.10.x (stabile Linie; 8.0 erst nach GA), Erweiterungen `pg_trgm`, `unaccent` | Ein System für Daten und Suche |
| Suche | Postgres-Volltext (`tsvector`, Konfiguration german/french/italian) + Trigramm für Tippfehler + strukturierte Filter | 50'000 Stellen brauchen keine eigene Suchmaschine |
| Jobs | `pg-boss` (Queue in Postgres) im Worker-Dienst | Kein Redis nötig, transaktionssicher |
| Dateien | Railway Bucket, S3-kompatibel, `@aws-sdk/client-s3` + Presigner | Privat; Up- und Download nur über signierte URLs ([Railway Docs](https://docs.railway.com/storage-buckets)) |
| Auth | Better Auth mit Passkeys, E-Mail-Link, Organisationen; SAML/OIDC für Spitalgruppen | Passwortlos, mandantenfähig |
| Validierung | Zod (geteilte Schemas Client/Server/KI) | Eine Wahrheit pro Datentyp |
| i18n | next-intl, Locales `de-CH`, `fr-CH`, `it-CH`, `en` | Schweizer Formatierung |
| KI | `@anthropic-ai/sdk`, Modell `claude-haiku-5-5` | Siehe Abschnitt 9 |
| E-Mail | Amazon SES (eu-central-1), Vorlagen mit React Email | EU-Standort |
| Push | Web Push mit VAPID (`web-push`) | PWA-Benachrichtigungen |
| Routing Auto | OSRM-Dienst auf Railway mit Schweiz-Extrakt (OpenStreetMap) | Keine Kosten pro Abfrage |
| Routing ÖV | opentransportdata.swiss (API-Schlüssel, Ergebnis-Cache 30 Tage) | Offizielle Schweizer Fahrplandaten |
| Video | ffmpeg im Worker (H.264 720p, Poster-Bild) | Kein externer Dienst |
| Zahlung | Stripe Billing (CHF, Karte, TWINT) + QR-Rechnung über `swissqrbill` für Institutionen | Spitäler zahlen per Rechnung |
| Monitoring | Sentry (EU-Datenregion), Railway Logs & Metriken | Fehler und Performance |
| Monorepo | pnpm + Turborepo: `apps/web`, `apps/worker`, `packages/db`, `packages/ui`, `packages/ai`, `packages/config` | Geteilter Code |

### 10.2 Railway-Dienste & Umgebungen

- **web:** Next.js standalone, min. 2 Replikas in Produktion, Health-Check `/api/health` (prüft DB-Verbindung).
- **worker:** gleicher Code-Stand, Startbefehl `node dist/worker.js`, 1 Replika; skaliert über pg-boss-Konkurrenz.
- **postgres:** Railway PostgreSQL, tägliche Railway-Backups + nächtlicher verschlüsselter `pg_dump` in den Bucket (Aufbewahrung 30 Tage).
- **bucket:** Präfixe `pass/`, `video/`, `logo/`, `import/`, `backup/`. Da Railway Buckets keine automatischen Backups oder Snapshots haben ([Railway Docs](https://docs.railway.com/storage-buckets.md)), repliziert ein nächtlicher Job `pass/` und `backup/` in einen zweiten Bucket.
- **osrm:** Docker-Image `osrm/osrm-backend`, Daten beim Build vorbereitet.
- **Umgebungen:** `production`, `staging`, PR-Umgebungen pro Pull Request mit eigener Datenbank aus Seed-Daten.
- **Variablen:** Bucket-Credentials über Railway-Variablenreferenzen; Secrets nie im Repo.

### 10.3 Kritische Abläufe

- **Datei-Upload:** Client fordert per Server Action eine signierte PUT-URL an (gültig 10 min, max. Grösse je Typ: Dokument 15 MB, Video 200 MB, Logo 2 MB) → Upload direkt in den Bucket → Worker prüft MIME-Typ per Magic Bytes, scannt mit ClamAV, erzeugt Vorschau → erst dann Status `verfügbar`.
- **Datei-Download:** immer über eine Route, die Berechtigung prüft und eine signierte GET-URL mit 60 s Gültigkeit erzeugt; Zugriffe auf `pass/` werden im Audit-Log protokolliert.
- **Schichtbuchung:** `UPDATE shift SET status='BOOKED', booked_by=$1 WHERE id=$2 AND status='OPEN' RETURNING id` in einer Transaktion; 0 Zeilen = "bereits vergeben".
- **Suche:** Server Component lädt Treffer per SQL mit Filtern + `ts_rank`; Pendelzeit lädt clientseitig nach, aus Cache-Tabelle oder per Job.

### 10.4 Nicht-funktionale Anforderungen

| Bereich | Ziel |
| --- | --- |
| Verfügbarkeit | 99.5 % pro Monat (Web) |
| Performance öffentlich | LCP < 2.0 s (4G, Mittelklasse-Smartphone), INP < 200 ms, CLS < 0.05 |
| JS-Budget | ≤ 170 KB gzip initial auf öffentlichen Seiten |
| Suche | p95 < 300 ms Server-Antwort |
| Wiederherstellung | RPO 24 h, RTO 4 h |
| Tests | Unit (Vitest), E2E (Playwright) für alle Kernflows, Zugänglichkeit (axe) im CI |

### 10.5 Architekturübersicht

&#91;embedded content: Kardia-Architektur · 5 Railway-Dienste, 4 externe Dienste\]

Der Browser spricht nur mit dem Web-Dienst; Web und Worker teilen sich Postgres und den Bucket, und alle ausgehenden Aufrufe gehen an vier externe Dienste.

## 11. Datenmodell

Das Datenmodell umfasst 33 Prisma-Modelle und 23 Enums in sieben Domänen. Das Schema unten ist gegen die Schema-Engine von Prisma ORM 7.10.1 validiert; die Such-Migration wurde gegen PostgreSQL getestet.

| Domäne | Modelle | Kernregel |
| --- | --- | --- |
| Identität | User, PushSubscription | Sessions und Passkeys verwaltet Better Auth in eigenen Tabellen |
| Arbeitgeber | Organization, OrgMember, Location, Ward, Job | Arbeitsbedingungen hängen an `Ward`; `Job.overrides` überschreibt einzelne Felder |
| Fachperson | CandidateProfile, Experience, LanguageSkill, TrainingProgress, Credential, Application, Message, SavedJob, SavedSearch | Eine Bewerbung pro Fachperson und Stelle (`@@unique`) |
| Marktplatz | Offer, CandidateBlock | Angebot referenziert immer eine `Job`-Zeile; Sperren gelten pro Organisation |
| Flex-Pool | FlexPool, PoolMember, Shift | Buchung nur per bedingtem UPDATE auf `status = OPEN` |
| Team-Einblicke | VerifiedEmployee, RealityCheck, WardVideo, WardAmbassador, TeamQuestion, WardBenchmark | `RealityCheck` speichert nur einen Hash der Person; Anzeige ab 5 Stimmen |
| Infrastruktur | File, CommuteCache, AiRun, Event, AuditLog, RecognitionGuide | Jede Datei im Bucket hat genau eine `File`-Zeile mit SHA-256 |

**Konventionen**

- IDs: `cuid()`; Geld in ganzen CHF als `Int`; Zeitpunkte in UTC, reine Daten als `@db.Date`.
- Validierungen, die Prisma nicht ausdrücken kann, liegen in geteilten Zod-Schemas: `rosterPattern` genau 28 Einträge, `salaryMaxChf ≤ salaryMinChf × 1.4` (AK-A4), Pensum in 10er-Schritten.
- Weiche Löschung nur für `User` (`deletedAt`); alles andere kaskadiert.
- `Job.searchVector` ist eine generierte Spalte, die Prisma nur liest.
- Die vollständige Datei `schema.prisma` liegt zusätzlich als Download im Chat.

### 11.1 Prisma-Schema

```prisma
// Kardia – Prisma-Schema (Prisma ORM 7.10.x, PostgreSQL 16+)
// Geldbeträge in CHF als Int (ganze Franken), Zeiten in UTC.

generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

// Erweiterungen pg_trgm und unaccent werden in der ersten Migration
// per CREATE EXTENSION angelegt (siehe migrations/0000_init_extensions).
datasource db {
  provider = "postgresql"
}

// ─────────────────────────── Enums ───────────────────────────

enum Locale {
  DE_CH
  FR_CH
  IT_CH
  EN
}

enum Profession {
  NURSE_HF_FH
  FAGE
  AGS
  NURSING_AID_SRK
  PHYSICIAN
  MPA
  PHYSIOTHERAPIST
  OCCUPATIONAL_THERAPIST
  SPEECH_THERAPIST
  MTRA
  BMA
  PARAMEDIC
  OR_TECHNICIAN
  MIDWIFE
}

enum Department {
  ICU
  EMERGENCY
  SURGERY
  INTERNAL_MEDICINE
  GERIATRICS
  PSYCHIATRY
  PEDIATRICS
  ONCOLOGY
  OPERATING_ROOM
  ANESTHESIA
  LONG_TERM_CARE
  HOME_CARE
  REHABILITATION
  MATERNITY
  RADIOLOGY
  LABORATORY
  PRACTICE
}

enum ShiftType {
  EARLY
  LATE
  NIGHT
  DAY_12H
  SPLIT
  WEEKDAYS_ONLY
}

enum RosterCode {
  F // Früh
  S // Spät
  N // Nacht
  T // Tag 12h
  X // frei
}

enum ChildcareType {
  NONE
  INTERNAL_DAYCARE
  ALLOWANCE
}

enum OrgVerification {
  PENDING
  VERIFIED
  REJECTED
  AGENCY_REVIEW
}

enum MemberRole {
  OWNER
  RECRUITER
  WARD_LEAD
  VIEWER
}

enum JobStatus {
  DRAFT
  PUBLISHED
  PAUSED
  CLOSED
}

enum ApplicationStatus {
  NEW
  SCREENED
  INTERVIEW
  OFFER
  HIRED
  REJECTED
  WITHDRAWN
}

enum RejectionReason {
  QUALIFICATION_MISSING
  POSITION_FILLED
  LANGUAGE
  AVAILABILITY
  OTHER
}

enum CredentialType {
  DIPLOMA
  RECOGNITION_SRK
  RECOGNITION_MEBEKO
  REGISTRY_ENTRY
  FURTHER_EDUCATION
  LANGUAGE_CERTIFICATE
}

enum CredentialStatus {
  SUBMITTED
  IN_REVIEW
  VERIFIED
  REJECTED
  EXPIRED
}

enum Registry {
  MEDREG
  GESREG
  NAREG
}

enum OfferStatus {
  SENT
  INTERESTED
  DECLINED
  EXPIRED
  WITHDRAWN
}

enum ShiftStatus {
  OPEN
  BOOKED
  CANCELLED
  COMPLETED
}

enum PoolBookingMode {
  FIRST_CONFIRMS
  EMPLOYER_SELECTS
}

enum ModerationStatus {
  PENDING
  APPROVED
  REJECTED
}

enum FileStatus {
  UPLOADING
  SCANNING
  READY
  REJECTED
}

enum AiFunction {
  JOB_STRUCTURING
  SEARCH_PARSING
  DOCUMENT_PRECHECK
  MODERATION
  TEAM_SUMMARY
  TRANSLATION
}

enum AiRunStatus {
  SUCCESS
  INVALID_OUTPUT
  TIMEOUT
  ERROR
}

enum AlertFrequency {
  INSTANT
  DAILY
  WEEKLY
}

enum PlanTier {
  PRAXIS
  INSTITUTION
  SPITALGRUPPE
}

// ─────────────────────── Identität & Auth ───────────────────────
// Tabellen für Sessions/Passkeys erzeugt Better Auth; hier nur die Fachdomäne.

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  emailVerified Boolean   @default(false)
  locale        Locale    @default(DE_CH)
  isAdmin       Boolean   @default(false)
  createdAt     DateTime  @default(now())
  deletedAt     DateTime?

  candidate   CandidateProfile?
  memberships OrgMember[]
  pushSubs    PushSubscription[]
  auditLogs   AuditLog[]
}

model PushSubscription {
  id        String   @id @default(cuid())
  userId    String
  endpoint  String   @unique
  p256dh    String
  auth      String
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// ───────────────────────── Arbeitgeber ─────────────────────────

model Organization {
  id                 String          @id @default(cuid())
  name               String
  uid                String          @unique // CHE-123.456.789
  verification       OrgVerification @default(PENDING)
  secoRegistryMatch  Boolean         @default(false)
  emailDomains       String[]
  logoFileId         String?         @unique
  plan               PlanTier?
  stripeCustomerId   String?         @unique
  offerQuotaPerMonth Int             @default(0)
  createdAt          DateTime        @default(now())

  logo      File?       @relation("OrgLogo", fields: [logoFileId], references: [id])
  members   OrgMember[]
  locations Location[]
  pools     FlexPool[]
  offers    Offer[]
  blockedBy CandidateBlock[]
}

model OrgMember {
  id             String     @id @default(cuid())
  organizationId String
  userId         String
  role           MemberRole

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([organizationId, userId])
}

model Location {
  id             String  @id @default(cuid())
  organizationId String
  name           String
  street         String
  postalCode     String
  city           String
  canton         String  @db.Char(2)
  lat            Float
  lng            Float
  hasParking     Boolean @default(false)

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  wards        Ward[]

  @@index([canton])
  @@index([lat, lng])
}

// Stationsprofil (Modul A) – trägt die Arbeitsbedingungen
model Ward {
  id                     String         @id @default(cuid())
  locationId             String
  name                   String
  department             Department
  salaryMinChf           Int // brutto/Jahr bei 100 %
  salaryMaxChf           Int
  thirteenthSalary       Boolean
  nightAllowanceChfHour  Int
  sundayAllowancePct     Int
  onCallChfDay           Int?
  shiftTypes             ShiftType[]
  rosterLeadWeeks        Int
  weekendsPerMonth       Float
  guaranteedWishDays     Int
  minWorkloadPct         Int
  maxWorkloadPct         Int
  minShiftsPerWeek       Int?
  patientsPerNurseDay    Float?
  patientsPerNurseNight  Float?
  skillMixHfFhPct        Int?
  skillMixFagePct        Int?
  skillMixAidPct         Int?
  onboardingWeeks        Int
  vacationWeeks          Int
  educationBudgetChf     Int?
  educationDays          Int?
  childcare              ChildcareType  @default(NONE)
  childcareAllowanceChf  Int?
  collectiveAgreement    String // GAV-Name oder "kein GAV"
  rosterPattern          RosterCode[] // genau 28 Einträge, Validierung in Zod
  reentryFriendly        Boolean        @default(false)
  reentryOnboardingWeeks Int?
  description            String?
  confirmedAt            DateTime // letzte Bestätigung durch Arbeitgeber
  createdAt              DateTime       @default(now())
  updatedAt              DateTime       @updatedAt

  location          Location           @relation(fields: [locationId], references: [id], onDelete: Cascade)
  jobs              Job[]
  realityChecks     RealityCheck[]
  videos            WardVideo[]
  questions         TeamQuestion[]
  ambassadors       WardAmbassador[]
  verifiedEmployees VerifiedEmployee[]
  shifts            Shift[]
  benchmarks        WardBenchmark[]

  @@index([department])
  @@index([salaryMinChf])
  @@index([rosterLeadWeeks])
}

model Job {
  id                 String       @id @default(cuid())
  wardId             String
  title              String
  profession         Profession
  workloadMinPct     Int
  workloadMaxPct     Int
  startDate          DateTime?    @db.Date
  status             JobStatus    @default(DRAFT)
  overrides          Json? // überschriebene Ward-Felder
  allowsPendingRecog Boolean      @default(false) // Modul H
  // Modul F – ärztliche Weiterbildung
  specialtyTitle     String?
  trainingCategory   String?
  maxCreditableYears Float?
  weeklyHours        Int?
  structuredTrainingHoursWeek Int?
  // Volltextsuche (per Migration als generierte Spalte + GIN-Index gepflegt)
  searchVector       Unsupported("tsvector")?
  publishedAt        DateTime?
  createdAt          DateTime     @default(now())
  updatedAt          DateTime     @updatedAt

  ward         Ward          @relation(fields: [wardId], references: [id], onDelete: Cascade)
  applications Application[]
  offers       Offer[]
  savedBy      SavedJob[]

  @@index([status, profession])
  @@index([publishedAt])
}

// ───────────────────────── Fachpersonen ─────────────────────────

model CandidateProfile {
  id                 String    @id @default(cuid())
  userId             String    @unique
  firstName          String
  lastName           String
  phone              String?
  homeLat            Float?
  homeLng            Float?
  homeDistrict       String? // für anonymes Marktplatz-Profil
  profession         Profession
  yearsExperience    Int       @default(0)
  workAuthorizedCh   Boolean? // nur Ja/Nein, kein Status
  // Modul E – anonymes Marktplatz-Profil
  marketplaceActive  Boolean   @default(false)
  desiredWorkloadPct Int?
  earliestStart      DateTime? @db.Date
  mustConditions     Json? // gleiches Schema wie Suchfilter
  createdAt          DateTime  @default(now())

  user          User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  credentials   Credential[]
  experiences   Experience[]
  languages     LanguageSkill[]
  applications  Application[]
  offers        Offer[]
  savedJobs     SavedJob[]
  savedSearches SavedSearch[]
  blocks        CandidateBlock[]
  poolMembers   PoolMember[]
  trainingYears TrainingProgress[]
}

model Experience {
  id          String     @id @default(cuid())
  candidateId String
  department  Department
  years       Float

  candidate CandidateProfile @relation(fields: [candidateId], references: [id], onDelete: Cascade)
}

model LanguageSkill {
  id          String @id @default(cuid())
  candidateId String
  language    String @db.Char(2) // ISO 639-1
  level       String @db.VarChar(2) // A1–C2

  candidate CandidateProfile @relation(fields: [candidateId], references: [id], onDelete: Cascade)

  @@unique([candidateId, language])
}

model TrainingProgress {
  id             String @id @default(cuid())
  candidateId    String
  specialtyTitle String
  area           String
  yearsCompleted Float

  candidate CandidateProfile @relation(fields: [candidateId], references: [id], onDelete: Cascade)
}

// Qualifikations-Pass (Modul D)
model Credential {
  id             String           @id @default(cuid())
  candidateId    String
  type           CredentialType
  title          String
  issuer         String?
  issuedAt       DateTime?        @db.Date
  validUntil     DateTime?        @db.Date
  registry       Registry?
  registryNumber String?
  status         CredentialStatus @default(SUBMITTED)
  rejectReason   String?
  reviewedById   String?
  reviewedAt     DateTime?
  fileId         String?          @unique
  createdAt      DateTime         @default(now())

  candidate CandidateProfile @relation(fields: [candidateId], references: [id], onDelete: Cascade)
  file      File?            @relation("CredentialFile", fields: [fileId], references: [id])

  @@index([status])
}

model Application {
  id               String             @id @default(cuid())
  jobId            String
  candidateId      String
  status           ApplicationStatus  @default(NEW)
  message          String?            @db.VarChar(500)
  documentsShared  Boolean            @default(false)
  rejectionReason  RejectionReason?
  statusChangedAt  DateTime           @default(now())
  createdAt        DateTime           @default(now())

  job       Job              @relation(fields: [jobId], references: [id], onDelete: Cascade)
  candidate CandidateProfile @relation(fields: [candidateId], references: [id], onDelete: Cascade)
  messages  Message[]

  @@unique([jobId, candidateId])
  @@index([status])
}

model Message {
  id            String   @id @default(cuid())
  applicationId String
  senderUserId  String
  body          String
  createdAt     DateTime @default(now())

  application Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)
}

model SavedJob {
  candidateId String
  jobId       String
  createdAt   DateTime @default(now())

  candidate CandidateProfile @relation(fields: [candidateId], references: [id], onDelete: Cascade)
  job       Job              @relation(fields: [jobId], references: [id], onDelete: Cascade)

  @@id([candidateId, jobId])
}

model SavedSearch {
  id          String         @id @default(cuid())
  candidateId String
  name        String
  filters     Json
  frequency   AlertFrequency @default(DAILY)
  lastSentAt  DateTime?

  candidate CandidateProfile @relation(fields: [candidateId], references: [id], onDelete: Cascade)
}

// ─────────────────── Umgekehrter Marktplatz (E) ───────────────────

model Offer {
  id             String      @id @default(cuid())
  organizationId String
  candidateId    String
  jobId          String
  salaryChf      Int
  workloadPct    Int
  startDate      DateTime    @db.Date
  note           String?     @db.VarChar(600)
  status         OfferStatus @default(SENT)
  declineReason  String?
  expiresAt      DateTime
  createdAt      DateTime    @default(now())

  organization Organization     @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  candidate    CandidateProfile @relation(fields: [candidateId], references: [id], onDelete: Cascade)
  job          Job              @relation(fields: [jobId], references: [id], onDelete: Cascade)

  @@index([organizationId, createdAt])
  @@index([candidateId, status])
}

model CandidateBlock {
  candidateId    String
  organizationId String

  candidate    CandidateProfile @relation(fields: [candidateId], references: [id], onDelete: Cascade)
  organization Organization     @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@id([candidateId, organizationId])
}

// ───────────────────────── Flex-Pool (C) ─────────────────────────

model FlexPool {
  id                 String          @id @default(cuid())
  organizationId     String
  name               String
  bookingMode        PoolBookingMode @default(FIRST_CONFIRMS)
  cancelDeadlineHours Int            @default(48)

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  members      PoolMember[]
  shifts       Shift[]
}

model PoolMember {
  poolId      String
  candidateId String
  joinedAt    DateTime @default(now())

  pool      FlexPool         @relation(fields: [poolId], references: [id], onDelete: Cascade)
  candidate CandidateProfile @relation(fields: [candidateId], references: [id], onDelete: Cascade)

  @@id([poolId, candidateId])
}

model Shift {
  id             String      @id @default(cuid())
  poolId         String
  wardId         String
  startsAt       DateTime
  endsAt         DateTime
  code           RosterCode
  hourlyRateChf  Int
  requirements   String?
  status         ShiftStatus @default(OPEN)
  bookedByCandidateId String?
  bookedAt       DateTime?

  pool FlexPool @relation(fields: [poolId], references: [id], onDelete: Cascade)
  ward Ward     @relation(fields: [wardId], references: [id], onDelete: Cascade)

  @@index([poolId, status, startsAt])
}

// ──────────────── Team-Einblicke & Realitäts-Check (G) ────────────────

model VerifiedEmployee {
  id         String   @id @default(cuid())
  wardId     String
  userId     String
  method     String // EMAIL_DOMAIN | EMPLOYER_INVITE
  verifiedAt DateTime @default(now())

  ward Ward @relation(fields: [wardId], references: [id], onDelete: Cascade)

  @@unique([wardId, userId])
}

model RealityCheck {
  id            String   @id @default(cuid())
  wardId        String
  field         String // Feldname aus Ward
  agrees        Boolean
  proposedValue String?
  comment       String?  @db.VarChar(400)
  // nur Hash, damit keine Zuordnung zur Person gespeichert wird
  voterHash     String
  createdAt     DateTime @default(now())

  ward Ward @relation(fields: [wardId], references: [id], onDelete: Cascade)

  @@unique([wardId, field, voterHash])
}

model WardVideo {
  id           String           @id @default(cuid())
  wardId       String
  fileId       String           @unique
  captionsId   String           @unique
  posterId     String?          @unique
  durationSec  Int
  moderation   ModerationStatus @default(PENDING)

  ward     Ward  @relation(fields: [wardId], references: [id], onDelete: Cascade)
  file     File  @relation("VideoFile", fields: [fileId], references: [id])
  captions File  @relation("VideoCaptions", fields: [captionsId], references: [id])
  poster   File? @relation("VideoPoster", fields: [posterId], references: [id])
}

model WardAmbassador {
  wardId String
  userId String

  ward Ward @relation(fields: [wardId], references: [id], onDelete: Cascade)

  @@id([wardId, userId])
}

model TeamQuestion {
  id         String           @id @default(cuid())
  wardId     String
  askedById  String
  body       String           @db.VarChar(500)
  answer     String?          @db.VarChar(1500)
  answeredAt DateTime?
  moderation ModerationStatus @default(PENDING)
  createdAt  DateTime         @default(now())

  ward Ward @relation(fields: [wardId], references: [id], onDelete: Cascade)
}

model WardBenchmark {
  id          String   @id @default(cuid())
  wardId      String
  field       String
  wardValue   Float
  medianValue Float
  peerCount   Int
  computedAt  DateTime @default(now())

  ward Ward @relation(fields: [wardId], references: [id], onDelete: Cascade)

  @@unique([wardId, field])
}

// ─────────────────────────── Infrastruktur ───────────────────────────

model File {
  id        String     @id @default(cuid())
  bucketKey String     @unique // z. B. pass/<cuid>.pdf
  mimeType  String
  sizeBytes Int
  sha256    String
  status    FileStatus @default(UPLOADING)
  ownerId   String
  createdAt DateTime   @default(now())

  orgLogo       Organization? @relation("OrgLogo")
  credential    Credential?   @relation("CredentialFile")
  videoFile     WardVideo?    @relation("VideoFile")
  videoCaptions WardVideo?    @relation("VideoCaptions")
  videoPoster   WardVideo?    @relation("VideoPoster")
}

model CommuteCache {
  originGeohash String // Geohash Präzision 7 (~150 m)
  wardId        String
  mode          String // PT | CAR
  minutes       Int
  computedAt    DateTime @default(now())

  @@id([originGeohash, wardId, mode])
}

model AiRun {
  id           String      @id @default(cuid())
  function     AiFunction
  model        String      @default("claude-haiku-5-5")
  inputTokens  Int
  outputTokens Int
  costUsd      Decimal     @db.Decimal(10, 6)
  durationMs   Int
  status       AiRunStatus
  inputHash    String
  rawInput     String? // nach 30 Tagen per Job geleert
  rawOutput    Json?
  orgId        String?
  createdAt    DateTime    @default(now())

  @@index([function, createdAt])
  @@index([orgId, createdAt])
}

model Event {
  id        String   @id @default(cuid())
  name      String // z. B. job.published, application.created
  userId    String?
  orgId     String?
  entityId  String?
  props     Json?
  createdAt DateTime @default(now())

  @@index([name, createdAt])
}

model AuditLog {
  id        String   @id @default(cuid())
  actorId   String
  action    String
  entity    String
  entityId  String
  before    Json?
  after     Json?
  createdAt DateTime @default(now())

  actor User @relation(fields: [actorId], references: [id])

  @@index([entity, entityId])
}

model RecognitionGuide {
  id               String     @id @default(cuid())
  originCountry    String     @db.Char(2)
  targetProfession Profession
  authority        String // SRK | MEBEKO | …
  steps            Json
  reviewedAt       DateTime   @db.Date

  @@unique([originCountry, targetProfession])
}
```

### 11.2 Ergänzende SQL-Migrationen

```sql
-- 0000_init_extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Wird an die Migration angehängt, die "Job" anlegt.
ALTER TABLE "Job" DROP COLUMN IF EXISTS "searchVector";
ALTER TABLE "Job" ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('german', coalesce("title", '')), 'A') ||
    setweight(to_tsvector('german', coalesce("specialtyTitle", '')), 'B')
  ) STORED;
CREATE INDEX "Job_searchVector_idx" ON "Job" USING GIN ("searchVector");
CREATE INDEX "Job_title_trgm_idx" ON "Job" USING GIN ("title" gin_trgm_ops);
```

## 12. API, Integrationen & Datenimport

Die Web-App nutzt Server Actions; alles, was die spätere native App oder Arbeitgebersysteme brauchen, läuft über eine versionierte REST-API unter `/api/v1` mit denselben Zod-Schemas.

### 12.1 REST-API v1 (JSON)

| Methode & Pfad | Zweck | Auth |
| --- | --- | --- |
| `GET /api/v1/jobs` | Suche mit Filterobjekt als Query (`?f=` base64url-JSON), Cursor-Paginierung | öffentlich |
| `GET /api/v1/jobs/:id` | Stelle inkl. aufgelöstem Stationsprofil und Realitäts-Check | öffentlich |
| `GET /api/v1/wards/:id` | Stationsprofil, Dienstrhythmus, Benchmarks (ab 8 Vergleichsstationen) | öffentlich |
| `POST /api/v1/applications` | Ein-Klick-Bewerbung | Fachperson |
| `GET /api/v1/me/applications` | Eigene Bewerbungen mit Status | Fachperson |
| `GET/PUT /api/v1/me/pass` | Qualifikations-Pass | Fachperson |
| `POST /api/v1/files/upload-url` | Signierte Upload-URL für Bucket | angemeldet |
| `GET /api/v1/me/offers` · `POST …/offers/:id/respond` | Angebote sehen und beantworten | Fachperson |
| `GET /api/v1/me/shifts` · `POST /api/v1/shifts/:id/book` | Flex-Schichten sehen und buchen | Pool-Mitglied |
| `POST /api/v1/org/jobs` · `PATCH /api/v1/org/jobs/:id` | Stellen anlegen/ändern | Org-API-Schlüssel oder Sitzung |
| `GET /api/v1/org/applications` | Bewerbungen für ATS-Abgleich | Org-API-Schlüssel |

- **Fehlerformat:** RFC 9457 (`application/problem+json`) mit `type`, `title`, `detail`, `errors[]` aus Zod.
- **Rate Limits:** öffentlich 60 Anfragen/min pro IP, angemeldet 300/min, Org-API 1'000/min; umgesetzt per Token-Bucket in Postgres (Tabelle `RateLimit`, wird in R2 dem Schema hinzugefügt) bzw. Railway-Edge-Limits.
- **API-Schlüssel:** pro Organisation, gespeichert als SHA-256-Hash, mit Scopes (`jobs:write`, `applications:read`), jederzeit widerrufbar.
- **OpenAPI 3.1:** wird aus den Zod-Schemas generiert (`zod-openapi`) und unter `/api/v1/openapi.json` veröffentlicht.

### 12.2 Webhooks (R2)

Ereignisse `application.created`, `application.status_changed`, `offer.responded`, `shift.booked`, `shift.cancelled`. Zustellung durch den Worker, Signatur `HMAC-SHA256` im Header `Kardia-Signature`, bis zu 8 Wiederholungen mit exponentiellem Abstand (1 min bis 2 h).

### 12.3 Inserat-Import

1. **Manuell:** Text, PDF oder URL einfügen → KI-1 → Prüfansicht → Veröffentlichen.
2. **Feed (R2):** Arbeitgeber hinterlegt einen XML- oder JSON-Feed ihres Bewerbermanagementsystems; der Worker liest ihn stündlich, erkennt neue/geänderte Stellen per Hash und legt Entwürfe an. Veröffentlichung erst nach Bestätigung der Pflichtfelder.
3. **Kein Scraping fremder Portale.** Kardia übernimmt nur Inserate, die der Arbeitgeber selbst liefert oder freigibt.

### 12.4 Externe Dienste

| Dienst | Zweck | Daten, die übermittelt werden |
| --- | --- | --- |
| Anthropic API (`claude-haiku-5-5`) | KI-1 bis KI-6 | Nur aufgabenbezogene Texte/Dokumente |
| opentransportdata.swiss | ÖV-Reisezeit | Start- und Ziel-Koordinaten (Start auf \~150 m gerundet) |
| UID-Register (BFS) | Organisationsprüfung | UID |
| SECO-Verzeichnis Vermittlung/Verleih | Agentur-Erkennung | Firmenname, UID |
| Amazon SES | Transaktions-E-Mails | E-Mail-Adresse, Inhalt |
| Stripe | Abos, Karte, TWINT | Rechnungsdaten der Organisation |
| Sentry (EU) | Fehlerüberwachung | Stacktraces ohne Personendaten (Scrubbing aktiv) |

## 13. PWA & Vorbereitung native App

Kardia ist ab Release 1 installierbar, offline lesbar und push-fähig; die spätere iOS-App nutzt dieselbe REST-API, dieselben Schemas und dieselben Design-Tokens.

### 13.1 Manifest (`app/manifest.ts`)

| Feld | Wert |
| --- | --- |
| `name` / `short_name` | "Kardia – Stellen im Gesundheitswesen" / "Kardia" |
| `start_url` | `/?source=pwa` |
| `display` | `standalone` |
| `background_color` | `#F7F8FA` (surface-50) |
| `theme_color` | `#FFFFFF` hell, `#0F1215` dunkel (per `<meta name="theme-color" media=…>`) |
| `icons` | 192 px, 512 px, 512 px `maskable`, flach, ohne Verlauf |
| `shortcuts` | Suche, Meine Bewerbungen, Meine Schichten |
| `lang` / `dir` | `de-CH` / `ltr` |

### 13.2 Service Worker

Umsetzung mit Serwist (`@serwist/next`), Precache der App-Shell bei jedem Build.

| Ressource | Strategie | Gültigkeit |
| --- | --- | --- |
| JS, CSS, Schriften, Icons | Cache First (versioniert) | bis zum nächsten Build |
| Öffentliche Seiten (Suche, Station) | Network First, Fallback Cache | 24 h |
| `/api/v1/me/applications`, `/me/shifts`, gemerkte Stellen | Network First, Fallback Cache | 7 Tage |
| Signierte Bucket-URLs, Pass-Dokumente | nie cachen (`NetworkOnly`) | – |
| Navigation ohne Netz und ohne Cache | Offline-Seite mit Liste der lokal verfügbaren Inhalte | – |

- **Offline lesbar:** gemerkte Stellen, eigene Bewerbungen, gebuchte Schichten (inkl. Adresse und Zeit).
- **Nur online:** Bewerben, Schicht buchen, Angebot annehmen. Die UI deaktiviert diese Aktionen offline mit dem Hinweis "Keine Verbindung – Aktion nicht möglich".
- **Hintergrund-Synchronisation** nur für "Merken" und "Gelesen"-Markierungen.

### 13.3 Push & Installation

- Web Push über VAPID; Ereignisse: neuer Treffer einer gespeicherten Suche, Statusänderung Bewerbung, neues Angebot, neue Schicht im Pool, Schicht-Erinnerung 12 h vorher.
- Push wird erst angefragt, wenn die Person eine Suche speichert oder sich bewirbt – nie beim ersten Besuch.
- iOS: Web Push funktioniert nur für zum Home-Bildschirm hinzugefügte Web-Apps; Kardia zeigt auf iOS deshalb eine eigene Anleitung "Zum Home-Bildschirm" mit zwei Schritten.
- Eigener Installationshinweis frühestens beim zweiten Besuch, maximal einmal pro 30 Tage.

### 13.4 Vorbereitung native iOS-App

- **API first:** Jede Funktion der Fachperson ist über `/api/v1` erreichbar; Web nutzt Server Actions, die dieselben Service-Funktionen aufrufen.
- **Auth:** Better Auth mit Bearer-Tokens für native Clients; Passkeys teilen sich die Domain (Associated Domains).
- **Universal Links:** `/.well-known/apple-app-site-association` und `/.well-known/assetlinks.json` werden ab R1 ausgeliefert (zunächst ohne App-IDs) für Pfade `/jobs/*`, `/wards/*`, `/offers/*`.
- **Design-Tokens** werden aus einer JSON-Quelle (`packages/ui/tokens.json`) mit Style Dictionary für CSS und später Swift/SwiftUI erzeugt.
- **OpenAPI-Spezifikation** (Abschnitt 12) dient zur Generierung des Swift-Clients.
- **AK-PWA1** Lighthouse-Installierbarkeit erfüllt, Offline-Navigation auf gemerkte Stellen funktioniert im Flugmodus (E2E-Test mit Playwright `context.setOffline(true)`).

## 14. Sicherheit, Datenschutz & Recht

Kardia bearbeitet Bewerbungs- und Qualifikationsdaten und muss das revidierte Datenschutzgesetz (revDSG) erfüllen; die grösste rechtliche Unbekannte ist, ob Marktplatz und Flex-Pool als bewilligungspflichtige Arbeitsvermittlung gelten (Q-5, vor R2 klären).

### 14.1 Datenschutz (revDSG)

- **Hosting:** Railway Region EU West; Datenbank, Bucket und Dienste liegen im EWR. Bekanntgaben in die USA (Anthropic, Stripe, Amazon SES, Sentry) nur mit geeigneten Garantien (Zertifizierung unter dem Swiss-U.S. Data Privacy Framework oder Standardvertragsklauseln); je Anbieter in Q-7 zu verifizieren.
- **Grundsätze im Code:** Datenminimierung (z. B. Wohnort auf Bezirk für Marktplatz, Pendel-Startpunkt auf \~150 m gerundet), Zweckbindung je Feld dokumentiert im Verzeichnis der Bearbeitungstätigkeiten.
- **Feldverschlüsselung:** `phone`, `registryNumber`, Nachrichtentexte mit AES-256-GCM auf Anwendungsebene; Schlüssel als Railway-Secret, Rotation jährlich.
- **Aufbewahrung:**

| Daten | Löschung |
| --- | --- |
| Bewerbung inkl. Nachrichten | 6 Monate nach Abschluss der Stelle |
| Inaktives Fachpersonen-Konto | nach 24 Monaten Inaktivität, Ankündigung 30 Tage vorher |
| Pass-Dokumente (Dateien) | sofort mit Löschung des Nachweises oder Kontos |
| KI-Rohtexte (`AiRun.rawInput`) | 30 Tage |
| Audit-Log | 10 Jahre (Admin-Aktionen), sonst 2 Jahre |
| Backups | 30 Tage rollierend |

- **Rechte der Betroffenen:** Datenexport als JSON per Klick (Datenportabilität), Selbstlöschung des Kontos, Auskunft innert 30 Tagen über Admin-Prozess.
- **Datenschutz-Folgenabschätzung** vor R1 wegen Matching und Profilbildung (Art. 22 revDSG).
- **Keine automatisierte Einzelentscheidung:** Ranking ja, Ablehnung nie automatisch (Abschnitt 9.4).
- **Kein Tracking durch Dritte**, keine Werbe-Cookies; nur technisch notwendige Cookies → kein Cookie-Banner nötig.

### 14.2 Sicherheit

| Massnahme | Umsetzung |
| --- | --- |
| Authentisierung | Passkeys/E-Mail-Link; Admins nur mit Passkey; Sitzungen 30 Tage, Admin 12 h |
| Autorisierung | Jede Service-Funktion prüft Rolle und Mandant (`organizationId`) serverseitig; Tests je Rolle |
| Transport | TLS 1.2+, HSTS mit `preload` |
| Browser | CSP mit Nonce, `frame-ancestors 'none'`, `Referrer-Policy: strict-origin-when-cross-origin` |
| Dateien | Nur signierte URLs, Magic-Byte-Prüfung, ClamAV-Scan, keine öffentlichen Buckets |
| Abhängigkeiten | Renovate wöchentlich, `pnpm audit` im CI, Lockfile verpflichtend |
| Geheimnisse | Nur Railway-Variablen; Secret-Scan (gitleaks) im CI |
| Protokollierung | Zugriffe auf Pass-Dokumente und alle Admin-Aktionen im `AuditLog` |
| Prüfung | Externer Penetrationstest vor öffentlichem Launch R1 |

### 14.3 Recht & Compliance

- **Arbeitsvermittlungsgesetz (AVG):** Klären, ob reine Inserateplattform (R1) bewilligungsfrei ist und ob aktives Matching, Angebote (E) oder Flex-Pool (C) eine Bewilligung nach AVG auslösen. Ergebnis bestimmt Release-Umfang R2 (Q-5).
- **Realitäts-Check & Team-Antworten:** sind Erfahrungsberichte; Moderation vor Veröffentlichung, Meldefunktion, Gegendarstellung für Arbeitgeber (Kommentarfunktion), Schutz vor persönlichkeitsverletzenden Aussagen.
- **Benchmarks:** nur aggregierte Mediane ab 8 Stationen, keine Namen anderer Arbeitgeber.
- **Rechtstexte:** AGB Fachpersonen, AGB Arbeitgeber, Datenschutzerklärung (DE/FR/IT/EN), Impressum.
- **Barrierefreiheit:** WCAG 2.2 AA (Abschnitt 7.4), jährlicher Audit.

## 15. Geschäftsmodell & Pricing

Fachpersonen zahlen nie; Arbeitgeber zahlen ein Software-Abo. Kardia nimmt bewusst keine Erfolgsgebühr pro Einstellung, um klar Software und nicht Vermittler zu sein (stützt die AVG-Position, Q-5) und um sich glaubwürdig von Agenturaufschlägen abzugrenzen.

| Plan | Preis (CHF, exkl. MWST) | Enthalten |
| --- | --- | --- |
| Einzelinserat | 290 pro Stelle, 60 Tage | 1 Station, KI-Import, Pipeline |
| Praxis | 79 / Monat | bis 2 aktive Stellen, 1 Station, 2 Nutzer |
| Institution | 690 / Monat | bis 25 aktive Stellen, unbegrenzt Stationen, 10 Nutzer, 20 Angebote/Monat (Marktplatz), Benchmark, Flex-Pool bis 100 Mitglieder |
| Spitalgruppe | ab 2'400 / Monat | unbegrenzt Stellen und Nutzer, 100 Angebote/Monat, mehrere Standorte, SSO, API, Webhooks, Feed-Import, unbegrenzte Pools |

- **Marktanker:** Ein spezialisiertes Schweizer Portal für Praxispersonal liegt bei rund CHF 275 pro Inserat ([lohncheck.ch](https://lohncheck.ch/de/articles/jobborsen)); das Einzelinserat ist bewusst ähnlich bepreist, liefert aber Stationsprofil und Pass-Bewerbungen.
- **Wertargument Institution:** Temporärpersonal kostet Spitäler bis zu 75 % mehr ([SRF](https://www.srf.ch/news/schweiz/fachkraeftemangel-temporaerfirmen-machen-spitaelern-bauchschmerzen)); ein Abo amortisiert sich, sobald eine einzige Temporärstelle durch eine Festanstellung oder den eigenen Pool ersetzt wird.
- **Zahlungsarten:** Karte und TWINT über Stripe; Rechnung mit QR-Einzahlungsschein für Institution und Spitalgruppe, Zahlungsfrist 30 Tage, jährliche Vorauszahlung mit 2 Monaten Rabatt.
- **Gründungspartner:** Die ersten 30 Institutionen im Kanton Zürich erhalten den Plan "Institution" 6 Monate kostenlos gegen vollständige Stationsprofile und ein Feedback-Gespräch pro Monat.
- **Kein Werbegeschäft**, keine bezahlten Ranking-Plätze: Sortierung folgt nur den Bedingungen der suchenden Person. Hervorhebung ist ausschliesslich über Profilvollständigkeit und Aktualität erreichbar.

## 16. Go-to-Market

Kardia startet mit der Angebotsseite: Zuerst 30 Stationen mit vollständigen Profilen im Kanton Zürich, erst dann aktives Marketing bei Fachpersonen – eine Suche ohne Treffer zerstört das Vertrauen sofort.

1. **Arbeitgeber gewinnen (vor Launch R1).** Direktansprache von Pflegeleitungen der Institutionen, die öffentlich auf Temporärpersonal verzichten wollen (VZK-Mitglieder). Angebot: Gründungspartner-Programm (Abschnitt 15). Ziel: 30 Stationen, mindestens 3 Fachbereiche.
2. **Profile befüllen.** Kardia-Team erfasst mit dem Arbeitgeber das erste Stationsprofil gemeinsam (60 Minuten); alle weiteren über KI-Import.
3. **Fachpersonen gewinnen (Launch R1).**
   - Höhere Fachschulen und Fachhochschulen Pflege: Abschlussjahrgänge mit dem Lebensmodell-Suchprinzip.
   - Berufsverbände: Lohn- und Bedingungsreport als gemeinsame Publikation anbieten.
   - Organische Suche: jede Station als eigene, indexierbare Seite mit strukturierten Daten (`JobPosting` nach schema.org) inkl. Lohnangabe.
   - Weiterempfehlung: Mitarbeitende werden für den Realitäts-Check ihrer eigenen Station eingeladen und lernen Kardia so kennen.
4. **Datenprodukt als Lautsprecher.** Halbjährlicher "Kardia-Bedingungsreport" mit Medianen zu Lohn, Dienstplan-Vorlauf und Wochenenden je Fachbereich und Region. Synergie mit Erfahrbar: Lohndaten aus beiden Quellen können (mit Einwilligung und aggregiert) gegenseitig validiert werden.
5. **Ausbau.** Nach 6 Monaten Deutschschweiz flächendeckend, mit R2 Ärztinnen und Ärzte (Weiterbildungs-Suche), mit R3 Romandie.

**Kanal-Ziele 12 Monate:** 40 % organische Suche, 25 % Weiterempfehlung/Realitäts-Check, 20 % Schulen und Verbände, 15 % direkt.

## 17. Roadmap & Releases

Kardia geht im Februar 2027 mit Pflege im Kanton Zürich live; Marktplatz und Flex-Pool folgen erst, wenn die AVG-Frage geklärt ist. Die Zeiten setzen einen Entwickler in Vollzeit mit Claude Code voraus.

&#91;embedded content: Roadmap · 4 Phasen, 3 Gates, Nov 2026 bis Feb 2028\]

Jede Phase beginnt erst, wenn ihr Gate erfüllt ist; verschiebt sich ein Gate, verschiebt sich die ganze folgende Phase statt dass Umfang in die laufende Phase rutscht.

## 18. Risiken & offene Fragen

Das grösste Risiko ist nicht technisch, sondern das Henne-Ei-Problem: Ohne ehrliche, vollständige Stationsprofile gibt es keinen Grund für Fachpersonen, Kardia zu nutzen.

### 18.1 Risiken

| Risiko | Auswirkung | Gegenmassnahme |
| --- | --- | --- |
| Arbeitgeber scheuen Transparenz (Lohn, Betreuungsschlüssel) | Wenige Inserate | Gründungspartner, KI-Import senkt Aufwand, Benchmark als Gegenwert |
| Geschönte Profile | Vertrauensverlust | Realitäts-Check, 180-Tage-Bestätigung, Rückstufung veralteter Profile |
| Marktplatz/Flex-Pool gilt als Arbeitsvermittlung | Bewilligungspflicht, Verzögerung R2 | AVG-Gutachten vor R2 (Q-5), kein Erfolgshonorar |
| Zu wenig Realitäts-Check-Stimmen (< 5) | Feature bleibt leer | Einladung durch Arbeitgeber, Anzeige erst ab Schwelle, kein leerer Platzhalter |
| Rufschädigende Erfahrungsberichte | Rechtsstreit | Moderation vor Veröffentlichung, nur strukturierte Felder plus kurzer Kommentar |
| KI erfindet Werte beim Import | Falsche Bedingungen | Belegpflicht je Feld, Goldset ≥ 95 %, menschliche Bestätigung |
| Grosse Portale kopieren Felder | Differenzierung schrumpft | Realitäts-Check und Pass sind netzwerkgetrieben und schwer kopierbar |
| Single-Developer-Kapazität | Verzögerung | Releases strikt schneiden, R1 ohne Marktplatz und Flex-Pool |

### 18.2 Offene Fragen

- [ ] **Q-1** Mitbewerber-Funktionen per Testkonto verifizieren (Abschnitt 5).
- [ ] **Q-2** Welches Register (MedReg, GesReg, NAREG) gilt für welchen Beruf, und ist eine maschinelle Abfrage zulässig?
- [ ] **Q-3** Nutzungsbedingungen des SIWF-Registers für Weiterbildungsstätten.
- [ ] **Q-4** Personalvermittler in R3 in separatem Bereich zulassen oder dauerhaft ausschliessen?
- [ ] **Q-5** AVG-Bewilligungspflicht für Marktplatz (E) und Flex-Pool (C) – Rechtsgutachten.
- [ ] **Q-6** Formulierung der Haltung zur internationalen Rekrutierung (WHO-Kodex) juristisch prüfen.
- [ ] **Q-7** Datenübermittlung USA: DPF-Status von Anthropic, Stripe, Amazon, Sentry prüfen; alternativ Claude Haiku 5.5 über Amazon Bedrock mit EU-Inferenzprofil ([computingforgeeks](https://computingforgeeks.com/claude-haiku-5-5-released-features-benchmarks/)).
- [ ] **Q-8** Markenrecherche für den Namen "Kardia" (Swissreg, EUIPO) und Domain-Verfügbarkeit.
- [ ] **Q-9** Muster-Dienstplan (28 Tage) ab R1 oder erst R2 als Pflichtfeld?

### Quellen

- [RRB Solothurn 2026/777 – Obsan-Bedarf](https://rrb.so.ch/beschlussnummer/2026_777/download/2283caae463d43c1840fa2e626128652/)
- [frontaliers-grandest.eu – Arbeitsmarkt Schweiz 2026](https://frontaliers-grandest.eu/de/?p=63863)
- [Kanton St. Gallen – Stellenportale](https://www.hallo.sg.ch/en/arbeit-finanzen/arbeitsstelle/arbeitssuche/_jcr_content/pdfonthefly.ocFile/arbeitssuche-en.pdf)
- [medi-karriere.ch](https://medi-karriere.ch)
- [SRF – Spitäler bauen Temporärstellen ab](https://www.srf.ch/news/wirtschaft/arbeit-auf-zeit-spitaeler-bauen-immer-mehr-temporaerstellen-ab)
- [SRF – Temporärfirmen machen Spitälern Bauchschmerzen](https://www.srf.ch/news/schweiz/fachkraeftemangel-temporaerfirmen-machen-spitaelern-bauchschmerzen)
- [Kantonsrat Zürich – Anfrage VZK-Verzicht](https://parlzhcdws.cmicloud.ch/parlzh5/cdws/Files/58cff922267344b6aeebdff191c400ac-332/1/pdf)
- [Parlament – SGK-S zum BGAP, 2. September 2026](https://www.parlament.ch/press-releases/Pages/mm-sgk-s-2026-09-02.aspx?lang=1031)
- [lohncheck.ch – Spezialisierte Jobbörsen](https://lohncheck.ch/de/articles/jobborsen)
- [Railway Docs – Storage Buckets](https://docs.railway.com/storage-buckets)
- [nextjs.org – unterstützte Versionen](https://nextjs.org/llms.txt)
- [techenclave – Claude Haiku 5.5 Preise](https://techenclave.com/news/items/claude-haiku-5-5-launches-with-0-10-input-pricing-for-shorter-prompts)
