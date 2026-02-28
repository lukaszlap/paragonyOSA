<p align="center">
  <img src="https://img.shields.io/badge/python-3.10%2B-blue?logo=python&logoColor=white" alt="Python 3.10+">
  <img src="https://img.shields.io/badge/Flask-3.0-000?logo=flask" alt="Flask 3.0">
  <img src="https://img.shields.io/badge/Gemini_AI-OCR_%26_Assistant-4285F4?logo=googlegemini&logoColor=white" alt="Gemini AI">
  <img src="https://img.shields.io/badge/MariaDB%20%2F%20MySQL-003545?logo=mariadb&logoColor=white" alt="MariaDB">
</p>

# 🧾 ParagonyOSA

**Inteligentna aplikacja do śledzenia paragonów i wydatków** z rozpoznawaniem obrazów (OCR), analityką finansową i konwersacyjnym asystentem AI — wszystko w języku polskim.

> Zeskanuj paragon → AI wyciągnie dane → przeglądaj wydatki, budżety, raporty i rozmawiaj z asystentem w naturalnym języku.

---

## ✨ Funkcjonalności

| Moduł | Opis |
|-------|------|
| 📸 **Skanowanie paragonów** | Zdjęcie paragonu → Gemini AI rozpoznaje produkty, ceny, sklep, adres i podatki |
| 📊 **Dashboard** | Podsumowanie miesięcznych wydatków, wykresy kategorii, ostatnie paragony |
| 🏷️ **Automatyczna kategoryzacja** | AI przypisuje każdy produkt do jednej z 50 kategorii (Jedzenie, Napoje, Chemia…) |
| 💰 **Limity budżetowe** | Ustaw miesięczny budżet per kategoria — powiadomienia przy przekroczeniu |
| 📈 **Raporty i analizy** | Wydatki wg okresu, kategorii, sklepu — porównania miesięczne, trendy |
| 🛒 **Listy zakupów** | Tworzenie, edycja i zarządzanie listami zakupów |
| 🔍 **Wyszukiwanie** | Szukaj po sklepie, produkcie, mieście, kwocie |
| 🤖 **Asystent AI** | Chatbot z 25 narzędziami — analizuje wydatki, odpowiada na pytania, zarządza budżetem |
| 🔔 **Powiadomienia** | Alerty budżetowe i systemowe |
| 🥗 **Analiza żywieniowa** | Informacje o wartościach odżywczych zakupionych produktów |
| 📜 **Historia cen** | Śledź zmiany cen produktów w czasie |

---

## 🏗 Architektura

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (SPA)                        │
│           Vanilla JS · Jinja2 Templates · CSS           │
├─────────────┬──────────────┬────────────────────────────┤
│  Auth       │  API         │  Assistant                  │
│  Blueprint  │  Blueprint   │  Blueprint                  │
│  (JWT)      │  (REST)      │  (AI Chat)                  │
├─────────────┴──────────────┴────────────────────────────┤
│              Flask Application (main.py)                 │
├──────────────────┬──────────────────────────────────────┤
│  DatabaseHelper  │  Ekstrakcja (OCR)                     │
│  (SQLAlchemy)    │  Gemini AI · PIL                      │
├──────────────────┼──────────────────────────────────────┤
│  MariaDB/MySQL   │  assistant_ai/                        │
│  12 tabel        │  VirtualAssistant · RAG · 7 tools     │
└──────────────────┴──────────────────────────────────────┘
```

### Kluczowe warstwy

- **`main.py`** — Flask SPA: landing page + app UI z catch-all routingiem
- **`routes/auth.py`** — rejestracja, logowanie, JWT, zarządzanie kluczami API
- **`routes/api.py`** — 30+ endpointów REST (paragony, produkty, limity, raporty…)
- **`routes/assistant.py`** — chat AI, historia, czyszczenie sesji
- **`ekstrakcja.py`** — pipeline OCR: obraz → kompresja → Gemini → parsowanie JSON → zapis do DB
- **`assistant_ai/`** — modularny asystent: `core.py` (Gemini + function calling), RAG (ChromaDB), 7 klas narzędzi
- **`db.py`** — `DatabaseHelper` z named parameters (`:param`), connection pooling

---

## 🚀 Szybki start

### Wymagania

- Python 3.10+
- MariaDB 10.4+ lub MySQL 8.0+
- Klucz API [Google Gemini](https://aistudio.google.com/)

### 1. Sklonuj repozytorium

```bash
git clone https://github.com/lukaszlap/paragonyOSA.git
cd paragonyOSA
```

### 2. Utwórz środowisko wirtualne

```bash
python -m venv .venv

