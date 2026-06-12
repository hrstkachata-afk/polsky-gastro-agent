# Lead finder pro polské kontakty

Lead finder hledá veřejné polské weby podle frází v `data/lead-queries.txt`, vytáhne základní veřejné kontakty a připraví je pro CRM.

## Spuštění

Malý test:

```bash
npm run leads -- --max-queries=1 --max-results=5 --max-pages=5
```

Větší běh:

```bash
npm run leads -- --max-queries=5 --max-results=10 --max-pages=40
```

Zápis nalezených kontaktů do Google Sheets:

```bash
npm run leads:push
```

Celý lokální běh najednou:

```bash
npm run leads:auto
```

## Výstupy

Skript vytvoří:

```text
outbox/leads/lead-candidates.csv
outbox/leads/google-sheets-import.tsv
```

Soubor `google-sheets-import.tsv` je připravený pro Google Sheet `Polsko gastro CRM`.

## Jak to zapadá do Zapieru

1. Lead finder najde kandidáty.
2. `npm run leads:push` vloží nové řádky do Google Sheets.
4. Zapier se spustí pro řádky se `status = novy`.
5. Zapier vytvoří Gmail draft a Trello kartu.

Online 24/7 varianta je popsaná v `docs/AUTOPILOT_24_7_CZ.md`.

## Bezpečnost

- Skript nic neposílá.
- Používá jen veřejně dostupné weby.
- Kandidáty je nutné před oslovením zkontrolovat.
- Preferuj obecné firemní kontakty jako `biuro@`, `kontakt@`, `info@`.
- Pokud si nejsi jistý vhodností kontaktu, nedávej ho do ostrého CRM.
