# Offene Fragen aus dem PRD (Abschnitt 18.2) und wie der Code damit umgeht

| Frage | Stand im Code |
| --- | --- |
| Q-1 Mitbewerber-Funktionen verifizieren | Nicht im Code; betrifft nur Marketing-Aussagen. |
| Q-2 Register je Beruf, maschinelle Abfrage | `REGISTRY_BY_PROFESSION` in `packages/core/src/pass.ts` als vorläufige Zuordnung; Prüfung manuell mit Registerlink. |
| Q-3 SIWF-Register Nutzungsbedingungen | Abweichungen werden als Event `training.deviation` gemeldet (Admin, AK-F2); kein automatischer Abgleich ohne Freigabe. |
| Q-4 Personalvermittler in R3 | Ausgeschlossen: SECO-Treffer → manuelle Prüfung, keine Veröffentlichung ohne Freigabe (AK-C1). |
| Q-5 AVG-Bewilligungspflicht Marktplatz/Flex-Pool | Funktionen gebaut, Freischaltung über Abo (`PLAN_LIMITS`); keine Erfolgsgebühr. |
| Q-6 Haltung internationale Rekrutierung | Text im Ratgeber Anerkennung, juristisch zu prüfen. |
| Q-7 Datenübermittlung USA | Anthropic-Aufrufe nur mit aufgabenbezogenen Daten; Wechsel auf Bedrock EU über einen anderen Client in `packages/ai/src/runner.ts` möglich. |
| Q-8 Markenrecherche «Kardia» | Name ist Arbeitstitel; zentral in `common.json` (`brand`). |
| Q-9 Muster-Dienstplan Pflicht ab R1 | `ROSTER_PATTERN_REQUIRED = true` in `packages/core/src/ward.ts` (ein Schalter). |

## Abweichungen vom PRD

| Stelle | Abweichung und Grund |
| --- | --- |
| Token `ink-500` (hell) | `#646C7C` statt `#6B7383`. Das PRD prüft den Kontrast nur gegen `surface-0` (4.8:1); auf dem Seitenhintergrund `surface-50` erreicht `#6B7383` nur 4.49:1 und fällt unter WCAG AA. `#646C7C` erreicht 5.3 / 5.0 / 4.6:1 auf `surface-0` / `-50` / `-100`. Der Dunkelmodus bleibt unverändert. |
