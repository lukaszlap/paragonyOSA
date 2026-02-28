# -*- coding: utf-8 -*-
"""
API routes - obsługuje wszystkie endpointy API
Obsługuje polskie znaki: ą, ć, ę, ł, ń, ó, ś, ź, ż
"""
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from api import Api, log_user_action, get_user_status
import ssl
import base64
import json
from ekstrakcja import Ekstrakcja

ssl._create_default_https_context = ssl._create_unverified_context

api_bp = Blueprint('api', __name__)

# Operacja związana z przetworzeniem obrazu z wykorzystaniem OCR 
# /paragony?page={currentPage}&size={PageSize}
@api_bp.route('/paragony', methods=['GET', 'POST'])
@jwt_required()
def paragony():
    sesja = get_jwt_identity()
    currentPage = request.args.get('page', default=0, type=int)
    pageSize = request.args.get('size', default=7, type=int)
    id_uzytkownika = sesja['id_uzytkownika']
    return Api.paragony(id_uzytkownika, currentPage, pageSize)

@api_bp.route('/paragon/<parametr>', methods=['GET', 'POST'])
@jwt_required()
def paragon(parametr):
    id_paragonu = parametr
    sesja = get_jwt_identity()
    id_uzytkownika = sesja['id_uzytkownika']
    return Api.paragon(id_uzytkownika, id_paragonu)

@api_bp.route('/paragonUpdate/<parametr>', methods=['PUT'])
@jwt_required()
def paragonUpdate(parametr):
    data = request.get_json()
    sesja = get_jwt_identity()
    return Api.update_paragon(parametr, data)

@api_bp.route('/produkty/<parametr>', methods=['GET', 'POST'])
@jwt_required()
def produkty(parametr):
    id_paragonu = parametr
    sesja = get_jwt_identity()
    id_uzytkownika = sesja['id_uzytkownika']
    return Api.produkty(id_uzytkownika, id_paragonu)

@api_bp.route('/produktyUpdate/<parametr>', methods=['PUT'])
@jwt_required()
def update_produkt(parametr):
    data = request.get_json()
    return Api.update_produkt(parametr, data)

@api_bp.route('/paragonDelete/<parametr>', methods=['DELETE'])
@jwt_required()
def paragonDelete(parametr):
    return Api.kasujParagon(parametr)

@api_bp.route('/produktDelete/<parametr>', methods=['DELETE'])
@jwt_required()
def produktDelete(parametr):
    return Api.kasujProdukt(parametr)

@api_bp.route('/analyze-receipt', methods=['POST','GET'])
@jwt_required()
def analyze_receipt():
    try:
        data = request.json
        base64_image = data.get('image')
        image_data = base64.b64decode(base64_image)
        image_data = base64.b64encode(image_data)
        sesja = get_jwt_identity()
        id_uzytkownika = sesja['id_uzytkownika']
        kluczDoGemini = sesja['apiKlucz']
        
        # Log rozpoczęcia skanowania
        from api import log_user_action, get_user_status
        user_status = get_user_status(id_uzytkownika)
        log_user_action(
            id_uzytkownika,
            "scan_receipt_start",
            user_status,
            json.dumps({"image_size": len(base64_image) if base64_image else 0}, ensure_ascii=False)
        )
        
        # Use environment variable as fallback when user key is not provided
        if not kluczDoGemini or len(kluczDoGemini) < 10:
            kluczDoGemini = current_app.config.get('GEMINI_API_KEY', '')
        
        response_text = Ekstrakcja.paragonik(image_data, id_uzytkownika, kluczDoGemini)
        
        # Log zakończenia skanowania
        log_user_action(
            id_uzytkownika,
            "scan_receipt_success",
            user_status,
            json.dumps({"id_paragonu": response_text}, ensure_ascii=False)
        )
        
        print(response_text)
        return response_text
    except Exception as e:
        print(e)
        # Log błędu skanowania
        try:
            sesja = get_jwt_identity()
            id_uzytkownika = sesja.get('id_uzytkownika')
            if id_uzytkownika:
                from api import log_user_action, get_user_status
                user_status = get_user_status(id_uzytkownika)
                log_user_action(
                    id_uzytkownika,
                    "scan_receipt_error",
                    user_status,
                    json.dumps({"error": str(e)}, ensure_ascii=False)
                )
        except:
            pass
        return jsonify(error=str(e)), 500 
    
