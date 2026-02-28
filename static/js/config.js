// Configuration for the Paragony App

/**
 * Automatyczne wykrywanie API Base URL
 * Działa dynamicznie na localhost, produkcji, i każdym innym środowisku
 */
function getApiBaseUrl() {
    // Jeśli aplikacja hostowana przez Flask, użyj tej samej domeny
    const protocol = window.location.protocol; // 'http:' lub 'https:'
    const hostname = window.location.hostname; // 'localhost', '192.168.1.x', 'paragony.app', itp.
    const port = window.location.port;         // '5000', '80', '443', itp.
    
    // Jeśli port jest standardowy (80 dla HTTP, 443 dla HTTPS), nie dołączaj go
    const portSuffix = port && port !== '80' && port !== '443' ? `:${port}` : '';
    
    return `${protocol}//${hostname}${portSuffix}`;
}

const CONFIG = {
    // API Base URL - wykrywane automatycznie na podstawie aktualnej lokalizacji
    API_BASE_URL: getApiBaseUrl(),
    
    // Storage keys
    STORAGE_KEYS: {
        TOKEN: 'paragony_token',
        TOKEN_TIMESTAMP: 'paragony_token_timestamp',
        USER_ID: 'paragony_user_id',
        USER_EMAIL: 'paragony_user_email',
        USER_NAME: 'paragony_user_name',
        HAS_API_KEY: 'paragony_has_api_key',
        SESSION_TIMESTAMP: 'paragony_session_timestamp',
        // AI Cache keys
        AI_CACHE_PREFIX: 'paragony_ai_cache_',
        AI_HEALTH_ANALYSIS: 'paragony_ai_health_analysis_',
        AI_SEASONAL_RECOMMENDATIONS: 'paragony_ai_seasonal_',
        AI_RECIPE_SUGGESTIONS: 'paragony_ai_recipes_'
    },
    
    // Session TTL (24 hours in milliseconds)
    SESSION_TTL: 24 * 60 * 60 * 1000, // 86,400,000 ms
    
    // Pagination
    DEFAULT_PAGE_SIZE: 7,
    
    // Date formats
    DATE_FORMAT: 'YYYY-MM-DD',
    
    // Timeouts
    REQUEST_TIMEOUT: 30000, // 30 seconds
    TOAST_DURATION: 5000,   // 5 seconds
    
    // File upload
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png'],
    
    // API Endpoints
    ENDPOINTS: {
        // Auth
        REGISTER: '/auth/register',
        LOGIN: '/auth/login',
        VERIFY: '/verify',
        LOGOUT: '/logout',
        ADD_KEY: '/addKey',
        CHANGE_PASSWORD: '/ZmienHaslo',
        
        // Receipts
        RECEIPTS: '/paragony',
        RECEIPT: '/paragon',
        RECEIPT_UPDATE: '/paragonUpdate',
        RECEIPT_DELETE: '/paragonDelete',
        ANALYZE_RECEIPT: '/analyze-receipt',
        
        // Products
        PRODUCTS: '/produkty',
        PRODUCT_UPDATE: '/produktyUpdate',
        PRODUCT_DELETE: '/produktDelete',
        PRODUCTS_FOR_RECEIPT: '/produktyDlaParagonu',
        PRODUCTS_FOR_CATEGORY: '/produktyzkategorii',
        PRODUCT_PRICE_HISTORY: '/produktyHistoriaCen',
        PRODUCT_INFO: '/pobierzInformacjeOProdukcie',
        
        // Reference data
        CATEGORIES: '/pobierzKategorie',
        CITIES: '/pobierzMiasta',
        COMPANIES: '/pobierzFirmy',
        
        // Limits
        LIMITS: '/limit',
        ADD_LIMIT: '/dodajlimit',
        UPDATE_LIMIT: '/limitUpdate',
        DELETE_LIMIT: '/limitDelete',
        
        // Notifications
        NOTIFICATIONS: '/powiadomienia',
        ADD_NOTIFICATION: '/dodaj_powiadomienie',
        
        // Logs
        LOGS: '/logi',
        
        // Reports
        REPORT: '/raport',
        REPORT_FILTERED: '/raport_z_filtrem',
        REPORT_CATEGORY_MONTHS: '/raportWydatkowKategorieMiesiace',
        
        // Shopping Lists
        CREATE_LIST: '/utworzListe',
        GET_LISTS: '/pobierzListy',
        GET_LIST_CONTENT: '/pobierzZawartoscListy',
        DELETE_LIST: '/usunListe',
        
        // Search
        SEARCH_COMPANY: '/wyszukiwaniesklepu',
        RECEIPTS_BY_COMPANY: '/paragonyPokazPoFirmie',
        
        // AI Features
        SUGGEST_DISHES: '/PobierzSugestieDania',
        CREATE_RECIPE: '/UtworzPrzepisDania',
        HEALTH_ANALYSIS: '/AnalizaZdrowotosciPosilku',
        SEASONAL_RECOMMENDATIONS: '/RekomendacjeSezonowosci'
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
