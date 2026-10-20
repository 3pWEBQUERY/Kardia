# ADR 0002 – Ergänzungen zum Prisma-Schema aus dem PRD

Status: angenommen · Datum: 20.10.2026

Das PRD-Schema (33 Modelle, 23 Enums) ist unverändert übernommen. Ergänzt wurde, was das PRD
an anderer Stelle verlangt, aber nicht modelliert:

| Ergänzung | Grund (PRD) |
| --- | --- |
| `User.name`, `image`, `updatedAt`, `lastActiveAt` | Pflichtfelder von Better Auth; Löschung inaktiver Konten nach 24 Monaten (14.1) |
| `Session` (+ `authMethod`), `Account`, `Verification`, `Passkey`, `SsoProvider` | «Tabellen für Sessions/Passkeys erzeugt Better Auth» (11); Admins nur mit Passkey (14.2) |
| `ApiKey` | API-Schlüssel pro Organisation als SHA-256 mit Scopes (12.1) |
| `WebhookEndpoint`, `WebhookDelivery` | Webhooks mit HMAC und 8 Wiederholungen (12.2) |
| `RateLimit` | Token-Bucket in Postgres, «wird in R2 dem Schema hinzugefügt» (12.1) |
| `JobFeed`, `Job.feedId/externalRef/sourceHash` | Feed-Import mit Hash-Erkennung (12.3) |
| `Job.rotations`, `assistantPositions` | Felder Modul F |
| `Job.paidUntil`, `Organization.planValidUntil`, `foundingPartner` | Einzelinserat 60 Tage, Gründungspartner (15) |
| `Ward.reentryAccompaniedShifts`, `reentryRefresher`, `translations` | Pflichtangaben Comeback-Pfad (H), KI-6-Übersetzungen editierbar (9.1) |
| `InviteToken` | Team-Einladung, «vom Arbeitgeber eingeladen» (G), Pool-Einladung (C) |
| `WardFieldComment` | Arbeitgeber kommentiert Realitäts-Check, löscht nie (AK-G2) |
| `ContentReport` | «gemeldete Inhalte» in der Moderation (Admin-Konsole) |
| `RecognitionProgress` | «eigener Fortschritt» im Anerkennungs-Tracker (H) |
| `ShiftInterest` | Pool-Modus «Arbeitgeber wählt aus» (C) |
| Indizes `Ward.shiftTypes` (GIN), `Ward.confirmedAt`, `Job(wardId,status)` | Such-p95 < 300 ms (AK-B3) |

Die Volltext-Migration (`searchVector` als generierte Spalte, GIN- und Trigramm-Index) ist
wie im PRD an die Migration angehängt, die `Job` anlegt (`0001_init`).
