# Trello fronta k odeslani

Agent umi pripravit Trello karty do seznamu `K odeslani`.

Kazda karta obsahuje:

- nazev firmy,
- web,
- e-mail, pokud je verejne nalezeny,
- telefon, pokud je verejne nalezeny,
- kontaktni formular,
- automaticke doporuceni,
- hotovy predmet a text e-mailu v polstine,
- rychly checklist pro odeslani.

## Jak to bezi

```text
GitHub Actions
-> npm run leads
-> npm run review-pack
-> npm run trello-cards
-> npm run review-issues
```

Bez Trello udaju se `npm run trello-cards` jen preskoci a vypise, co by vytvoril. Po doplneni udaju zacne zakladat karty primo do Trella.

## Co je potreba doplnit do GitHub Secrets

V repozitari otevri:

```text
Settings -> Secrets and variables -> Actions -> New repository secret
```

Dopln tyto tri hodnoty:

```text
TRELLO_KEY
TRELLO_TOKEN
TRELLO_LIST_ID
```

`TRELLO_KEY` a `TRELLO_TOKEN` vytvoris v Trello/Atlassian developer nastaveni.

`TRELLO_LIST_ID` je ID seznamu v Trellu, typicky seznam `K odeslani`.

## Bezpecny provoz

Agent zatim neposila e-maily automaticky. Jen pripravi kartu tak, aby clovek mohl sednout k Trellu a rozesilat:

1. otevrit kartu,
2. zkopirovat e-mail nebo otevrit formular,
3. zkopirovat predmet a text,
4. odeslat,
5. presunout kartu do `Odeslano`.

Tohle je bezpecnejsi nez plne automaticke rozesilani, protoze se tim snizuje riziko blokace uctu a spamu.