# Windows
.\.venv\Scripts\activate

# Linux / macOS
source .venv/bin/activate
```

### 3. Zainstaluj zależności

```bash
pip install -r requriements.txt
```

### 4. Skonfiguruj zmienne środowiskowe

```bash
cp .env.example .env
```

Uzupełnij plik `.env`:

```env
SECRET_KEY=<wygeneruj: python -c "import secrets; print(secrets.token_hex(32))">
JWT_SECRET_KEY=<wygeneruj: python -c "import secrets; print(secrets.token_hex(32))">

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=twoje_haslo
DB_NAME=paragony

GEMINI_API_KEY=twoj_klucz_gemini
```

### 5. Utwórz bazę danych

```sql
mysql -u root -p < BazaDanychMariaDB.sql
```

### 6. (Opcjonalnie) Zbuduj bazę wiedzy RAG

```bash
pip install sentence-transformers chromadb langchain-text-splitters
python build_rag_database.py
```

### 7. Uruchom serwer

```bash
python main.py
```

Aplikacja dostępna pod: **http://localhost:5000**

---

## 📁 Struktura projektu

```
paragonyOSA/
├── main.py                  # Punkt wejścia Flask + routing SPA
├── config.py                # Konfiguracja (env vars)
├── db.py                    # DatabaseHelper (SQLAlchemy)
├── api.py                   # Logika biznesowa (klasa Api)
├── ekstrakcja.py            # OCR pipeline (Gemini AI + PIL)
├── BazaDanychMariaDB.sql    # Schemat bazy danych (12 tabel)
│
├── routes/
│   ├── auth.py              # Autentykacja (JWT, bcrypt)
│   ├── api.py               # Endpointy REST
│   └── assistant.py         # Chat AI endpointy
│
├── assistant_ai/
│   ├── core.py              # VirtualAssistant (Gemini + function calling)
│   ├── intent_analyzer.py   # Analiza intencji użytkownika
│   ├── rag_knowledge.py     # RAG z ChromaDB
│   ├── prompts/
│   │   └── system_prompt.py # System prompt asystenta
│   └── tools/
│       ├── expense_tools.py         # Analiza wydatków
│       ├── budget_tools.py          # Zarządzanie budżetami
│       ├── receipt_tools.py         # Operacje na paragonach
│       ├── shopping_list_tools.py   # Listy zakupów
│       ├── notification_tools.py    # Powiadomienia
│       ├── product_nutrition_tools.py # Wartości odżywcze
│       ├── user_logs_tools.py       # Logi aktywności
│       └── tool_definitions.py      # Definicje 25 narzędzi Gemini
│
├── templates/               # Jinja2 (26 szablonów, 14 folderów)
│   ├── index.html           # SPA shell
│   ├── main.html            # Landing page
│   └── ...                  # auth/, dashboard/, receipts/, assistant/...
│
├── static/
│   ├── css/                 # Style (app/, main/)
│   └── js/                  # Vanilla JS (15 modułów)
│
├── docs/                    # 22 pliki dokumentacji (PL)
├── .env.example             # Szablon zmiennych środowiskowych
└── .gitignore
```

---

## 🗄 Baza danych

12 tabel MariaDB/MySQL:

| Tabela | Opis |
|--------|------|
| `uzytkownicy` | Użytkownicy (email, hasło bcrypt, klucz API, status) |
| `paragony` | Paragony (data, suma, binarny obraz JPEG, sklep, miasto) |
| `produkty` | Produkty z paragonów (nazwa, cena, ilość, kategoria) |
| `firmy` | Sklepy / firmy (Biedronka, Lidl, Żabka…) |
| `miasta` | Miasta z kodami pocztowymi |
| `kategorie` | 50 kategorii produktów |
| `kody_ean` | Kody kreskowe EAN |
| `limity` | Limity budżetowe per kategoria/użytkownik |
| `powiadomienia` | Powiadomienia systemowe |
| `lista` | Nagłówki list zakupów |
| `listy` | Pozycje list zakupów |
| `logi` | Logi aktywności (audit trail) |

---

## 🤖 Asystent AI

Konwersacyjny asystent z **25 narzędziami** opartymi na Gemini function calling:

**Przykładowe pytania:**
- *„Ile wydałem w tym miesiącu?"*
- *„Pokaż wydatki w Biedronce za ostatnie 3 miesiące"*
- *„Porównaj moje wydatki z stycznia i lutego"*
- *„Jakie mam limity budżetowe i czy je przekroczyłem?"*
- *„Stwórz listę zakupów na weekend"*
- *„Pokaż wartości odżywcze moich ostatnich zakupów"*

**Architektura asystenta:**
- **Gemini AI** — generowanie odpowiedzi + function calling
- **RAG** (ChromaDB + polskie embeddingi) — przeszukiwanie dokumentacji
- **IntentAnalyzer** — rozpoznawanie intencji + ekstrakcja parametrów
- **7 klas narzędzi** — ExpenseTools, BudgetTools, ReceiptTools, ShoppingListTools, NotificationTools, ProductNutritionTools, UserLogsTools

---

## 🔒 Bezpieczeństwo

- **JWT** — tokeny dostępu z konfigurowalnymwygasaniem (domyślnie 24h)
- **bcrypt** — hashowanie haseł (salt rounds)
- **Walidacja hasła** — min. 8 znaków, wielka/mała litera, cyfra, znak specjalny
- **Named parameters** — `:param` bindings zapobiegają SQL injection
- **CORS** — konfigurowalny per-origin (domyślnie `*` w dev)
- **Zmienne środowiskowe** — sekrety wyłącznie z `.env` (nigdy w kodzie)

---

## 📡 API — główne endpointy

Wszystkie chronione JWT — nagłówek: `Authorization: Bearer <token>`

| Metoda | Endpoint | Opis |
|--------|----------|------|
| `POST` | `/register` | Rejestracja użytkownika |
| `POST` | `/login` | Logowanie → zwraca JWT |
| `POST` | `/logout` | Wylogowanie (revoke token) |
| `POST` | `/addKey` | Dodaj klucz Gemini API |
| `GET` | `/paragony?page=0&size=7` | Lista paragonów (paginacja) |
| `GET` | `/paragon/<id>` | Szczegóły paragonu |
| `POST` | `/analyze-receipt` | Skanuj paragon (base64 image) |
| `GET` | `/produktyDlaParagonu/<id>` | Produkty z paragonu |
| `GET/POST` | `/limit` | Limity budżetowe |
| `GET` | `/raport` | Raporty wydatków |
| `POST` | `/assistant/chat` | Chat z asystentem AI |
| `GET` | `/assistant/history` | Historia rozmów |
| `POST` | `/assistant/clear` | Wyczyść sesję asystenta |

---

## 🛠 Rozwój

### Dodawanie nowego endpointu API

1. Dodaj route w `routes/api.py` z `@jwt_required()`
2. Zaimplementuj logikę w `api.py` (klasa `Api`, metoda statyczna)
3. Użyj `DatabaseHelper.fetch_all/fetch_one/execute` do DB
4. Dodaj nazwę endpointu do listy `api_endpoints` w `main.py`

### Dodawanie narzędzia asystenta

1. Utwórz klasę w `assistant_ai/tools/`
2. Dodaj definicję w `tools/tool_definitions.py`
3. Zainicjalizuj w `core.VirtualAssistant.__init__`
4. Zmapuj nazwę funkcji w `core._execute_function`

---

## 📄 Dokumentacja

W folderze `docs/` znajdziesz 22 pliki dokumentacji (po polsku):

- **Przewodniki użytkownika** — logowanie, dashboard, skanowanie, produkty, limity
- **Dokumentacja techniczna** — architektura, baza danych, API, bezpieczeństwo
- **Asystent AI** — architektura, QuickStart, ulepszenia
- **Funkcjonalności** — edycja paragonów, historia cen, analiza żywieniowa, sezonowość

---

## 🧰 Tech Stack

| Warstwa | Technologia |
|---------|-------------|
| Backend | Python 3.10+, Flask 3.0, SQLAlchemy, PyMySQL |
| AI / OCR | Google Gemini API, PIL/Pillow |
| Asystent | Gemini function calling, ChromaDB, RAG |
| Baza danych | MariaDB 10.4+ / MySQL 8.0+ |
| Auth | Flask-JWT-Extended, bcrypt |
| Frontend | Vanilla JS (SPA), Jinja2, CSS, Font Awesome |

---

## 👥 Autorzy

Projekt stworzony na potrzeby zarządzania wydatkami domowymi.

---

## 📜 Licencja

Projekt prywatny.
