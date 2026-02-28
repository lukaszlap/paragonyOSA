# Wirtualny Asystent AI - Architektura Modułowa

## Przegląd

Ten katalog zawiera zmodularyzowaną implementację wirtualnego asystenta AI bazującego na Google Gemini, który pomaga użytkownikom zarządzać finansami osobistymi poprzez analizę paragonów i wydatków.

## Struktura Katalogów

```
assistant_ai/
├── __init__.py                 # Główny interface modułu
├── core.py                     # VirtualAssistant i AssistantManager
├── constants.py                # Stałe i konfiguracja
├── intent_analyzer.py          # Analiza intencji użytkownika
├── rag_knowledge.py            # 📚 RAG - Baza wiedzy z dokumentacji
├── chroma_db/                  # 💾 Baza wektorowa ChromaDB (generowana)
├── RAG_GUIDE.md                # 📖 Pełna dokumentacja systemu RAG
├── tools/                      # Narzędzia asystenta
│   ├── __init__.py
│   ├── tool_definitions.py     # Definicje narzędzi dla AI
│   ├── expense_tools.py        # Funkcje analizy wydatków
│   ├── budget_tools.py         # Funkcje zarządzania budżetem
│   ├── shopping_list_tools.py  # Funkcje list zakupów
│   └── user_logs_tools.py      # Funkcje logów użytkownika
└── prompts/                    # Prompty systemowe
    ├── __init__.py
    └── system_prompt.py        # Prompt systemowy dla AI
```

## Moduły

### `core.py`
Główna logika asystenta:
- **VirtualAssistant**: Klasa główna zarządzająca konwersacją i wywołaniami narzędzi
- **AssistantManager**: Singleton zarządzający sesjami użytkowników

### `constants.py`
Stałe używane w całym module:
- `LOG_ACTIONS`: Typy akcji dostępne w systemie logowania
- `GEMINI_MODEL_NAME`: Nazwa modelu Gemini
- `GEMINI_GENERATION_CONFIG`: Konfiguracja generowania odpowiedzi

### `intent_analyzer.py`
Analizator intencji użytkownika:
- **IntentAnalyzer**: Klasa analizująca zapytania użytkownika i wydobywająca parametry

### `rag_knowledge.py` 📚
**System RAG (Retrieval-Augmented Generation)**:
- **RAGKnowledgeBase**: Wyszukiwanie semantyczne w dokumentacji
- Automatycznie dodaje kontekst z bazy wiedzy do pytań o system
- Używa modelu `sdadas/mmlw-retrieval-roberta-large` (polski)
- **Zobacz [RAG_GUIDE.md](RAG_GUIDE.md) dla pełnej dokumentacji**

**Szybki start RAG:**
```bash
# 1. Zainstaluj zależności
pip install sentence-transformers chromadb langchain-text-splitters

# 2. Zbuduj bazę wiedzy (z folderu backend/)
python build_rag_database.py

# 3. Gotowe! System automatycznie użyje bazy
```

### `tools/`
Katalog z narzędziami asystenta podzielonymi na kategorie:

#### `expense_tools.py` - ExpenseTools
Funkcje analizy wydatków:
- `get_expenses_by_date()` - wydatki z okresu
- `get_expenses_by_category()` - wydatki z kategorii
- `get_expenses_by_store()` - wydatki w sklepie
- `get_spending_summary()` - podsumowanie wydatków
- `get_product_history()` - historia zakupów produktu
- `get_most_expensive_purchases()` - najdroższe zakupy
- `get_shopping_frequency()` - częstotliwość zakupów
- `compare_periods()` - porównanie okresów

#### `budget_tools.py` - BudgetTools
Funkcje zarządzania budżetem:
- `get_budget_status()` - status budżetu/limitów
- `manage_budget_limits()` - zarządzanie limitami (add/update/delete)

#### `shopping_list_tools.py` - ShoppingListTools
Funkcje list zakupów:
- `manage_shopping_list()` - zarządzanie listami (create/add/remove/get/delete)

#### `user_logs_tools.py` - UserLogsTools
Funkcje logów użytkownika:
- `get_user_logs()` - pobieranie logów aktywności

### `prompts/`
Katalog z promptami systemowymi:

#### `system_prompt.py`
- `get_system_prompt()` - generuje prompt systemowy dla asystenta

## Użycie

### Podstawowe użycie

```python
from assistant_ai import VirtualAssistant, AssistantManager

# Pobranie lub utworzenie sesji asystenta
assistant = AssistantManager.get_or_create_assistant(
    user_id=123,
    api_key="YOUR_GEMINI_API_KEY"
)

# Wysłanie wiadomości
response = assistant.process_message("Ile wydałem dzisiaj?")
print(response['response'])
```

### Zarządzanie sesjami

```python
from assistant_ai import AssistantManager

# Reset rozmowy (zachowuje sesję)
AssistantManager.reset_conversation(user_id=123)

# Usunięcie sesji
AssistantManager.clear_session(user_id=123)
```

### Bezpośrednie użycie narzędzi

```python
from assistant_ai.tools import ExpenseTools, BudgetTools

# Analiza wydatków
expense_tools = ExpenseTools(user_id=123)
expenses = expense_tools.get_expenses_by_date(
    start_date="2025-01-01",
    end_date="2025-01-31"
)

# Zarządzanie budżetem
budget_tools = BudgetTools(user_id=123)
result = budget_tools.manage_budget_limits(
    action="add",
    category="Jedzenie",
    amount=300.0
)
```

## Migracja ze starego kodu

Stary import:
```python
from assistant import VirtualAssistant, AssistantManager
```

Nowy import:
```python
from assistant_ai import VirtualAssistant, AssistantManager
```

API pozostaje bez zmian - wszystkie metody działają tak samo.

## Zalety nowej architektury

1. **Modularność**: Każda funkcjonalność w osobnym pliku
2. **Czytelność**: Kod podzielony na logiczne sekcje (~300 linii na plik zamiast 1769)
3. **Testowalność**: Łatwiejsze testowanie poszczególnych komponentów
4. **Rozszerzalność**: Łatwe dodawanie nowych narzędzi
5. **Separacja odpowiedzialności**: Każda klasa ma jasno określone zadanie

## Rozwój

### Dodawanie nowego narzędzia

1. Utwórz klasę narzędzia w `tools/new_tool.py`:
```python
class NewTool:
    def __init__(self, user_id: int):
        self.user_id = user_id
    
    def do_something(self, param: str) -> Dict:
        # Implementacja
        pass
```

2. Dodaj definicję w `tools/tool_definitions.py`:
```python
{
    "name": "new_function",
    "description": "Opis funkcji",
    "parameters": {...}
}
```

3. Zainicjalizuj w `core.py`:
```python
self.new_tool = NewTool(user_id)
```

4. Dodaj mapowanie w `_execute_function`:
```python
'new_function': self.new_tool.do_something
```

## Wymagania

- Python 3.8+
- google-generativeai
- flask
- flask-jwt-extended
- Własny moduł `db` (DatabaseHelper)

## Licencja

Zgodnie z licencją projektu ParagonyV2.
