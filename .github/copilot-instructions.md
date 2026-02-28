# Copilot Instructions

## Architecture Overview
**ParagonyV2** is a Polish receipt-tracking app with AI-powered OCR, expense analytics, and a conversational assistant. Key layers:
- **Flask SPA** (`main.py`) serves both landing page (`main.html`) and app UI (`index.html`) with catch-all routing for frontend navigation
- **Three blueprints**: `routes.auth` (JWT), `routes.api` (receipts/analytics), `routes.assistant` (AI chat)
- **SQLAlchemy + PyMySQL** via `db.DatabaseHelper` (replaces old `flask_mysqldb.MySQL` cursors)
- **Gemini AI** for OCR (`ekstrakcja.Ekstrakcja`) and assistant (`assistant_ai/`) with per-user API keys
- **RAG knowledge base** (ChromaDB) powers documentation search in assistant responses
- **Modular Jinja2 templates**: 26 templates across 14 folders (see `TEMPLATE_MIGRATION.md`)

## Critical Database Pattern
**No more cursors!** All database access flows through `db.DatabaseHelper` static methods:
```python
from db import DatabaseHelper

# Query
data = DatabaseHelper.fetch_all("SELECT * FROM produkty WHERE id_paragonu = :id", {'id': 123})
row = DatabaseHelper.fetch_one("SELECT nazwa FROM firmy WHERE id_firmy = :id", {'id': 5})

# Execute with auto-commit
DatabaseHelper.execute("UPDATE paragony SET suma = :suma WHERE id_paragonu = :id", 
                       {'suma': 100.0, 'id': 7})

# Manual transaction
DatabaseHelper.execute(query, params, return_lastrowid=False)
DatabaseHelper.commit()  # or DatabaseHelper.rollback()
```
**Never** open cursors manually (`mysql.connection.cursor()`). Named parameters (`:param`) are required—no `%s` placeholders.

## Running & Debugging
```powershell
# Setup (Windows)
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt

# Start server (dev mode, port 5000)
python main.py  # Runs on http://0.0.0.0:5000

# Optional: SSL mode (uncomment in main.py)
# app.run(ssl_context='adhoc', host='0.0.0.0', port=443)

# Environment config (optional overrides)
$env:FLASK_ENV = "development"
$env:DB_HOST = "localhost"  # Override Aiven remote DB
$env:GEMINI_API_KEY = "your-key"
```
- **Auth flow**: Register at `/register` → login at `/login` → store `access_token` from response → use `Authorization: Bearer <token>` header for all API calls
- **Testing receipts**: POST base64 image to `/analyze-receipt` with JWT; AI extracts data → creates paragon → spawns product categorization
- **Config**: `config.py` has dev/prod classes; defaults to Aiven MySQL (see connection strings). Override via environment vars.

## AI Processing Pipelines
### Receipt OCR Flow
`/analyze-receipt` → `Ekstrakcja.paragonik(img, user_id, gemini_key)`:
1. Image compressed to JPEG (800px max, quality=50) to save DB space
2. Gemini extracts JSON: `{adres: {...}, produkty: [...], podatki: {...}, suma: {...}}`
3. `klasyfikacjaFirmyStart` / `klasyfikacjaMiastaStart` map names to DB IDs (retry with AI if missing)
4. `dodajParagon` inserts receipt with compressed binary image
5. **Sync call** `dodajProduktyDoBazy` → `klasyfikacjaKategorieJedna` batches all products to Gemini once
6. Each product inserted with `id_kategorii` from AI mapping (fallback: "TrudnoOkreslic" category)
7. `DatabaseHelper.commit()` at end; rollback on exception

### AI Assistant (`assistant_ai/`)
Modular architecture replaces monolithic `assistant.py`:
- `core.VirtualAssistant`: Gemini chat with function calling, RAG context injection
- `intent_analyzer.IntentAnalyzer`: Extracts user intent + parameters
- `rag_knowledge.RAGKnowledgeBase`: Semantic search in docs (`chroma_db/`) using Polish embeddings (`sdadas/mmlw-retrieval-roberta-large`)
- `tools/`: 7 tool classes (ExpenseTools, BudgetTools, ShoppingListTools, etc.) mapped to Gemini function definitions
- `AssistantManager`: Singleton holding per-user sessions (`_sessions[user_id]`)

**Key workflow**: User message → RAG checks doc keywords → injects context → Gemini calls tool → AssistantManager routes to tool class → formats response

**RAG Setup** (one-time):
```powershell
pip install sentence-transformers chromadb langchain-text-splitters
python build_rag_database.py  # Builds chroma_db/ from docs/*.md
```

