window.guideDatabase = {
    meta: {
        version: '1.0.0',
        updatedAt: '2025-10-17',
        summary: 'Skondensowana instrukcja uzytkownika systemu Paragony z opisem kluczowych modulow i scenariuszami pracy z Asystentem AI.'
    },
    quickStart: [
        { id: 'dashboard', icon: 'fa-home', label: 'Dashboard' },
        { id: 'scan', icon: 'fa-camera', label: 'Dodaj paragon' },
        { id: 'assistant', icon: 'fa-robot', label: 'Zapytaj Asystenta' }
    ],
    sections: [
        {
            id: 'dashboard',
            icon: 'fa-home',
            title: 'Dashboard i szybkie akcje',
            summary: 'Widok startowy z kluczowymi liczbami, kafelkami oraz powiadomieniami.',
            keywords: ['start', 'kafelki', 'statystyki', 'widok glowny'],
            focusAreas: [
                {
                    label: 'Widzet finansowy',
                    description: 'Kontroluj liczbe paragonow, wydatki miesieczne i alerty limitow.'
                },
                {
                    label: 'Sekcja powiadomien',
                    description: 'Monitoruj ostatnie alerty i przechodz natychmiast do szczegolow.'
                }
            ],
            steps: [
                'Sprawdz gorne kafelki, aby ocenic aktualna sytuacje finansowa.',
                'Kliknij kafelek z szybka akcja, by przejsc do wybranego modulu.',
                'U dolu widoku sprawdz ostatnie paragony i powiadomienia.'
            ],
            tips: [
                'Asystent AI otwiera pelny widok czatu i ukrywa mini okno nawigacyjne.',
                'Skrot Ctrl+K w pasku wyszukiwania uruchamia wyszukiwanie globalne.'
            ],
            related: [
                { id: 'scan', label: 'Dodaj paragon' },
                { id: 'reports', label: 'Raporty miesieczne' }
            ]
        },
        {
            id: 'scan',
            icon: 'fa-camera',
            title: 'Skanowanie paragonow',
            summary: 'Modul OCR wykorzystujacy Gemini do ekstrakcji danych z obrazow.',
            keywords: ['ocr', 'gemini', 'dodawanie', 'paragon'],
            focusAreas: [
                {
                    label: 'Klucz API',
                    description: 'Dodaj lub zaktualizuj klucz Gemini przed pierwszym skanem.'
                },
                {
                    label: 'Kroki analizy',
                    description: 'Sledz pasek postepu i komunikaty, aby znac etap przetwarzania.'
                }
            ],
            steps: [
                'Przeciagnij obraz JPG, PNG lub PDF albo wybierz plik z dysku.',
                'Zatwierdz wysylke i obserwuj paski postepu w panelu statusu.',
                'Po zakonczeniu otworz liste paragonow, aby zweryfikowac produkty.'
            ],
            tips: [
                'Najlepsze efekty daja wyrazne zdjecia z jednolitym tlem i prosta czcionka.',
                'Mozesz dodac kilka paragonow jeden po drugim, system sklasyfikuje je w tle.'
            ],
            related: [
                { id: 'receipts', label: 'Lista paragonow' },
                { id: 'assistant', label: 'Analiza wynikow z AI' }
            ]
        },
        {
            id: 'receipts',
            icon: 'fa-file-invoice',
            title: 'Paragony i produkty',
            summary: 'Lista zapisanych dokumentow z mozliwoscia edycji pozycji.',
            keywords: ['lista', 'produkty', 'edycja', 'archiwum'],
            focusAreas: [
                {
                    label: 'Filtry i wyszukiwanie',
                    description: 'Filtruj po sklepie, dacie i kwocie, aby szybko odnalezc potrzebny dokument.'
                },
                {
                    label: 'Edycja pozycji',
                    description: 'Rozwin paragon i aktualizuj nazwy, ilosci oraz kategorie produktow.'
                }
            ],
            steps: [
                'Kliknij paragon na liscie, by zobaczyc jego produkty.',
                'Uzyj przycisku edycji przy produkcie, aby poprawic nazwe lub cene.',
                'Zastosuj filtry dat, gdy tworzysz raporty okresowe.'
            ],
            tips: [
                'Zmiany w produktach od razu wplywaja na raporty i limity.',
                'Usuwane paragony trafiaja do kosza logicznego i mozna je przywrocic.'
            ],
            related: [
                { id: 'reports', label: 'Raporty okresowe' },
                { id: 'limits', label: 'Kontrola limitow' }
            ]
        },
        {
            id: 'limits',
            icon: 'fa-chart-pie',
            title: 'Limity budzetowe',
            summary: 'Definiowanie progow wydatkow dla poszczegolnych kategorii.',
            keywords: ['budzet', 'limit', 'alert', 'planowanie'],
            focusAreas: [
                {
                    label: 'Monitorowanie',
                    description: 'Kazda kategoria pokazuje aktualne wykorzystanie limitu.'
                },
                {
                    label: 'Alerty',
                    description: 'Powiadomienia informuja o przekroczeniach i zblizaniu sie do progu.'
                }
            ],
            steps: [
                'Dodaj limit wybierajac kategorie oraz miesieczny budzet.',
                'Edytuj lub usuwaj limity wraz ze zmiana planu finansowego.',
                'Obserwuj ostrzezenia w panelu powiadomien i na dashboardzie.'
            ],
            tips: [
                'Kategorie limitow sa wspoldzielone z raportami i produktami, dbaj o spojnosc nazw.',
                'Planowanie sezonowe ulatwia duplikowanie limitow i zmiane okresu obowiazywania.'
            ],
            related: [
                { id: 'notifications', label: 'Alerty przekroczen' },
                { id: 'assistant', label: 'Pytania o limit' }
            ]
        },
        {
            id: 'reports',
            icon: 'fa-chart-line',
            title: 'Raporty i analizy',
            summary: 'Przekrojowe zestawienia wydatkow wraz z wykresami i porownaniami.',
            keywords: ['raporty', 'wykres', 'trend', 'porownanie'],
            focusAreas: [
                {
                    label: 'Zakres dat',
                    description: 'Dostosuj zakres, aby badac tydzien, miesiac lub rok.'
                },
                {
                    label: 'Porownania okresowe',
                    description: 'Porownuj okresy i wykrywaj trendy sezonowe.'
                }
            ],
            steps: [
                'Wybierz zakres dat oraz kategorie do analizy.',
                'Odczytaj wskazniki na wykresach, aby ocenic dynamike wydatkow.',
                'Zapisuj wnioski i w razie potrzeby wyslij je do Asystenta AI.'
            ],
            tips: [
                'Klikanie legendy wykresu ukrywa wybrane serie danych.',
                'Po edycji paragonu odswiez raport, aby przeliczyc statystyki.'
            ],
            related: [
                { id: 'assistant', label: 'Analiza AI' },
                { id: 'limits', label: 'Limity a raporty' }
            ]
        },
        {
            id: 'shopping-lists',
            icon: 'fa-shopping-cart',
            title: 'Listy zakupow',
            summary: 'Planowanie zakupow i monitorowanie wydatkow na bazie list kontrolnych.',
            keywords: ['lista', 'zakupy', 'plan', 'kontrola'],
            focusAreas: [
                {
                    label: 'Aktywne listy',
                    description: 'Przechowuj aktualne listy wraz z planowanym kosztem.'
                },
                {
                    label: 'Udostepnianie',
                    description: 'Kopiuj zawartosc listy, aby wyslac ja SMS-em lub w komunikatorze.'
                }
            ],
            steps: [
                'Utworz nowa liste i dodaj pozycje z kategoriami oraz orientacyjnymi cenami.',
                'Oznaczaj produkty jako kupione, aby aktualizowac pozostaly budzet.',
                'Archiwizuj zakonczone listy, aby analizowac przyzwyczajenia zakupowe.'
            ],
            tips: [
                'Asystent AI potrafi zaproponowac liste na podstawie historii zakupow.',
                'Polacz liste z paragonem, aby szybciej potwierdzic ceny.'
            ],
            related: [
                { id: 'assistant', label: 'Lista od Asystenta' },
                { id: 'receipts', label: 'Potwierdz ceny' }
            ]
        },
        {
            id: 'search',
            icon: 'fa-search',
            title: 'Wyszukiwarka produktow',
            summary: 'Szczegolowe wyszukiwanie produktow z filtrami cen, sklepow i dat.',
            keywords: ['wyszukiwarka', 'filtry', 'produkty', 'historia'],
            focusAreas: [
                {
                    label: 'Szybkie wyniki',
                    description: 'Podczas pisania pojawiaja sie podpowiedzi dla popularnych zapytan.'
                },
                {
                    label: 'Panel filtrow',
                    description: 'Zawez wyniki po cenie, sklepie lub przedziale czasowym.'
                }
            ],
            steps: [
                'Wpisz minimum trzy znaki, aby aktywowac wyszukiwarke.',
                'Ustaw filtry, gdy potrzebujesz precyzyjnych wynikow.',
                'Kliknij produkt, aby zobaczyc historie cen i powiazane paragony.'
            ],
            tips: [
                'Historia wyszukiwania zapisywana jest lokalnie i mozna ja wyczyscic jednym kliknieciem.',
                'Po znalezieniu produktu mozesz przekazac go do listy zakupow lub poprosic AI o analize.'
            ],
            related: [
                { id: 'dashboard', label: 'Szybkie wyszukiwanie' },
                { id: 'receipts', label: 'Produkty w paragonach' }
            ]
        },
        {
            id: 'notifications',
            icon: 'fa-bell',
            title: 'Powiadomienia i alerty',
            summary: 'Centralne miejsce do zarzadzania alertami systemowymi i budzetowymi.',
            keywords: ['powiadomienia', 'alert', 'monitoring'],
            focusAreas: [
                {
                    label: 'Zakladki filtrow',
                    description: 'Przelaczaj sie miedzy wszystkimi, nieprzeczytanymi i waznymi alertami.'
                },
                {
                    label: 'Masowe akcje',
                    description: 'Przycisk oznacz wszystko przyspiesza porzadki w skrzynce.'
                }
            ],
            steps: [
                'Wybierz odpowiedni filtr, aby skupic sie na danym typie powiadomien.',
                'Kliknij powiadomienie, by otworzyc szczegoly i przejsc do powiazanych danych.',
                'Uzyj masowych akcji, gdy chcesz wyczyscic cala liste.'
            ],
            tips: [
                'Alerty o limitach sa kolorowane, co ulatwia ich wychwycenie na dashboardzie.',
                'Licznik powiadomien w nawigacji aktualizuje sie automatycznie.'
            ],
            related: [
                { id: 'limits', label: 'Kontrola limitow' },
                { id: 'dashboard', label: 'Podglad alertow' }
            ]
        },
        {
            id: 'assistant',
            icon: 'fa-robot',
            title: 'Wirtualny Asystent AI',
            summary: 'Czat konwersacyjny integrujacy dane o paragonach, limitach i listach.',
            keywords: ['assistant', 'ai', 'czat', 'analiza'],
            focusAreas: [
                {
                    label: 'Sugestie startowe',
                    description: 'Wybierz gotowe tematy, aby szybko poznac mozliwosci asystenta.'
                },
                {
                    label: 'Wykorzystanie narzedzi',
                    description: 'Asystent automatycznie pobiera dane z modulow i proponuje kolejne kroki.'
                }
            ],
            steps: [
                'Zadaj pytanie naturalnym jezykiem, np. o wydatki z ostatniego miesiaca.',
                'Przejrzyj odpowiedz wraz z kontekstem i rekomendacjami.',
                'Wykorzystaj przyciski podpowiedzi, aby poglebic rozmowe.'
            ],
            tips: [
                'Mozesz poprosic o podsumowanie nowego paragonu przed jego edycja.',
                'Asystent rozumie krotsze polecenia i reaguje na jezyk polski.'
            ],
            assistantExamples: [
                {
                    title: 'Analiza budzetu',
                    prompt: 'Porownaj moje wydatki na zywnosc z dwoch ostatnich miesiecy i podaj procentowa roznice.',
                    followUp: 'Zaproponuj limit na kolejny miesiac, jezeli wydatki rosna.'
                },
                {
                    title: 'Wsparcie zakupowe',
                    prompt: 'Na podstawie historii przygotuj liste zakupow na weekend.',
                    followUp: 'Dodaj tansze zamienniki, jezeli przekraczam budzet.'
                }
            ],
            related: [
                { id: 'reports', label: 'Dane do analizy' },
                { id: 'shopping-lists', label: 'Listy z czatu' }
            ]
        },
        {
            id: 'profile',
            icon: 'fa-user',
            title: 'Profil i ustawienia',
            summary: 'Konfiguracja konta, kluczy API oraz przeglad logow systemowych.',
            keywords: ['profil', 'bezpieczenstwo', 'klucz api', 'logi'],
            focusAreas: [
                {
                    label: 'Dane logowania',
                    description: 'Aktualizuj haslo oraz monitoruj aktywne sesje.'
                },
                {
                    label: 'Klucze i integracje',
                    description: 'Dodawaj klucze Gemini i sledz ich wykorzystanie.'
                }
            ],
            steps: [
                'Zmien dane profilu i zapisz, aby odnowic token JWT.',
                'Sprawdz dziennik zdarzen w poszukiwaniu nietypowych logowan.',
                'Dodaj lub usun klucz API podczas rotacji uprawnien.'
            ],
            tips: [
                'Po aktualizacji klucza odswiez modul Skanowanie przed kolejnym importem.',
                'Eksportuj logi, aby przekazac je zespolowi wsparcia.'
            ],
            related: [
                { id: 'scan', label: 'Klucz dla OCR' },
                { id: 'assistant', label: 'Dostep do narzedzi AI' }
            ]
        }
    ]
};