@api_bp.route('/pobierzKategorie', methods=['GET', 'POST'])
@jwt_required()
def pobierzKategorie():
    try:
        return Api.pobierzKategorie()
    except Exception as e:
        print(e)
        return jsonify(error=str(e)), 500

@api_bp.route('/pobierzMiasta', methods=['GET', 'POST'])
@jwt_required()
def pobierzMiasta():
    try:
        return Api.pobierzMiasta()
    except Exception as e:
        print(e)
        return jsonify(error=str(e)), 500
    
@api_bp.route('/pobierzFirmy', methods=['GET', 'POST'])
@jwt_required()
def pobierzFirmy():
    try:
        return Api.pobierzFirmy()
    except Exception as e:
        print(e)
        return jsonify(error=str(e)), 500
    
@api_bp.route('/limit', methods=['GET']) 
@jwt_required()
def moje_produkty():
    sesja = get_jwt_identity()
    id_uzytkownika = sesja['id_uzytkownika']
    return Api.produktyUser1(id_uzytkownika) 

@api_bp.route('/dodajlimit', methods=['GET']) 
@jwt_required()
def dodaj_produkty():
    id_kategorii = request.args.get('id_kategorii', default=1, type=int)
    limit = request.args.get('limit', default=1000, type=float)
    sesja = get_jwt_identity()
    id_uzytkownika = sesja['id_uzytkownika']
    return Api.dodajLimitNaKategorie(id_uzytkownika, id_kategorii, limit) 

@api_bp.route('/limitDelete/<parametr>', methods=['DELETE'])
@jwt_required()
def limitDelete(parametr):
    return Api.kasujLimit(parametr)

@api_bp.route('/limitUpdate/<parametr>', methods=['PUT'])
@jwt_required()
def update_limit(parametr):
    data = request.get_json(silent=True) or {}
    limit_value = data.get('limit')
    if limit_value is None:
        return jsonify({'message': 'Brak wartości limitu'}), 400

    try:
        limit_value = float(limit_value)
    except (TypeError, ValueError):
        return jsonify({'message': 'Nieprawidłowa wartość limitu'}), 400

    try:
        limit_id = int(parametr)
    except (TypeError, ValueError):
        return jsonify({'message': 'Nieprawidłowe ID limitu'}), 400

    sesja = get_jwt_identity()
    id_uzytkownika = sesja['id_uzytkownika']

    nazwa_kategorii = data.get('nazwaKategorii')
    if not nazwa_kategorii:
        from db import DatabaseHelper
        limit_row = DatabaseHelper.fetch_one(
            """
            SELECT k.nazwa AS nazwa
            FROM limity l
            JOIN kategorie k ON l.id_kategorii = k.id_kategorii
            WHERE l.id = :id_limitu AND l.id_uzytkownika = :id_uzytkownika
            """,
            {'id_limitu': limit_id, 'id_uzytkownika': id_uzytkownika}
        )
        if not limit_row:
            return jsonify({'message': 'Limit nie znaleziony'}), 404
        nazwa_kategorii = limit_row['nazwa']

    return Api.update_limit(limit_value, nazwa_kategorii, id_uzytkownika)

@api_bp.route('/dodaj_powiadomienie', methods=['POST'])
@jwt_required()
def dodaj_powiadomienie_route():
    data = request.get_json()
    id_limitu = data.get('id_limitu')
    tresc = data.get('tresc')
    sesja = get_jwt_identity()
    id_uzytkownika = sesja['id_uzytkownika']
    if not id_limitu or not tresc:
        return jsonify({'message': 'Brakujące dane'}), 400

    try:
        Api.dodaj_powiadomienie(id_limitu, tresc, id_uzytkownika)
        return jsonify({}), 204
    except Exception as e:
        return jsonify({'message': f'Błąd serwera: {str(e)}'}), 500
    
@api_bp.route('/powiadomienia', methods=['GET'])
@jwt_required()
def pobierz_powiadomienia_route():
    id_uzytkownika = get_jwt_identity()['id_uzytkownika']
    return Api.pobierz_powiadomienia(id_uzytkownika)

@api_bp.route('/wyszukiwaniesklepu', methods=['GET', 'POST'])
@jwt_required()
def pobierzParagonyPoFirmie():
    sesja = get_jwt_identity()
    nazwaFirmy = request.args.get('nazwaFirmy', default="Biedronka" )
    
    id_uzytkownika = sesja['id_uzytkownika']
    return Api.pobierzParagonyPoFirmie(nazwaFirmy, id_uzytkownika)

