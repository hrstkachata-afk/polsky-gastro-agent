# Zap 01: Nový kontakt -> Gmail draft -> Trello karta

Účel: když se do Google Sheets přidá nový kontakt, Zapier připraví e-mail a založí kartu v Trellu. Nic se samo neodesílá.

## Trigger

App: `Google Sheets`

Event:

```text
New Spreadsheet Row
```

Tabulka:

```text
Polsko gastro CRM
```

Filtr:

```text
status = novy
do_not_contact != TRUE
email exists OR contact_form exists
```

## AI krok

App: `OpenAI by Zapier` nebo `AI by Zapier`

Úkol:

```text
Vytvoř krátký, slušný první e-mail v polštině pro polského partnera.
E-mail se nemá tvářit jako masový spam.
Neodesílej kompletní tvrdou reklamu, nejdřív se zeptej, jestli můžeme poslat skupinovou nabídku.
Zohledni typ kontaktu.

Restaurace/objekt:
Chata Dr. Hrstky, Štramberk
Kontakt: Monika Sikorová
Telefon: +420 724 143 903
E-mail: hrstkachata@gmail.com
Web: www.chatadrhrstky.cz

Nabídka:
- český regionální oběd
- Olbrew z místního pivovaru pro dospělé skupiny
- nealko varianta pro školy a osoby, které nepijí alkohol
- domácí ucho plněné krémem po obědě
- sáček Štramberských uší s sebou
- orientační cena kolem 600 Kč / osoba
- kapacita max. 40 osob

Kontakt:
Firma: {{company_name}}
Typ: {{contact_type}}
Město: {{city}}
Web: {{website}}

Vrať výsledek ve formátu:
SUBJECT: ...
BODY:
...
```

## Akce 1

App: `Gmail`

Event:

```text
Create Draft
```

To:

```text
{{email}}
```

Subject:

```text
výstup AI SUBJECT
```

Body:

```text
výstup AI BODY
```

Poznámka: pokud kontakt nemá e-mail a má jen formulář, draft nevytvářej. Trello karta vznikne i tak a Monika uvidí, že je potřeba kontaktní formulář.

## Akce 2

App: `Trello`

Event:

```text
Create Card
```

List:

```text
Ke schválení
```

Card name:

```text
[{{contact_type}}] {{company_name}} - {{city}}
```

Card description: použij šablonu z `trello-board.md`.

## Akce 3

App: `Google Sheets`

Event:

```text
Update Spreadsheet Row
```

Nastav:

```text
status = ke_schvaleni
first_draft_subject = subject z AI
trello_card_url = URL vytvořené karty
next_step = Monika zkontroluje Gmail draft a odešle ho ručně.
```

## Volitelná WhatsApp notifikace

Posílat jen u priority `high`.

Text:

```text
Moniko, nový návrh čeká na schválení:
{{company_name}} - {{city}}
Typ: {{contact_type}}
Draft je v Gmailu, karta je v Trellu.
```
