# -*- coding: utf-8 -*-
"""
Moduł RAG - Retrieval-Augmented Generation
===========================================

Ten moduł zapewnia dostęp do bazy wiedzy z dokumentacji podczas runtime.
Używany przez VirtualAssistant do wzbogacenia kontekstu o informacje z dokumentacji.

Funkcjonalność:
- Wyszukiwanie semantyczne w bazie wiedzy
- Zwracanie najbardziej relevantnych fragmentów dokumentacji
- Optymalizacja pod kątem polskiego języka
"""

from pathlib import Path
from typing import List, Dict, Optional, Any
import chromadb  # type: ignore
from sentence_transformers import SentenceTransformer  # type: ignore


class RAGKnowledgeBase:
    """
    Klasa do wyszukiwania w bazie wiedzy RAG
    
    Używa ChromaDB i sentence-transformers do semantycznego wyszukiwania
    w dokumentacji systemu.
    """
    
    # Model embedingowy - ten sam co użyty do budowy bazy
    EMBEDDING_MODEL = "sdadas/mmlw-retrieval-roberta-large"
    
    # Nazwa kolekcji w ChromaDB
    COLLECTION_NAME = "knowledge_base"
    
    def __init__(self, db_path: Optional[str] = None):
        """
        Inicjalizacja bazy wiedzy RAG
        
        Args:
            db_path: Ścieżka do folderu z bazą ChromaDB (opcjonalne)
                    Jeśli None, użyje domyślnej lokalizacji
        """
        self.initialized = False
        self.embedding_model = None
        self.collection = None
        
        # Ustal ścieżkę do bazy
        if db_path is None:
            current_dir = Path(__file__).parent
            db_path = current_dir / "chroma_db"
        else:
            db_path = Path(db_path)
        
        self.db_path = db_path
        
        # Sprawdź czy baza istnieje
        if not self.db_path.exists():
            print(f"⚠️  Baza wiedzy RAG nie istnieje: {self.db_path}")
            print("💡 Uruchom: python build_rag_database.py aby ją utworzyć")
            return
        
        try:
            self._initialize()
        except Exception as e:
            print(f"⚠️  Błąd inicjalizacji bazy wiedzy RAG: {e}")
            print("💡 System będzie działać bez bazy wiedzy")
    
    def _initialize(self):
        """Inicjalizuje model i połączenie z bazą"""
        # Załaduj model embedingowy
        self.embedding_model = SentenceTransformer(self.EMBEDDING_MODEL)
        
        # Połącz z ChromaDB
        self.client = chromadb.PersistentClient(path=str(self.db_path))
        
        # Załaduj kolekcję
        try:
            self.collection = self.client.get_collection(self.COLLECTION_NAME)
            self.initialized = True
            print(f"✅ Baza wiedzy RAG załadowana: {self.collection.count()} dokumentów")
        except Exception as e:
            raise Exception(f"Nie można załadować kolekcji '{self.COLLECTION_NAME}': {e}")
    
    def is_available(self) -> bool:
        """
        Sprawdza czy baza wiedzy jest dostępna
        
        Returns:
            True jeśli baza jest zainicjalizowana i gotowa
        """
        return self.initialized
    
    def search(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """
        Wyszukuje najbardziej relevantne fragmenty dokumentacji
        
        Args:
            query: Zapytanie użytkownika (w języku naturalnym)
            top_k: Liczba wyników do zwrócenia (domyślnie 3)
            
        Returns:
            Lista słowników z wynikami:
            [
                {
                    'text': 'Treść fragmentu dokumentacji',
                    'filename': 'nazwa_pliku.md',
                    'chunk_index': 0,
                    'distance': 0.234  # im mniejsza tym lepsze dopasowanie
                },
                ...
            ]
        """
        if not self.initialized:
            return []
        
        try:
            # Wygeneruj embedding dla zapytania
            query_embedding = self.embedding_model.encode([query])[0].tolist()
            
            # Wyszukaj w bazie
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=top_k,
                include=['documents', 'metadatas', 'distances']
            )
            
            # Formatuj wyniki
            formatted_results = []
            if results['documents'] and len(results['documents'][0]) > 0:
                for i in range(len(results['documents'][0])):
                    formatted_results.append({
                        'text': results['documents'][0][i],
                        'filename': results['metadatas'][0][i]['filename'],
                        'chunk_index': results['metadatas'][0][i]['chunk_index'],
                        'source_path': results['metadatas'][0][i]['source_path'],
                        'distance': results['distances'][0][i]
                    })
            
            return formatted_results
            
        except Exception as e:
            print(f"⚠️  Błąd wyszukiwania w bazie RAG: {e}")
            return []
    
    def get_context_for_query(self, query: str, max_tokens: int = 2000) -> str:
        """
        Zwraca sformatowany kontekst z bazy wiedzy dla danego zapytania
        
        Args:
            query: Zapytanie użytkownika
            max_tokens: Maksymalna długość kontekstu (w przybliżeniu znaki/4)
            
        Returns:
            Sformatowany string z kontekstem do dodania do prompta
        """
        if not self.initialized:
            return ""
        
        results = self.search(query, top_k=3)
        
        if not results:
            return ""
        
        # Buduj kontekst z wyników
        context_parts = ["=== KONTEKST Z BAZY WIEDZY ===\n"]
        current_length = len(context_parts[0])
        
        for i, result in enumerate(results, 1):
            # Formatuj fragment
            fragment = f"\n📄 Źródło: {result['filename']}\n"
            fragment += f"{result['text']}\n"
            fragment += "-" * 50 + "\n"
            
            # Sprawdź czy nie przekroczymy limitu
            if current_length + len(fragment) > max_tokens * 4:
                break
            
            context_parts.append(fragment)
            current_length += len(fragment)
        
        context_parts.append("\n=== KONIEC KONTEKSTU ===\n")
        
        return "".join(context_parts)
    
    def search_specific_topic(self, topic: str) -> List[Dict[str, Any]]:
        """
        Wyszukuje fragmenty dotyczące konkretnego tematu
        
        Args:
            topic: Temat do wyszukania (np. "architektura", "API", "narzędzia")
            
        Returns:
            Lista wyników jak w metodzie search()
        """
        # Rozszerz zapytanie dla lepszych wyników
        expanded_query = f"Dokumentacja techniczna: {topic}. Opis i wyjaśnienie."
        return self.search(expanded_query, top_k=5)
    
    def get_statistics(self) -> Dict[str, Any]:
        """
        Zwraca statystyki bazy wiedzy
        
        Returns:
            Słownik ze statystykami
        """
        if not self.initialized:
            return {
                'available': False,
                'error': 'Baza nie została zainicjalizowana'
            }
        
        return {
            'available': True,
            'total_chunks': self.collection.count(),
            'collection_name': self.COLLECTION_NAME,
            'embedding_model': self.EMBEDDING_MODEL,
            'db_path': str(self.db_path)
        }


# Singleton instance - może być używana globalnie
_global_rag_instance: Optional[RAGKnowledgeBase] = None


def get_rag_knowledge_base() -> RAGKnowledgeBase:
    """
    Zwraca globalną instancję bazy wiedzy RAG (singleton)
    
    Returns:
        RAGKnowledgeBase instance
    """
    global _global_rag_instance
    
    if _global_rag_instance is None:
        _global_rag_instance = RAGKnowledgeBase()
    
    return _global_rag_instance


def reset_rag_knowledge_base():
    """Resetuje globalną instancję (przydatne przy testach)"""
    global _global_rag_instance
    _global_rag_instance = None