@api_bp.route('/paragonyPokazPoFirmie', methods=['GET', 'POST'])
@jwt_required()
def paragonyPokazPoFirmie():
    sesja = get_jwt_identity()
    nazwaFirmy = request.args.get('nazwaFirmy', default="Biedronka" )
    id_uzytkownika = sesja['id_uzytkownika']
    return Api.paragonyDlaDanejFirmy(id_uzytkownika, nazwaFirmy)


@api_bp.route('/produktyDlaParagonu', methods=['GET', 'POST'])
@jwt_required()
def produktyDlaParagonu():
    sesja = get_jwt_identity()
    id_uzytkownika = sesja['id_uzytkownika']
    return Api.produktyDlaParagonu(id_uzytkownika)


@api_bp.route('/raport', methods=['GET', 'POST'])
@jwt_required()
def raport():
    try:
        sesja = get_jwt_identity()
        id_uzytkownika = sesja['id_uzytkownika']
        start_date_str = request.args.get('startDate')
        end_date_str = request.args.get('endDate')
        return Api.raport(id_uzytkownika, start_date_str, end_date_str)
    except Exception as e:
        print(e)
        return jsonify(error=str(e)), 500


@api_bp.route('/api', methods=['GET'])
@jwt_required()
def get_data():
    start_date = request.args.get('startDate')
    end_date = request.args.get('endDate')
    category_ids = request.args.get('categoryIds', '').split(',')
    return Api.raport(start_date, end_date, category_ids)

@api_bp.route('/raport_z_filtrem', methods=['GET']) 
@jwt_required()
def raport_z_filtrem():
        sesja = get_jwt_identity()
        id_uzytkownika = sesja['id_uzytkownika']
        start_date_str = request.args.get('startDate')
        end_date_str = request.args.get('endDate')
        kategory_ids_str = request.args.get('categoryIds')
        return Api.raport_z_filtrem(id_uzytkownika, start_date_str, end_date_str, kategory_ids_str)
    
@api_bp.route('/produktyzkategorii', methods=['GET', 'POST'])
@jwt_required()
def produktyDlaKategorii():
    sesja = get_jwt_identity()
    id_uzytkownika = sesja['id_uzytkownika']
    id_kategorii = request.args.get('id_kategorii', default=0, type=int)
    return Api.produktyDlaKategorii(id_uzytkownika, id_kategorii)

@api_bp.route('/utworzListe', methods=['POST'])
@jwt_required()
def utworz_liste():
    try:
        from db import DatabaseHelper
        data = request.get_json() or []
        id_uzytkownika = get_jwt_identity()['id_uzytkownika']

        id_listy = DatabaseHelper.execute(
            "INSERT INTO lista(id_uzytkownika) VALUES (:id_uzytkownika);",
            {'id_uzytkownika': id_uzytkownika},
            return_lastrowid=True
        )

        if not id_listy:
            raise ValueError("Nie udało się utworzyć listy zakupów")

        added_items = 0
        for produkt in data:
            product_id = produkt.get('id_Produktu')
            quantity = produkt.get('ilosc', 1)
            if not product_id:
                continue
            DatabaseHelper.execute("""
                INSERT INTO listy(id_listy, id_produktu, ilosc, id_uzytkownika) 
                VALUES (:id_listy, :id_produktu, :ilosc, :id_uzytkownika)
            """, {
                'id_listy': id_listy,
                'id_produktu': product_id,
                'ilosc': quantity or 1,
                'id_uzytkownika': id_uzytkownika
            })
            added_items += 1

        if added_items == 0:
            return jsonify({
                'error': 'Nie dodano żadnych pozycji do listy - brak prawidłowych produktów'
            }), 400
        
        list_items = Api.fetch_shopping_list_items(id_uzytkownika, id_listy)
        summary = Api.build_shopping_list_summary(id_uzytkownika, id_listy, list_items)

        return jsonify({
            'message': 'Lista utworzona pomyślnie',
            'listId': id_listy,
            'summary': summary
        }), 201

    except Exception as e:
        print(f"Błąd podczas tworzenia listy: {e}")
        return jsonify({'error': 'Wystąpił błąd podczas tworzenia listy'}), 500


