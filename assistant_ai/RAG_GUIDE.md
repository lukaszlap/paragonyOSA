# 📚 System RAG - Baza Wiedzy dla Wirtualnego Asystenta

## Czym jest RAG?

**RAG (Retrieval-Augmented Generation)** to system, który wzbogaca odpowiedzi LLM o kontekst z bazy wiedzy. 

W naszym przypadku:
- Dokumentacja z folderu `docs/` jest przetwarzana i zapisywana jako **embedingi wektorowe**
- Gdy użytkownik zadaje pytanie o system (np. "jak działa aplikacja?"), RAG automatycznie wyszukuje relevantne fragmenty dokumentacji
- Te fragmenty są dodawane do kontekstu LLM, dzięki czemu asystent może odpowiedzieć na pytania o architekturę, funkcjonalność, API itp.

---

## 🚀 Szybki Start

### 1. Instalacja zależności

```bash
cd backend
pip install sentence-transformers chromadb langchain-text-splitters
```

lub z pliku requirements:

```bash
pip install -r requriements.txt
```

### 2. Budowa bazy wiedzy

Uruchom standalone skrypt, który przetworzy dokumentację:

```bash
python build_rag_database.py
```

**Co robi ten skrypt:**
- Wczytuje wszystkie pliki `.md` z folderu `docs/`
- Dzieli je na chunki (fragmenty ~1000 znaków)
- Generuje embedingi używając modelu `sdadas/mmlw-retrieval-roberta-large` (najlepszy dla polskiego)
- Zapisuje wszystko do bazy ChromaDB w folderze `backend/assistant_ai/chroma_db/`

**Pierwszy raz może potrwać kilka minut** - model embedingowy musi się pobrać (~500MB).

### 3. Gotowe!

System automatycznie załaduje bazę wiedzy przy starcie asystenta. Nie musisz nic więcej robić!

---

## 🔧 Jak to działa?

### Architektura

```
docs/
├── Asystent_AI_Dokumentacja.md
├── Asystent_AI_Architektura.md
└── ... inne pliki .md
         ↓
    [build_rag_database.py]
         ↓
    Chunking (podziel na fragmenty)
         ↓
    Embedding (zamień na wektory)
         ↓
backend/assistant_ai/chroma_db/
    (baza wektorowa ChromaDB)
         ↓
    [rag_knowledge.py]
         ↓
    Semantic Search
         ↓
    [core.py - VirtualAssistant]
         ↓
    Kontekst dla LLM
```

### Komponenty

#### 1. `build_rag_database.py` - Budowa bazy (standalone)
- **Nie jest** częścią głównego systemu
- Używany tylko do jednorazowego utworzenia/aktualizacji bazy
- Może być uruchamiany wielokrotnie (nadpisuje starą bazę)

#### 2. `assistant_ai/rag_knowledge.py` - Moduł RAG (runtime)
- Klasa `RAGKnowledgeBase` - wyszukiwanie w bazie
- Metoda `search()` - semantyczne wyszukiwanie fragmentów
- Metoda `get_context_for_query()` - zwraca sformatowany kontekst

#### 3. `assistant_ai/core.py` - Integracja
- VirtualAssistant inicjalizuje `RAGKnowledgeBase`
- Metoda `_check_and_get_rag_context()` sprawdza czy pytanie dotyczy dokumentacji
- Jeśli tak, automatycznie dodaje kontekst z bazy do prompta

#### 4. `prompts/system_prompt.py` - Informacja dla LLM
- System prompt informuje asystenta o istnieniu bazy wiedzy
- LLM wie, że może odpowiadać na pytania o system/dokumentację

---

## 🎯 Przykłady użycia

### Pytania, które uruchomią RAG:

✅ "Jak działa aplikacja ParagonyV2?"
✅ "Jakie są główne funkcjonalności systemu?"
✅ "Wyjaśnij architekturę aplikacji"
✅ "Co to jest API asystenta?"
✅ "Jakie technologie zostały użyte?"
✅ "Pomoc - jak korzystać z aplikacji?"

### Pytania, które NIE uruchomią RAG:

❌ "Ile wydałem na jedzenie?" (to pytanie o dane użytkownika)
❌ "Dodaj limit 300 PLN" (to akcja na bazie danych)
❌ "Pokaż moje paragony" (to zapytanie o transakcje)

**RAG jest używany tylko dla pytań o dokumentację/system, nie o dane użytkownika.**

---

## 🛠️ Konfiguracja

### Model embedingowy

**Domyślny:** `sdadas/mmlw-retrieval-roberta-large`

Dlaczego ten model?
- 🇵🇱 Stworzony specjalnie dla polskiego języka
- 🎯 Zoptymalizowany dla zadań retrieval (wyszukiwania)
- 🏆 Najlepszy wynik na polskich benchmarkach
- 📚 Idealny dla dokumentacji technicznej

**Alternatywy** (możesz zmienić w kodzie):
```python
# W build_rag_database.py i rag_knowledge.py zmień:
EMBEDDING_MODEL = "sdadas/polish-sentence-transformer"  # lżejszy
# lub
EMBEDDING_MODEL = "sentence-transformers/paraphrase-multilingual-mpnet-base-v2"  # wielojęzyczny
```

### Parametry chunkingu

W `build_rag_database.py`:

```python
CHUNK_SIZE = 1000       # Wielkość fragmentu w znakach
CHUNK_OVERLAP = 200     # Nakładanie się fragmentów (dla kontekstu)
```

### Liczba wyników RAG

W `rag_knowledge.py`:

```python
def search(self, query: str, top_k: int = 3):  # Zmień top_k
```

