# Verzeichnis der Bearbeitungstätigkeiten (Auszug, revDSG)

Zweckbindung je Feld (PRD 14.1). Verschlüsselt (AES-256-GCM): `CandidateProfile.phone`,
`Credential.registryNumber`, `Message.body`, `WebhookEndpoint.secret`.

| Daten | Zweck | Empfänger | Löschung |
| --- | --- | --- | --- |
| E-Mail, Sprache | Konto, Benachrichtigungen | Amazon SES (E-Mail) | mit Konto; inaktive Konten nach 24 Monaten (Ankündigung 30 Tage vorher) |
| Name, Telefon | Bewerbung, erst bei Bewerbung/Interesse für Arbeitgeber sichtbar | Arbeitgeber der Bewerbung | mit Konto |
| Wohnort (Koordinaten) | Pendelzeit; nur als Geohash (~150 m) an Routing; im Marktplatz nur Bezirk | OSRM (eigener Dienst), opentransportdata.swiss (gerundeter Startpunkt) | mit Konto; Cache 30 Tage |
| Pass-Nachweise, Dokumente | Qualifikationsprüfung, Bewerbung | Kardia-Prüfteam; Arbeitgeber nur mit Freigabe pro Bewerbung (AK-D1); Anthropic nur Dokument + Felder des Nachweises (KI-3) | Dokumente sofort mit Nachweis/Konto |
| Bewerbungen, Nachrichten | Stellenbesetzung | Arbeitgeber | 6 Monate nach Abschluss der Stelle |
| Realitäts-Check-Stimmen | Vergleichbarkeit der Arbeitsbedingungen | öffentlich nur aggregiert ab 5 Stimmen | Stimme ohne Personenbezug (HMAC) |
| KI-Rohtexte (`AiRun.rawInput/rawOutput`) | Fehleranalyse | – | 30 Tage |
| Audit-Log | Nachvollziehbarkeit | – | Admin-Aktionen 10 Jahre, sonst 2 Jahre |
| Ereignisse (`Event`) | KPIs ohne Drittanbieter-Tracker | – | Nutzerbezug mit Konto |

Keine automatisierte Einzelentscheidung: Ranking ja, Ablehnung nie automatisch (Art. 21 revDSG).
Nur technisch notwendige Cookies (`kardia.session_token`, `kardia_locale`, `kardia_theme`,
`kardia_nav`, `kardia_org`) – kein Cookie-Banner.
