# Příklady vyhodnocení odpovědí AI krokem

## Příklad 1: Chtějí cenu

E-mail:

```text
Dzień dobry, proszę o ofertę dla grupy 35 osób na lipiec. Jaka byłaby cena?
```

AI výstup:

```json
{
  "interest_status": "chce_cenu",
  "summary_cs": "Kontakt chce nabídku pro 35 osob na červenec a ptá se na cenu.",
  "people_count": "35",
  "requested_date": "lipiec",
  "group_type": "nejasne",
  "needs_non_alcoholic": "nejasne",
  "next_step_cs": "Připravit konkrétní nabídku s orientační cenou a ověřit datum.",
  "whatsapp_priority": "high",
  "draft_reply_pl": "Dzień dobry,\n\ndziękujemy za wiadomość. Dla grupy 35 osób możemy przygotować czeski obiad regionalny w Štramberku. Cena orientacyjna wynosi około 600 CZK za osobę, dokładne menu i godzinę możemy dopasować do Państwa programu.\n\nCzy mają Państwo już konkretny termin w lipcu?\n\nPozdrawiam serdecznie\nMonika Sikorová\nChata Dr. Hrstky"
}
```

## Příklad 2: Škola

E-mail:

```text
Interesuje nas wycieczka szkolna dla 28 uczniów i 3 opiekunów. Czy macie opcję bez alkoholu?
```

AI výstup:

```json
{
  "interest_status": "zajem",
  "summary_cs": "Škola má zájem o výlet pro 28 žáků a 3 doprovody a ptá se na nealko variantu.",
  "people_count": "31",
  "requested_date": "",
  "group_type": "szkola",
  "needs_non_alcoholic": "ano",
  "next_step_cs": "Odpovědět, že je možná školní varianta bez alkoholu, a zeptat se na termín.",
  "whatsapp_priority": "high",
  "draft_reply_pl": "Dzień dobry,\n\ndziękujemy za wiadomość. Tak, dla grup szkolnych przygotowujemy wariant bez alkoholu. Możemy zaproponować czeski obiad, domowe ucho z kremem oraz paczkę Štramberskich uszu na wynos.\n\nCzy mają Państwo wybrany termin wycieczki?\n\nPozdrawiam serdecznie\nMonika Sikorová\nChata Dr. Hrstky"
}
```

## Příklad 3: Nezájem

E-mail:

```text
Dziękujemy, ale nie jesteśmy zainteresowani. Proszę nie wysyłać kolejnych wiadomości.
```

AI výstup:

```json
{
  "interest_status": "nepsat",
  "summary_cs": "Kontakt odmítl nabídku a žádá neposílat další zprávy.",
  "people_count": "",
  "requested_date": "",
  "group_type": "",
  "needs_non_alcoholic": "",
  "next_step_cs": "Označit jako nekontaktovat a už nepsat.",
  "whatsapp_priority": "none",
  "draft_reply_pl": "Dzień dobry,\n\ndziękujemy za odpowiedź. Oczywiście, nie będziemy wysyłać kolejnych wiadomości.\n\nPozdrawiam serdecznie\nMonika Sikorová"
}
```
