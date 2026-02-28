// Dashboard Manager
class DashboardManager {
    constructor() {
        this.currentPage = 0;
        this.pageSize = 5;
        this.productSearchInput = document.getElementById('product-search-input');
        this.productSearchResults = document.getElementById('product-search-results');
        this.productSearchDetail = document.getElementById('product-search-detail');
        this.productSearchHint = document.getElementById('product-search-hint');
        this.productSearchDebounceId = null;
        this.productSearchData = [];
        this.productSearchPromise = null;
        this.selectedProductId = null;

        this.initializeProductSearch();
        this.initializeQuickActions();
    }

    initializeQuickActions() {
        // Handle quick action tiles
        const actionTiles = document.querySelectorAll('.action-tile');
        actionTiles.forEach(tile => {
            tile.addEventListener('click', () => {
                const viewName = tile.dataset.view;
                if (window.app) {
                    window.app.navigateTo(viewName);
                }
            });
        });

        // Handle "Zobacz wszystkie" button for notifications
        const seeAllNotificationsBtn = document.querySelector('[data-view="notifications"]');
        if (seeAllNotificationsBtn) {
            seeAllNotificationsBtn.addEventListener('click', () => {
                if (window.app) {
                    window.app.navigateTo('notifications');
                }
            });
        }
    }

    async initialize() {
        // Clear product search when returning to dashboard
        this.clearProductSearch();
        
        await this.loadStats();
        await this.loadNotifications();
        await this.loadRecentReceipts();
    }

    // Clear product search completely
    clearProductSearch() {
        if (this.productSearchInput) {
            this.productSearchInput.value = '';
        }
        if (this.productSearchResults) {
            this.productSearchResults.innerHTML = '';
        }
        if (this.productSearchDetail) {
            this.productSearchDetail.innerHTML = '';
            this.productSearchDetail.classList.add('hidden');
        }
        this.setProductHint('Wpisz przynajmniej 3 znaki, aby rozpocząć wyszukiwanie.');
    }

    initializeProductSearch() {
        if (!this.productSearchInput) {
            return;
        }

        this.productSearchInput.addEventListener('input', () => {
            const rawValue = this.productSearchInput.value.trim();

            if (rawValue.length < 3) {
                this.clearProductResults();
                this.setProductHint('Wpisz przynajmniej 3 znaki, aby rozpocząć wyszukiwanie.');
                return;
            }

            if (this.productSearchDebounceId) {
                clearTimeout(this.productSearchDebounceId);
            }

            this.productSearchDebounceId = setTimeout(() => {
                this.handleProductSearch(rawValue);
            }, 250);
        });
    }

    async handleProductSearch(query) {
        if (!this.productSearchResults) {
            return;
        }

        this.productSearchDebounceId = null;
        this.setProductHint('Ładuję produkty...');

        try {
            await this.loadProductSearchDataset();

            const normalizedQuery = query.toLowerCase();
            const filtered = this.productSearchData.filter(product => {
                const name = (product.nazwa || '').toLowerCase();
                return name.includes(normalizedQuery);
            });

            this.selectedProductId = null;
            this.productSearchDetail?.classList.add('hidden');
            if (this.productSearchDetail) {
                this.productSearchDetail.innerHTML = '';
            }

            if (filtered.length === 0) {
                this.renderProductResults([]);
                this.setProductHint(`Brak wyników dla "${query}".`);
                return;
            }

            const limitedResults = filtered.slice(0, 20);
            this.renderProductResults(limitedResults);
            this.setProductHint(filtered.length > limitedResults.length
                ? `Wyświetlam pierwsze ${limitedResults.length} z ${filtered.length} wyników.`
                : '');

        } catch (error) {
            console.error('Error searching products:', error);
            ui.showToast('Nie udało się pobrać produktów.', 'error');
            this.renderProductResults([]);
            this.setProductHint('Nie udało się pobrać produktów. Spróbuj ponownie później.');
        }
    }

