# -*- coding: utf-8 -*-
"""
Moduł ekstrakcji danych z paragonów i przetwarzania produktów
Obsługuje polskie znaki: ą, ć, ę, ł, ń, ó, ś, ź, ż
"""
import base64
from flask import app, jsonify, json, session
from flask_jwt_extended import get_jwt_identity
from datetime import datetime
import random
import pyttsx3
import json
from PIL import Image, ImageOps
import os
import io
import time
import genai
import google.generativeai as genai
from google.ai.generativelanguage_v1beta.types import content
import PIL
import threading
from io import BytesIO
import requests


# genai.configure(api_key="")  # Moved to individual methods - configured dynamically with user's API key
kluczDoGemini=""


def log_user_action(user_id, action, user_status, details=None):
    """Store a single audit log entry."""
    from db import DatabaseHelper
    try:
        DatabaseHelper.execute(
            """
            INSERT INTO logi (id_uzytkownika, action, user_status_at_log, details)
            VALUES (:user_id, :action, :status, :details)
            """,
            {
                "user_id": user_id,
                "action": action,
                "status": user_status,
                "details": details,
            },
        )
    except Exception as e:
        print(f"Error logging user action: {e}")


def get_user_status(user_id):
    """Fetch latest user status for logging."""
    from db import DatabaseHelper
    try:
        record = DatabaseHelper.fetch_one(
            "SELECT status FROM uzytkownicy WHERE id_uzytkownika = :user_id",
            {"user_id": user_id},
        )
        return record.get("status", "unknown") if record else "unknown"
    except Exception as e:
        print(f"Error getting user status: {e}")
        return "unknown"

