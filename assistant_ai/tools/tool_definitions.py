# -*- coding: utf-8 -*-
"""
Definicje narzędzi (tools) dla Wirtualnego Asystenta AI
"""

from ..constants import LOG_ACTIONS


def get_tools_definition():
    """
    Zwraca definicję narzędzi dla asystenta AI
    Używa funkcji aby móc dynamicznie wstawić LOG_ACTIONS
    """
    return [
        {
            "name": "get_expenses_by_date",
            "description": "Pobiera wydatki użytkownika z określonego przedziału czasowego. Użyj gdy użytkownik pyta o wydatki z konkretnego dnia, tygodnia, miesiąca lub okresu.",
            "parameters": {
                "type": "object",
                "properties": {
                    "start_date": {
                        "type": "string",
                        "description": "Data początkowa w formacie YYYY-MM-DD"
                    },
                    "end_date": {
                        "type": "string",
                        "description": "Data końcowa w formacie YYYY-MM-DD"
                    }
                },
                "required": ["start_date", "end_date"]
            }
        },
        {
            "name": "get_expenses_by_category",
            "description": "Pobiera wydatki użytkownika z określonej kategorii w danym okresie. Użyj gdy użytkownik pyta o wydatki na konkretne rzeczy (np. jedzenie, transport, ubrania).",
            "parameters": {
                "type": "object",
                "properties": {
                    "category": {
                        "type": "string",
                        "description": "Nazwa kategorii (np. 'Jedzenie', 'Transport', 'Alkohol')"
                    },
                    "start_date": {
                        "type": "string",
                        "description": "Data początkowa w formacie YYYY-MM-DD"
                    },
                    "end_date": {
                        "type": "string",
                        "description": "Data końcowa w formacie YYYY-MM-DD"
                    }
                },
                "required": ["category", "start_date", "end_date"]
            }
        },
        {
            "name": "get_expenses_by_store",
            "description": "Pobiera wydatki użytkownika w określonym sklepie/firmie w danym okresie.",
            "parameters": {
                "type": "object",
                "properties": {
                    "store_name": {
                        "type": "string",
                        "description": "Nazwa sklepu/firmy (np. 'Biedronka', 'Lidl', 'Kaufland')"
                    },
                    "start_date": {
                        "type": "string",
                        "description": "Data początkowa w formacie YYYY-MM-DD"
                    },
                    "end_date": {
                        "type": "string",
                        "description": "Data końcowa w formacie YYYY-MM-DD"
                    }
                },
                "required": ["store_name", "start_date", "end_date"]
            }
        },
        {
            "name": "get_spending_summary",
            "description": "Pobiera podsumowanie wydatków użytkownika (suma, średnia, ilość transakcji) dla określonego okresu.",
            "parameters": {
                "type": "object",
                "properties": {
                    "start_date": {
                        "type": "string",
                        "description": "Data początkowa w formacie YYYY-MM-DD"
                    },
                    "end_date": {
                        "type": "string",
                        "description": "Data końcowa w formacie YYYY-MM-DD"
                    },
                    "group_by": {
                        "type": "string",
                        "enum": ["day", "week", "month", "category", "store"],
                        "description": "Sposób grupowania danych"
                    }
                },
                "required": ["start_date", "end_date"]
            }
        },
        {
            "name": "get_product_history",
            "description": "Pobiera historię zakupów konkretnego produktu (ceny, miejsca zakupu, daty).",
            "parameters": {
                "type": "object",
                "properties": {
                    "product_name": {
                        "type": "string",
                        "description": "Nazwa produktu do wyszukania"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maksymalna liczba wyników (domyślnie 10)",
                        "default": 10
                    }
                },
                "required": ["product_name"]
            }
        },
        {
            "name": "get_budget_status",
            "description": "Pobiera status budżetu/limitów użytkownika dla kategorii.",
            "parameters": {
                "type": "object",
                "properties": {
                    "category": {
                        "type": "string",
                        "description": "Nazwa kategorii (opcjonalna, jeśli puste - zwraca wszystkie)"
                    }
                }
            }
        },
        {
            "name": "get_most_expensive_purchases",
            "description": "Pobiera najdroższe zakupy użytkownika w określonym okresie.",
            "parameters": {
                "type": "object",
                "properties": {
                    "start_date": {
                        "type": "string",
                        "description": "Data początkowa w formacie YYYY-MM-DD"
                    },
                    "end_date": {
                        "type": "string",
                        "description": "Data końcowa w formacie YYYY-MM-DD"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Liczba wyników (domyślnie 5)",
                        "default": 5
                    }
                },
                "required": ["start_date", "end_date"]
            }
        },
        {
            "name": "get_shopping_frequency",
            "description": "Pobiera częstotliwość zakupów w różnych sklepach w określonym okresie.",
            "parameters": {
                "type": "object",
                "properties": {
                    "start_date": {
                        "type": "string",
                        "description": "Data początkowa w formacie YYYY-MM-DD"
                    },
                    "end_date": {
                        "type": "string",
                        "description": "Data końcowa w formacie YYYY-MM-DD"
                    }
                },
                "required": ["start_date", "end_date"]
            }
        },
        {
            "name": "compare_periods",
            "description": "Porównuje wydatki między dwoma okresami czasu.",
            "parameters": {
                "type": "object",
                "properties": {
                    "period1_start": {
                        "type": "string",
                        "description": "Data początkowa pierwszego okresu (YYYY-MM-DD)"
                    },
                    "period1_end": {
                        "type": "string",
                        "description": "Data końcowa pierwszego okresu (YYYY-MM-DD)"
                    },
                    "period2_start": {
                        "type": "string",
                        "description": "Data początkowa drugiego okresu (YYYY-MM-DD)"
                    },
                    "period2_end": {
                        "type": "string",
                        "description": "Data końcowa drugiego okresu (YYYY-MM-DD)"
                    }
                },
                "required": ["period1_start", "period1_end", "period2_start", "period2_end"]
            }
        },
        {
            "name": "get_user_logs",
            "description": f"""Pobiera logi aktywności użytkownika z systemu. Użyj gdy użytkownik pyta o historię swoich działań, ostatnie operacje, zmiany w koncie lub aktywność w aplikacji.
            
Dostępne typy akcji do filtrowania:
{chr(10).join([f'- {key}: {desc}' for key, desc in LOG_ACTIONS.items()])}

Użytkownik może pytać naturalnie, np.:
- "Co ostatnio robiłem?" - pobierz ostatnie logi bez filtrowania
- "Kiedy się logowałem?" - filtruj po 'user_login'
- "Jakie paragony dodałem?" - filtruj po 'receipt_add'
- "Pokaż moje błędy" - filtruj po 'system_error'
            """,
            "parameters": {
                "type": "object",
                "properties": {
                    "start_date": {
                        "type": "string",
                        "description": "Data początkowa w formacie YYYY-MM-DD (opcjonalna)"
                    },
                    "end_date": {
                        "type": "string",
                        "description": "Data końcowa w formacie YYYY-MM-DD (opcjonalna)"
                    },
                    "action_type": {
                        "type": "string",
                        "description": f"Typ akcji do filtrowania. Przykłady: user_login, receipt_add, budget_update. Dostępne typy: {', '.join(list(LOG_ACTIONS.keys())[:10])}..."
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maksymalna liczba wyników (domyślnie 20)",
                        "default": 20
                    }
                }
            }
        },
        {
            "name": "manage_budget_limits",
            "description": """[CREATE/UPDATE/DELETE] Zarządza limitami budżetowymi użytkownika - PEŁNE UPRAWNIENIA CRUD.

**AKCJE:**
- action="add" → [CREATE] Dodaj nowy limit
- action="update" → [UPDATE] Zaktualizuj istniejący limit
- action="delete" → [DELETE] Usuń limit

**PRZYKŁADY UŻYCIA:**
✅ "Ustaw limit 300 PLN na Jedzenie" → action="add"
✅ "Zmień limit na Jedzenie na 400 PLN" → action="update"
✅ "Usuń limit na Transport" → action="delete"
❌ "Sprawdź limity" → użyj get_budget_status (READ)

Dostępne kategorie: Jedzenie, Napoje, Alkohol, Elektronika, Odzież, Transport, Dom, Sport, Rozrywka, itp.""",
            "parameters": {
                "type": "object",
                "properties": {
                    "action": {
                        "type": "string",
                        "enum": ["add", "update", "delete"],
                        "description": "Akcja: add (dodaj nowy), update (aktualizuj), delete (usuń)"
                    },
                    "category": {
                        "type": "string",
                        "description": "Nazwa kategorii (np. 'Jedzenie', 'Transport')"
                    },
                    "amount": {
                        "type": "number",
                        "description": "Kwota limitu w PLN (wymagana dla add/update)"
                    }
                },
                "required": ["action", "category"]
            }
        },
        {
            "name": "manage_shopping_list",
            "description": """[CREATE/READ/UPDATE/DELETE] Zarządza listami zakupów użytkownika - PEŁNE UPRAWNIENIA CRUD.

**AKCJE:**
- action="create_list" → [CREATE] Utwórz nową listę zakupów
- action="add_item" → [CREATE] Dodaj produkt do listy
- action="get_list" → [READ] Pobierz zawartość listy
- action="remove_item" → [DELETE] Usuń produkt z listy
- action="delete_list" → [DELETE] Usuń całą listę

**PRZYKŁADY UŻYCIA:**
✅ "Utwórz nową listę zakupów" → action="create_list"
✅ "Dodaj mleko do listy" → action="add_item", product_name="mleko"
✅ "Pokaż moją listę" → action="get_list"
✅ "Usuń chleb z listy" → action="remove_item", product_name="chleb"
✅ "Usuń całą listę" → action="delete_list"

Możesz interaktywnie pomagać w tworzeniu i zarządzaniu listą.""",
            "parameters": {
                "type": "object",
                "properties": {
                    "action": {
                        "type": "string",
                        "enum": ["create_list", "add_item", "remove_item", "get_list", "delete_list"],
                        "description": "Akcja do wykonania"
                    },
                    "list_id": {
                        "type": "integer",
                        "description": "ID listy (opcjonalne dla create_list)"
                    },
                    "product_name": {
                        "type": "string",
                        "description": "Nazwa produktu (dla add_item/remove_item)"
                    },
                    "quantity": {
                        "type": "integer",
                        "description": "Ilość produktu (dla add_item, domyślnie 1)",
                        "default": 1
                    }
                },
                "required": ["action"]
            }
        },
        {
            "name": "get_receipt_details",
            "description": """[READ ONLY] Pobiera szczegółowe informacje o konkretnym paragonie wraz z listą wszystkich produktów. 
            
⚠️ TYLKO ODCZYT! NIE możesz dodawać/edytować/usuwać paragonów przez tę funkcję.

Użyj gdy użytkownik:
- "Pokaż paragon nr X"
- "Jakie produkty były na paragonie X?"
- "Ile wydałem na paragonie X?"

NIE używaj gdy użytkownik chce:
- Dodać paragon (poleć skanowanie w aplikacji)
- Edytować paragon (poleć edycję w aplikacji)
- Usunąć paragon (poleć usunięcie w aplikacji)""",
            "parameters": {
                "type": "object",
                "properties": {
                    "receipt_id": {
                        "type": "integer",
                        "description": "ID paragonu"
                    }
                },
                "required": ["receipt_id"]
            }
        },
        {
            "name": "search_receipts",
            "description": """[READ ONLY] Wyszukuje paragony według różnych kryteriów: sklep, kwota, data, miasto.
            
⚠️ TYLKO WYSZUKIWANIE! Ta funkcja NIE modyfikuje paragonów.

Użyj gdy użytkownik:
- "Znajdź paragony z Biedronki"
- "Pokaż zakupy powyżej 100 PLN"
- "Jakie paragony mam z Warszawy?"

NIE używaj do modyfikacji paragonów!""",
            "parameters": {
                "type": "object",
                "properties": {
                    "store_name": {
                        "type": "string",
                        "description": "Nazwa sklepu (opcjonalna)"
                    },
                    "min_amount": {
                        "type": "number",
                        "description": "Minimalna kwota (opcjonalna)"
                    },
                    "max_amount": {
                        "type": "number",
                        "description": "Maksymalna kwota (opcjonalna)"
                    },
                    "start_date": {
                        "type": "string",
                        "description": "Data początkowa YYYY-MM-DD (opcjonalna)"
                    },
                    "end_date": {
                        "type": "string",
                        "description": "Data końcowa YYYY-MM-DD (opcjonalna)"
                    },
                    "city": {
                        "type": "string",
                        "description": "Miasto (opcjonalne)"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maksymalna liczba wyników (domyślnie 20)",
                        "default": 20
                    }
                }
            }
        },
        {
            "name": "get_recent_receipts",
            "description": "Pobiera ostatnie paragony użytkownika. Użyj gdy użytkownik pyta o ostatnie zakupy.",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {
                        "type": "integer",
                        "description": "Liczba paragonów do pobrania (domyślnie 10)",
                        "default": 10
                    }
                }
            }
        },
        {
            "name": "get_receipt_statistics",
            "description": "Pobiera ogólne statystyki wszystkich paragonów użytkownika (liczba, suma, średnia, min/max, itp.).",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        },
        {
            "name": "get_notifications",
            "description": "Pobiera powiadomienia użytkownika. Użyj gdy użytkownik pyta o powiadomienia lub alerty.",
            "parameters": {
                "type": "object",
                "properties": {
                    "unread_only": {
                        "type": "boolean",
                        "description": "Czy pokazać tylko nieprzeczytane (opcjonalne)",
                        "default": False
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maksymalna liczba wyników (domyślnie 20)",
                        "default": 20
                    }
                }
            }
        },
        {
            "name": "get_budget_alerts",
            "description": "Pobiera alerty budżetowe - kategorie które przekroczyły lub zbliżają się do limitu. Użyj gdy użytkownik pyta o przekroczenia limitów lub ostrzeżenia budżetowe.",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        },
        {
            "name": "get_product_nutrition",
            "description": "Pobiera informacje żywieniowe o produkcie (kalorie, białko, tłuszcze, cukry, alergeny). Użyj gdy użytkownik pyta o wartości odżywcze produktu.",
            "parameters": {
                "type": "object",
                "properties": {
                    "product_name": {
                        "type": "string",
                        "description": "Nazwa produktu"
                    }
                },
                "required": ["product_name"]
            }
        },
        {
            "name": "search_products_by_nutrition",
            "description": "Wyszukuje produkty według kryteriów żywieniowych (np. niska kaloryczność, wysokie białko, bez alergenów).",
            "parameters": {
                "type": "object",
                "properties": {
                    "max_calories": {
                        "type": "number",
                        "description": "Maksymalna liczba kalorii (opcjonalna)"
                    },
                    "max_sugar": {
                        "type": "number",
                        "description": "Maksymalna zawartość cukru (opcjonalna)"
                    },
                    "min_protein": {
                        "type": "number",
                        "description": "Minimalna zawartość białka (opcjonalna)"
                    },
                    "has_allergens": {
                        "type": "boolean",
                        "description": "False = tylko produkty bez alergenów (opcjonalne)"
                    }
                }
            }
        },
        {
            "name": "get_nutrition_summary",
            "description": "Pobiera podsumowanie wartości odżywczych zakupionych produktów w danym okresie.",
            "parameters": {
                "type": "object",
                "properties": {
                    "start_date": {
                        "type": "string",
                        "description": "Data początkowa YYYY-MM-DD (opcjonalna)"
                    },
                    "end_date": {
                        "type": "string",
                        "description": "Data końcowa YYYY-MM-DD (opcjonalna)"
                    }
                }
            }
        },
        {
            "name": "get_top_stores",
            "description": "Pobiera ranking sklepów według wydatków. Użyj gdy użytkownik pyta gdzie wydaje najwięcej lub które sklepy odwiedza najczęściej.",
            "parameters": {
                "type": "object",
                "properties": {
                    "start_date": {
                        "type": "string",
                        "description": "Data początkowa YYYY-MM-DD"
                    },
                    "end_date": {
                        "type": "string",
                        "description": "Data końcowa YYYY-MM-DD"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Liczba sklepów (domyślnie 10)",
                        "default": 10
                    }
                },
                "required": ["start_date", "end_date"]
            }
        },
        {
            "name": "get_category_breakdown",
            "description": "Pobiera szczegółowy rozkład wydatków po kategoriach z procentami. Użyj gdy użytkownik pyta na co wydaje najwięcej pieniędzy lub jaki jest podział wydatków.",
            "parameters": {
                "type": "object",
                "properties": {
                    "start_date": {
                        "type": "string",
                        "description": "Data początkowa YYYY-MM-DD"
                    },
                    "end_date": {
                        "type": "string",
                        "description": "Data końcowa YYYY-MM-DD"
                    }
                },
                "required": ["start_date", "end_date"]
            }
        },
        {
            "name": "get_monthly_trends",
            "description": "Pobiera trendy wydatków w ostatnich N miesiącach z analizą wzrostową/spadkową. Użyj gdy użytkownik pyta o trendy lub jak zmieniają się jego wydatki w czasie.",
            "parameters": {
                "type": "object",
                "properties": {
                    "months": {
                        "type": "integer",
                        "description": "Liczba miesięcy wstecz (domyślnie 6)",
                        "default": 6
                    }
                }
            }
        },
        {
            "name": "get_spending_patterns",
            "description": "Analizuje wzorce wydatków według dni tygodnia i pór dnia. Użyj gdy użytkownik pyta kiedy najczęściej robi zakupy lub jaki ma nawyk zakupowy.",
            "parameters": {
                "type": "object",
                "properties": {
                    "start_date": {
                        "type": "string",
                        "description": "Data początkowa YYYY-MM-DD"
                    },
                    "end_date": {
                        "type": "string",
                        "description": "Data końcowa YYYY-MM-DD"
                    }
                },
                "required": ["start_date", "end_date"]
            }
        }
    ]
