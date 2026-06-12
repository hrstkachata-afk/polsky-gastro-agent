# Zap 03: Trello follow-up -> Gmail draft follow-upu

Účel: když Monika přesune kartu do sloupce `Čeká na Moniku` nebo nastaví follow-up, Zapier připraví další e-mail.

## Trigger

App: `Trello`

Event:

```text
Card Moved to List
```

List:

```text
Čeká na Moniku
```

Nebo samostatný sloupec, pokud ho později přidáme:

```text
Follow-up
```

## AI krok

App: `OpenAI by Zapier` nebo `AI by Zapier`

Úkol:

```text
Vytvoř krátký follow-up e-mail v polštině.
Tón: slušný, nenátlakový, stručný.
Cíl: připomenout nabídku Chata Dr. Hrstky pro polské skupiny.
Pokud karta říká, že jde o školu, nezmiňuj degustaci alkoholu, ale nabídni nealko variantu.
Pokud karta říká, že jde o dospělou skupinu, můžeš zmínit Olbrew z místního pivovaru.

Vrať:
SUBJECT: ...
BODY:
...

Kontext karty:
{{trello_card_description}}
```

## Akce

App: `Gmail`

Event:

```text
Create Draft
```

To:

```text
email z karty nebo Google Sheets
```

Subject:

```text
výstup AI SUBJECT
```

Body:

```text
výstup AI BODY
```

## Aktualizace Trella

Přidej komentář:

```text
Follow-up draft vytvořen v Gmailu. Čeká na kontrolu Moniky.
```