    async loadProductSearchDataset() {
        if (this.productSearchPromise) {
            return this.productSearchPromise;
        }

        this.productSearchPromise = api.getProductsForReceipt()
            .then(data => {
                this.productSearchData = Array.isArray(data) ? data : [];
                if (this.productSearchData.length === 0) {
                    this.setProductHint('Nie znaleziono żadnych produktów w paragonach.');
                }
                return this.productSearchData;
            })
            .catch(error => {
                this.productSearchPromise = null;
                throw error;
            });

        return this.productSearchPromise;
    }

    renderProductResults(results) {
        if (!this.productSearchResults) {
            return;
        }

        if (results.length === 0) {
            this.productSearchResults.innerHTML = '<div class="product-search-empty">Brak wyników do wyświetlenia.</div>';
            return;
        }

        this.productSearchResults.innerHTML = results.map(product => `
            <button class="product-result" data-product-id="${product.id_produktu}">
                <div class="product-result-main">
                    <span class="product-result-name">${product.nazwa}</span>
                    <span class="product-result-price">${ui.formatCurrency(product.cena)}</span>
                </div>
                <div class="product-result-meta">
                    <span>${product.nazwa_firmy || '---'}</span>
                    <span>•</span>
                    <span>${ui.formatDateShort(product.data_dodania)}</span>
                </div>
            </button>
        `).join('');

        this.attachProductResultListeners();
    }

    attachProductResultListeners() {
        if (!this.productSearchResults) {
            return;
        }

        const items = this.productSearchResults.querySelectorAll('.product-result');
        items.forEach(item => {
            item.addEventListener('click', () => {
                const { productId } = item.dataset;
                const product = this.productSearchData.find(p => String(p.id_produktu) === productId);

                if (!product) {
                    return;
                }

                // Get the current search query
                const query = this.productSearchInput?.value?.trim() || product.nazwa;

                // Navigate to search view and set query with highlighted product
                if (window.app) {
                    window.app.navigateTo('search');
                }

                // Set query and highlight in search manager
                if (window.searchManager) {
                    setTimeout(() => {
                        window.searchManager.setQueryAndHighlight(query, productId);
                    }, 300);
                }
            });
        });
    }

    highlightSelectedProduct() {
        if (!this.productSearchResults) {
            return;
        }

        this.productSearchResults.querySelectorAll('.product-result').forEach(button => {
            if (button.dataset.productId === this.selectedProductId) {
                button.classList.add('selected');
            } else {
                button.classList.remove('selected');
            }
        });
    }

