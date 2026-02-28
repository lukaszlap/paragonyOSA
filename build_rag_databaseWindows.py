# -*- coding: utf-8 -*-
"""
Skrypt do budowy bazy wiedzy RAG z dokumentacji
===================================================

Ten skrypt NIE jest częścią głównego systemu.
Służy tylko do jednorazowego utworzenia bazy wektorowej z dokumentacji.

Użycie:
-------
1. Upewnij się że masz zainstalowane zależności:
   pip install sentence-transformers chromadb langchain-text-splitters

2. Uruchom skrypt:
   python build_rag_database.py

3. Skrypt utworzy plik 'knowledge_base.db' w folderze backend/assistant_ai/

Model embedingowy:
------------------
Używamy 'sdadas/mmlw-retrieval-roberta-large' - najlepszy model dla polskiego języka
w zadaniach retrieval, stworzony przez polskiego naukowca.

Alternatywy:
- sdadas/polish-sentence-transformer
- sentence-transformers/paraphrase-multilingual-mpnet-base-v2

Więcej info: https://huggingface.co/sdadas/mmlw-retrieval-roberta-large
"""

import sys
from pathlib import Path
from typing import List, Dict
import chromadb
from sentence_transformers import SentenceTransformer
from langchain_text_splitters import RecursiveCharacterTextSplitter
import hashlib


