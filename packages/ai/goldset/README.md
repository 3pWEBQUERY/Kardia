# Goldset KI-1

200 echte, anonymisierte Inserate mit manuell erfassten Soll-Feldern (PRD 9.3).
Eine Datei pro Inserat:

```json
{ "id": "zh-0001", "synthetic": false, "text": "…Inseratetext…", "expected": { "department": "ICU", "salaryMinChf": 88000 } }
```

Nicht genannte Felder gelten als `null` (im Inserat nicht vorhanden). Ein Wert der KI
für ein Feld mit Soll `null` zählt als **erfunden**. Freigabe nur bei ≥ 95 %
Feldgenauigkeit und 0 erfundenen Werten. Die drei `synthetic-*.json` sind
Platzhalter zum Testen des Laufs und werden durch echte Inserate ersetzt.
Personennamen, Telefonnummern und E-Mail-Adressen vor dem Einchecken entfernen.
