# Bezpecny online rezim

Puvodni Google Sheet `Polsko gastro CRM` byl zablokovan Googlem kvuli smluvnim podminkam. Proto je agent docasne prepnuty do bezpecnejsiho rezimu:

```text
GitHub Actions po rucnim spusteni
-> lead finder najde verejne polske kandidaty
-> pripravi hotove texty osloveni
-> vytvori GitHub Issues a pri konfiguraci Trella i Trello karty
-> clovek sedi nad Trello frontou `K odeslani` a odesila pripravene texty
```

Agent sam neposila e-maily. Vytvari nebo pripravuje podklady ke kontrole.

## Co je aktivni

- `npm run leads` najde verejne kandidaty.
- `npm run review-pack` vytvori checklist a Trello CSV k odeslani.
- `npm run trello-cards` vytvori Trello karty, pokud jsou nastavene Trello secrets.
- `npm run review-issues` vytvori GitHub Issues pro rucni schvaleni.
- `.github/workflows/polsky-leads.yml` jde spustit rucne pres GitHub Actions.
- Workflow ted nezapisuje do Google Sheets.
- Vystupy jsou ulozene jako artifact `polsky-leads-output`.

## Co je pozastavene

- Automaticky denni schedule.
- Automaticky zapis do Google Sheets.
- Automaticke spousteni Zapieru z novych radku.
- Plne automaticke odesilani e-mailu bez schvaleni.

## Proc

Google zablokoval puvodni Sheet. Pokracovat stejnym automatickym zpusobem by mohlo zablokovat dalsi dokument nebo ucet. Bezpecnejsi je nejdriv snizit automatiku a zkontrolovat, jake kontakty a texty do CRM vubec patri.

## Dalsi bezpecna varianta

1. Pouzivat GitHub artifact jako surovy vystup.
2. Do noveho CRM davat jen zkontrolovane firmy.
3. Ukladat hlavne nazev firmy, web, mesto, typ kontaktu a odkaz na kontaktni stranku.
4. E-mail vytvaret az po rucnim schvaleni kontaktu.
5. Pouzivat Trello jako frontu k odeslani.

## Vystupy ke kontrole

Po rucnim behu workflow stahni artifact `polsky-leads-output`. Dulezite soubory:

- `lead-candidates.csv` - surovy seznam nalezenych kandidatu.
- `kontakty-ke-kontrole.md` - lidsky checklist k odeslani.
- `trello-karty-k-odeslani.csv` - CSV pro vytvoreni karet v seznamu `K odeslani`.

## Trello jako fronta k odeslani

Podrobnosti jsou v:

```text
docs/TRELLO_FRONTA_CZ.md
```

Po doplneni GitHub Secrets `TRELLO_KEY`, `TRELLO_TOKEN` a `TRELLO_LIST_ID` bude workflow zakladat karty primo v Trellu.

## GitHub Issues jako CRM

Workflow vytvari issue s labely:

- `lead-review`
- `priority-high`
- `priority-normal`
- `priority-low`

Issue slouzi jako karta ke kontrole. Kdyz je kontakt vhodny, nech issue otevrene a dopln poznamku. Kdyz je nevhodny, zavri ho s poznamkou `neposilat`.
