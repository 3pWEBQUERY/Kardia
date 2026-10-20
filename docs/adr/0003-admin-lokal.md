# ADR 0003 – Admin-Anmeldung lokal

Status: angenommen · Datum: 20.10.2026

Die Admin-Konsole verlangt eine Passkey-Sitzung, höchstens 12 Stunden alt (PRD 14.2).
Ein E-Mail-Link wird für Admins nur verschickt, solange sie noch keinen Passkey haben
(Ersteinrichtung: Link → Einstellungen → Passkey hinzufügen → neu mit Passkey anmelden).

Für die lokale Entwicklung und automatisierte Tests akzeptiert `requireAdmin` eine
E-Mail-Link-Sitzung nur, wenn `NODE_ENV !== 'production'` **und** `DEV_ADMIN_MAGIC_LINK=1`
gesetzt ist. In Produktion ist dieser Weg ausgeschlossen.
