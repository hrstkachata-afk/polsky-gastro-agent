# Zap 02: Odpověď v Gmailu -> AI vyhodnocení -> Trello update -> WhatsApp Monice

Účel: když někdo odpoví, Zapier odpověď přečte, shrne ji, aktualizuje CRM a upozorní Moniku jen u důležitých odpovědí.

## Doporučený Gmail štítek

V Gmailu vytvoř štítek:

```text
Polsko gastro agent
```

Na odeslané nebo odpovězené konverzace se bude dávat tento štítek.

## Trigger

App: `Gmail`

Event:

```text
New Email Matching Search
```

Search:

```text
label:"Polsko gastro agent" newer_than:14d -from:hrstkachata@gmail.com -in:trash -in:spam
```

## AI krok

App: `OpenAI by Zapier` nebo `AI by Zapier`

Úkol:

```text
Jsi obchodní asistent pro Chata Dr. Hrstky.
Přečti odpověď od polského kontaktu a vrať strukturované vyhodnocení v češtině.

Rozliš:
- zajem
- chce_cenu
- chce_termin
- chce_menu
- rezervace
- nezajem
- nejasne
- nepsat

Vytáhni:
- shrnutí jednou větou
- počet osob, pokud je zmíněn
- termín nebo datum, pokud je zmíněn
- jestli jde o školu / seniory / firmu / cestovku
- jestli je potřeba nealko varianta
- další doporučený krok
- návrh krátké odpovědi v polštině

Odpověz přesně ve formátu JSON:
{
  "interest_status": "...",
  "summary_cs": "...",
  "people_count": "...",
  "requested_date": "...",
  "group_type": "...",
  "needs_non_alcoholic": "...",
  "next_step_cs": "...",
  "whatsapp_priority": "high/normal/none",
  "draft_reply_pl": "..."
}

E-mail:
{{gmail_body}}
```

## Akce 1

App: `Google Sheets`

Event:

```text
Find Spreadsheet Row
```

Najdi podle:

```text
email = sender email
```

Pokud se nenajde, založ nový řádek se stavem:

```text
status = odpoved_bez_kontaktu
```

## Akce 2

App: `Google Sheets`

Event:

```text
Update Spreadsheet Row
```

Nastav:

```text
last_reply_at = datum e-mailu
interest_status = AI interest_status
people_count = AI people_count
requested_date = AI requested_date
next_step = AI next_step_cs
gmail_thread_url = odkaz na Gmail thread, pokud jej Zapier poskytne
notes = AI summary_cs
```

## Akce 3

App: `Trello`

Event:

```text
Find Card
```

Najdi podle:

```text
contact_id
```

Když není `contact_id`, hledej podle názvu firmy nebo e-mailu.

## Akce 4

App: `Trello`

Event:

```text
Update Card
```

Přesuň kartu podle výsledku:

- `zajem`, `chce_cenu`, `chce_termin`, `chce_menu` -> `Odpověděli - zájem`
- `rezervace` -> `Domluvit termín`
- `nezajem` -> `Nezájem`
- `nepsat` -> `Nekontaktovat`
- `nejasne` -> `Čeká na Moniku`

Přidej komentář:

```text
AI shrnutí: {{summary_cs}}
Další krok: {{next_step_cs}}
Počet osob: {{people_count}}
Termín: {{requested_date}}
Nealko varianta: {{needs_non_alcoholic}}
```

## Akce 5

App: `Gmail`

Event:

```text
Create Draft
```

Vytvoř odpověď na původní vlákno:

```text
{{draft_reply_pl}}
```

Nic neposílat automaticky.

## Akce 6: WhatsApp Monice

Poslat jen pokud:

```text
whatsapp_priority = high
```

Text:

```text
Moniko, přišla důležitá odpověď z Polska.

Kontakt: {{company_name}}
Stav: {{interest_status}}
Shrnutí: {{summary_cs}}
Počet osob: {{people_count}}
Termín: {{requested_date}}

Další krok: {{next_step_cs}}
V Gmailu je připravený draft odpovědi a Trello karta je aktualizovaná.
```