class RAGDatabaseBuilder:
    """Klasa do budowy bazy wiedzy RAG z dokumentacji markdown"""
    
    # Model embedingowy zoptymalizowany dla polskiego języka
    EMBEDDING_MODEL = "sdadas/mmlw-retrieval-roberta-large"
    
    # Wielkość chunków - zoptymalizowana dla dokumentacji technicznej
    CHUNK_SIZE = 1000  # znaki
    CHUNK_OVERLAP = 200  # nakładanie się chunków dla kontekstu
    
    def __init__(self, docs_folder: str, output_db_path: str):
        """
        Inicjalizacja buildera
        
        Args:
            docs_folder: Ścieżka do folderu z dokumentacją (markdown)
            output_db_path: Ścieżka gdzie zapisać bazę .db
        """
        self.docs_folder = Path(docs_folder)
        self.output_db_path = Path(output_db_path)
        
        print("🔧 Inicjalizacja RAG Database Builder...")
        print(f"📁 Folder dokumentacji: {self.docs_folder}")
        print(f"💾 Baza zostanie zapisana: {self.output_db_path}")
        
        # Inicjalizacja modelu embedingowego
        print(f"\n🤖 Ładowanie modelu embedingowego: {self.EMBEDDING_MODEL}")
        print("⏳ To może potrwać chwilę przy pierwszym uruchomieniu...")
        self.embedding_model = SentenceTransformer(self.EMBEDDING_MODEL)
        print("✅ Model załadowany!")
        
        # Inicjalizacja text splittera
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.CHUNK_SIZE,
            chunk_overlap=self.CHUNK_OVERLAP,
            length_function=len,
            separators=["\n\n", "\n", ". ", " ", ""]  # Preferuj naturalne podziały
        )
        
        # Inicjalizacja ChromaDB
        self.client = chromadb.PersistentClient(
            path=str(self.output_db_path.parent / "chroma_db")
        )
        
    def load_markdown_files(self) -> List[Dict[str, str]]:
        """
        Ładuje wszystkie pliki .md z folderu docs
        
        Returns:
            Lista słowników {filename, content, path}
        """
        print("\n📚 Wczytywanie plików markdown...")
        documents = []
        
        for md_file in self.docs_folder.glob("*.md"):
            try:
                with open(md_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                documents.append({
                    'filename': md_file.name,
                    'content': content,
                    'path': str(md_file)
                })
                print(f"  ✓ {md_file.name} ({len(content)} znaków)")
                
            except Exception as e:
                print(f"  ✗ Błąd przy wczytywaniu {md_file.name}: {e}")
        
        print(f"\n✅ Wczytano {len(documents)} plików")
        return documents
    
    def split_documents(self, documents: List[Dict[str, str]]) -> List[Dict[str, str]]:
        """
        Dzieli dokumenty na mniejsze chunki
        
        Args:
            documents: Lista dokumentów
            
        Returns:
            Lista chunków z metadanymi
        """
        print("\n✂️  Dzielenie dokumentów na chunki...")
        all_chunks = []
        
        for doc in documents:
            # Podziel tekst na chunki
            text_chunks = self.text_splitter.split_text(doc['content'])
            
            # Dodaj metadane do każdego chunka
            for i, chunk in enumerate(text_chunks):
                chunk_id = hashlib.md5(
                    f"{doc['filename']}_{i}_{chunk[:50]}".encode()
                ).hexdigest()
                
                all_chunks.append({
                    'id': chunk_id,
                    'text': chunk,
                    'filename': doc['filename'],
                    'chunk_index': i,
                    'total_chunks': len(text_chunks),
                    'source_path': doc['path']
                })
            
            print(f"  ✓ {doc['filename']}: {len(text_chunks)} chunków")
        
        print(f"\n✅ Utworzono {len(all_chunks)} chunków")
        return all_chunks
    
    def create_embeddings(self, chunks: List[Dict[str, str]]) -> List[List[float]]:
        """
        Tworzy embedingi dla wszystkich chunków
        
        Args:
            chunks: Lista chunków
            
        Returns:
            Lista wektorów embedingowych
        """
        print("\n🧮 Generowanie embedingów...")
        print("⏳ To może potrwać kilka minut w zależności od ilości danych...")
        
        texts = [chunk['text'] for chunk in chunks]
        embeddings = self.embedding_model.encode(
            texts,
            show_progress_bar=True,
            batch_size=32
        )
        
        print(f"✅ Wygenerowano {len(embeddings)} embedingów")
        print(f"📊 Wymiar wektora: {len(embeddings[0])}")
        
        return embeddings.tolist()
    
    def save_to_chromadb(self, chunks: List[Dict[str, str]], embeddings: List[List[float]]):
        """
        Zapisuje chunki i embedingi do ChromaDB
        
        Args:
            chunks: Lista chunków z metadanymi
            embeddings: Lista embedingów
        """
        print("\n💾 Zapisywanie do bazy ChromaDB...")
        
        # Usuń starą kolekcję jeśli istnieje
        try:
            self.client.delete_collection("knowledge_base")
            print("  ℹ️  Usunięto starą kolekcję")
        except Exception:
            pass
        
        # Utwórz nową kolekcję
        collection = self.client.create_collection(
            name="knowledge_base",
            metadata={
                "description": "Baza wiedzy z dokumentacji ParagonyV2",
                "embedding_model": self.EMBEDDING_MODEL
            }
        )
        
        # Przygotuj dane do zapisu
        ids = [chunk['id'] for chunk in chunks]
        documents = [chunk['text'] for chunk in chunks]
        metadatas = [
            {
                'filename': chunk['filename'],
                'chunk_index': chunk['chunk_index'],
                'total_chunks': chunk['total_chunks'],
                'source_path': chunk['source_path']
            }
            for chunk in chunks
        ]
        
        # Zapisz w batch'ach (ChromaDB ma limity)
        batch_size = 100
        for i in range(0, len(ids), batch_size):
            batch_end = min(i + batch_size, len(ids))
            
            collection.add(
                ids=ids[i:batch_end],
                embeddings=embeddings[i:batch_end],
                documents=documents[i:batch_end],
                metadatas=metadatas[i:batch_end]
            )
            
            print(f"  ✓ Zapisano batch {i//batch_size + 1}/{(len(ids)-1)//batch_size + 1}")
        
        print(f"\n✅ Baza zapisana w: {self.output_db_path.parent / 'chroma_db'}")
        print(f"📊 Liczba chunków w bazie: {collection.count()}")
    
    def build(self):
        """Główna funkcja budująca bazę wiedzy"""
        print("\n" + "="*60)
        print("🚀 START BUDOWY BAZY WIEDZY RAG")
        print("="*60)
        
        try:
            # 1. Wczytaj pliki markdown
            documents = self.load_markdown_files()
            
            if not documents:
                print("❌ Nie znaleziono żadnych plików markdown!")
                return False
            
            # 2. Podziel na chunki
            chunks = self.split_documents(documents)
            
            # 3. Wygeneruj embedingi
            embeddings = self.create_embeddings(chunks)
            
            # 4. Zapisz do ChromaDB
            self.save_to_chromadb(chunks, embeddings)
            
            print("\n" + "="*60)
            print("✅ BAZA WIEDZY RAG UTWORZONA POMYŚLNIE!")
            print("="*60)
            print("\n📝 Następne kroki:")
            print("1. Baza jest gotowa do użycia")
            print("2. System asystenta automatycznie ją załaduje")
            print("3. Możesz teraz używać asystenta z bazą wiedzy")
            
            return True
            
        except Exception as e:
            print(f"\n❌ BŁĄD podczas budowy bazy: {e}")
            import traceback
            traceback.print_exc()
            return False


def main():
    """Główna funkcja skryptu"""
    # Ścieżki
    current_dir = Path(__file__).parent
    docs_folder = current_dir.parent / "docs"
    output_db = current_dir / "assistant_ai" / "knowledge_base.db"
    
    # Sprawdź czy folder docs istnieje
    if not docs_folder.exists():
        print(f"❌ Folder dokumentacji nie istnieje: {docs_folder}")
        print("💡 Upewnij się że uruchamiasz skrypt z folderu 'backend'")
        sys.exit(1)
    
    # Utwórz folder na bazę jeśli nie istnieje
    output_db.parent.mkdir(parents=True, exist_ok=True)
    
    # Buduj bazę
    builder = RAGDatabaseBuilder(
        docs_folder=str(docs_folder),
        output_db_path=str(output_db)
    )
    
    success = builder.build()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
