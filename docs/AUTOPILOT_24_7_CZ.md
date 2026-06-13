# Bezpecny online rezim

Puvodni Google Sheet `Polsko gastro CRM` byl zablokovan Googlem kvuli smluvnim podminkam. Proto je agent docasne prepnuty do bezpecnejsiho rezimu:

```text
GitHub Actions po rucnim spusteni
-> lead finder najde verejne polske kandidaty
-> ulozi CSV/TSV vystupy jako GitHub artifact
-> clovek kontakty zkontroluje
-> az potom se rozhodne, co pujde do CRM/Zapieru
```

Agent sam neposila e-maily. Vytvari nebo pripravuje podklady ke kontrole.

## Co je aktivni

- `npm run leads` najde verejne kandidaty.
- `.github/workflows/polsky-leads.yml` jde spustit rucne pres GitHub Actions.
- Workflow ted nezapisuje do Google Sheets.
- Vystupy jsou ulozene jako artifact `polsky-leads-output`.

## Co je pozastavene

- Automaticky denni schedule.
- Automaticky zapis do Google Sheets.
- Automaticke spousteni Zapieru z novych radku.

## Proc

Google zablokoval puvodni Sheet. Pokracovat stejnym automatickym zpusobem by mohlo zablokovat dalsi dokument nebo ucet. Bezpecnejsi je nejdriv snizit automatiku a zkontrolovat, jake kontakty a texty do CRM vubec patri.

## Dalsi bezpecna varianta

1. Pouzivat GitHub artifact jako surovy vystup.
2. Do noveho CRM davat jen zkontrolovane firmy.
3. Ukladat hlavne nazev firmy, web, mesto, typ kontaktu a odkaz na kontaktni stranku.
4. E-mail vytvaret az po rucnim schvaleni kontaktu.
5. Zachovat Gmail pouze jako drafty, ne automaticke odesilani.
