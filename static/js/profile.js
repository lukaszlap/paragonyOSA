// Profile Manager
class ProfileManager {
    constructor() {
        this.currentLogsPage = 0;
        this.logsPageSize = 10;
        this.allLogs = [];
        this.filteredLogs = [];
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const changePasswordForm = document.getElementById('change-password-form');
        const updateApiKeyBtn = document.getElementById('update-api-key-btn');
        const personalDataForm = document.getElementById('personal-data-form');

        if (changePasswordForm) {
            changePasswordForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.changePassword();
            });
        }

        if (updateApiKeyBtn) {
            updateApiKeyBtn.addEventListener('click', () => this.updateApiKey());
        }

        if (personalDataForm) {
            personalDataForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.savePersonalData();
            });
        }

        // Logs tab listeners
        const logsApplyFilterBtn = document.getElementById('logs-apply-filter-btn');
        const logsClearFilterBtn = document.getElementById('logs-clear-filter-btn');
        const logsPrevBtn = document.getElementById('logs-prev-btn');
        const logsNextBtn = document.getElementById('logs-next-btn');
        const logsPageSizeSelect = document.getElementById('logs-page-size-select');

        if (logsApplyFilterBtn) {
            logsApplyFilterBtn.addEventListener('click', () => this.applyLogsFilter());
        }

        if (logsClearFilterBtn) {
            logsClearFilterBtn.addEventListener('click', () => this.clearLogsFilter());
        }

        if (logsPrevBtn) {
            logsPrevBtn.addEventListener('click', () => this.loadLogsPreviousPage());
        }

        if (logsNextBtn) {
            logsNextBtn.addEventListener('click', () => this.loadLogsNextPage());
        }

        if (logsPageSizeSelect) {
            logsPageSizeSelect.addEventListener('change', (e) => {
                this.logsPageSize = parseInt(e.target.value);
                this.loadLogs(0, true); // Reload from first page with new size and current filters
            });
        }

        // Quick filter buttons - apply on Enter key
        const logsSearchFilter = document.getElementById('logs-search-filter');
        if (logsSearchFilter) {
            logsSearchFilter.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.applyLogsFilter();
                }
            });
        }

        // Tab switching listener
        document.querySelectorAll('.tab[data-tab]').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.currentTarget.dataset.tab;
                this.switchTab(tabName);
                
                // Load logs when switching to logs tab
                if (tabName === 'logs' && this.allLogs.length === 0) {
                    this.loadLogs();
                }
            });
        });
    }

    async initialize() {
        this.loadProfileData();
        await this.loadStatistics();
    }

    loadProfileData() {
        const userId = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_ID);
        const userEmail = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_EMAIL);
        const userName = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_NAME);

        // Update display name and email in profile card
        const displayName = document.getElementById('profile-display-name');
        const displayEmail = document.getElementById('profile-display-email');
        if (displayName) displayName.textContent = userName || 'Użytkownik';
        if (displayEmail) displayEmail.textContent = userEmail || 'email@example.com';

        // Update form inputs
        const nameInput = document.getElementById('profile-name-input');
        const emailInput = document.getElementById('profile-email-input');
        if (nameInput) nameInput.value = userName || '';
        if (emailInput) emailInput.value = userEmail || '';

        // Generate and update avatars
        if (userName) {
            ui.updateAvatars(userName);
        }
    }

    async loadStatistics() {
        try {
            // Show loading state
            this.updateStatistics({
                receipts: '...',
                spent: '...',
                products: '...',
                warnings: '...',
                notifications: '...'
            });

            // Fetch data in parallel where possible
            const [receipts, limits, notifications] = await Promise.all([
                api.getReceipts(0, 1000).catch(err => {
                    console.error('Error loading receipts:', err);
                    return [];
                }),
                api.getLimits().catch(err => {
                    console.error('Error loading limits:', err);
                    return [];
                }),
                api.getNotifications().catch(err => {
                    console.error('Error loading notifications:', err);
                    return [];
                })
            ]);

            // Debug logging
            console.log('Profile Statistics - Receipts:', receipts);
            console.log('Profile Statistics - Limits:', limits);
            console.log('Profile Statistics - Notifications:', notifications);

            // Calculate total receipts
            const totalReceipts = Array.isArray(receipts) ? receipts.length : 0;

            // Calculate total spent
            let totalSpent = 0;
            if (Array.isArray(receipts)) {
                receipts.forEach(receipt => {
                    const amount = parseFloat(receipt.suma) || 0;
                    totalSpent += amount;
                });
            }

            // Calculate total products (count from first 10 receipts and estimate)
            let totalProducts = 0;
            if (Array.isArray(receipts)) {
                const sampleSize = Math.min(10, receipts.length);
                if (sampleSize > 0) {
                    const productPromises = receipts.slice(0, sampleSize).map(receipt => 
                        api.getProducts(receipt.id_paragonu).catch(() => [])
                    );
                    const productArrays = await Promise.all(productPromises);
                    const sampleProductCount = productArrays.reduce((sum, products) => sum + (products.length || 0), 0);
                    const avgProductsPerReceipt = sampleProductCount / sampleSize;
                    totalProducts = Math.round(avgProductsPerReceipt * totalReceipts);
                }
            }

            // Get limit warnings count (percentage >= 75%)
            let limitWarnings = 0;
            if (Array.isArray(limits)) {
                limits.forEach(limit => {
                    const spent = parseFloat(limit.Wydano) || 0;
                    const limitValue = parseFloat(limit.Limit) || 0;
                    if (limitValue === 0) {
                        return; // Skip if no limit set
                    }
                    const percentage = (spent / limitValue) * 100;
                    if (percentage >= 75) {
                        limitWarnings++;
                    }
                });
            }

            // Get notifications count
            let unreadNotifications = 0;
            if (Array.isArray(notifications)) {
                unreadNotifications = notifications.filter(n => !n.przeczytane).length;
            }

            // Update statistics in UI
            this.updateStatistics({
                receipts: totalReceipts,
                spent: totalSpent,
                products: totalProducts,
                warnings: limitWarnings,
                notifications: unreadNotifications
            });

        } catch (error) {
            console.error('Error loading statistics:', error);
            // Set default values on error
            this.updateStatistics({
                receipts: 0,
                spent: 0,
                products: 0,
                warnings: 0,
                notifications: 0
            });
        }
    }

    updateStatistics(stats) {
        const receiptsEl = document.getElementById('profile-total-receipts');
        const spentEl = document.getElementById('profile-total-spent');
        const productsEl = document.getElementById('profile-total-products');
        const warningsEl = document.getElementById('profile-limit-warnings');
        const notificationsEl = document.getElementById('profile-notifications-count');

        if (receiptsEl) receiptsEl.textContent = stats.receipts === '...' ? '...' : (stats.receipts || 0);
        if (spentEl) spentEl.textContent = stats.spent === '...' ? '...' : ui.formatCurrency(stats.spent || 0);
        if (productsEl) productsEl.textContent = stats.products === '...' ? '...' : (stats.products || 0);
        if (warningsEl) warningsEl.textContent = stats.warnings === '...' ? '...' : (stats.warnings || 0);
        if (notificationsEl) notificationsEl.textContent = stats.notifications === '...' ? '...' : (stats.notifications || 0);
    }

    savePersonalData() {
        ui.showToast('Funkcja edycji danych osobowych nie została jeszcze wprowadzona', 'info');
    }

    async changePassword() {
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (!newPassword || !confirmPassword) {
            ui.showToast('Wypełnij wszystkie pola', 'warning');
            return;
        }

        if (newPassword !== confirmPassword) {
            ui.showToast('Hasła nie są zgodne', 'error');
            return;
        }

        // Validate password
        if (!this.validatePassword(newPassword)) {
            ui.showToast('Hasło nie spełnia wymagań', 'error');
            return;
        }

        ui.showLoader();

        try {
            await api.changePassword(newPassword, confirmPassword);
            ui.showToast('Hasło zostało zmienione. Zaloguj się ponownie.', 'success');
            
            // Logout after password change
            setTimeout(() => {
                authManager.handleLogout();
            }, 2000);

        } catch (error) {
            ui.showToast(error.message || 'Błąd zmiany hasła', 'error');
        } finally {
            ui.hideLoader();
        }
    }

    validatePassword(password) {
        const minLength = password.length >= 8;
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const hasDigit = /\d/.test(password);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        
        return minLength && hasUpper && hasLower && hasDigit && hasSpecial;
    }

    async updateApiKey() {
        const keyInput = document.getElementById('profile-api-key');
        const key = keyInput.value.trim();

        if (!key) {
            ui.showToast('Wprowadź klucz API', 'warning');
            return;
        }

        ui.showLoader();

        try {
            await api.addApiKey(key);
            localStorage.setItem(CONFIG.STORAGE_KEYS.HAS_API_KEY, 'true');
            ui.showToast('Klucz API został zaktualizowany', 'success');
            keyInput.value = '';
        } catch (error) {
            ui.showToast(error.message || 'Błąd aktualizacji klucza', 'error');
        } finally {
            ui.hideLoader();
        }
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`.tab[data-tab="${tabName}"]`)?.classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`)?.classList.add('active');
    }

    // ===== LOGS METHODS =====
    async loadLogs(page = 0, applyFilters = false) {
        try {
            ui.showLoader();
            this.currentLogsPage = page;
            
            // Prepare filters object from form inputs
            const filters = applyFilters ? this.getActiveFilters() : {};
            
            console.log('Loading logs - Page:', page, 'Size:', this.logsPageSize, 'Filters:', filters);
            
            const logs = await api.getLogs(page, this.logsPageSize, filters);
            this.allLogs = Array.isArray(logs) ? logs : [];
            this.filteredLogs = [...this.allLogs];
            
            console.log('Loaded logs:', this.allLogs.length, 'records');
            
            this.renderLogs();
            this.updateLogsPagination();
            this.updateFilterInfo(filters);
            
            // Show success message if filters are applied
            if (applyFilters && Object.keys(filters).length > 0) {
                ui.showToast(`Znaleziono ${this.allLogs.length} wyników`, 'info');
            }
        } catch (error) {
            console.error('Error loading logs:', error);
            ui.showToast(error.message || 'Błąd podczas ładowania logów', 'error');
            this.allLogs = [];
            this.filteredLogs = [];
            this.renderLogs();
        } finally {
            ui.hideLoader();
        }
    }

    getActiveFilters() {
        const filters = {};
        
        const dateFrom = document.getElementById('logs-date-from-filter')?.value;
        const dateTo = document.getElementById('logs-date-to-filter')?.value;
        const action = document.getElementById('logs-action-filter')?.value;
        const status = document.getElementById('logs-status-filter')?.value;
        const search = document.getElementById('logs-search-filter')?.value;
        
        if (dateFrom) filters.dateFrom = dateFrom;
        if (dateTo) filters.dateTo = dateTo;
        if (action) filters.action = action;
        if (status) filters.userStatus = status;
        if (search) filters.details = search;
        
        return filters;
    }

    updateFilterInfo(filters) {
        const filterInfo = document.getElementById('logs-filter-info');
        if (!filterInfo) return;
        
        const activeFilters = Object.keys(filters).length;
        if (activeFilters > 0) {
            filterInfo.textContent = `Aktywne filtry: ${activeFilters}`;
            filterInfo.style.color = 'var(--primary-color)';
            filterInfo.style.fontWeight = 'var(--font-medium)';
        } else {
            filterInfo.textContent = '';
        }
    }

    renderLogs() {
        const tableBody = document.getElementById('logs-table-body');
        const mobileContainer = document.getElementById('logs-mobile-container');
        const emptyState = document.getElementById('logs-empty-state');

        if (!tableBody || !mobileContainer) return;

        // Clear existing content
        tableBody.innerHTML = '';
        mobileContainer.innerHTML = '';

        if (this.filteredLogs.length === 0) {
            if (emptyState) emptyState.classList.remove('hidden');
            return;
        }

        if (emptyState) emptyState.classList.add('hidden');

        // Render for desktop (table)
        this.filteredLogs.forEach(log => {
            const formattedDetails = this.formatDetails(log.action, log.details);
            const actionColor = this.getActionColor(log.action);
            const actionIcon = this.getActionIcon(log.action);
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><span class="log-timestamp">${this.formatLogDate(log.timestamp)}</span></td>
                <td>
                    <span class="log-action-badge ${this.getActionClass(log.action)}" 
                          style="background-color: ${actionColor}20; color: ${actionColor}; border: 1px solid ${actionColor}40;"
                          title="${this.formatAction(log.action)}">
                        <i class="fas ${actionIcon}"></i> ${this.formatAction(log.action)}
                    </span>
                </td>
                <td><span class="log-status-badge ${log.user_status_at_log}">${this.formatStatus(log.user_status_at_log)}</span></td>
                <td><span class="log-details" title="${ui.escapeHtml(formattedDetails)}">${formattedDetails}</span></td>
            `;
            tableBody.appendChild(row);
        });

        // Render for mobile (cards)
        this.filteredLogs.forEach(log => {
            const formattedDetails = this.formatDetails(log.action, log.details);
            const actionColor = this.getActionColor(log.action);
            const actionIcon = this.getActionIcon(log.action);
            
            const card = document.createElement('div');
            card.className = 'log-mobile-card';
            card.innerHTML = `
                <div class="log-mobile-header">
                    <span class="log-action-badge ${this.getActionClass(log.action)}" 
                          style="background-color: ${actionColor}20; color: ${actionColor}; border: 1px solid ${actionColor}40;">
                        <i class="fas ${actionIcon}"></i> ${this.formatAction(log.action)}
                    </span>
                    <span class="log-mobile-date">${this.formatLogDate(log.timestamp)}</span>
                </div>
                <div class="log-mobile-body">
                    <div class="log-mobile-row">
                        <span class="log-mobile-label">Status:</span>
                        <span class="log-mobile-value"><span class="log-status-badge ${log.user_status_at_log}">${this.formatStatus(log.user_status_at_log)}</span></span>
                    </div>
                    <div class="log-mobile-row">
                        <span class="log-mobile-label">Szczegóły:</span>
                        <span class="log-mobile-value">${formattedDetails}</span>
                    </div>
                </div>
            `;
            mobileContainer.appendChild(card);
        });
    }

    formatDetails(action, detailsStr) {
        if (!detailsStr || detailsStr === 'null' || detailsStr === 'undefined') {
            return 'Brak szczegółów';
        }

        try {
            // Parse JSON details
            const details = typeof detailsStr === 'string' ? JSON.parse(detailsStr) : detailsStr;
            
            // Format based on action type
            switch (action) {
                case 'login':
                case 'logout':
                case 'register':
                    return details.email ? `Email: ${details.email}` : 'Brak szczegółów';
                
                case 'scan_receipt_start':
                    return details.image_size ? `Rozmiar obrazu: ${(details.image_size / 1024 / 1024).toFixed(2)} MB` : 'Rozpoczęto skanowanie';
                
                case 'scan_receipt_success':
                case 'view_receipt_details':
                    return details.id_paragonu ? `ID paragonu: ${details.id_paragonu}` : 'Sukces';
                
                case 'scan_receipt_error':
                case 'add_receipt_error':
                case 'add_products_error':
                    return details.error ? `Błąd: ${details.error}` : 'Wystąpił błąd';
                
                case 'add_receipt_start':
                case 'add_receipt_success':
                    let info = [];
                    if (details.firma) info.push(`${details.firma}`);
                    if (details.miasto) info.push(details.miasto);
                    if (details.suma) info.push(`${details.suma} zł`);
                    if (details.id_paragonu) info.push(`ID: ${details.id_paragonu}`);
                    return info.length > 0 ? info.join(', ') : 'Dodano paragon';
                
                case 'fetch_receipts_list':
                    return details.count ? `Pobrano ${details.count} paragonów (strona ${details.page + 1})` : 'Pobrano listę';
                
                case 'update_receipt':
                    if (details.changes) {
                        const changes = Object.entries(details.changes).map(([key, value]) => `${key}: ${value}`).join(', ');
                        return `Paragon #${details.id_paragonu}: ${changes}`;
                    }
                    return details.id_paragonu ? `Zaktualizowano paragon #${details.id_paragonu}` : 'Zaktualizowano paragon';
                
                case 'delete_receipt':
                    return details.id_paragonu ? `Usunięto paragon #${details.id_paragonu}` : 'Usunięto paragon';
                
                case 'view_products_list':
                    return details.count ? `Pobrano ${details.count} produktów z paragonu #${details.id_paragonu}` : 'Pobrano listę produktów';
                
                case 'classify_products_start':
                    return details.products_count ? `Klasyfikacja ${details.products_count} produktów z paragonu #${details.id_paragonu}` : 'Rozpoczęto klasyfikację';
                
                case 'add_products_success':
                    return details.products_count ? `Dodano ${details.products_count} produktów do paragonu #${details.id_paragonu}` : 'Dodano produkty';
                
                case 'update_product':
                    if (details.changes) {
                        const changes = Object.entries(details.changes).map(([key, value]) => `${key}: ${value}`).join(', ');
                        return `Produkt #${details.id_produktu}: ${changes}`;
                    }
                    return details.id_produktu ? `Zaktualizowano produkt #${details.id_produktu}` : 'Zaktualizowano produkt';
                
                case 'delete_product':
                    return details.nazwa ? `Usunięto: ${details.nazwa}` : (details.id_produktu ? `Usunięto produkt #${details.id_produktu}` : 'Usunięto produkt');
                
                case 'create_limit':
                case 'update_limit':
                    return details.limit ? `Kategoria #${details.id_kategorii}: ${details.limit} zł` : 'Zmieniono limit';
                
                case 'delete_limit':
                    return details.id_kategorii ? `Usunięto limit kategorii #${details.id_kategorii}` : 'Usunięto limit';
                
                case 'generate_report':
                    return details.start_date && details.end_date ? 
                        `Okres: ${details.start_date} - ${details.end_date} (${details.records_count || 0} rekordów)` : 
                        'Wygenerowano raport';
                
                case 'create_shopping_list':
                    return details.products_count ? `Lista #${details.id_listy}: ${details.products_count} produktów` : 'Utworzono listę';
                
                case 'view_shopping_list':
                    return details.id_listy ? `Lista zakupów #${details.id_listy}` : 'Wyświetlono listę';
                
                case 'delete_shopping_list':
                    return details.id_listy ? `Usunięto listę #${details.id_listy}` : 'Usunięto listę';
                
                default:
                    // Generic formatting for unknown actions
                    const entries = Object.entries(details);
                    if (entries.length === 0) return 'Brak szczegółów';
                    return entries.map(([key, value]) => `${key}: ${value}`).slice(0, 3).join(', ');
            }
        } catch (error) {
            // If JSON parsing fails, return raw string (escaped)
            return ui.escapeHtml(String(detailsStr).substring(0, 100));
        }
    }

    formatLogDate(timestamp) {
        if (!timestamp) return 'Nieznana data';
        const date = new Date(timestamp);
        return date.toLocaleString('pl-PL', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatAction(action) {
        const actionMap = {
            // Autentykacja i Autoryzacja
            'login': 'Logowanie',
            'logout': 'Wylogowanie',
            'register': 'Rejestracja',
            
            // Skanowanie i Przetwarzanie Paragonów
            'scan_receipt_start': 'Rozpoczęto skanowanie',
            'scan_receipt_success': 'Skanowanie zakończone',
            'scan_receipt_error': 'Błąd skanowania',
            'add_receipt_start': 'Rozpoczęto dodawanie paragonu',
            'add_receipt_success': 'Dodano paragon',
            'add_receipt_error': 'Błąd dodawania paragonu',
            
            // Zarządzanie Paragonami
            'fetch_receipts_list': 'Pobrano listę paragonów',
            'view_receipt_details': 'Wyświetlono szczegóły paragonu',
            'update_receipt': 'Zaktualizowano paragon',
            'delete_receipt': 'Usunięto paragon',
            
            // Zarządzanie Produktami
            'view_products_list': 'Pobrano listę produktów',
            'classify_products_start': 'Rozpoczęto klasyfikację produktów',
            'add_products_success': 'Dodano produkty',
            'add_products_error': 'Błąd dodawania produktów',
            'update_product': 'Zaktualizowano produkt',
            'delete_product': 'Usunięto produkt',
            
            // Limity Budżetowe
            'create_limit': 'Utworzono limit',
            'update_limit': 'Zaktualizowano limit',
            'delete_limit': 'Usunięto limit',
            
            // Raporty i Analizy
            'generate_report': 'Wygenerowano raport',
            
            // Listy Zakupowe
            'create_shopping_list': 'Utworzono listę zakupów',
            'view_shopping_list': 'Wyświetlono listę zakupów',
            'delete_shopping_list': 'Usunięto listę zakupów',
            
            // Backward compatibility - stare akcje
            'password_change': 'Zmiana hasła',
            'receipt_upload': 'Upload paragonu',
            'limit_exceeded': 'Przekroczenie limitu',
            'api_key_added': 'Dodanie klucza API',
            'scan_receipt': 'Skanowanie paragonu',
            'add_product': 'Dodanie produktu',
            'update_profile': 'Aktualizacja profilu',
            'set_limit': 'Ustawienie limitu'
        };
        return actionMap[action] || action.replace(/_/g, ' ');
    }

    getActionClass(action) {
        // Return class for styling based on action type
        return action.replace(/_/g, '-');
    }

    getActionColor(action) {
        // Return color for action badge based on category
        const colors = {
            // Autentykacja - niebieski
            'login': '#3498db',
            'register': '#3498db',
            'logout': '#95a5a6',
            
            // Skanowanie - zielony
            'scan_receipt_start': '#2ecc71',
            'scan_receipt_success': '#27ae60',
            'add_receipt_start': '#2ecc71',
            'add_receipt_success': '#27ae60',
            
            // Błędy - czerwony
            'scan_receipt_error': '#e74c3c',
            'add_receipt_error': '#e74c3c',
            'add_products_error': '#e74c3c',
            
            // Pobieranie/Wyświetlanie - fioletowy/szary
            'fetch_receipts_list': '#9b59b6',
            'view_receipt_details': '#9b59b6',
            'view_products_list': '#9b59b6',
            'view_shopping_list': '#9b59b6',
            
            // Edycja/Aktualizacja - pomarańczowy
            'update_receipt': '#f39c12',
            'update_product': '#f39c12',
            'update_limit': '#f39c12',
            'classify_products_start': '#f39c12',
            
            // Usuwanie - ciemny czerwony
            'delete_receipt': '#c0392b',
            'delete_product': '#c0392b',
            'delete_limit': '#c0392b',
            'delete_shopping_list': '#c0392b',
            
            // Tworzenie - niebieski/zielony
            'create_limit': '#3498db',
            'create_shopping_list': '#3498db',
            'add_products_success': '#27ae60',
            
            // Raporty - fioletowy
            'generate_report': '#9b59b6',
            
            // Domyślny - szary
            'default': '#7f8c8d'
        };
        
        return colors[action] || colors['default'];
    }

    getActionIcon(action) {
        // Return Font Awesome icon for action type
        const icons = {
            // Autentykacja
            'login': 'fa-sign-in-alt',
            'logout': 'fa-sign-out-alt',
            'register': 'fa-user-plus',
            
            // Skanowanie
            'scan_receipt_start': 'fa-camera',
            'scan_receipt_success': 'fa-check-circle',
            'scan_receipt_error': 'fa-exclamation-circle',
            'add_receipt_start': 'fa-plus-circle',
            'add_receipt_success': 'fa-check',
            'add_receipt_error': 'fa-times-circle',
            
            // Zarządzanie paragonami
            'fetch_receipts_list': 'fa-list',
            'view_receipt_details': 'fa-eye',
            'update_receipt': 'fa-edit',
            'delete_receipt': 'fa-trash-alt',
            
            // Produkty
            'view_products_list': 'fa-shopping-basket',
            'classify_products_start': 'fa-tags',
            'add_products_success': 'fa-check-double',
            'add_products_error': 'fa-times',
            'update_product': 'fa-pen',
            'delete_product': 'fa-trash',
            
            // Limity
            'create_limit': 'fa-plus-square',
            'update_limit': 'fa-edit',
            'delete_limit': 'fa-minus-square',
            
            // Raporty
            'generate_report': 'fa-chart-bar',
            
            // Listy zakupowe
            'create_shopping_list': 'fa-list-ul',
            'view_shopping_list': 'fa-clipboard-list',
            'delete_shopping_list': 'fa-trash-alt',
            
            // Domyślny
            'default': 'fa-circle'
        };
        
        return icons[action] || icons['default'];
    }

    formatStatus(status) {
        const statusMap = {
            'active': 'Aktywny',
            'default': 'Podstawowy',
            'premium': 'Premium',
            'admin': 'Administrator',
            'trial': 'Próbny',
            'inactive': 'Nieaktywny',
            'suspended': 'Zawieszony'
        };
        return statusMap[status] || (status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Nieznany');
    }

    applyLogsFilter() {
        // Reload logs from API with filters (reset to page 0)
        this.loadLogs(0, true);
    }

    clearLogsFilter() {
        // Clear all filter inputs
        document.getElementById('logs-date-from-filter').value = '';
        document.getElementById('logs-date-to-filter').value = '';
        document.getElementById('logs-action-filter').value = '';
        document.getElementById('logs-status-filter').value = '';
        document.getElementById('logs-search-filter').value = '';
        
        // Reload logs without filters
        this.loadLogs(0, false);
        ui.showToast('Filtry zostały wyczyszczone', 'info');
    }

    updateLogsPagination() {
        const prevBtn = document.getElementById('logs-prev-btn');
        const nextBtn = document.getElementById('logs-next-btn');
        const pageInfo = document.getElementById('logs-page-info');

        if (prevBtn) {
            prevBtn.disabled = this.currentLogsPage === 0;
        }

        if (nextBtn) {
            // Disable next if we got less than page size (last page)
            nextBtn.disabled = this.allLogs.length < this.logsPageSize;
        }

        if (pageInfo) {
            pageInfo.textContent = `Strona ${this.currentLogsPage + 1}`;
        }
    }

    loadLogsPreviousPage() {
        if (this.currentLogsPage > 0) {
            this.loadLogs(this.currentLogsPage - 1, true);
        }
    }

    loadLogsNextPage() {
        this.loadLogs(this.currentLogsPage + 1, true);
    }
}

// Create global instance
window.profileManager = new ProfileManager();
