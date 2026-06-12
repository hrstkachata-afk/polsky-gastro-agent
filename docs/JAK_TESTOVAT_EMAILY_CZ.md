# Jak trénovat e-maily a odpovědi

Tahle verze nic neposílá sama. Slouží k tréninku procesu.

## 1. Vytvořit návrhy

```bash
npm run drafts
```

Výsledek:

- návrhy e-mailů jsou v `outbox/*.txt`,
- seznam návrhů je v `outbox/index.csv`,
- akce je zapsaná v `data/aktivita.csv`.

## 2. Zapsat testovací odpověď

Příklad, že cestovka má zájem:

```bash
npm run reply -- --contact=K001 --interest=zajem --summary="Chtějí cenu a možné termíny pro 35 osob." --next="poslat konkrétní nabídku"
```

Příklad, že kontakt nechce další zprávy:

```bash
npm run reply -- --contact=K001 --interest=nezajem --summary="Nemají zájem o nabídku." --next="nepsat znovu"
```

Výsledek:

- odpověď je v `data/odpovedi.csv`,
- akce je v `data/aktivita.csv`.

## 3. Udělat přehled

```bash
npm run report
```

Výsledek:

- přehled vznikne v `reports/prehled.md`.

## 4. Jak to bude fungovat s Gmailem

Další vrstva bude číst odpovědi z Gmailu podle předmětu, odesílatele nebo štítku.

Doporučený štítek v Gmailu:

```text
Polsko gastro agent
```

Agent pak bude umět:

- najít nové odpovědi,
- shrnout, jestli mají zájem,
- zapsat výsledek do `data/odpovedi.csv`,
- doporučit další krok,
- připravit odpověď, ale neodeslat ji bez schválení.

První bezpečný Gmail test už proběhl read-only dotazem:

```text
subject:"Oferta dla grup z Polski" -in:trash -in:spam
```

Výsledek byl 0 nalezených e-mailů, protože zatím běží jen lokální trénink a ostré e-maily se neposílaly.

## 5. Kde co najdeš

- `data/kontakty.csv` - seznam firem a skupin, které chceme oslovit.
- `outbox/*.txt` - konkrétní návrhy e-mailů ke schválení.
- `outbox/index.csv` - seznam připravených návrhů.
- `data/aktivita.csv` - deník všeho, co agent udělal.
- `data/odpovedi.csv` - zapsané odpovědi a vyhodnocení zájmu.
- `reports/prehled.md` - lidský přehled, který si můžeš otevřít a hned vidět stav.
