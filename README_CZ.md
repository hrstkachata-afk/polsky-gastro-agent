# Polský gastro agent

Tahle složka je první verze automatizace pro propagaci skupinové nabídky polským partnerům.

Agent zatím nic neposílá. Jen připravuje návrhy e-mailů ke schválení.

## Jak to funguje

1. Doplň údaje restaurace v `data/nabidka.json`.
2. Přidej kontakty do `data/kontakty.csv`.
3. U kontaktů, které chceš zpracovat, nastav `status` na `schvalit`.
4. Spusť:

```bash
npm run drafts
```

5. Návrhy najdeš ve složce `outbox/`.

## Stav kontaktu

Používej tyto stavy:

- `schvalit` - připravit návrh e-mailu,
- `pripraveno` - návrh už existuje,
- `odeslano` - e-mail byl odeslán ručně,
- `odpovedel` - kontakt odpověděl,
- `nezajem` - nemá zájem,
- `neposilat` - už nekontaktovat.

## Co doplnit před ostrým použitím

- jméno kontaktní osoby,
- telefon,
- e-mail,
- web,
- cenu balíčku,
- minimální počet osob,
- reálné kontakty v Polsku.

Další krok může být napojení na Gmail tak, aby agent připravoval drafty přímo v e-mailu, ale stále čekal na tvoje schválení.

## Sběr nových kontaktů

Pro hledání polských kandidátů spusť:

```bash
npm run leads
```

Výsledky najdeš v:

```text
outbox/leads/
```

Podrobnosti jsou v `docs/LEAD_FINDER_CZ.md`.

## Online autopilot

Varianta bez ručního pouštění je připravená přes GitHub Actions a už není závislá na Google účtu:

```text
docs/AUTOPILOT_24_7_CZ.md
```

Agent najde kontakty, připraví e-mailové texty a může vytvořit Trello karty do seznamu `K odeslani`.

Trello fronta je popsaná v:

```text
docs/TRELLO_FRONTA_CZ.md
```
