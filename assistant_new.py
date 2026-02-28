# -*- coding: utf-8 -*-
"""
DEPRECATED: Ten plik jest zachowany dla kompatybilności wstecznej.
Proszę używać: from assistant_ai import VirtualAssistant, AssistantManager

Nowa architektura znajduje się w katalogu assistant_ai/:
- assistant_ai/core.py - główna logika asystenta
- assistant_ai/constants.py - stałe i konfiguracja
- assistant_ai/intent_analyzer.py - analiza intencji
- assistant_ai/tools/ - narzędzia (wydatki, budżet, listy, logi)
- assistant_ai/prompts/ - prompty systemowe
"""

# Import dla kompatybilności wstecznej
from assistant_ai import VirtualAssistant, AssistantManager, LOG_ACTIONS

__all__ = ['VirtualAssistant', 'AssistantManager', 'LOG_ACTIONS']

# Uwaga o przestarzałości
import warnings
warnings.warn(
    "Moduł 'assistant' jest przestarzały. Używaj 'assistant_ai' zamiast tego.",
    DeprecationWarning,
    stacklevel=2
)
