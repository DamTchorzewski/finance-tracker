# Repozytorium: opis i tagi

Rzeczy, które ustawia się na GitHubie ręcznie (nie da się ich zapisać w plikach repozytorium). Przegląd projektu:
[README](../README.md).

## Nazwa repozytorium: `finance-tracker`

Standard nazw: `reops/standards/repo-names.md` (fraza, której szuka programista). To wersja 2 aplikacji finansowej; API
to `finance-tracker-api` (rola na końcu). Repozytorium powstało 2026-11-21 jako kopia, z całą historią,
`personal-finance-manager` (wersja 1, projekt zespołowy, wcześniej `S7venSurvivors-Wallet`), który zostaje bez zmian.
Nazwa marki (logo, nazwa w aplikacji) jest wybierana osobno i trafi do opisu, gdy będzie gotowa.

## Opis i tagi (About)

**Opis (Description):**

```text
Personal finance tracker: React 19, TypeScript and Tailwind CSS PWA with multi-currency accounts at NBP rates, budgets, a command palette and a demo; Firebase Auth, Hosting and a Cloud Run API.
```

**Strona (Website):** adres na Firebase Hosting po pierwszym wdrożeniu (`https://<project>.web.app` albo własna domena).

**Tagi (Topics):**

```text
react typescript vite tailwindcss tanstack-router tanstack-query pwa personal-finance budget-tracker expense-tracker nbp currency-converter firebase firebase-hosting accessibility
```

Z GitHub CLI jedną komendą:

```bash
gh repo edit DamTchorzewski/finance-tracker --description "Personal finance tracker: React 19, TypeScript and Tailwind CSS PWA with multi-currency accounts at NBP rates, budgets, a command palette and a demo; Firebase Auth, Hosting and a Cloud Run API." --add-topic react --add-topic typescript --add-topic vite --add-topic tailwindcss --add-topic tanstack-router --add-topic tanstack-query --add-topic pwa --add-topic personal-finance --add-topic budget-tracker --add-topic expense-tracker --add-topic nbp --add-topic currency-converter --add-topic firebase --add-topic firebase-hosting --add-topic accessibility
```

## Ustawienia do włączenia

| Gdzie (GitHub)                               | Co ustawić                                                                  |
| -------------------------------------------- | --------------------------------------------------------------------------- |
| Settings → General → Default branch          | `main` (już jest)                                                           |
| Settings → Secrets and variables → Variables | `VITE_FIREBASE_*` i `SITE_URL`, patrz [deployment.md](deployment.md)        |
| Settings → Environments → `production`       | zmienne wdrożenia na Firebase Hosting, patrz [deployment.md](deployment.md) |
| Settings → Pages                             | wyłączone (aplikacja jest na Firebase Hosting)                              |
| Settings → Code security                     | Dependabot alerts i secret scanning (`standards/github-settings.md`)        |
