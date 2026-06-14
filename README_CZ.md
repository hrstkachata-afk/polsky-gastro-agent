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

## AI psani e-mailu

Trello karty umi pouzit i skutecne AI psani pres Gemini nebo OpenAI API. Agent stale nic sam neposila, jen pripravi lepsi navrh ke kontrole.

V GitHub Secrets je potreba doplnit aspon jeden z techto klicu:

```text
GEMINI_API_KEY
OPENAI_API_KEY
```

Agent zkusi nejdriv Gemini, potom OpenAI, a az potom bezpecnou pravidlovou verzi.

Volitelne jde v GitHub Variables nastavit:

```text
GEMINI_MODEL
OPENAI_MODEL
```

Kdyz API klic chybi nebo provider vrati chybu, agent pouzije bezpecnou pravidlovou verzi textu. V Trello karte je videt, jestli text vznikl pres Gemini, OpenAI, nebo jako nahradni sablona.

Styl a pravidla psani jsou v:

```text
data/ai-styl.json
```

Kdyz se nejaky e-mail nelibi, uprav tento soubor. Gemini ho dostane pri kazdem dalsim behu.