W `core.py`:

```python
self.rag_kb.get_context_for_query(user_message, max_tokens=500)  # Limit znaków
```

---

## 🔄 Aktualizacja bazy wiedzy

Gdy dodasz/zmodyfikujesz pliki w `docs/`, uruchom ponownie:

```bash
python build_rag_database.py
```

Baza zostanie przebudowana. Restart aplikacji nie jest wymagany - nowa baza zostanie załadowana przy następnym pytaniu.

---

## 🐛 Troubleshooting

### ⚠️ "Baza wiedzy RAG nie istnieje"

```
⚠️  Baza wiedzy RAG nie istnieje: backend/assistant_ai/chroma_db
💡 Uruchom: python build_rag_database.py aby ją utworzyć
```

**Rozwiązanie:** Uruchom `python build_rag_database.py`

### ⚠️ "Import chromadb could not be resolved"

```
Import "chromadb" could not be resolved
```

**Rozwiązanie:** 
```bash
pip install chromadb sentence-transformers langchain-text-splitters
```

### ⚠️ Baza się nie ładuje mimo że istnieje

Sprawdź czy folder `backend/assistant_ai/chroma_db/` zawiera pliki:
```bash
ls backend/assistant_ai/chroma_db/
```

Jeśli jest pusty, przebuduj bazę:
```bash
python build_rag_database.py
```

### ⚠️ Model embedingowy pobiera się za długo

Pierwszy raz model (~500MB) pobiera się z HuggingFace. To normalne.

Jeśli chcesz lżejszy model:
- Użyj `sdadas/polish-sentence-transformer` (mniejszy)
- Albo `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` (najmniejszy)

---

## 📊 Statystyki i monitoring

### Sprawdź stan bazy:

```python
from assistant_ai.rag_knowledge import get_rag_knowledge_base

rag = get_rag_knowledge_base()
stats = rag.get_statistics()
print(stats)
```

Output:
```json
{
    "available": true,
    "total_chunks": 127,
    "collection_name": "knowledge_base",
    "embedding_model": "sdadas/mmlw-retrieval-roberta-large",
    "db_path": "backend/assistant_ai/chroma_db"
}
```

### Test wyszukiwania:

```python
results = rag.search("jak działa API asystenta?", top_k=3)
for i, result in enumerate(results, 1):
    print(f"\n{i}. Źródło: {result['filename']}")
    print(f"   Dopasowanie: {result['distance']:.4f}")
    print(f"   Fragment: {result['text'][:200]}...")
```

---

## 🎓 Jak działa semantyczne wyszukiwanie?

1. **Embedowanie pytania:**
   ```
   "Jak działa aplikacja?" → [0.234, -0.567, 0.123, ...]
   ```

2. **Porównanie z bazą:**
   Każdy chunk dokumentacji ma swój wektor. ChromaDB oblicza **odległość kosinusową** między wektorami.

3. **Zwrócenie najbliższych:**
   Chunki z najmniejszą odległością (najbardziej podobne semantycznie) są zwracane.

4. **Dodanie do kontekstu:**
   Te chunki są formatowane i dodawane do prompta dla LLM.

**To nie jest keyword search!** System rozumie znaczenie, nie tylko słowa:
- "jak działa system" ≈ "wyjaśnij funkcjonalność aplikacji"
- "API" ≈ "interfejs programistyczny" ≈ "endpointy"

---

## 📝 Best Practices

### 1. Struktura dokumentacji
- ✅ Używaj nagłówków (`##`, `###`)
- ✅ Podziel długie sekcje na mniejsze
- ✅ Dodawaj konkretne przykłady
- ✅ Używaj jasnego języka

### 2. Wielkość chunków
- 1000 znaków to sweet spot dla dokumentacji technicznej
- Mniejsze = więcej wyników ale mniej kontekstu
- Większe = mniej wyników ale pełniejszy kontekst

### 3. Aktualizacja bazy
- Przebuduj bazę po każdej większej zmianie w docs/
- Małe poprawki = przebuduj wieczorem/w nocy
- Duże zmiany = przebuduj od razu

### 4. Monitorowanie
- Sprawdzaj logi czy RAG jest używany
- Testuj czy odpowiedzi zawierają informacje z dokumentacji
- Analizuj które pytania uruchamiają RAG

---

## 🔮 Przyszłe usprawnienia

Potencjalne rozszerzenia systemu:

- [ ] **Hybrid search** - połączenie semantic + keyword search
- [ ] **Reranking** - drugie sortowanie wyników dla lepszej precyzji
- [ ] **Metadata filtering** - filtrowanie po typie dokumentu, dacie itp.
- [ ] **Query expansion** - automatyczne rozszerzanie zapytań
- [ ] **Cache** - cachowanie popularnych pytań
- [ ] **Analytics** - statystyki użycia RAG

---

## 📚 Dodatkowe zasoby

- [ChromaDB Documentation](https://docs.trychroma.com/)
- [Sentence Transformers](https://www.sbert.net/)
- [Model sdadas/mmlw-retrieval-roberta-large](https://huggingface.co/sdadas/mmlw-retrieval-roberta-large)
- [LangChain Text Splitters](https://python.langchain.com/docs/modules/data_connection/document_transformers/)

---

## 👥 Wsparcie

Jeśli masz pytania lub problemy:
1. Sprawdź sekcję **Troubleshooting** powyżej
2. Przejrzyj kod - jest dobrze udokumentowany
3. Sprawdź logi w terminalu
4. Zweryfikuj czy wszystkie zależności są zainstalowane

**Happy coding! 🚀**
