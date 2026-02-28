// API Service - handles all HTTP requests to the backend
class ApiService {
    constructor() {
        this.baseURL = CONFIG.API_BASE_URL;
        this.token = this.getToken();
        
        // Log detected API URL for debugging
        console.log('🌐 API Base URL:', this.baseURL);
        console.log('📍 Current location:', window.location.href);
    }

    // Get token from localStorage
    getToken() {
        const token = localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
        
        // Check if token exists and is still valid
        if (token && this.isSessionValid()) {
            return token;
        }
        
        // Token expired or invalid
        if (token) {
            this.removeToken();
        }
        return null;
    }

    // Check if session is still valid (within 24 hours)
    isSessionValid() {
        const tokenTimestamp = localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN_TIMESTAMP);
        
        if (!tokenTimestamp) {
            return false;
        }
        
        const now = Date.now();
        const tokenAge = now - parseInt(tokenTimestamp, 10);
        
        // Check if token is older than 24 hours
        if (tokenAge > CONFIG.SESSION_TTL) {
            console.warn('Session expired: Token is older than 24 hours');
            return false;
        }
        
        return true;
    }

    // Get remaining session time in milliseconds
    getSessionRemainingTime() {
        const tokenTimestamp = localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN_TIMESTAMP);
        
        if (!tokenTimestamp) {
            return 0;
        }
        
        const now = Date.now();
        const tokenAge = now - parseInt(tokenTimestamp, 10);
        const remaining = CONFIG.SESSION_TTL - tokenAge;
        
        return Math.max(0, remaining);
    }

    // Set token in localStorage with timestamp
    setToken(token) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.TOKEN, token);
        localStorage.setItem(CONFIG.STORAGE_KEYS.TOKEN_TIMESTAMP, Date.now().toString());
        this.token = token;
    }

    // Remove token from localStorage
    removeToken() {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN_TIMESTAMP);
        this.token = null;
    }

    // Build headers for requests
    getHeaders(includeAuth = true, contentType = 'application/json') {
        const headers = {};
        
        if (contentType) {
            headers['Content-Type'] = contentType;
        }
        
        if (includeAuth && this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        return headers;
    }

    // Generic request method
    async request(endpoint, options = {}) {
        // Check if session is still valid before making request
        if (options.auth !== false) {
            if (!this.isSessionValid()) {
                this.removeToken();
                throw new Error('Sesja wygasła. Zaloguj się ponownie.');
            }
        }

        const url = `${this.baseURL}${endpoint}`;
        const config = {
            ...options,
            headers: this.getHeaders(options.auth !== false, options.contentType)
        };

        try {
            const response = await fetch(url, config);
            
            // Handle 401 Unauthorized
            if (response.status === 401) {
                // Get response text first to check for error message
                const text = await response.text();
                let data;
                try {
                    data = JSON.parse(text);
                } catch (e) {
                    data = { message: text };
                }
                
                // If this is a login attempt (endpoint contains /auth/login), don't reload
                // Just throw the error so it can be displayed
                if (endpoint.includes('/auth/login') || endpoint.includes('/auth/register')) {
                    const errorMessage = data.message || data.error || data.msg || 'Nieprawidłowy email lub hasło';
                    throw new Error(errorMessage);
                }
                
                // For other endpoints, this means token expired - logout and reload
                this.removeToken();
                window.location.reload();
                throw new Error('Sesja wygasła. Zaloguj się ponownie.');
            }

            // Get response text first
            const text = await response.text();
            
            // Try to parse as JSON
            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                // If not JSON, return as text
                data = text;
            }

            if (!response.ok) {
                // Extract error message from response
                const errorMessage = data.message || data.error || data.msg || 'Wystąpił błąd';
                throw new Error(errorMessage);
            }

            return data;
        } catch (error) {
            console.error('API Request Error:', error);
            
            // Handle network errors (failed to fetch, connection refused, etc.)
            if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
                throw new Error('Nie można połączyć się z serwerem. Sprawdź połączenie internetowe i spróbuj ponownie.');
            }
            
            // Re-throw other errors
            throw error;
        }
    }

    // GET request
    async get(endpoint, params = {}, auth = true) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        
        return this.request(url, {
            method: 'GET',
            auth
        });
    }

    // POST request
    async post(endpoint, data = {}, auth = true) {
        return this.request(endpoint, {
            method: 'POST',
            auth,
            body: JSON.stringify(data)
        });
    }

    // PUT request
    async put(endpoint, data = {}, auth = true) {
        return this.request(endpoint, {
            method: 'PUT',
            auth,
            body: JSON.stringify(data)
        });
    }

    // DELETE request
    async delete(endpoint, auth = true) {
        return this.request(endpoint, {
            method: 'DELETE',
            auth
        });
    }

    // Auth endpoints
    async register(login, password, imie) {
        return this.post(CONFIG.ENDPOINTS.REGISTER, { login, password, imie }, false);
    }

    async login(login, password) {
        const response = await this.post(CONFIG.ENDPOINTS.LOGIN, { login, password }, false);
        if (response.access_token) {
            this.setToken(response.access_token);
            // Store user info with session timestamp
            localStorage.setItem(CONFIG.STORAGE_KEYS.USER_ID, response.id_uzytkownika);
            localStorage.setItem(CONFIG.STORAGE_KEYS.USER_EMAIL, response.login);
            localStorage.setItem(CONFIG.STORAGE_KEYS.USER_NAME, response.imie);
            localStorage.setItem(CONFIG.STORAGE_KEYS.HAS_API_KEY, response.klucz);
            localStorage.setItem(CONFIG.STORAGE_KEYS.SESSION_TIMESTAMP, Date.now().toString());
        }
        return response;
    }

    async verify() {
        return this.get(CONFIG.ENDPOINTS.VERIFY);
    }

    async logout() {
        const response = await this.post(CONFIG.ENDPOINTS.LOGOUT);
        this.removeToken();
        localStorage.clear();
        return response;
    }

    async addApiKey(key) {
        return this.get(CONFIG.ENDPOINTS.ADD_KEY, { klucz: key });
    }

    async changePassword(newPassword, confirmPassword) {
        return this.post(CONFIG.ENDPOINTS.CHANGE_PASSWORD, { newPassword, confirmPassword });
    }

    // Receipts endpoints
    async getReceipts(page = 0, size = CONFIG.DEFAULT_PAGE_SIZE) {
        const response = await this.get(CONFIG.ENDPOINTS.RECEIPTS, { page, size });
        return typeof response === 'string' ? JSON.parse(response) : response;
    }

    async getReceipt(id) {
        const response = await this.get(`${CONFIG.ENDPOINTS.RECEIPT}/${id}`);
        const parsed = typeof response === 'string' ? JSON.parse(response) : response;
        return parsed[0] || parsed; // Backend returns array with single element
    }

    async updateReceipt(id, data) {
        return this.put(`${CONFIG.ENDPOINTS.RECEIPT_UPDATE}/${id}`, data);
    }

    async deleteReceipt(id) {
        return this.delete(`${CONFIG.ENDPOINTS.RECEIPT_DELETE}/${id}`);
    }

    async analyzeReceipt(base64Image) {
        const response = await this.post(CONFIG.ENDPOINTS.ANALYZE_RECEIPT, { image: base64Image });
        // Backend returns receipt ID as string
        return typeof response === 'string' ? response.replace(/"/g, '') : response;
    }

    // Products endpoints
    async getProducts(receiptId) {
        const response = await this.get(`${CONFIG.ENDPOINTS.PRODUCTS}/${receiptId}`);
        return typeof response === 'string' ? JSON.parse(response) : response;
    }

    async updateProduct(id, data) {
        return this.put(`${CONFIG.ENDPOINTS.PRODUCT_UPDATE}/${id}`, data);
    }

    async deleteProduct(id) {
        return this.delete(`${CONFIG.ENDPOINTS.PRODUCT_DELETE}/${id}`);
    }

    async getProductsForReceipt() {
        const response = await this.get(CONFIG.ENDPOINTS.PRODUCTS_FOR_RECEIPT);
        return typeof response === 'string' ? JSON.parse(response) : response;
    }

    async getProductsForCategory(categoryId) {
        const response = await this.get(CONFIG.ENDPOINTS.PRODUCTS_FOR_CATEGORY, { id_kategorii: categoryId });
        return typeof response === 'string' ? JSON.parse(response) : response;
    }

    async getProductPriceHistory(productName) {
        const response = await this.get(CONFIG.ENDPOINTS.PRODUCT_PRICE_HISTORY, { nazwa: productName });
        return typeof response === 'string' ? JSON.parse(response) : response;
    }

    async getProductInfo(productName) {
        const response = await this.get(CONFIG.ENDPOINTS.PRODUCT_INFO, { nazwaProduktu: productName });
        return typeof response === 'string' ? JSON.parse(response) : response;
    }

    // Reference data endpoints
    async getCategories() {
        const response = await this.get(CONFIG.ENDPOINTS.CATEGORIES);
        return typeof response === 'string' ? JSON.parse(response) : response;
    }

    async getCities() {
        const response = await this.get(CONFIG.ENDPOINTS.CITIES);
        return typeof response === 'string' ? JSON.parse(response) : response;
    }

    async getCompanies() {
        const response = await this.get(CONFIG.ENDPOINTS.COMPANIES);
        return typeof response === 'string' ? JSON.parse(response) : response;
    }

    // Limits endpoints
    async getLimits() {
        const response = await this.get(CONFIG.ENDPOINTS.LIMITS);
        return typeof response === 'string' ? JSON.parse(response) : response;
    }

    async addLimit(categoryId, limit) {
        return this.get(CONFIG.ENDPOINTS.ADD_LIMIT, { id_kategorii: categoryId, limit });
    }

    async updateLimit(id, data) {
        return this.put(`${CONFIG.ENDPOINTS.UPDATE_LIMIT}/${id}`, data);
    }

    async deleteLimit(id) {
        return this.delete(`${CONFIG.ENDPOINTS.DELETE_LIMIT}/${id}`);
    }

    // Notifications endpoints
    async getNotifications() {
        const response = await this.get(CONFIG.ENDPOINTS.NOTIFICATIONS);
        return typeof response === 'string' ? JSON.parse(response) : response;
    }

    async addNotification(limitId, content) {
        return this.post(CONFIG.ENDPOINTS.ADD_NOTIFICATION, { id_limitu: limitId, tresc: content });
    }

    // Logs endpoints
    async getLogs(page = 0, size = 50, filters = {}) {
        const params = { page, size };
        
        // Add optional filters if provided
        if (filters.details) params.details = filters.details;
        if (filters.dateFrom) params.date_from = filters.dateFrom;
        if (filters.dateTo) params.date_to = filters.dateTo;
        if (filters.userStatus) params.user_status = filters.userStatus;
        if (filters.action) params.action = filters.action;
        
        const response = await this.get(CONFIG.ENDPOINTS.LOGS, params);
        return typeof response === 'string' ? JSON.parse(response) : response;
    }

    // Reports endpoints
    async getReport(startDate, endDate) {
        const response = await this.get(CONFIG.ENDPOINTS.REPORT, { startDate, endDate });
        return typeof response === 'string' ? JSON.parse(response) : response;
    }

    async getFilteredReport(startDate, endDate, categoryIds) {
        const response = await this.get(CONFIG.ENDPOINTS.REPORT_FILTERED, { 
            startDate, 
            endDate, 
            categoryIds: categoryIds.join(',') 
        });
        return typeof response === 'string' ? JSON.parse(response) : response;
    }

    async getCategoryMonthsReport(categoryId, months) {
        const response = await this.get(CONFIG.ENDPOINTS.REPORT_CATEGORY_MONTHS, { 
            id_kategorii: categoryId, 
            months 
        });
        return typeof response === 'string' ? JSON.parse(response) : response;
    }

    // Shopping lists endpoints
    async createShoppingList(products) {
        return this.post(CONFIG.ENDPOINTS.CREATE_LIST, products);
    }

    async getShoppingLists() {
        return this.get(CONFIG.ENDPOINTS.GET_LISTS);
    }

    async getShoppingListContent(listId) {
        const response = await this.get(`${CONFIG.ENDPOINTS.GET_LIST_CONTENT}/${listId}`);
        return typeof response === 'string' ? JSON.parse(response) : response;
    }

    async deleteShoppingList(listId) {
        return this.delete(`${CONFIG.ENDPOINTS.DELETE_LIST}/${listId}`);
    }

    // Search endpoints
    async searchByCompany(companyName) {
        const response = await this.get(CONFIG.ENDPOINTS.SEARCH_COMPANY, { nazwaFirmy: companyName });
        // Response is already parsed by request() method
        return Array.isArray(response) ? response : [];
    }

    async getReceiptsByCompany(companyName) {
        const response = await this.get(CONFIG.ENDPOINTS.RECEIPTS_BY_COMPANY, { nazwaFirmy: companyName });
        // Response is already parsed by request() method
        return Array.isArray(response) ? response : [];
    }

    // AI endpoints
    async suggestDishes(receiptId) {
        return this.get(CONFIG.ENDPOINTS.SUGGEST_DISHES, { idParagonu: receiptId });
    }

    async createRecipe(receiptId, dishName, dishDescription) {
        return this.post(CONFIG.ENDPOINTS.CREATE_RECIPE, { 
            idParagonu: receiptId, 
            dishName, 
            dishDescription 
        });
    }

    async getHealthAnalysis(receiptId) {
        return this.get(CONFIG.ENDPOINTS.HEALTH_ANALYSIS, { idParagonu: receiptId });
    }

    async getSeasonalRecommendations(receiptId) {
        return this.get(CONFIG.ENDPOINTS.SEASONAL_RECOMMENDATIONS, { idParagonu: receiptId });
    }

    // Session management
    // Revalidate session timestamp on user activity (keep-alive)
    refreshSessionTimestamp() {
        const token = localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
        if (token) {
            // Update session timestamp on user activity
            localStorage.setItem(CONFIG.STORAGE_KEYS.SESSION_TIMESTAMP, Date.now().toString());
            localStorage.setItem(CONFIG.STORAGE_KEYS.TOKEN_TIMESTAMP, Date.now().toString());
        }
    }

    // Get session info for debugging
    getSessionInfo() {
        const token = localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
        const tokenTimestamp = localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN_TIMESTAMP);
        const sessionTimestamp = localStorage.getItem(CONFIG.STORAGE_KEYS.SESSION_TIMESTAMP);
        
        if (!token) {
            return {
                isValid: false,
                token: null,
                remainingTime: 0,
                message: 'No token found'
            };
        }

        const remainingTime = this.getSessionRemainingTime();
        const isValid = this.isSessionValid();
        
        return {
            isValid,
            token: token.substring(0, 20) + '...',
            tokenTimestamp: new Date(parseInt(tokenTimestamp, 10)).toISOString(),
            sessionTimestamp: sessionTimestamp ? new Date(parseInt(sessionTimestamp, 10)).toISOString() : null,
            remainingTime,
            remainingHours: Math.floor(remainingTime / (60 * 60 * 1000)),
            remainingMinutes: Math.floor((remainingTime % (60 * 60 * 1000)) / (60 * 1000)),
            sessionTTL: CONFIG.SESSION_TTL,
            sessionTTLHours: CONFIG.SESSION_TTL / (60 * 60 * 1000)
        };
    }
}

// Create global instance
const api = new ApiService();
