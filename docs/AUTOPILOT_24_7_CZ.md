# Autopilot 24/7

Ano, agent muze bezet sam online. Prakticky retezec je:

```text
GitHub Actions kazdy pracovni den
-> lead finder najde verejne polske kontakty
-> zapise nove radky do Google Sheets
-> Zapier se spusti pro status novy
-> AI pripravi text
-> Gmail vytvori draft
-> Trello vytvori kartu ke kontrole
```

Agent sam neposila e-maily. Vytvari drafty, aby mel clovek posledni kontrolu pred odeslanim.

## Co je uz pripravene

- `npm run leads` najde verejne kontakty.
- `npm run leads:push` zapise nove kontakty do Google Sheets.
- `npm run leads:auto` udela oboji po sobe.
- `.github/workflows/polsky-leads.yml` spousti online beh kazdy pracovni den v 06:15 UTC a jde spustit i rucne.

## Jednorazove nastaveni Google zapisu

Google Sheets potrebuje bezpecny technicky ucet, aby mohl GitHub zapisovat do tabulky bez tveho pocitace. Aktualni nastavena varianta pouziva GitHub OIDC, takze v GitHubu nemusi byt ulozeny privatni JSON klic.

1. Google Cloud projekt: `cobalt-alchemy-499219-h7`.
2. Service account: `polsky-gastro-agent@cobalt-alchemy-499219-h7.iam.gserviceaccount.com`.
3. Google Sheet `Polsko gastro CRM` je sdileny s timto service accountem jako editor.
4. GitHub Actions v repozitari `hrstkachata-afk/polsky-gastro-agent` se prihlasuje pres Workload Identity Provider:

```text
projects/799250032013/locations/global/workloadIdentityPools/github-pool/providers/github-provider
```

## GitHub secrets

Pro aktualni OIDC variantu nejsou potreba GitHub secrets. Workflow ma jen `id-token: write` opravneni a Google Cloud povoli pouze repozitar `hrstkachata-afk/polsky-gastro-agent`.

## Test

Po nastaveni secrets:

1. Otevri GitHub repozitar.
2. Jdi do `Actions`.
3. Vyber `Polsky gastro lead finder`.
4. Klikni `Run workflow`.
5. Zkontroluj Google Sheet, jestli pribyly nove radky se `status = novy`.
6. V Zapieru zkontroluj historii Zapier zapu a Gmail drafty.

## Provozni poznamky

- Pokud Zapier trial skonci, multistep zap muze prestat bezet, dokud nebude plan aktivni.
- Pokud Google najde stejny web znovu, skript ho preskoci podle ID, webu, e-mailu nebo kontaktniho formulare.
- Pro ostre automaticke odesilani by bylo potreba pridat dalsi schvalovaci pravidla. Aktualni varianta je bezpecnejsi: drafty plus Trello kontrola.
