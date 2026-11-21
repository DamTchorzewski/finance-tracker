# Decyzje

Decyzje techniczne wersji 2 z powodem i datą. Plan całości: [redesign-plan.md](redesign-plan.md).

## 2026-11-21: nowe repozytoria zamiast wersji 2.0.0 w starych

Właściciel wybrał wersję 2 w nowych repozytoriach (`finance-tracker`, `finance-tracker-api`), skopiowanych z historią
z `personal-finance-manager` i `-api`. Stare zostają bez zmian jako projekt zespołowy (działają na Pages i Cloud Run).
Licencja MIT zostaje z wpisem zespołu, a autor wersji 2 jest dopisany drugą linią.

## 2026-11-21: Firebase Hosting zamiast GitHub Pages

Nagłówki bezpieczeństwa (CSP, HSTS, X-Frame-Options, Permissions-Policy) są wymagane przez `standards/security.md`, a
GitHub Pages ich nie wysyła. Firebase Hosting w tym samym projekcie przekazuje też `/api/**` do Cloud Run (jeden adres,
bez CORS) i trzyma pomocnika logowania Firebase na tej samej domenie, więc logowanie Google działa mimo blokowania danych
stron trzecich w przeglądarkach. `Cross-Origin-Opener-Policy` to `same-origin-allow-popups`, bo okno logowania Google
musi móc odpisać stronie (pełne `same-origin` je psuje).

## 2026-11-21: własne i18n zamiast Paraglide

Plan wymieniał Paraglide JS. Wszystkie teksty są w jednym pliku (`src/i18n/messages.ts`), angielski ma typ polskiego,
więc brak tłumaczenia wyłapuje `typecheck`; liczba mnoga przez `Intl.PluralRules`. To kilkadziesiąt linii bez
kompilatora i bez wtyczki do Vite, a spełnia ten sam wymóg standardu (teksty w jednym miejscu, brak cichego fallbacku).

## 2026-11-21: typy z OpenAPI (openapi-typescript) zamiast klienta z orval

Plan wymieniał orval. Aplikacja ma dwa źródła danych o tym samym interfejsie (API i demo w przeglądarce), więc hooki
generowane pod jedno API nie pasują. Typy z `openapi.json` (`pnpm api:types`) dają tę samą ochronę: zmiana pola w API
kończy się błędem `typecheck` tutaj.

## 2026-11-21: bez biblioteki Motion

Plan wymieniał Motion. Wszystkie animacje (wejście ekranów, panele, paski budżetów, licznik kwot) to CSS i jedno
`requestAnimationFrame`, więc Motion nie dawał niczego poza wagą pierwszego ładowania. Gdy pojawi się animacja, której
CSS nie uniesie (np. słoik celu z czatu projektowego), wróci jako import na żądanie.

## 2026-11-21: ciężki kod na żądanie

Firebase Auth (45 kB gzip) ładuje się dopiero przy logowaniu, Recharts (108 kB) dopiero z wykresem, paleta poleceń i
formularz transakcji przy pierwszym otwarciu. Pierwsze ładowanie to ok. 150 kB gzip JS (React, router, cache zapytań,
Radix Dialog). Parametry adresu sprawdza ręczny walidator zamiast Zod, żeby schemat nie trafiał do pierwszego ładowania.

## 2026-11-21: PWA i dane offline

Aplikacja (nie strona klienta) potrzebuje działania bez sieci, więc wyjątek od zasady „bez service workera” ze
`standards/performance.md`: Workbox z prekeszem plików, kursy NBP jako stale-while-revalidate, ostatnie odpowiedzi API w
IndexedDB (7 dni). Nowa wersja nie podmienia się sama: pyta „Jest nowa wersja aplikacji” i odświeża po zgodzie.
Dane demo nie są zapisywane do IndexedDB, bo i tak żyją w localStorage.

## 2026-11-21: kwoty w groszach i kurs z dnia transakcji

Kwoty to liczby całkowite w jednostkach podstawowych z kodem ISO 4217 (jak w API). Wartość w PLN po kursie NBP z dnia
transakcji jest zapisywana raz, więc raport z marca nie zmienia się, gdy zmieniają się kursy; raport w innej walucie
głównej przelicza tę wartość po dzisiejszym kursie.
