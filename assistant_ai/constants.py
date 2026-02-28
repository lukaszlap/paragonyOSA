# -*- coding: utf-8 -*-
"""
Stałe i definicje dla Wirtualnego Asystenta AI
"""

# Definicja typów akcji dostępnych w systemie logowania
LOG_ACTIONS = {
    'user_login': 'Logowanie użytkownika do systemu',
    'user_logout': 'Wylogowanie użytkownika',
    'user_register': 'Rejestracja nowego użytkownika',
    'receipt_add': 'Dodanie nowego paragonu',
    'receipt_edit': 'Edycja paragonu',
    'receipt_delete': 'Usunięcie paragonu',
    'receipt_view': 'Wyświetlenie szczegółów paragonu',
    'receipt_search': 'Wyszukiwanie paragonów',
    'product_add': 'Dodanie produktu do paragonu',
    'product_edit': 'Edycja produktu',
    'product_delete': 'Usunięcie produktu',
    'product_nutrition_view': 'Wyświetlenie wartości odżywczych produktu',
    'budget_create': 'Utworzenie nowego limitu budżetowego',
    'budget_update': 'Aktualizacja limitu budżetowego',
    'budget_delete': 'Usunięcie limitu budżetowego',
    'budget_alert': 'Alert przekroczenia limitu budżetowego',
    'list_create': 'Utworzenie listy zakupów',
    'list_update': 'Aktualizacja listy zakupów',
    'list_delete': 'Usunięcie listy zakupów',
    'profile_update': 'Aktualizacja profilu użytkownika',
    'password_change': 'Zmiana hasła',
    'api_key_generate': 'Wygenerowanie klucza API',
    'premium_activate': 'Aktywacja konta premium',
    'premium_deactivate': 'Dezaktywacja konta premium',
    'notification_create': 'Utworzenie powiadomienia',
    'notification_read': 'Odczytanie powiadomienia',
    'notification_view': 'Wyświetlenie powiadomień',
    'export_data': 'Eksport danych użytkownika',
    'import_data': 'Import danych',
    'assistant_query': 'Zapytanie do asystenta AI',
    'assistant_clear_history': 'Wyczyszczenie historii rozmowy z asystentem',
    'analysis_expenses': 'Analiza wydatków użytkownika',
    'analysis_trends': 'Analiza trendów wydatków',
    'analysis_patterns': 'Analiza wzorców zakupowych',
    'system_error': 'Błąd systemowy',
    'security_alert': 'Alert bezpieczeństwa'
}

# Konfiguracja modelu Gemini
GEMINI_MODEL_NAME = 'gemini-2.5-flash-lite'
GEMINI_GENERATION_CONFIG = {
    "temperature": 0.7,
    "top_p": 0.95,
    "top_k": 40,
    "max_output_tokens": 2048,
}