### Product Classification
`Ekstrakcja.klasyfikacjaKategorieJedna` sends **all** products from receipt to Gemini in one prompt:
```python
# Returns: {"1": "Jedzenie", "2": "Napoje", "3": "TrudnoOkreslic"}
# Max 3 retry attempts with improved prompts if JSON parsing fails
# Fallback: assigns default category ID to all products
```
Similar pattern for `klasyfikacjaFirmy` / `klasyfikacjaMiasta` (single product, no batching).

## Code Conventions
- **JSON responses**: Use `json.dumps(..., ensure_ascii=False)` for Polish characters (ą,ć,ę,ł,ń,ó,ś,ź,ż) in `routes/api.py`
- **Logging**: Call `log_user_action(user_id, action, user_status, details_json)` after significant events (login, scan_receipt, add_products). See `routes/auth.py` and `api.py` for examples.
- **Gemini API keys**: Always retrieve from `get_jwt_identity()['apiKlucz']` with fallback to `app.config['GEMINI_API_KEY']` for testing. Never hardcode keys in prod.
- **Image handling**: Convert RGBA/LA/P modes to RGB before JPEG save (`ekstrakcja.py:dodajParagon`). Use `ImageOps.exif_transpose` for rotation.
- **Pagination**: Standard pattern `?page=0&size=50` with `LIMIT :size OFFSET :offset` in SQL (see `Api.paragony`).

## Frontend Integration
- **SPA routing**: `main.py` catch-all route checks `api_endpoints` list; unknown paths serve `index.html` for client-side navigation
- **Static files**: Served from `static/` with structure: `css/`, `js/`, `MojCSS/`, `docs/`. Link as `/static/js/app.js` etc.
- **API prefix**: All endpoints registered under `/` (no `/api/` prefix). Frontend calls `/paragony`, `/login`, `/assistant/chat` directly.
- **Templates**: Use `{% include "folder/file.html" %}` in Jinja2. See `templates/index.html` for assembly pattern. Organized by feature (auth/, receipts/, dashboard/, etc.)

## Security & Best Practices
- **JWT revocation**: In-memory `revoked_tokens` set cleared on restart. For persistent revocation, add DB table.
- **Password validation**: Must be 8+ chars with uppercase, lowercase, digit, special char (regex in `routes/auth.py`)
- **SQL injection**: DatabaseHelper with `:param` bindings prevents injection; never use f-strings in SQL
- **API key fallback**: Temporary fallback key in code for testing; remove in production or gate with `if app.debug:`
- **Transaction safety**: Use `auto_commit=False` when chaining inserts across tables (e.g., paragon + products), call `commit()` once at end

## Common Tasks
**Add new API endpoint**:
1. Define route in `routes/api.py` with `@jwt_required()`
2. Extract user_id from `get_jwt_identity()['id_uzytkownika']`
3. Add static method to `api.Api` class for business logic
4. Use `DatabaseHelper.fetch_all/fetch_one/execute`
5. Return `json.dumps(data, ensure_ascii=False)` or `jsonify({...})`
6. Add endpoint name to `api_endpoints` list in `main.py` catch-all

**Add assistant tool**:
1. Create `assistant_ai/tools/new_tool.py` with class + methods
2. Add definitions to `tools/tool_definitions.py`
3. Initialize in `core.VirtualAssistant.__init__`
4. Map function name in `core._execute_function`
5. Update `assistant_bp.get_capabilities` examples

**Add new template component**:
1. Create file in appropriate `templates/` subfolder (e.g., `components/`, `receipts/`)
2. Add `{% include "folder/file.html" %}` to `templates/index.html` at correct location
3. Ensure CSS classes align with existing styles in `static/css/app/`

**Modify Gemini prompt**:
- Receipt OCR: Edit prompt in `Ekstrakcja.paragonik` (JSON structure must match existing parser)
- Classification: Update `klasyfikacjaKategorieJedna` prompt with examples
- Assistant: Edit `prompts/system_prompt.py` (reloaded on each new session)

## File Paths Reference
- **Config**: `config.py` (DB, JWT, CORS, Gemini key)
- **Database layer**: `db.py` (DatabaseHelper)
- **Auth**: `routes/auth.py` (register, login, addKey, logout)
- **API**: `routes/api.py` (paragony, produkty, analyze-receipt, limits, reports)
- **AI OCR**: `ekstrakcja.py` (Ekstrakcja class, ~1470 lines)
- **Assistant**: `routes/assistant.py` (chat, history, clear)
- **Assistant core**: `assistant_ai/core.py` (VirtualAssistant)
- **RAG setup**: `build_rag_database.py` (run once to build `chroma_db/`)
- **Business logic**: `api.py` (Api class with static methods, ~1129 lines)
- **Templates**: `templates/index.html` (main entry), `TEMPLATE_MIGRATION.md` (structure docs)