class Ekstrakcja:
    app = None  
    @staticmethod
    def init_app(application):
        Ekstrakcja.app = application

    @staticmethod
    def dodajProduktyDoBazy(data, id_paragonu, kluczDoGemini, id_uzytkownika=None, auto_commit=True):
        from db import DatabaseHelper
        try:
            for produkt in data['produkty']:
                print("*" * 20)
                print(f"Nazwa produktu: {produkt['nazwa']} - ilosc: {produkt['ilosc']}/{produkt['jednostka']} - Cena: {produkt['cena']} - Podatek: {produkt['podatek']}")
                # Handle possible None values
                if produkt['podatek'] is None:
                    produkt['podatek'] = "BRAK"
                if produkt['ilosc'] is None:
                    produkt['ilosc'] = 0
                if produkt['jednostka'] is None:
                    produkt['jednostka'] = "Brak"
                if produkt['cena'] is None:
                    produkt['cena'] = 0
                if produkt['cenajednostkowa'] is None:
                    produkt['cenajednostkowa'] = 0
                produkt['id_kategorii'] = None
                produkt['nazwa_kategorii'] = None
            
            # Log rozpoczęcia klasyfikacji
            if id_uzytkownika:
                user_status = get_user_status(id_uzytkownika)
                log_user_action(
                    id_uzytkownika,
                    "classify_products_start",
                    user_status,
                    json.dumps({"id_paragonu": id_paragonu, "products_count": len(data['produkty'])}, ensure_ascii=False)
                )
            
            produkty = Ekstrakcja.klasyfikacjaKategorieJedna(data['produkty'], kluczDoGemini)
            print(20*"*")
            print("LAST OPERACJA")
            print(20*"*")
            print(produkty)
            paragon_id = int(id_paragonu)
            for produkt in produkty:
                Ekstrakcja.dodajProdukty(paragon_id, produkt['nazwa'], produkt['cena'], produkt['cenajednostkowa'], produkt['ilosc'], produkt['jednostka'], produkt['podatek'], produkt['id_kategorii'], commit=auto_commit)
            
            # Log zakończenia dodawania produktów
            if id_uzytkownika:
                user_status = get_user_status(id_uzytkownika)
                log_user_action(
                    id_uzytkownika,
                    "add_products_success",
                    user_status,
                    json.dumps({"id_paragonu": id_paragonu, "products_count": len(produkty)}, ensure_ascii=False)
                )
                
        except Exception as e:
            print(f"Error processing products: {e}")
            # Log błędu
            if id_uzytkownika:
                try:
                    user_status = get_user_status(id_uzytkownika)
                    log_user_action(
                        id_uzytkownika,
                        "add_products_error",
                        user_status,
                        json.dumps({"id_paragonu": id_paragonu, "error": str(e)}, ensure_ascii=False)
                    )
                except:
                    pass
            if auto_commit:
                DatabaseHelper.rollback()
            raise e
                
                
    # Funkcja związana z wyswietleniem wszystkich paragonow uzytkownika od id 1 ale tak ze z joinem z tabelą nazwa firmy
    @staticmethod
    def paragonik(img, id_uzytkownika, kluczDoGemini):
        from db import DatabaseHelper
        try:
            genai.configure(api_key=kluczDoGemini)
            safety_settings = [
            {
                "category": "HARM_CATEGORY_HARASSMENT",
                "threshold": "BLOCK_NONE",
            },
            {
                "category": "HARM_CATEGORY_HATE_SPEECH",
                "threshold": "BLOCK_NONE",
            },
            {
                "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                "threshold": "BLOCK_NONE",
            },
            {
                "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                "threshold": "BLOCK_NONE",
            },
            ]


            generation_config = {
            "temperature": 1,
            "top_p": 0.95,
            "top_k": 40,
            "max_output_tokens": 8192
            }
            base64_img = img
            # Operacja zwiazana z przetworzeniem obrazu z wykorzystaniem OCR
            imgB = base64.b64decode(base64_img)
            img=Image.open(io.BytesIO(imgB))
            
            # Konwersja do RGB przed zapisem jako JPEG
            # RGBA (z przezroczystością) nie jest obsługiwane przez JPEG
            if img.mode in ('RGBA', 'LA', 'P'):
                # Tworzymy białe tło dla obrazów z przezroczystością
                background = Image.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                background.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
                img = background
            elif img.mode != 'RGB':
                img = img.convert("RGB")
            
            buffer = io.BytesIO()
            img.save(buffer, format="JPEG")  # Użyj właściwego formatu obrazu
            binary_data = buffer.getvalue()

            model = genai.GenerativeModel(
            #model_name="gemini-1.5-pro-002",
            #model_name="gemini-1.5-pro",
            #model_name="gemini-1.5-pro",
            model_name="gemini-2.5-flash",
            #model_name="gemini-1.5-pro-002",
            #model_name="gemini-2.5-flash-lite-latest",
            safety_settings=safety_settings,
            generation_config=generation_config,
            )
            
            response = model.generate_content(["""Give me results of the receipt in json format in the syntax, if something is missing, enter null. Be careful some prices of products would be below the name of the product.:
            nazwafirmy name of the company. String format.
            ulica street. String format.
            miasto city. String format.
            kodpocztowy postal code. String format.
            nazwa name. String format.
            ilosc means how many products are there, value mostly occurs alone or in front of x and price, with the unit. If you dont have unit its alone! Example 2x8,69 its 2 products. Float format.
            jednostka unit locatet next to ilosc. String format.
            cena price for all products mostly the result of a mathematical operation. Float format.
            cenajednostkowa: The unit price of a product, for one product or full unit price eg. kg. Presented in a float format.
            Podatek A and Ptu A its not the same. Podatek its a full sum o the bought products. Ptu its a sum of the tax. A tax often takes on a name like SPRZEDAZ OPODATKOWANA. Float format.
            Rabat or OPUST its the same as discount. Its not a products, dont add it to a products list!!! If you see prices with the minus its a discount. Float format.
            Mathematical sum up all Rabat or OPUST (ALL DISCOUNTS) price and add to RABAT in json. Float format.
            Remember format of the json. If you dont have some data enter null.
            Read prices very exactly its very important.
            {
            "adres": {
                "nazwafirmy": "Sklep Spożywczy 'Zdrowa Żywność'",
                "ulica": "ul. Zielona 5",
                "miasto": "Warszawa",
                "kodpocztowy": "00-001"
            },
            "produkty": [
                {
                "nazwa": "Chleb",
                "ilosc": 1,
                "jednostka": "szt",
                "cena": 3.50,
                "cenajednostkowa": 3.50,
                "podatek": "A"
                },
                {
                "nazwa": "Pomidory",
                "ilosc": 0.3,
                "jednostka": "kg",
                "cena": 2.80,
                "cenajednostkowa": 9.33,
                "podatek": "D"
                }
            ],
            "podatki": {
                "podatekA": 3.32,
                "podatekB": 9.30,
                "podatekC": 2.14,
                "podatekD": 2.14,
                "PTU A": 2.14,
                "PTU B": 11.44,
                "PTU C": 11.44,
                "PTU D": 11.44,
                "RABAT": -7.32
            },
            "suma": {
                "TOTAL": 11.44
            }
            }""", img], stream=False)

            print(response.text)
            
            wynik = str(response.text)

            def _extract_first_json_block(raw_text):
                depth = 0
                in_string = False
                escape = False
                start_index = None
                for index, char in enumerate(raw_text):
                    if escape:
                        escape = False
                        continue
                    if char == "\\":
                        escape = True
                        continue
                    if char == '"':
                        in_string = not in_string
                        continue
                    if in_string:
                        continue
                    if char == '{' and depth == 0:
                        start_index = index
                        depth = 1
                        continue
                    if char == '{':
                        depth += 1
                        continue
                    if char == '}':
                        depth -= 1
                        if depth == 0 and start_index is not None:
                            return raw_text[start_index:index + 1]
                return None

            json_payload = _extract_first_json_block(wynik)
            if not json_payload:
                raise ValueError("Nie udało się wydobyć poprawnego JSON-a z odpowiedzi modelu AI")

            data = json.loads(json_payload)
            
            nazwa_firmy = data['adres']['nazwafirmy']
            if nazwa_firmy == None:
                data['adres']['nazwafirmy'] = "TrudnoOkreslic"
                nazwa_firmy = "brak"
            ulica_firmy = data['adres']['ulica']
            if ulica_firmy == None:
                data['adres']['ulica'] = "TrudnoOkreslic"
                ulica_firmy = "brak"
            miasto_firmy = data['adres']['miasto']
            if miasto_firmy == None:
                data['adres']['miasto'] = "TrudnoOkreslic"
                miasto_firmy = "brak"
            suma_total = data['suma']['TOTAL']
            if suma_total == None:
                data['suma']['TOTAL'] = 0
                suma_total = 0
            podatekA = data['podatki']['podatekA']
            if podatekA == None:
                data['podatki']['podatekA'] = 0
                podatekA = 0
            podatekB = data['podatki']['podatekB']
            if podatekB == None:
                data['podatki']['podatekB'] = 0
                podatekB = 0
            podatekC = data['podatki']['podatekC']
            if podatekC == None:
                data['podatki']['podatekC'] = 0
                podatekC = 0
            podatekD = data['podatki']['podatekD']
            if podatekD == None:
                podatekD = 0
            PTU_A = data['podatki']['PTU A']
            if PTU_A == None:
                data['podatki']['PTU A'] = 0
                PTU_A = 0
            PTU_B = data['podatki']['PTU B']
            if PTU_B == None:
                data['podatki']['PTU B'] = 0
                PTU_B = 0
            PTU_C = data['podatki']['PTU C']
            if PTU_C == None:
                data['podatki']['PTU C'] = 0
                PTU_C = 0
            PTU_D = data['podatki']['PTU D']
            if PTU_D == None:
                data['podatki']['PTU D'] = 0
                PTU_D = 0
            rabat = data['podatki']['RABAT']
            if rabat == None:
                data['podatki']['RABAT'] = 0
                rabat = 0
            
            print(f"Adres firmy: {nazwa_firmy} - {ulica_firmy} - {miasto_firmy} ")
            print("*"*20)
            Ekstrakcja.wszystkieProdukty(data)
            sumaZOperacji = float(Ekstrakcja.suma(rabat, data))
            print("Suma z operacji matematycznej: ", sumaZOperacji)
            print("*"*20)
            print(f"Podatek A: {podatekA}")
            print(f"Podatek B: {podatekB}")
            print(f"Podatek C: {podatekC}")
            print(f"Podatek D: {podatekD}")
            print(f"PTU A: {PTU_A}")
            print(f"PTU B: {PTU_B}")
            print(f"PTU C: {PTU_C}")
            print(f"PTU D: {PTU_D}")
            print(f"Rabat: {rabat}")
            print("*"*20)
            print(f"Suma z operacji matematycznej: {Ekstrakcja.suma(rabat, data)}")
            print(f"Suma total: {suma_total}")
            
            id_miasta = Ekstrakcja.klasyfikacjaMiastaStart(miasto_firmy, ulica_firmy, miasto_firmy, kluczDoGemini)
            id_firmy = Ekstrakcja.klasyfikacjaFirmyStart(nazwa_firmy, kluczDoGemini)
            # Ekstrakcja.dodajParagon(id_uzytkownika, id_firmy, id_miasta, ulica, suma, rabat)
            try:
                # Log rozpoczęcia dodawania paragonu
                user_status = get_user_status(id_uzytkownika)
                log_user_action(
                    id_uzytkownika,
                    "add_receipt_start",
                    user_status,
                    json.dumps({"firma": nazwa_firmy, "miasto": miasto_firmy, "suma": suma_total}, ensure_ascii=False)
                )
                
                id_paragonu = Ekstrakcja.dodajParagon(
                    id_uzytkownika,
                    id_firmy,
                    id_miasta,
                    ulica_firmy,
                    suma_total,
                    sumaZOperacji,
                    rabat,
                    imgB,
                    auto_commit=False,
                )
                
                # Log zakończenia dodawania paragonu
                log_user_action(
                    id_uzytkownika,
                    "add_receipt_success",
                    user_status,
                    json.dumps({"id_paragonu": id_paragonu, "firma": nazwa_firmy, "suma": suma_total}, ensure_ascii=False)
                )
                
                # Dodawanie produktów do bazy danych - usunięto threading, aby uniknąć problemów z sesją SQLAlchemy
                Ekstrakcja.dodajProduktyDoBazy(data, id_paragonu, kluczDoGemini, id_uzytkownika, auto_commit=False)
                DatabaseHelper.commit()
            except Exception as e:
                # Log błędu
                try:
                    user_status = get_user_status(id_uzytkownika)
                    log_user_action(
                        id_uzytkownika,
                        "add_receipt_error",
                        user_status,
                        json.dumps({"error": str(e)}, ensure_ascii=False)
                    )
                except:
                    pass
                DatabaseHelper.rollback()
                raise

            return str(id_paragonu)
        except Exception as e:
            print(str(e))
            return str(e)
        

    @staticmethod
    def klasyfikacjaKategorieJedna(data, kluczDoGemini):
        from db import DatabaseHelper
        # Zmiana zapytania, aby pobrać ID i nazwę kategorii
        kategorie = DatabaseHelper.fetch_all("SELECT `id_kategorii`, `nazwa` FROM `kategorie`", {})
        
        # Znajdź domyślną kategorię "TrudnoOkreslic"
        default_category_id = None
        for kategoria in kategorie:
            if kategoria['nazwa'] == "TrudnoOkreslic":
                default_category_id = kategoria['id_kategorii']
                break
        
        # Jeśli nie ma kategorii "TrudnoOkreslic", użyj pierwszej dostępnej
        if default_category_id is None and len(kategorie) > 0:
            default_category_id = kategorie[0]['id_kategorii']
            print(f"WARNING: Kategoria 'TrudnoOkreslic' nie istnieje! Używam kategorii: {kategorie[0]['nazwa']}")
        
        if default_category_id is None:
            raise ValueError("BRAK KATEGORII W BAZIE DANYCH! Dodaj przynajmniej jedną kategorię.")
        
        # Zrób joina do nazwa_kategorii z przecinkiem
        nazwa_kategorii = ", ".join(kategoria['nazwa'] for kategoria in kategorie)
        # Połącz wszystkie nazwy produktów z przecinkiem
        nazwa_produktu = ", ".join(produkt['nazwa'] for produkt in data)
        
        # Ulepszone promptowanie z przykładami
        system = f"""Skategoryzuj produkty z paragonu do jednej z mojej listy kategorii.
Dostępne kategorie: {nazwa_kategorii}

WAŻNE ZASADY:
1. Zwróć TYLKO prawidłowy JSON w formacie: {{"1": "NazwaKategorii", "2": "NazwaKategorii", "3": "NazwaKategorii"}}
2. Klucze to numery produktów (od 1), wartości to TYLKO nazwy kategorii
3. NIE dodawaj nazw produktów do JSON
4. NIE używaj zagnieżdżonych struktur
5. Jeśli nie możesz określić kategorii, użyj "TrudnoOkreslic"

PRZYKŁAD POPRAWNEGO FORMATU:
{{"1": "Jedzenie", "2": "Napoje", "3": "TrudnoOkreslic", "4": "Alkohol"}}

PRZYKŁAD BŁĘDNEGO FORMATU (NIE RÓB TAK):
{{"1": "Produkt X": "Jedzenie"}} ❌
{{"produkt1": "Jedzenie"}} ❌
"""
        prompt1 = f"Nazwy produktów do sklasyfikowania:\n{str(nazwa_produktu)}\n\nZwróć TYLKO JSON:"
        
        print("=" * 80)
        print("KLASYFIKACJA KATEGORII - PRÓBA")
        print("=" * 80)
        print(f"Produkty: {nazwa_produktu}")
        print(f"Dostępne kategorie: {nazwa_kategorii}")
        
        # Mechanizm ponawiania z maksymalnie 3 próbami
        max_attempts = 3
        klasyfikacje = None
        
        for attempt in range(1, max_attempts + 1):
            print(f"\n--- PRÓBA {attempt}/{max_attempts} ---")
            
            try:
                kategoria_klasyfikacja = str(Ekstrakcja.geminiAsk(prompt1 + system, 4192, kluczDoGemini))
                print(f"Odpowiedź AI (próba {attempt}):")
                print(kategoria_klasyfikacja)
                
                # Czyszczenie odpowiedzi
                json_string = kategoria_klasyfikacja.strip()
                # Usuń markdown code blocks
                json_string = json_string.replace('```json\n', '').replace('```json', '')
                json_string = json_string.replace('\n```', '').replace('```', '')
                json_string = json_string.strip()
                
                # Jeśli zaczyna się od tekstu przed JSON, spróbuj znaleźć JSON
                if not json_string.startswith('{'):
                    # Szukaj pierwszego { i ostatniego }
                    start_idx = json_string.find('{')
                    end_idx = json_string.rfind('}')
                    if start_idx != -1 and end_idx != -1:
                        json_string = json_string[start_idx:end_idx+1]
                
                print(f"Oczyszczony JSON (próba {attempt}):")
                print(json_string)
                
                # Próba parsowania
                klasyfikacje = json.loads(json_string)
                
                # Walidacja struktury JSON
                if not isinstance(klasyfikacje, dict):
                    raise ValueError("Odpowiedź nie jest słownikiem")
                
                # Sprawdź czy klucze to liczby jako stringi
                valid_keys = all(key.isdigit() for key in klasyfikacje.keys())
                if not valid_keys:
                    raise ValueError("Klucze nie są liczbami")
                
                # Sprawdź czy wartości to stringi (nazwy kategorii)
                valid_values = all(isinstance(val, str) for val in klasyfikacje.values())
                if not valid_values:
                    raise ValueError("Wartości nie są stringami")
                
                print(f"✅ SUKCES! JSON poprawnie sparsowany w próbie {attempt}")
                break  # Sukces - wyjdź z pętli
                
            except json.JSONDecodeError as e:
                print(f"❌ JSON decode error (próba {attempt}): {e}")
                if attempt < max_attempts:
                    print(f"🔄 Ponawiam próbę... ({attempt + 1}/{max_attempts})")
                    prompt1 = f"""POPRZEDNIA ODPOWIEDŹ BYŁA BŁĘDNA!

Nazwy produktów do sklasyfikowania:
{str(nazwa_produktu)}

ZWRÓĆ TYLKO PROSTY JSON W FORMACIE:
{{"1": "NazwaKategorii", "2": "NazwaKategorii", "3": "NazwaKategorii"}}

BEZ ŻADNYCH DODATKOWYCH TEKSTÓW, BEZ NAZW PRODUKTÓW W JSONIE!
"""
                else:
                    print(f"❌ Wszystkie {max_attempts} próby nieudane. Używam domyślnej kategorii.")
                    klasyfikacje = None
                    
            except ValueError as e:
                print(f"❌ Validation error (próba {attempt}): {e}")
                if attempt < max_attempts:
                    print(f"🔄 Ponawiam próbę... ({attempt + 1}/{max_attempts})")
                else:
                    print(f"❌ Wszystkie {max_attempts} próby nieudane. Używam domyślnej kategorii.")
                    klasyfikacje = None
        
        # Jeśli wszystkie próby zawiodły
        if klasyfikacje is None:
            print("=" * 80)
            print("⚠️ PRZYPISYWANIE DOMYŚLNEJ KATEGORII DO WSZYSTKICH PRODUKTÓW")
            print("=" * 80)
            for produkt in data:
                produkt['id_kategorii'] = default_category_id
                produkt['nazwa_kategorii'] = "TrudnoOkreslic"
            return data
         
        # Przypisanie kategorii do każdego produktu w danych
        print("=" * 80)
        print("PRZYPISYWANIE KATEGORII DO PRODUKTÓW")
        print("=" * 80)
        
        for idx, produkt in enumerate(data, start=1):
            # Dodajemy kategorię na podstawie id produktu
            produkt['nazwa_kategorii'] = klasyfikacje.get(str(idx), "TrudnoOkreslic")
            # Szukaj ID dla tej kategorii
            produkt['id_kategorii'] = None  # Resetuj dla każdego produktu
            for kategoria in kategorie:
                if produkt['nazwa_kategorii'] == kategoria['nazwa']:
                    produkt['id_kategorii'] = kategoria['id_kategorii']
                    break  # Znaleziono kategorię, przerwij pętlę
            # Jeśli nie znaleziono kategorii, ustaw domyślną
            if produkt['id_kategorii'] is None:
                print(f"WARNING: Nie znaleziono kategorii '{produkt['nazwa_kategorii']}' dla produktu '{produkt['nazwa']}'. Używam domyślnej.")
                produkt['id_kategorii'] = default_category_id
                produkt['nazwa_kategorii'] = "TrudnoOkreslic"
            
            print(f"✅ Produkt: {produkt['nazwa']} → Kategoria: {produkt['nazwa_kategorii']} (ID: {produkt['id_kategorii']})")
        
        print("=" * 80)
        print("KLASYFIKACJA ZAKOŃCZONA POMYŚLNIE")
        print("=" * 80)
        return data
    
    @staticmethod
    def wszystkieProdukty(data):
        for produkt in data['produkty']:
            print (f"Nazwa produktu: {produkt['nazwa']} - ilosc: {produkt['ilosc']}/{produkt['jednostka']} - Cena: {produkt['cena']} - Podatek: {produkt['podatek']}")
                
    @staticmethod 
    def suma(rabat, data):
        suma = 0
        for produkt in data['produkty']:
            if produkt['cena'] is None:
                produkt['cena'] = 0
            suma += produkt['cena']
        return suma-rabat
        
    @staticmethod
    def dodajParagonOLDBEZKOMPRESJI(mysql, id_uzytkownika, id_firmy, id_miasta, ulica, suma, sumaZOperacji, rabat, binary_data):
        try:
            cur = mysql.connection.cursor()
            sql = "INSERT INTO `paragony` (`id_uzytkownika`, `id_firmy`, `id_miasta`, `ulica`, `suma`, `sumaZOperacji`, `rabat`, `data_dodania`, `obraz` ) VALUES (%s, %s, %s, %s, %s, %s, %s, current_timestamp(), %s)"
            val = (id_uzytkownika, id_firmy, id_miasta, ulica, suma, sumaZOperacji, rabat, binary_data)
            cur.execute(sql, val)
            cur.connection.commit()
            id_paragonu = cur.lastrowid  # Pobieramy ID paragonu
            cur.close()
            print(f"Paragon dodany o ID: {id_paragonu}")
            return str(id_paragonu)
        except Exception as e:
            print(str(e))
            return str(e)
        
    @staticmethod
    def dodajParagon(id_uzytkownika, id_firmy, id_miasta, ulica, suma, sumaZOperacji, rabat, binary_data, auto_commit=True):
        from db import DatabaseHelper, db
        try:
            # Maksymalna kompresja obrazu
            compressed_data = None
            max_width = 800  # Maksymalna szerokość obrazu (można dostosować)
            max_height = 800  # Maksymalna wysokość obrazu (można dostosować)
            quality = 50  # Jakość JPEG (im niższa, tym bardziej skompresowany obraz)
            
            with io.BytesIO(binary_data) as input_buffer:
                with Image.open(input_buffer) as img:
                    # Użycie EXIF do poprawy orientacji
                    img = ImageOps.exif_transpose(img)
                    
                    # Konwersja do RGB PRZED zmianą rozmiaru i zapisem
                    # RGBA (z przezroczystością) nie jest obsługiwane przez JPEG
                    if img.mode in ('RGBA', 'LA', 'P'):
                        # Tworzymy białe tło dla obrazów z przezroczystością
                        background = Image.new('RGB', img.size, (255, 255, 255))
                        if img.mode == 'P':
                            img = img.convert('RGBA')
                        background.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
                        img = background
                    elif img.mode != 'RGB':
                        img = img.convert("RGB")

                    # Zmiana rozmiaru (proporcjonalne skalowanie)
                    img.thumbnail((max_width, max_height))

                    # Kompresja do formatu JPEG z niższą jakością
                    output_buffer = io.BytesIO()
                    img.save(output_buffer, format="JPEG", quality=quality)
                    compressed_data = output_buffer.getvalue()
            # WAGA KOMPRESJI
            print(f"Rozmiar obrazu przed kompresją: {len(binary_data)} bajtów")
            print(f"Rozmiar obrazu po kompresji: {len(compressed_data)} bajtów")
            
            # Validate foreign keys before inserting
            print(f"Debug - About to insert paragon with: id_uzytkownika={id_uzytkownika}, id_firmy={id_firmy}, id_miasta={id_miasta}")
            if id_uzytkownika is None:
                raise ValueError("id_uzytkownika cannot be None")
            if id_firmy is None:
                raise ValueError("id_firmy cannot be None. Make sure the company classification returned a valid ID.")
            if id_miasta is None:
                raise ValueError("id_miasta cannot be None. Make sure the city classification returned a valid ID.")
            
            # Dodanie do bazy danych
            sql = """
                INSERT INTO `paragony` (
                    `id_uzytkownika`, `id_firmy`, `id_miasta`, `ulica`, 
                    `suma`, `sumaZOperacji`, `rabat`, `data_dodania`, `obraz`
                ) VALUES (:id_uzytkownika, :id_firmy, :id_miasta, :ulica, :suma, :sumaZOperacji, :rabat, current_timestamp(), :obraz)
            """
            val = {
                'id_uzytkownika': id_uzytkownika,
                'id_firmy': id_firmy,
                'id_miasta': id_miasta,
                'ulica': ulica,
                'suma': suma,
                'sumaZOperacji': sumaZOperacji,
                'rabat': rabat,
                'obraz': compressed_data
            }
            id_paragonu = DatabaseHelper.execute(sql, val, return_lastrowid=True)

            if id_paragonu is None or int(id_paragonu) == 0:
                raise Exception("Failed to get last insert ID for paragon")
            id_paragonu = int(id_paragonu)
            print(f"Paragon dodany o ID: {id_paragonu}")
            return id_paragonu
        except Exception as e:
            print(f"Error adding paragon: {str(e)}")
            # Transaction is automatically rolled back by the context manager
            raise e  # Re-raise the exception instead of returning it as a string


    @staticmethod
    def dodajProdukty(id_paragonu, nazwa, cena, cenajednostkowa, ilosc, jednostka, podatek, id_kategorii, commit=True):
        from db import DatabaseHelper
        #daj printa wszystkich dostarczonych danych
        paragon_id = int(id_paragonu)
        print(f"ID paragonu: {paragon_id}")
        print(f"Nazwa produktu: {nazwa}")
        print(f"Cena: {cena}")
        print(f"Cenajednostkowa: {cenajednostkowa}")
        print(f"ilosc: {ilosc}")
        print(f"Jednostka: {jednostka}")
        print(f"Podatek: {podatek}")
        print(f"ID kategorii dla {nazwa}: {id_kategorii}")
        
        # Dodajemy id_kodu z wartością domyślną 1 (Nieznane)
        sql = "INSERT INTO `produkty` (`id_paragonu`, `nazwa`, `cena`, `cenajednostkowa`, `ilosc`, `jednostka`, `typ_podatku`, `id_kategorii`, `id_kodu`) VALUES (:id_paragonu, :nazwa, :cena, :cenajednostkowa, :ilosc, :jednostka, :podatek, :id_kategorii, :id_kodu)"
        val = {
            'id_paragonu': paragon_id,
            'nazwa': nazwa,
            'cena': cena,
            'cenajednostkowa': cenajednostkowa,
            'ilosc': ilosc,
            'jednostka': jednostka,
            'podatek': podatek,
            'id_kategorii': id_kategorii,
            'id_kodu': 1  # Wartość domyślna dla nowo dodawanych produktów
        }
        DatabaseHelper.execute(sql, val)
        return f"Produkt dodany o nazwie: {nazwa}"
  

    @staticmethod
    def geminiAsk(pytanie, max_tokens=100, kluczDoGemini=None):
        if kluczDoGemini is None:
            raise ValueError("API key (kluczDoGemini) is required")
        genai.configure(api_key=kluczDoGemini)
        safety_settings = [
            {
            "category": "HARM_CATEGORY_HARASSMENT",
            "threshold": "BLOCK_NONE",
            },
            {
            "category": "HARM_CATEGORY_HATE_SPEECH",
            "threshold": "BLOCK_NONE",
            },
            {
            "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            "threshold": "BLOCK_NONE",
            },
            {
            "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
            "threshold": "BLOCK_NONE",
            },
        ]

        generation_config = {
            "temperature": 1,
            "top_p": 0.95,
            "top_k": 40,
            "max_output_tokens": max_tokens
        }

        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash-lite",
            safety_settings=safety_settings,
            generation_config=generation_config,
        )
        response = model.generate_content([pytanie,], stream=False)
        return str(response.text)
    
    @staticmethod
    def klasyfikacjaFirmy(nazwa_firmyy, kluczDoGemini):
        from db import DatabaseHelper
        # Zmiana zapytania, aby pobrać ID i nazwę miasta
        firmy = DatabaseHelper.fetch_all("SELECT `id_firmy`, `nazwa` FROM `firmy`", {})
        
        # Tworzenie listy z miastami z bazy danych
        #utworz dwie listy dla id i dla miast i wgraj dane z miasta
        id_firmy = None
        nazwa_firm = None
        for firma in firmy:
            id_firmy = firma['id_firmy']
            nazwa_firm = firma['nazwa']
            #zrob joina do nazwa_firm z przecinkiem
        #zrob joina do nazwa_firm z przecinkiem
        nazwa_firm = ", ".join(firma['nazwa'] for firma in firmy)
        system = f"Skategoryzuj firme z paragonu do jednej z mojej listy [firm: {nazwa_firm}]. Zawsze zwracaj jakiś wynik! Jeżeli firme jest trudno określić to daj nazwe TrudnoOkreslic. Daj tylko nazwe firmy w tym formacie: {{\"nazwa\": \"Netto\"}}"
        prompt1=f"Nazwa firmy z paragonu to: {str(nazwa_firmyy)}"
        prompt=f"Skategoryzuj firme z paragonu {str(nazwa_firmyy)} do jednej z mojej listy [firm: {nazwa_firm}]. Zawsze zwracaj jakiś wynik! Jeżeli firme jest trudno określić to daj nazwe TrudnoOkreslic. Daj tylko nazwe firmy w tym formacie: {{\"nazwa\": \"Netto\"}}"
        firma_klasyfikacja = str(Ekstrakcja.geminiAsk(prompt, 512, kluczDoGemini))
        # daj mi załadowanie go do jsona ale pamietaj ze ma na poczatku '''json
        print(firma_klasyfikacja)
        json_string = firma_klasyfikacja.replace('```json\n', '').replace('\n```', '')
        #nazwa_firmy = json.loads(json_string)['nazwa']
        
        try:
            nazwa_firmy = json.loads(json_string).get('nazwa', 'TrudnoOkreslic')
        except json.JSONDecodeError:
            nazwa_firmy = 'TrudnoOkreslic'
        
        #odpytaj dane firmy o id
        id_firmy = None
        for firma in firmy:
            if nazwa_firmy == firma['nazwa']:
                id_firmy = firma['id_firmy']
                break
        
        if id_firmy is None:
            print(f"Warning: Company '{nazwa_firmy}' not found in database after AI classification")
            # Return ID for "TrudnoOkreslic"
            for firma in firmy:
                if firma['nazwa'] == 'TrudnoOkreslic':
                    id_firmy = firma['id_firmy']
                    break
        
        return id_firmy  # Zwracanie listy tupli (id, nazwa)
    
    @staticmethod
    def klasyfikacjaFirmyStart(nazwa_firmyy, kluczDoGemini):
        from db import DatabaseHelper
        # Retrieve company ID and name
        firmy = DatabaseHelper.fetch_all("SELECT `id_firmy`, `nazwa` FROM `firmy`", {})
        
        id_firmy = None
        # Check if the company exists in the database
        for firma in firmy:
            if nazwa_firmyy == firma['nazwa']:
                id_firmy = firma['id_firmy']
                break

        # If company not found, call klasyfikacjaFirmy
        if id_firmy is None:
            print("Firma nie jest w bazie danych")
            print("Rozpoczynam klasyfikację firmy przez AI")
            id_firmy = Ekstrakcja.klasyfikacjaFirmy(nazwa_firmyy, kluczDoGemini)
            
        return id_firmy  # Returning company ID

            
    
    @staticmethod
    def klasyfikacjaMiasta(nazwa_firmy, ulica, miastoo, kluczDoGemini):
        from db import DatabaseHelper
        miasta = DatabaseHelper.fetch_all("SELECT `id_miasta`, `nazwa` FROM `miasta` LIMIT 108", {})
        
        id_miasta_list = []
        nazwa_miasta_list = []
        for miasto in miasta:
            id_miasta_list.append(miasto['id_miasta'])
            nazwa_miasta_list.append(miasto['nazwa'])

        nazwa_miasta_str = ', '.join(nazwa_miasta_list)
        system = f"Skategoryzuj miasto z paragonu do jednej z mojej listy [miast: {nazwa_miasta_str}]. Zawsze zwracaj jakiś wynik! Jeżeli miasto jest trudno określić to daj nazwe TrudnoOkreslic. Daj tylko nazwe w tym formacie: {{\"nazwa\": \"Bydgoszcz\"}}"
        prompt1 = f"Nazwa miasta z paragonu to: {str(miastoo)}."
        prompt = f"Skategoryzuj miasto z paragonu {str(miastoo)} do jednej z mojej listy [miast: {nazwa_miasta_str}]. Zawsze zwracaj jakiś wynik! Jeżeli miasto jest trudno określić to daj nazwe TrudnoOkreslic. Daj tylko nazwe w tym formacie: {{\"nazwa\": \"Bydgoszcz\"}}"
        miasto_klasyfikacja = str(Ekstrakcja.geminiAsk(prompt1+system, 512, kluczDoGemini))
        json_string = miasto_klasyfikacja.replace('```json\n', '').replace('\n```', '')
        try:
            nazwa_miasta = json.loads(json_string).get('nazwa', 'TrudnoOkreslic')
        except json.JSONDecodeError:
            nazwa_miasta = 'TrudnoOkreslic'
        #odpytaj dane miasta o id
        id_miasta = None
        for miasto in miasta:
            if nazwa_miasta == miasto['nazwa']:
                id_miasta = miasto['id_miasta']
                break
        
        if id_miasta is None:
            print(f"Warning: City '{nazwa_miasta}' not found in database after AI classification")
            # Return ID for "TrudnoOkreslic" or a default city
            for miasto in miasta:
                if miasto['nazwa'] == 'TrudnoOkreslic':
                    id_miasta = miasto['id_miasta']
                    break
        
        return id_miasta  # Zwracanie listy tupli (id, nazwa)
    
    @staticmethod
    def klasyfikacjaMiastaStart(nazwa_firmy, ulica, miastoo, kluczDoGemini):
        from db import DatabaseHelper
        miasta = DatabaseHelper.fetch_all("SELECT `id_miasta`, `nazwa` FROM `miasta`", {})
        
        id_miasta = None
        for miasto in miasta:
            if miastoo == miasto['nazwa']:
                id_miasta = miasto['id_miasta']
                break

        if id_miasta is None:
            print("Miasto nie jest w bazie danych")
            print("Rozpoczynam klasyfikację miasta przez AI")
            id_miasta = Ekstrakcja.klasyfikacjaMiasta(nazwa_firmy, ulica, miastoo, kluczDoGemini)
            
        return id_miasta


    def klasyfikacjaKategorie(mysql, nazwa_produktu, kluczDoGemini):
        cur = mysql.connection.cursor()
        cur.execute("SELECT `id_kategorii`, `nazwa` FROM `kategorie`")
        kategorie = cur.fetchall()
        cur.close()
        id_kategorii = None
        nazwa_kategorii = None
        for kategoria in kategorie:
            id_kategorii = kategoria['id_kategorii']
            nazwa_kategorii = kategoria['nazwa']
            
        nazwa_kategorii = ", ".join(kategoria['nazwa'] for kategoria in kategorie)
        system = f"Skategoryzuj produkt z paragonu do jednej z mojej listy [kategorii: {nazwa_kategorii}]. Zawsze zwracaj jakiś wynik!. Jeżeli kategorie jest trudno określić to daj nazwe TrudnoOkreslic. Daj tylko nazwe w tym formacie: {{\"nazwa\": \"Jedzenie\"}}"
        prompt1 = f"Nazwa produktu to: {str(nazwa_produktu)}."
        prompt = f"Skategoryzuj produkt z paragonu {str(nazwa_produktu)} do jednej z mojej listy [kategorii: {nazwa_kategorii}]. Zawsze zwracaj jakiś wynik!. Jeżeli kategorie jest trudno określić to daj nazwe TrudnoOkreslic. Daj tylko nazwe w tym formacie: {{\"nazwa\": \"Jedzenie\"}}"
        print(prompt)
        kategoria_klasyfikacja = str(Ekstrakcja.geminiAsk(prompt1+system, 512, kluczDoGemini))
        print(kategoria_klasyfikacja)
        json_string = kategoria_klasyfikacja.replace('```json\n', '').replace('\n```', '')
        try:
            nazwa_kategorii = json.loads(json_string).get('nazwa', 'TrudnoOkreslic')
        except json.JSONDecodeError:
            nazwa_kategorii = 'TrudnoOkreslic'
        for kategoria in kategorie:
            if nazwa_kategorii == kategoria['nazwa']:
                id_kategorii = kategoria['id_kategorii']
        return id_kategorii 
    
    @staticmethod
    def PobierzSugestieDania(id_paragonu, kluczDoGemini):
        from db import DatabaseHelper
        try:
            print(f"DEBUG PobierzSugestieDania: START dla paragonu ID: {id_paragonu}")
            print(f"DEBUG: API Key length: {len(kluczDoGemini) if kluczDoGemini else 0}")
            
            # Configure Gemini API
            genai.configure(api_key=kluczDoGemini)
            
            # Bezpieczne ustawienia modelu
            safety_settings = [
                {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
            ]

            generation_config = {
                "temperature": 1,
                "top_p": 0.95,
                "top_k": 40,
                "max_output_tokens": 8192
            }

            # Pobieranie produktów z bazy danych
            print(f"DEBUG: Wykonuję zapytanie SQL dla paragonu {id_paragonu}")
            produkty = DatabaseHelper.fetch_all("""
                SELECT `nazwa` AS `nazwa_produktu`
                FROM `produkty`
                WHERE `id_paragonu` = :id_paragonu
            """, {'id_paragonu': id_paragonu})
            print(f"DEBUG: Zapytanie wykonane. Znaleziono {len(produkty) if produkty else 0} produktów")
            if produkty:
                print(f"DEBUG: Pierwsze 3 produkty: {produkty[:3]}")

            if not produkty:
                print(f"DEBUG: BRAK PRODUKTÓW dla paragonu ID: {id_paragonu}")
                return {"recipes": []} 

            products = [item['nazwa_produktu'] for item in produkty]
            print(f"DEBUG: Lista produktów dla Gemini ({len(products)} items): {products}")

            model = genai.GenerativeModel(
                model_name="gemini-2.5-flash",
                safety_settings=safety_settings,
                generation_config=generation_config,
            )
            print(f"DEBUG: Wysyłam zapytanie do Gemini: {products}")
            prompt = """
                Na podstawie dostarczonych produktów z paragonu, zaproponuj 3 unikalne dania, które mogę przygotować z tych składników. (sol i pieprz przewaznie sa w domu)
                Zwróć wynik w formacie JSON, gdzie każdy przepis jest obiektem z polami "Dish_name" (nazwa dania) i "Dish_description" (opis dania).
                [
                    {
                        "Dish_name": "Sałatka z pomidorów i ogórków",
                        "Dish_description": "Pokrój pomidory i ogórki w kostkę. Dodaj oliwę z oliwek, sól, pieprz i wymieszaj."
                    },
                    {
                        "Dish_name": "Kanapka z serem i szynką",
                        "Dish_description": "Na kromkę chleba połóż plaster sera i szynki. Przykryj drugą kromką chleba."
                    },
                    {
                        "Dish_name": "Jajecznica z pomidorami",
                        "Dish_description": "Na patelni rozgrzej masło, dodaj pokrojone pomidory i smaż przez kilka minut. Dodaj roztrzepane jajka, sól, pieprz i smaż do uzyskania odpowiedniej konsystencji."
                    }
                ]
                Produkty:
            """
            prompt += ', '.join(products)
            #print(f"DEBUG: Wysłano zapytanie do Gemini: {prompt}")
            response = model.generate_content(prompt, stream=False)
            #print(f"DEBUG: Otrzymano odpowiedź od Gemini: {response.text}")

            # Parsowanie odpowiedzi JSON
            json_string = response.text.strip().replace('```json', '').replace('```', '')
            try:
                json_response = json.loads(json_string)
            except json.JSONDecodeError as json_error:
                print(f"DEBUG: Błąd dekodowania JSON: {json_error}")
                print(f"DEBUG: Otrzymany tekst: {json_string}")
                raise ValueError("Niepoprawny format odpowiedzi JSON od Gemini.")

            print(f"DEBUG: Zwracam dane: {json_response}")
            # Gemini zwraca listę, opakuj ją w dict z kluczem "recipes"
            if isinstance(json_response, list):
                return {"recipes": json_response}
            # Jeśli już jest dict, sprawdź czy ma klucz "recipes"
            elif isinstance(json_response, dict) and "recipes" not in json_response:
                # Jeśli dict nie ma "recipes", opakuj cały dict
                return {"recipes": [json_response]}
            return json_response

        except Exception as e:
            print(f"DEBUG: Wystąpił błąd podczas przetwarzania paragonu o ID: {id_paragonu}. Błąd: {e}")
            return {"status": "error", "message": str(e)}
        
    @staticmethod
    def UtworzPrzepisDania(id_paragonu, Dish_name, Dish_description, kluczDoGemini):
        from db import DatabaseHelper
        try:
            print(f"DEBUG UtworzPrzepisDania: id_paragonu={id_paragonu}, dish={Dish_name}")
            print(f"DEBUG: API Key length: {len(kluczDoGemini) if kluczDoGemini else 0}")
            
            # Configure Gemini API
            genai.configure(api_key=kluczDoGemini)
            
            safety_settings = [
                {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
            ]

            generation_config = {
                "temperature": 1,
                "top_p": 0.95,
                "top_k": 40,
                "max_output_tokens": 8192
            }

            # Pobieranie produktów z bazy danych
            print("DEBUG: Wykonuję zapytanie do bazy danych o produkty")
            produkty = DatabaseHelper.fetch_all("""
                SELECT `p`.`nazwa` AS `nazwa_produktu`
                FROM `produkty` AS `p`
                WHERE `p`.`id_paragonu` = :id_paragonu
            """, {'id_paragonu': id_paragonu})
            print(f"DEBUG: Pobrano produkty z bazy danych: {produkty}")

            if not produkty:
                print(f"DEBUG: Brak produktów dla paragonu ID: {id_paragonu}. Zwracam puste przepisy")
                return {"recipes": []} 

            products = [item['nazwa_produktu'] for item in produkty]
            print(f"DEBUG: Przygotowane produkty dla Gemini: {products}")

            # Generowanie treści za pomocą Gemini
            model = genai.GenerativeModel(
                model_name="gemini-2.5-flash",
                safety_settings=safety_settings,
                generation_config=generation_config,
            )
            print(f"DEBUG: Wysyłam zapytanie do Gemini: {products}")
            prompt = f"""
Jesteś ekspertem kulinarnym. Stwórz szczegółowy przepis na danie w formacie JSON.

Nazwa dania: {Dish_name}
Opis dania: {Dish_description}
Dostępne składniki: {', '.join(products)}

Wygeneruj przepis w DOKŁADNIE tym formacie JSON (bez dodatkowych formatowań markdown):
{{
    "nazwa": "nazwa dania",
    "opis": "Krótki, zachęcający opis dania (2-3 zdania)",
    "czas_przygotowania": "np. 30 minut",
    "trudnosc": "Łatwy/Średni/Trudny",
    "porcje": "np. 2 osoby",
    "skladniki": [
        {{"nazwa": "nazwa składnika", "ilosc": "100g/2 szt/1 łyżka"}},
        {{"nazwa": "nazwa składnika", "ilosc": "200ml"}}
    ],
    "kroki": [
        "Krok 1: Szczegółowy opis pierwszego kroku przygotowania",
        "Krok 2: Szczegółowy opis drugiego kroku przygotowania",
        "Krok 3: Szczegółowy opis trzeciego kroku"
    ],
    "wskazowki": [
        "Wskazówka 1: Pomocna porada dotycząca przygotowania",
        "Wskazówka 2: Sugestia modyfikacji lub podania"
    ],
    "wartosci_odzywcze": {{
        "kalorie": "szacunkowa wartość w kcal na porcję",
        "bialko": "wartość w gramach",
        "tluszcze": "wartość w gramach",
        "weglowodany": "wartość w gramach"
    }}
}}

WAŻNE: 
- Zwróć TYLKO czysty JSON bez żadnego formatowania markdown (bez ```json)
- Użyj dostępnych składników z listy
- Dostosuj ilości do podanej liczby porcji
- Kroki powinny być jasne i szczegółowe
- Wskazówki mogą zawierać emotikonę na początku (np. 💡, 🔥, 👨‍🍳)
"""
            response = model.generate_content(prompt, stream=False)
            print(f"DEBUG: Otrzymano przepis od Gemini, długość: {len(response.text) if response.text else 0}")
            
            # Parse JSON response
            recipe_text = response.text.strip()
            # Remove markdown code blocks if present
            if recipe_text.startswith('```json'):
                recipe_text = recipe_text[7:]
            if recipe_text.startswith('```'):
                recipe_text = recipe_text[3:]
            if recipe_text.endswith('```'):
                recipe_text = recipe_text[:-3]
            recipe_text = recipe_text.strip()
            
            try:
                recipe_json = json.loads(recipe_text)
                print(f"DEBUG: Przepis sparsowany jako JSON")
                return {"status": "success", "recipe": recipe_json, "recipe_text": response.text}
            except json.JSONDecodeError as je:
                print(f"DEBUG: Błąd parsowania JSON, zwracam jako tekst: {je}")
                # Fallback to text format if JSON parsing fails
                return {"status": "success", "recipe_text": response.text, "recipe": {"opis": response.text}}
        except Exception as e:
            print(f"DEBUG: Błąd w UtworzPrzepisDania: {e}")
            return {"status": "error", "message": str(e)}
    
    @staticmethod
    def AnalizaZdrowotosciPosilku(id_paragonu, kluczDoGemini):
        """
        Analiza zdrowotności posiłku na podstawie produktów z paragonu.
        Generuje raport dotyczący wartości odżywczych, kaloryczności i zaleceń zdrowotnych.
        
        Args:
            id_paragonu (int): ID paragonu do analizy
            kluczDoGemini (str): Klucz API do Gemini
            
        Returns:
            dict: Raport zdrowotności zawierający:
                - status: "success" lub "error"
                - analiza_kalorii: szacunkowa liczba kalorii
                - makroelementy: analiza białek, tłuszczy, węglowodanów
                - produkty_wysoko_cukrowe: lista produktów z wysoką zawartością cukru
                - produkty_wysoko_tluszczowe: lista produktów z wysoką zawartością tłuszczу
                - rekomendacje_zdrowotne: lista zaleceń
                - oznaczenia_dietetyczne: lista oznnaczeń (wegańskie, bezglutenowe, itp.)
                - podsumowanie: ogólny przegląd zdrowotności
        """
        from db import DatabaseHelper
        try:
            print(f"DEBUG AnalizaZdrowotosciPosilku: START dla paragonu ID: {id_paragonu}")
            print(f"DEBUG: API Key length: {len(kluczDoGemini) if kluczDoGemini else 0}")
            
            # Configure Gemini API
            genai.configure(api_key=kluczDoGemini)
            
            # Bezpieczne ustawienia modelu
            safety_settings = [
                {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
            ]

            generation_config = {
                "temperature": 1,
                "top_p": 0.95,
                "top_k": 40,
                "max_output_tokens": 8192
            }

            # Pobieranie produktów z bazy danych
            print(f"DEBUG: Wykonuję zapytanie SQL dla paragonu {id_paragonu}")
            produkty = DatabaseHelper.fetch_all("""
                SELECT `nazwa` AS `nazwa_produktu`, `cena`, `ilosc`, `jednostka`, `typ_podatku`
                FROM `produkty`
                WHERE `id_paragonu` = :id_paragonu
            """, {'id_paragonu': id_paragonu})
            
            print(f"DEBUG: Zapytanie wykonane. Znaleziono {len(produkty) if produkty else 0} produktów")
            if produkty:
                print(f"DEBUG: Pierwsze 3 produkty: {produkty[:3]}")

            if not produkty:
                print(f"DEBUG: BRAK PRODUKTÓW dla paragonu ID: {id_paragonu}")
                return {"status": "error", "message": "Brak produktów do analizy"} 

            products = [item['nazwa_produktu'] for item in produkty]
            print(f"DEBUG: Lista produktów dla Gemini ({len(products)} items): {products}")

            model = genai.GenerativeModel(
                model_name="gemini-2.5-flash",
                safety_settings=safety_settings,
                generation_config=generation_config,
            )
            
            prompt = f"""
Wykonaj szczegółową analizę zdrowotności posiłku na podstawie dostarczonych produktów.

PRODUKTY Z ZAKUPÓW:
{', '.join(products)}

Zwróć wynik w formacie JSON z następującą strukturą:
{{
    "analiza_kalorii": {{
        "szacunkowe_kalorie_na_porcje": NUMBER,
        "opis": "STRING - krótki opis szacowanej kaloryczności"
    }},
    "makroelementy": {{
        "bialka_procent": NUMBER (0-100),
        "tluszcze_procent": NUMBER (0-100),
        "weglowodany_procent": NUMBER (0-100),
        "opis": "STRING - analiza balansu makroelementów"
    }},
    "produkty_wysoko_cukrowe": [
        {{"nazwa": "STRING", "zalecenie": "STRING"}}
    ],
    "produkty_wysoko_tluszczowe": [
        {{"nazwa": "STRING", "zalecenie": "STRING"}}
    ],
    "produkty_wysoko_solone": [
        {{"nazwa": "STRING", "zalecenie": "STRING"}}
    ],
    "rekomendacje_zdrowotne": [
        "STRING - zalecenie 1",
        "STRING - zalecenie 2",
        "STRING - zalecenie 3"
    ],
    "oznaczenia_dietetyczne": [
        {{"typ": "STRING (np. wegańskie, bezglutenowe, itp.)", "dostepne": BOOLEAN}}
    ],
    "podsumowanie": "STRING - ogólny przegląd zdrowotności posiłku (2-3 zdania)",
    "ocena_zdrowotnosci": "STRING (Zdrowy, Umiarkowany, Wysoko-kalorijny)",
    "wskazowki_dla_diety": "STRING - specjalne wskazówki dla osób na diecie"
}}

WAŻNE:
1. Zwróć TYLKO poprawny JSON, bez żadnych dodatkowych tekstów
2. Bądź szczególnie ostrożny przy identyfikacji produktów cukierniczych i tłustych
3. Jeśli produktu nie ma na liście, pomiń go w analizie
4. Procenty makroelementów powinny sumować się do ~100%
5. Podaj praktyczne rady, które użytkownik może zastosować
"""
            
            print(f"DEBUG: Wysyłam zapytanie do Gemini")
            response = model.generate_content(prompt, stream=False)
            print(f"DEBUG: Otrzymano odpowiedź od Gemini, długość: {len(response.text) if response.text else 0}")

            # Parsowanie odpowiedzi JSON
            json_string = response.text.strip().replace('```json', '').replace('```', '')
            try:
                json_response = json.loads(json_string)
                json_response['status'] = 'success'
                print(f"DEBUG: Zwracam dane: {json_response}")
                return json_response
            except json.JSONDecodeError as json_error:
                print(f"DEBUG: Błąd dekodowania JSON: {json_error}")
                print(f"DEBUG: Otrzymany tekst: {json_string}")
                return {
                    "status": "error",
                    "message": "Błąd przy parsowaniu odpowiedzi AI",
                    "raw_response": json_string
                }

        except Exception as e:
            print(f"DEBUG: Błąd w AnalizaZdrowotosciPosilku: {e}")
            import traceback
            traceback.print_exc()
            return {"status": "error", "message": str(e)}

    @staticmethod
    def RekomendacjeSezonowosci(id_paragonu, kluczDoGemini):
        """
        Rekomendacje dotyczące sezonowości produktów.
        Wskazuje produkty sezonowe i ich najlepsze okresy zakupów.
        
        Args:
            id_paragonu (int): ID paragonu do analizy
            kluczDoGemini (str): Klucz API do Gemini
            
        Returns:
            dict: Raport sezonowości zawierający:
                - status: "success" lub "error"
                - produkty_sezonowe: lista produktów sezonowych z informacjami
                - produkty_wszechsezonowe: lista produktów dostępnych cały rok
                - najlepsze_okresy: informacje o najlepszych okresach na zakupy
                - porady_przechowywania: wskazówki dotyczące przechowywania
                - oszczednosci: szacunkowe oszczędności przy zakupach sezonowych
                - przepisy_wykorzystujace_sezoniwe: przepisy do produktów sezonowych
        """
        from db import DatabaseHelper
        try:
            print(f"DEBUG RekomendacjeSezonowosci: START dla paragonu ID: {id_paragonu}")
            print(f"DEBUG: API Key length: {len(kluczDoGemini) if kluczDoGemini else 0}")
            
            # Configure Gemini API
            genai.configure(api_key=kluczDoGemini)
            
            # Bezpieczne ustawienia modelu
            safety_settings = [
                {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
            ]

            generation_config = {
                "temperature": 1,
                "top_p": 0.95,
                "top_k": 40,
                "max_output_tokens": 8192
            }

            # Pobieranie produktów z bazy danych
            print(f"DEBUG: Wykonuję zapytanie SQL dla paragonu {id_paragonu}")
            produkty = DatabaseHelper.fetch_all("""
                SELECT `nazwa` AS `nazwa_produktu`, `cena`, `ilosc`, `jednostka`
                FROM `produkty`
                WHERE `id_paragonu` = :id_paragonu
            """, {'id_paragonu': id_paragonu})
            
            print(f"DEBUG: Zapytanie wykonane. Znaleziono {len(produkty) if produkty else 0} produktów")
            if produkty:
                print(f"DEBUG: Pierwsze 3 produkty: {produkty[:3]}")

            if not produkty:
                print(f"DEBUG: BRAK PRODUKTÓW dla paragonu ID: {id_paragonu}")
                return {"status": "error", "message": "Brak produktów do analizy"} 

            products = [item['nazwa_produktu'] for item in produkty]
            print(f"DEBUG: Lista produktów dla Gemini ({len(products)} items): {products}")

            model = genai.GenerativeModel(
                model_name="gemini-2.5-flash",
                safety_settings=safety_settings,
                generation_config=generation_config,
            )
            
            prompt = f"""
Wykonaj analizę sezonowości produktów na podstawie dostarczonych danych.

PRODUKTY Z ZAKUPÓW:
{', '.join(products)}

Aktualny miesiąc to: {datetime.now().strftime('%B (%B)')}
Aktualny rok: {datetime.now().year}

Zwróć wynik w formacie JSON z następującą strukturą:
{{
    "produkty_sezonowe": [
        {{
            "nazwa": "STRING - nazwa produktu",
            "typ_sezonowosci": "STRING (letni, zimowy, wiosenny, jesienny, pelny_rok)",
            "najlepszy_okres": "STRING - np. 'Maj-Wrzesień'",
            "obecna_cena_sezonowosc": "STRING (W sezonie, Poza sezonem, Dostepny caly rok)",
            "szacunkowa_roznica_ceny": "NUMBER - procent taniej w sezonie",
            "porady_przechowywania": "STRING - jak przechowywać",
            "najlepsze_zastosowanie": "STRING - jak wykorzystać produkt",
            "przepisy_sezonowe": ["STRING - przepis 1", "STRING - przepis 2"]
        }}
    ],
    "produkty_wszechsezonowe": [
        {{
            "nazwa": "STRING - nazwa produktu",
            "dostepnosc": "dostępny cały rok",
            "notatka": "STRING - dodatkowe info"
        }}
    ],
    "najlepsze_okresy_zakupow": {{
        "wiosna": "STRING - rekomendacje na wiosnę",
        "lato": "STRING - rekomendacje na lato",
        "jesien": "STRING - rekomendacje na jesień",
        "zima": "STRING - rekomendacje na zimę"
    }},
    "oszczednosci": {{
        "szacunkowa_roznica_wydatkow": "STRING - np. 'Możesz zaoszczędzić do 15% na warzywach w sezonie'",
        "produkty_do_zaoszczedzenia": ["STRING - produkt 1", "STRING - produkt 2"]
    }},
    "porady_przechowywania_ogolne": [
        "STRING - porada 1",
        "STRING - porada 2",
        "STRING - porada 3"
    ],
    "linki_do_przepisow": [
        {{
            "nazwa_przepisu": "STRING",
            "produkty_sezonowe_uzyte": ["STRING - produkt 1"],
            "opis": "STRING - krótki opis przepisu"
        }}
    ],
    "podsumowanie": "STRING - podsumowanie analizy sezonowości dla bieżącego okresu"
}}

WAŻNE:
1. Zwróć TYLKO poprawny JSON, bez żadnych dodatkowych tekstów
2. Bądź praktyczny i konkretny w swoich rekomendacjach
3. Orientuj się na sezon w Polsce
4. Jeśli produktu nie ma na liście, pomiń go w analizie
5. Podaj rzeczywiste procenty oszczędności
"""
            
            print(f"DEBUG: Wysyłam zapytanie do Gemini")
            response = model.generate_content(prompt, stream=False)
            print(f"DEBUG: Otrzymano odpowiedź od Gemini, długość: {len(response.text) if response.text else 0}")

            # Parsowanie odpowiedzi JSON
            json_string = response.text.strip().replace('```json', '').replace('```', '')
            try:
                json_response = json.loads(json_string)
                json_response['status'] = 'success'
                print(f"DEBUG: Zwracam dane: {json_response}")
                return json_response
            except json.JSONDecodeError as json_error:
                print(f"DEBUG: Błąd dekodowania JSON: {json_error}")
                print(f"DEBUG: Otrzymany tekst: {json_string}")
                return {
                    "status": "error",
                    "message": "Błąd przy parsowaniu odpowiedzi AI",
                    "raw_response": json_string
                }

        except Exception as e:
            print(f"DEBUG: Błąd w RekomendacjeSezonowosci: {e}")
            import traceback
            traceback.print_exc()
            return {"status": "error", "message": str(e)}

    @staticmethod
    def pobierzInformacjeOProdukcie(product_name, kluczDoGemini):
        from db import DatabaseHelper
        
        # Najpierw korygujemy nazwę produktu
        prompt = f"Twoim zadaniem jest poprawienie nazwy na bardziej popularna np. dostaniesz nazwe Pizza Margh to zamien na Pizza margherita inny przykład to CocaCocla500ml to zamień na CocaCola, SosCulineo500G to daj na SosCulineo itp., zwroc tylko poprawiona nazwe i nic więcej! Nazwa ma byc krótka bez zaznaczania ze to gazowany czy jaka ma jednostkę. Jezeli istnieje taka możliwośc to zwracaj nazwy z polskim akcentem np: ąźćżść, Harnaś. Nazwa produktu to: {product_name}"
        corrected_product_name = Ekstrakcja.geminiAsk(prompt, 100, kluczDoGemini)
        
        print(f"[CACHE CHECK] Sprawdzam bazę danych dla produktu: {corrected_product_name}")
        
        # Sprawdzamy czy produkt już istnieje w bazie danych
        cached_data = DatabaseHelper.pobierzDaneZKodowEan(corrected_product_name)
        
        if cached_data:
            print(f"[CACHE HIT] Znaleziono produkt w bazie danych: {corrected_product_name}")
            return json.dumps(cached_data, ensure_ascii=False)
        
        print(f"[CACHE MISS] Produkt nie znaleziony w bazie, odpytuję API: {corrected_product_name}")
        
        # Jeśli nie ma w bazie, pobieramy z API
        url = "https://pl.openfoodfacts.org/cgi/search.pl"
        params = {
            'search_terms': corrected_product_name,
            'search_simple': 1,
            'action': 'process',
            'country': 'PL',
            'page_size': 1,
            'json': 1,
        }
        response = requests.get(url, params=params)
        
        # Sprawdzenie odpowiedzi
        if response.status_code == 200:
            data = response.json()
            products = data.get('products', [])
            print(f"[API RESPONSE] Otrzymano {len(products)} produktów")
            
            produkty = []
            if products:
                for product in products:
                    product_data = {
                        'nazwa_produktu': product.get('product_name'),
                        'marka': product.get('brands'),
                        'image_thumb_url': product.get('image_url'),
                        'ean': product.get('_id'),
                        'wartosci_odzywcze': {
                            'kalorie': product.get('nutriments', {}).get('energy-kcal_100g'),
                            'tluszcz': product.get('nutriments', {}).get('fat_100g'),
                            'cukry': product.get('nutriments', {}).get('sugars_100g'),
                            'bialko': product.get('nutriments', {}).get('proteins_100g'),
                            'sol': product.get('nutriments', {}).get('salt_100g'),
                            'blonnik': product.get('nutriments', {}).get('fiber_100g'),
                            'weglowodany': product.get('nutriments', {}).get('carbohydrates_100g'),
                            'sod': product.get('nutriments', {}).get('sodium_100g'),
                            'wartosc_odzywcza': product.get('nutriments', {}).get('nutrition-score-fr_100g'),
                            'allergens': product.get('allergens'),
                            'ingredients_text': product.get('ingredients_text')
                        }
                    }
                    produkty.append(product_data)
                    
                    # Zapisujemy do bazy danych z poprawioną nazwą produktu
                    try:
                        product_data['nazwa_produktu'] = corrected_product_name
                        nowy_id_kodu = DatabaseHelper.zapiszKodEanDoBazy(product_data)
                        print(f"[CACHE SAVE] Zapisano produkt do bazy: {corrected_product_name} (id_kodu: {nowy_id_kodu})")
                        
                        # Aktualizujemy id_kodu w tabeli produkty dla tego produktu
                        # Używamy oryginalnej nazwy produktu (product_name) bo tak jest zapisana w tabeli produkty
                        updated_count = DatabaseHelper.aktualizujIdKoduDlaProduktu(product_name, nowy_id_kodu)
                        print(f"[PRODUCT UPDATE] Zaktualizowano {updated_count} produktów w tabeli produkty (nazwa: {product_name})")
                        
                    except Exception as e:
                        print(f"[CACHE ERROR] Błąd podczas zapisywania do bazy: {e}")
                        # Kontynuujemy nawet jeśli zapis się nie powiódł
            else:
                print(f"[API ERROR] Nie znaleziono produktów dla: {corrected_product_name}")
                return json.dumps({'status': 'error', 'message': 'Nie znaleziono produktów dla: ' + corrected_product_name}, ensure_ascii=False)
            
            return json.dumps(produkty, ensure_ascii=False)
        else:
            print(f"[HTTP ERROR] Błąd HTTP: {response.status_code}")
            return json.dumps({'status': 'error', 'message': f'Błąd HTTP: {response.status_code}'}, ensure_ascii=False)
        
        