# Bezpečný postup oslovení

Tahle automatizace je záměrně nastavená tak, aby nic neposílala sama.

Postup:

1. Najdi relevantní firmu nebo organizaci.
2. Zapiš ji do `data/kontakty.csv`.
3. Nastav `status` na `schvalit`.
4. Spusť `npm run drafts`.
5. Zkontroluj návrh ve složce `outbox/`.
6. Pošli ručně jen kontakty, které dávají smysl.
7. Do tabulky zapiš výsledek: `odeslano`, `odpovedel`, `nezajem`, `neposilat`.

Doporučené pravidlo:

- první e-mail neposílá kompletní reklamu, ale ptá se, jestli můžeš poslat nabídku,
- neposílat opakovaně lidem, kteří nereagují nebo odmítnou,
- nepoužívat koupené databáze,
- psát menšímu počtu skutečně relevantních partnerů,
- udržovat vlastní seznam `neposilat`.

Poznámka: Tohle není právní rada. U marketingu do Polska je vhodné držet se opatrného režimu, protože elektronický přímý marketing může vyžadovat souhlas příjemce.
