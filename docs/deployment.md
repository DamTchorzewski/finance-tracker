# Wdrożenie: Firebase Hosting

Aplikacja wersji 2 stoi na **Firebase Hosting** w tym samym projekcie Google co jej API i wersja 1. Hosting serwuje
`dist/` z nagłówkami z `firebase.json` i przekazuje `/api/**` do usługi Cloud Run `finance-tracker-api` (repozytorium
`finance-tracker-api`), więc aplikacja i API są pod jednym adresem. Wersja 1 (`personal-finance-manager` na GitHub Pages)
działa dalej bez zmian. Konfiguracja kont i Workload Identity:
[`finance-tracker-api/docs/deployment.md`](https://github.com/DamTchorzewski/finance-tracker-api/blob/develop/docs/deployment.md),
krok 1 (ten sam skrypt w Cloud Shell dopuszcza oba nowe repozytoria i daje prawa do Hostingu).

## 1. Firebase (w przeglądarce, jednorazowo)

1. **console.firebase.google.com** → projekt → **Build → Hosting → Get started** (przejdź kroki, wdrożenia robi GitHub).
   Adres aplikacji to `https://<project>.web.app`. Własna domena: Hosting → **Add custom domain** (np.
   `finanse.example.pl`), rekordy DNS z konsoli u rejestratora.
2. **Authentication → Settings → Authorized domains**: `<project>.web.app` jest tam od początku; dodaj tylko własną
   domenę, jeśli jest.
3. **Project settings → General → Your apps**: ta sama aplikacja web co w wersji 1 (pięć wartości `firebaseConfig`).
   `authDomain` ustaw na adres aplikacji na Hostingu (np. `<project>.web.app`), nie `<project>.firebaseapp.com`: wtedy
   pomocnik logowania Google działa na tej samej stronie.
4. **Google Cloud → APIs & Services → Credentials → OAuth 2.0 Client IDs → Web client**: dodaj (obecne wpisy zostają)
   _Authorized JavaScript origins_ `https://<project>.web.app` i _Authorized redirect URIs_
   `https://<project>.web.app/__/auth/handler`. Bez tego logowanie Google kończy się błędem `redirect_uri_mismatch`.
   Własna domena: to samo dla niej.
5. (Zalecane) **Google Cloud → APIs & Services → Credentials → Browser key** (klucz web Firebase) → **Application
   restrictions: Websites**: adres aplikacji, `localhost:5173` oraz `damtchorzewski.github.io` i
   `<project>.firebaseapp.com`. Z tego samego klucza korzysta wersja 1: bez dwóch ostatnich przestanie działać.
6. (Opcjonalnie) **Authentication → Templates → Email address verification → Customize action URL**:
   `https://<adres aplikacji>/login`. Link z maila potwierdza adres na stronie aplikacji. Ustawienie jest
   wspólne dla projektu: zmienia też linki w mailach wersji 1, więc zostaw je puste, dopóki wersja 1 działa.

## 2. GitHub

Repozytorium `finance-tracker`:

- **Settings → Secrets and variables → Actions → Variables** (zmienne repozytorium, czyta je build):
  `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`,
  `VITE_FIREBASE_MESSAGING_SENDER_ID` oraz `SITE_URL` (adres aplikacji, dla cotygodniowej kontroli). Wartości są w
  zmiennych repozytorium `personal-finance-manager` (oprócz `VITE_FIREBASE_AUTH_DOMAIN`, które zmienia się na adres
  Hostingu). Z GitHub CLI: `gh variable set VITE_FIREBASE_API_KEY -R DamTchorzewski/finance-tracker --body "<wartość>"`.
- **Settings → Environments → New environment** → `production` (_Deployment branches: Selected branches → `main`_),
  **Variables**: `GCP_PROJECT_ID`, `GCP_WORKLOAD_IDENTITY_PROVIDER`, `GCP_SERVICE_ACCOUNT` (wartości z końca skryptu w
  Cloud Shell) i `SITE_URL`.

Żadna z tych wartości nie jest sekretem.

## 3. Pierwsze wdrożenie

1. Najpierw API: wydanie `finance-tracker-api` (`develop` → `main`) wdraża usługę `finance-tracker-api`. Bez niej
   przekierowanie `/api/**` nie ma dokąd iść i Hosting odrzuci wdrożenie.
2. Potem aplikacja: wydanie `develop` → `main` albo Actions → **Build & Deploy** → _Run workflow_ na `main`.
3. Workflow kończy się `scripts/health-check.ts`: strony 200, nagłówki bezpieczeństwa, cache, `/api/health` i
   `/api/rates` przez Hosting.
4. Na stronie: demo, rejestracja e-mailem (link potwierdzający), logowanie e-mailem i Google, „Przenieś dane ze starej
   aplikacji Wallet” w ustawieniach. Prawdziwą rejestrację robi właściciel.

## Wycofanie

Firebase Hosting trzyma poprzednie wersje: konsola → Hosting → **Release history** → przy poprzedniej wersji
**Rollback** (natychmiast, bez budowania). Albo `git revert` na gałęzi roboczej i zwykłe wydanie.

## Koszty

Hosting w planie Blaze ma darmowe 10 GB miejsca i 360 MB transferu dziennie; aplikacja to ok. 2 MB z prekeszem.
Odpowiedzi `/api/rates` mają `s-maxage`, więc CDN Hostingu oddaje je bez budzenia Cloud Run. Alert budżetu z wersji 1
obejmuje cały projekt.