    escapeHtml(text) {
        if (text === null || text === undefined) {
            return '';
        }
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        };
        return String(text).replace(/[&<>"']/g, char => map[char]);
    }

    clearProductResults() {
        if (this.productSearchResults) {
            this.productSearchResults.innerHTML = '';
        }
        if (this.productSearchDetail) {
            this.productSearchDetail.innerHTML = '';
            this.productSearchDetail.classList.add('hidden');
        }
        this.selectedProductId = null;
    }

    setProductHint(message) {
        if (!this.productSearchHint) {
            return;
        }

        if (!message) {
            this.productSearchHint.classList.add('hidden');
            this.productSearchHint.textContent = '';
            return;
        }

        this.productSearchHint.textContent = message;
        this.productSearchHint.classList.remove('hidden');
    }

    async loadStats() {
        try {
            // Load receipts to count
            const receipts = await api.getReceipts(0, 100); // Get more for counting
            const totalReceipts = receipts.length;

            // Calculate this month's spending
            const now = new Date();
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            
            const startDate = firstDay.toISOString().split('T')[0];
            const endDate = lastDay.toISOString().split('T')[0];
            
            const monthlyData = await api.getReport(startDate, endDate);
            const totalSpent = monthlyData.reduce((sum, item) => {
                return sum + this.parseAmount(item.suma_cen);
            }, 0);

            // Load limits to check warnings
            const limits = await api.getLimits();
            const warnings = limits.filter(limit => {
                const spent = this.parseAmount(limit.Wydano);
                const limitValue = this.parseAmount(limit.Limit);
                if (limitValue === 0) {
                    return false;
                }
                const percentage = (spent / limitValue) * 100;
                return percentage >= 75;
            }).length;

            // Count total products (approximate from recent receipts)
            let totalProducts = 0;
            for (const receipt of receipts.slice(0, 10)) {
                try {
                    const products = await api.getProducts(receipt.id_paragonu);
                    totalProducts += products.length;
                } catch (e) {
                    // Skip if error
                }
            }

            // Update UI
            document.getElementById('total-receipts').textContent = totalReceipts;
            document.getElementById('total-spent').textContent = ui.formatCurrency(totalSpent);
            document.getElementById('limit-warnings').textContent = warnings;
            document.getElementById('total-products').textContent = totalProducts;

        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    async loadNotifications() {
        try {
            const notifications = await api.getNotifications();
            const container = document.getElementById('notifications-list');
            const totalCountElement = document.getElementById('total-notifications-count');

            const totalCount = Array.isArray(notifications) ? notifications.length : 0;

            if (!notifications || notifications.length === 0) {
                ui.showEmptyState('notifications-list', 'Brak powiadomień', 'fas fa-bell-slash');
                if (totalCountElement) {
                    totalCountElement.textContent = '0';
                }
                ui.updateNotificationBadges(0);
                return;
            }

            // Update total count
            if (totalCountElement) {
                totalCountElement.textContent = totalCount;
            }

            ui.updateNotificationBadges(totalCount);

            // Sort notifications by priority: danger > warning > info > success
            // Then show only first 3 most important notifications on dashboard
            const sortedNotifications = [...notifications].sort((a, b) => {
                const getPriority = (notification) => {
                    const rawMessage = notification.tresc || notification.wiadomosc || '';
                    const message = rawMessage.toLowerCase();
                    const percentMatch = rawMessage.match(/(\d+(?:\.\d+)?)\s*%/);
                    
                    if (percentMatch && (message.includes('limit') || message.includes('wykorzystan'))) {
                        const percentage = parseFloat(percentMatch[1]);
                        if (percentage >= 90) return 4; // Critical - highest priority
                        if (percentage >= 75) return 3; // Warning
                        if (percentage >= 50) return 2; // Info
                    }
                    
                    if (message.includes('przekrocz')) return 4;
                    if (message.includes('ostrzeżenie')) return 3;
                    if (message.includes('sukces')) return 1;
                    
                    return 2; // Default info priority
                };
                
                return getPriority(b) - getPriority(a);
            });

            container.innerHTML = sortedNotifications
                .slice(0, 3)
                .map(notification => ui.createNotificationItem(notification))
                .join('');

        } catch (error) {
            console.error('Error loading notifications:', error);
            ui.showEmptyState('notifications-list', 'Błąd ładowania powiadomień', 'fas fa-exclamation-triangle');
        }
    }

    async loadRecentReceipts() {
        try {
            const receipts = await api.getReceipts(0, 8);
            const container = document.getElementById('recent-receipts-list');

            if (!receipts || receipts.length === 0) {
                ui.showEmptyState('recent-receipts-list', 'Brak paragonów', 'fas fa-receipt');
                return;
            }

            container.innerHTML = receipts
                .map(receipt => ui.createReceiptCard(receipt))
                .join('');

            // Add click handlers
            container.querySelectorAll('.receipt-card').forEach(card => {
                card.addEventListener('click', () => {
                    const receiptId = card.dataset.id;
                    if (window.receiptsManager) {
                        window.receiptsManager.showReceiptDetail(receiptId);
                    }
                });
            });

        } catch (error) {
            console.error('Error loading recent receipts:', error);
            ui.showEmptyState('recent-receipts-list', 'Błąd ładowania paragonów', 'fas fa-exclamation-triangle');
        }
    }

    parseAmount(value) {
        if (value === null || value === undefined) {
            return 0;
        }

        if (typeof value === 'number' && Number.isFinite(value)) {
            return value;
        }

        const raw = String(value)
            .replace(/[^0-9,.-]+/g, '')
            .replace(',', '.');

        const parsed = Number(raw);
        return Number.isFinite(parsed) ? parsed : 0;
    }
}

// Create global instance
window.dashboardManager = new DashboardManager();