@api_bp.route('/pobierzListy', methods=['GET'])
@jwt_required()
def pobierz_listy():
    try:
        from db import DatabaseHelper
        id_uzytkownika = get_jwt_identity()['id_uzytkownika']
        listy = DatabaseHelper.fetch_all(
            "SELECT * FROM lista WHERE id_uzytkownika = :id_uzytkownika ORDER BY id DESC",
            {'id_uzytkownika': id_uzytkownika}
        )
        print(listy)
        return jsonify(listy), 200

    except Exception as e:
        print(f"Błąd podczas pobierania list: {e}")
        return jsonify({'error': 'Wystąpił błąd podczas pobierania list'}), 500
    
@api_bp.route('/pobierzZawartoscListy/<int:id_listy>', methods=['GET'])
@jwt_required()
def pobierzZawartoscListy(id_listy):
    try:
        id_uzytkownika = get_jwt_identity()['id_uzytkownika']
        list_items = Api.fetch_shopping_list_items(id_uzytkownika, id_listy)
        summary = Api.build_shopping_list_summary(id_uzytkownika, id_listy, list_items)

        return jsonify({
            'items': list_items,
            'summary': summary
        }), 200

    except Exception as e:
        print(f"Błąd podczas pobierania list: {e}")
        return jsonify({'error': 'Wystąpił błąd podczas pobierania list'}), 500


@api_bp.route('/usunListe/<int:id_listy>', methods=['DELETE'])
@jwt_required()
def usun_liste(id_listy):
    try:
        from db import DatabaseHelper
        id_uzytkownika = get_jwt_identity()['id_uzytkownika']
        DatabaseHelper.execute("DELETE FROM listy WHERE id_listy = :id_listy", {'id_listy': id_listy})
        DatabaseHelper.execute("DELETE FROM lista WHERE id = :id_listy", {'id_listy': id_listy})

        return jsonify({'message': 'Lista usunięta pomyślnie'}), 200

    except Exception as e:
        print(f"Błąd podczas usuwania listy: {e}")
        return jsonify({'error': 'Wystąpił błąd podczas usuwania listy'}), 500
    
    #WIKTOR
@api_bp.route('/PobierzSugestieDania', methods=['GET'])
@jwt_required()
def PobierzSugestieDania():
    try:
        idParagonu = request.args.get('idParagonu', type=int)
        print(f"=== ENDPOINT PobierzSugestieDania called with idParagonu: {idParagonu} ===")
        if idParagonu is None:
              return jsonify({'status': 'error', 'message': 'Brak ID paragonu'})
        
        # Get API key from session with fallback
        sesja = get_jwt_identity()
        kluczDoGemini = sesja.get('apiKlucz', '')
        
        # Use environment variable as fallback when user key is not provided
        if not kluczDoGemini or len(kluczDoGemini) < 10:
            kluczDoGemini = current_app.config.get('GEMINI_API_KEY', '')
        
        result = Ekstrakcja.PobierzSugestieDania(idParagonu, kluczDoGemini)
        print(f"=== RESULT from Ekstrakcja: {result} ===")
        print(f"=== RESULT type: {type(result)} ===")
        json_result = jsonify(result)
        print(f"=== JSON RESULT: {json_result.get_json()} ===")
        return json_result
    except Exception as e:
        print(f"=== ERROR in PobierzSugestieDania: {e} ===")
        import traceback
        traceback.print_exc()
        return jsonify(error=str(e)), 500
    
@api_bp.route('/raportWydatkowKategorieMiesiace', methods=['GET'])
@jwt_required()
def raportWydatkowKategorieMiesiace():
    try:
        sesja = get_jwt_identity()
        id_uzytkownika = sesja['id_uzytkownika']
        id_kategorii = request.args.get('id_kategorii', type=int)
        months = request.args.get('months', type=int) 
        if id_kategorii is None:
             return jsonify({'status': 'error', 'message': 'Brak ID kategorii'})
        return Api.pobierzRaportWydatkowKategorieMiesiace(id_uzytkownika, id_kategorii, months) 
    except Exception as e:
        print(e)
        return jsonify(error=str(e)), 500
    
