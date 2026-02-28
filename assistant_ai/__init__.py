# -*- coding: utf-8 -*-
"""
Wirtualny Asystent AI - Moduł główny

Ten moduł dostarcza zmodularyzowaną architekturę wirtualnego asystenta AI
bazującego na Google Gemini, który pomaga użytkownikom zarządzać finansami
osobistymi poprzez analizę paragonów i wydatków.
"""

from .core import VirtualAssistant, AssistantManager
from .constants import LOG_ACTIONS

__all__ = ['VirtualAssistant', 'AssistantManager', 'LOG_ACTIONS']
