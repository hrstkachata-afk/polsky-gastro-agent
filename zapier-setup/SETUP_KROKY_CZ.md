# Setup kroky pro Zapier autopilota

Tahle verze je navržená tak, aby běžela skoro bez starostí, ale pořád bezpečně:

- e-maily se připravují jako drafty,
- Monika odesílá ručně,
- odpovědi se automaticky vyhodnocují,
- Trello ukazuje obchodní přehled,
- WhatsApp upozorňuje jen na důležité věci.

## 1. Vytvořit Google Sheet

Název:

```text
Polsko gastro CRM
```

Nejjednodušší ruční vložení do Google Sheets:

1. otevři soubor:

```text
zapier-setup/google-sheets-crm-paste.tsv
```

2. zkopíruj celý obsah,
3. klikni v Google Sheets na buňku `A1`,
4. vlož obsah.

Google Sheets tabulátorový soubor automaticky rozdělí do sloupců.

## 2. Vytvořit Trello board

Postupuj podle:

```text
zapier-setup/trello-board.md
```

## 3. V Gmailu vytvořit štítek

Štítek:

```text
Polsko gastro agent
```

## 4. Zapier účty / aplikace

V Zapieru napojit:

- Gmail účet `hrstkachata@gmail.com`,
- Google Sheets,
- Trello,
- WhatsApp Business nebo WhatsApp Notifications,
- OpenAI by Zapier / AI by Zapier.

## 5. Vytvořit tři Zapy

1. `zap-01-novy-kontakt.md`
2. `zap-02-odpoved-z-gmailu.md`
3. `zap-03-followup-z-trella.md`

## 6. Bezpečnostní pravidla

- První měsíc neposílat nic automaticky.
- Vždy vytvářet pouze Gmail draft.
- WhatsApp posílat jen u důležitých odpovědí.
- Kontakty se stavem `do_not_contact = TRUE` nikdy neoslovovat.
- U škol používat nealko variantu a nezmiňovat degustaci piva jako hlavní bod.

## 7. Doporučený první test

1. Přidat jeden testovací kontakt do Google Sheets.
2. Nechat Zapier vytvořit Gmail draft.
3. Zkontrolovat, že vznikla Trello karta.
4. Odeslat testovací e-mail na vlastní adresu.
5. Odpovědět jako cestovka.
6. Ověřit, že Zapier:
   - aktualizoval Google Sheets,
   - přesunul Trello kartu,
   - vytvořil odpovědní Gmail draft,
   - poslal WhatsApp Monice jen pokud šlo o zájem.