@api_bp.route('/UtworzPrzepisDania', methods=['GET', 'POST'])
@jwt_required()
def UtworzPrzepisDania():
    try:
        data = request.get_json()
        print(data)
        id_paragonu = data.get('idParagonu')
        Dish_name = data.get('dishName')
        Dish_description = data.get('dishDescription')
        
        # Get API key from session with fallback
        sesja = get_jwt_identity()
        kluczDoGemini = sesja.get('apiKlucz', '')
        
        # Use environment variable as fallback when user key is not provided
        if not kluczDoGemini or len(kluczDoGemini) < 10:
            kluczDoGemini = current_app.config.get('GEMINI_API_KEY', '')
        
        result = Ekstrakcja.UtworzPrzepisDania(id_paragonu, Dish_name, Dish_description, kluczDoGemini)
        return jsonify(result)
    except Exception as e:
        print(e)
        return jsonify(error=str(e)), 500

@api_bp.route('/AnalizaZdrowotosciPosilku', methods=['GET'])
@jwt_required()
def AnalizaZdrowotosciPosilku():
    """
    Endpoint do analizy zdrowotności posiłku na podstawie produktów z paragonu.
    
    Query Parameters:
        - idParagonu (int, wymagany): ID paragonu do analizy
    
    Response:
    {
        "status": "success",
        "analiza_kalorii": {
            "szacunkowe_kalorie_na_porcje": 2500,
            "opis": "Posiłek o wysokiej kaloryczności"
        },
        "makroelementy": {
            "bialka_procent": 25,
            "tluszcze_procent": 35,
            "weglowodany_procent": 40,
            "opis": "Zbalansowany rozkład makroelementów"
        },
        "produkty_wysoko_cukrowe": [...],
        "produkty_wysoko_tluszczowe": [...],
        "rekomendacje_zdrowotne": [...],
        "oznaczenia_dietetyczne": [...],
        "podsumowanie": "...",
        "ocena_zdrowotnosci": "Umiarkowany",
        "wskazowki_dla_diety": "..."
    }
    """
    try:
        idParagonu = request.args.get('idParagonu', type=int)
        print(f"=== ENDPOINT AnalizaZdrowotosciPosilku called with idParagonu: {idParagonu} ===")
        if idParagonu is None:
            return jsonify({'status': 'error', 'message': 'Brak ID paragonu'})
        
        # Get API key from session with fallback
        sesja = get_jwt_identity()
        kluczDoGemini = sesja.get('apiKlucz', '')
        
        # Use environment variable as fallback when user key is not provided
        if not kluczDoGemini or len(kluczDoGemini) < 10:
            kluczDoGemini = current_app.config.get('GEMINI_API_KEY', '')
        
        result = Ekstrakcja.AnalizaZdrowotosciPosilku(idParagonu, kluczDoGemini)
        print(f"=== RESULT from Ekstrakcja: {result} ===")
        return jsonify(result)
    except Exception as e:
        print(f"=== ERROR in AnalizaZdrowotosciPosilku: {e} ===")
        import traceback
        traceback.print_exc()
        return jsonify(error=str(e)), 500

@api_bp.route('/RekomendacjeSezonowosci', methods=['GET'])
@jwt_required()
def RekomendacjeSezonowosci():
    """
    Endpoint do rekomendacji sezonowości produktów.
    
    Query Parameters:
        - idParagonu (int, wymagany): ID paragonu do analizy
    
    Response:
    {
        "status": "success",
        "produkty_sezonowe": [
            {
                "nazwa": "Truskawki",
                "typ_sezonowosci": "letni",
                "najlepszy_okres": "Maj-Wrzesień",
                "obecna_cena_sezonowosc": "W sezonie",
                "szacunkowa_roznica_ceny": 30,
                "porady_przechowywania": "Przechowuj w lodówce",
                "najlepsze_zastosowanie": "Sałatki, desery",
                "przepisy_sezonowe": ["Sałatka z truskawkami", "Dżem truskawkowy"]
            }
        ],
        "produkty_wszechsezonowe": [...],
        "najlepsze_okresy_zakupow": {...},
        "oszczednosci": {...},
        "porady_przechowywania_ogolne": [...],
        "linki_do_przepisow": [...],
        "podsumowanie": "..."
    }
    """
    try:
        idParagonu = request.args.get('idParagonu', type=int)
        print(f"=== ENDPOINT RekomendacjeSezonowosci called with idParagonu: {idParagonu} ===")
        if idParagonu is None:
            return jsonify({'status': 'error', 'message': 'Brak ID paragonu'})
        
        # Get API key from session with fallback
        sesja = get_jwt_identity()
        kluczDoGemini = sesja.get('apiKlucz', '')
        
        # Use environment variable as fallback when user key is not provided
        if not kluczDoGemini or len(kluczDoGemini) < 10:
            kluczDoGemini = current_app.config.get('GEMINI_API_KEY', '')
        
        result = Ekstrakcja.RekomendacjeSezonowosci(idParagonu, kluczDoGemini)
        print(f"=== RESULT from Ekstrakcja: {result} ===")
        return jsonify(result)
    except Exception as e:
        print(f"=== ERROR in RekomendacjeSezonowosci: {e} ===")
        import traceback
        traceback.print_exc()
        return jsonify(error=str(e)), 500
    
@api_bp.route('/produktyHistoriaCen', methods=['GET'])
@jwt_required()
def produktyHistoriaCen():
    try:
        sesja = get_jwt_identity()
        id_uzytkownika = sesja['id_uzytkownika']
        nazwa = request.args.get('nazwa', type=str)
        if nazwa is None:
             return jsonify({'status': 'error', 'message': 'brak nazwy'})
        return Api.produktyHistoriaCen(id_uzytkownika, nazwa)
    except Exception as e:
        print(e)
        return jsonify(error=str(e)), 500
    
@api_bp.route('/pobierzInformacjeOProdukcie', methods=['GET'])
@jwt_required()
def pobierzInformacjeOProdukcie():
    try:
        sesja = get_jwt_identity()
        kluczDoGemini = sesja.get('apiKlucz', '')
        
        # Use environment variable as fallback when user key is not provided
        if not kluczDoGemini or len(kluczDoGemini) < 10:
            kluczDoGemini = current_app.config.get('GEMINI_API_KEY', '')
        
        nazwaProduktu = request.args.get('nazwaProduktu', type=str)
        if not nazwaProduktu:
            return jsonify({'status': 'error', 'message': 'Brak nazwy produktu'}), 400
        
        return Ekstrakcja.pobierzInformacjeOProdukcie(nazwaProduktu, kluczDoGemini)
    except Exception as e:
        print(f"Error in pobierzInformacjeOProdukcie: {e}")
        return jsonify(error=str(e)), 500

@api_bp.route('/logi', methods=['GET'])
@jwt_required()
def pobierz_logi():
    """
    Endpoint do pobierania logów użytkownika z paginacją i filtrowaniem
    
    Query params:
        - page: numer strony (domyślnie 0)
        - size: liczba wyników na stronę (domyślnie 50, max 200)
        - details: tekst do wyszukania w kolumnie details (opcjonalny, wyszukiwanie częściowe)
        - date_from: data początkowa w formacie YYYY-MM-DD lub YYYY-MM-DD HH:MM:SS (opcjonalny)
        - date_to: data końcowa w formacie YYYY-MM-DD lub YYYY-MM-DD HH:MM:SS (opcjonalny)
        - user_status: status użytkownika (np. 'active', 'premium', opcjonalny)
        - action: akcja do filtrowania (np. 'login', 'logout', 'scan_receipt', opcjonalny)
    
    Przykłady użycia:
        GET /logi?page=0&size=50
        GET /logi?details=paragon&page=0
        GET /logi?date_from=2025-01-01&date_to=2025-12-31
        GET /logi?user_status=premium&action=scan_receipt
        GET /logi?details=błąd&date_from=2025-10-01&size=100
    """
    try:
        sesja = get_jwt_identity()
        id_uzytkownika = sesja['id_uzytkownika']
        
        # Pobierz parametry paginacji
        page = request.args.get('page', default=0, type=int)
        size = request.args.get('size', default=50, type=int)
        
        # Pobierz parametry filtrowania (opcjonalne)
        details_search = request.args.get('details', default=None, type=str)
        date_from = request.args.get('date_from', default=None, type=str)
        date_to = request.args.get('date_to', default=None, type=str)
        user_status = request.args.get('user_status', default=None, type=str)
        action = request.args.get('action', default=None, type=str)
        
        # Walidacja parametrów paginacji
        if page < 0:
            return jsonify({'error': 'Parametr page musi być większy lub równy 0'}), 400
        if size < 1 or size > 200:
            return jsonify({'error': 'Parametr size musi być w zakresie 1-200'}), 400
        
        return Api.pobierz_logi(
            id_uzytkownika=id_uzytkownika,
            page=page,
            size=size,
            details_search=details_search,
            date_from=date_from,
            date_to=date_to,
            user_status=user_status,
            action=action
        )
    except Exception as e:
        print(f"Error in pobierz_logi: {e}")
        return jsonify(error=str(e)), 500