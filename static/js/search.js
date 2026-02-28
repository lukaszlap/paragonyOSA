// Search Page Manager
class SearchManager {
    constructor() {
        this.searchInput = document.getElementById('search-page-input');
        this.searchHint = document.getElementById('search-page-hint');
        this.searchStats = document.getElementById('search-stats');
        this.searchResults = document.getElementById('search-page-results');
        this.searchDetail = document.getElementById('search-page-detail');
        this.searchDebounceId = null;
        this.productsData = [];
        this.productsPromise = null;
        this.selectedProductId = null;
        this.currentResults = [];
        this.currentSortOption = 'relevance';
        this.activeFilters = {
            priceMin: null,
            priceMax: null,
            store: null,
            dateFrom: null,
            dateTo: null
        };

        this.initializeSearch();
        this.initializeFilters();
        this.initializeSorting();
    }

    async initialize() {
        // Load initial data if needed
        this.clearResults();
        
        // Check if there's a query in the input
        const currentQuery = this.searchInput ? this.searchInput.value.trim() : '';
        
        if (currentQuery && currentQuery.length >= 3) {
            // If there's a valid query, perform search
            await this.performSearch(currentQuery);
        } else {
            // Show hint for empty state
            this.setHint('Wpisz przynajmniej 3 znaki, aby rozpocząć wyszukiwanie.');
        }
    }

    // Set query from dashboard and highlight a product
    async setQueryAndHighlight(query, productId) {
        if (!this.searchInput) {
            return;
        }

        // Set the input value and trigger search
        this.searchInput.value = query;
        this.searchInput.focus();

        // Perform the search
        await this.performSearch(query);

        // After rendering, highlight the product if it exists
        if (productId) {
            this.selectedProductId = String(productId);
            setTimeout(() => {
                this.highlightProductResult();
                this.scrollToHighlightedProduct();
            }, 100);
        }
    }

    highlightProductResult() {
        if (!this.searchResults) {
            return;
        }

        this.searchResults.querySelectorAll('.search-result-card').forEach(card => {
            if (card.dataset.productId === this.selectedProductId) {
                card.classList.add('highlighted');
            } else {
                card.classList.remove('highlighted');
            }
        });
    }

    scrollToHighlightedProduct() {
        const highlighted = this.searchResults?.querySelector('.search-result-card.highlighted');
        if (highlighted) {
            highlighted.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    initializeSearch() {
        if (!this.searchInput) {
            return;
        }

        this.searchInput.addEventListener('input', () => {
            const query = this.searchInput.value.trim();

            if (query.length < 3) {
                this.clearResults();
                this.setHint('Wpisz przynajmniej 3 znaki, aby rozpocząć wyszukiwanie.');
                this.hideStats();
                return;
            }

            if (this.searchDebounceId) {
                clearTimeout(this.searchDebounceId);
            }

            this.searchDebounceId = setTimeout(() => {
                this.performSearch(query);
            }, 300);
        });

        // Focus on input when view is opened
        setTimeout(() => {
            if (this.searchInput) {
                this.searchInput.focus();
            }
        }, 100);
    }

    async performSearch(query) {
        this.searchDebounceId = null;
        this.setHint('Wyszukuję produktów...');
        this.hideStats();

        try {
            await this.loadProductsData();

            const normalizedQuery = query.toLowerCase();
            let filtered = this.productsData.filter(product => {
                const name = (product.nazwa || '').toLowerCase();
                return name.includes(normalizedQuery);
            });

            // Apply filters
            filtered = this.applyFilters(filtered);

            // Apply sorting
            filtered = this.applySorting(filtered);

            this.currentResults = filtered;

            this.selectedProductId = null;
            this.searchDetail.classList.add('hidden');
            this.searchDetail.innerHTML = '';

            if (filtered.length === 0) {
                this.renderResults([]);
                this.setHint(`Nie znaleziono produktów dla "${query}".`);
                this.hideStats();
                return;
            }

            this.renderResults(filtered);
            this.showStats(filtered.length, query);
            this.setHint('');

        } catch (error) {
            console.error('Error searching products:', error);
            ui.showToast('Nie udało się wyszukać produktów.', 'error');
            this.renderResults([]);
            this.setHint('Błąd wyszukiwania. Spróbuj ponownie później.');
            this.hideStats();
        }
    }

    applyFilters(products) {
        let filtered = [...products];

        // Price filter
        if (this.activeFilters.priceMin !== null) {
            filtered = filtered.filter(p => parseFloat(p.cena) >= this.activeFilters.priceMin);
        }
        if (this.activeFilters.priceMax !== null) {
            filtered = filtered.filter(p => parseFloat(p.cena) <= this.activeFilters.priceMax);
        }

        // Store filter
        if (this.activeFilters.store) {
            const storeQuery = this.activeFilters.store.toLowerCase();
            filtered = filtered.filter(p => {
                const storeName = (p.nazwa_firmy || '').toLowerCase();
                return storeName.includes(storeQuery);
            });
        }

        // Date filter
        if (this.activeFilters.dateFrom) {
            const dateFrom = new Date(this.activeFilters.dateFrom);
            filtered = filtered.filter(p => {
                const productDate = new Date(p.data_dodania);
                return productDate >= dateFrom;
            });
        }
        if (this.activeFilters.dateTo) {
            const dateTo = new Date(this.activeFilters.dateTo);
            dateTo.setHours(23, 59, 59, 999);
            filtered = filtered.filter(p => {
                const productDate = new Date(p.data_dodania);
                return productDate <= dateTo;
            });
        }

        return filtered;
    }

    applySorting(products) {
        const sorted = [...products];

        switch (this.currentSortOption) {
            case 'name-asc':
                sorted.sort((a, b) => (a.nazwa || '').localeCompare(b.nazwa || ''));
                break;
            case 'name-desc':
                sorted.sort((a, b) => (b.nazwa || '').localeCompare(a.nazwa || ''));
                break;
            case 'price-asc':
                sorted.sort((a, b) => parseFloat(a.cena) - parseFloat(b.cena));
                break;
            case 'price-desc':
                sorted.sort((a, b) => parseFloat(b.cena) - parseFloat(a.cena));
                break;
            case 'date-desc':
                sorted.sort((a, b) => new Date(b.data_dodania) - new Date(a.data_dodania));
                break;
            case 'date-asc':
                sorted.sort((a, b) => new Date(a.data_dodania) - new Date(b.data_dodania));
                break;
            case 'relevance':
            default:
                // Keep original order (relevance)
                break;
        }

        return sorted;
    }

    initializeFilters() {
        const toggleFiltersBtn = document.getElementById('toggle-search-filters');
        const filtersPanel = document.getElementById('search-filters-panel');
        const applyFiltersBtn = document.getElementById('apply-filters');
        const clearFiltersBtn = document.getElementById('clear-all-filters');

        if (toggleFiltersBtn && filtersPanel) {
            toggleFiltersBtn.addEventListener('click', () => {
                filtersPanel.classList.toggle('hidden');
            });
        }

        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => {
                this.collectFilters();
                this.updateActiveFiltersDisplay();
                
                // Re-run search with filters
                const query = this.searchInput.value.trim();
                if (query.length >= 3) {
                    this.performSearch(query);
                }
            });
        }

        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                this.clearFilters();
            });
        }
    }

    collectFilters() {
        const priceMin = document.getElementById('filter-price-min');
        const priceMax = document.getElementById('filter-price-max');
        const store = document.getElementById('filter-store');
        const dateFrom = document.getElementById('filter-date-from');
        const dateTo = document.getElementById('filter-date-to');

        this.activeFilters.priceMin = priceMin && priceMin.value ? parseFloat(priceMin.value) : null;
        this.activeFilters.priceMax = priceMax && priceMax.value ? parseFloat(priceMax.value) : null;
        this.activeFilters.store = store && store.value.trim() ? store.value.trim() : null;
        this.activeFilters.dateFrom = dateFrom && dateFrom.value ? dateFrom.value : null;
        this.activeFilters.dateTo = dateTo && dateTo.value ? dateTo.value : null;
    }

    clearFilters() {
        this.activeFilters = {
            priceMin: null,
            priceMax: null,
            store: null,
            dateFrom: null,
            dateTo: null
        };

        // Clear form inputs
        const priceMin = document.getElementById('filter-price-min');
        const priceMax = document.getElementById('filter-price-max');
        const store = document.getElementById('filter-store');
        const dateFrom = document.getElementById('filter-date-from');
        const dateTo = document.getElementById('filter-date-to');

        if (priceMin) priceMin.value = '';
        if (priceMax) priceMax.value = '';
        if (store) store.value = '';
        if (dateFrom) dateFrom.value = '';
        if (dateTo) dateTo.value = '';

        this.updateActiveFiltersDisplay();

        // Re-run search without filters
        const query = this.searchInput.value.trim();
        if (query.length >= 3) {
            this.performSearch(query);
        }
    }

    updateActiveFiltersDisplay() {
        const activeFiltersContainer = document.getElementById('active-filters');
        if (!activeFiltersContainer) return;

        const chips = [];

        if (this.activeFilters.priceMin !== null || this.activeFilters.priceMax !== null) {
            let priceText = 'Cena: ';
            if (this.activeFilters.priceMin !== null && this.activeFilters.priceMax !== null) {
                priceText += `${ui.formatCurrency(this.activeFilters.priceMin)} - ${ui.formatCurrency(this.activeFilters.priceMax)}`;
            } else if (this.activeFilters.priceMin !== null) {
                priceText += `od ${ui.formatCurrency(this.activeFilters.priceMin)}`;
            } else {
                priceText += `do ${ui.formatCurrency(this.activeFilters.priceMax)}`;
            }
            chips.push({ label: priceText, filter: 'price' });
        }

        if (this.activeFilters.store) {
            chips.push({ label: `Sklep: ${this.activeFilters.store}`, filter: 'store' });
        }

        if (this.activeFilters.dateFrom || this.activeFilters.dateTo) {
            let dateText = 'Data: ';
            if (this.activeFilters.dateFrom && this.activeFilters.dateTo) {
                dateText += `${this.activeFilters.dateFrom} - ${this.activeFilters.dateTo}`;
            } else if (this.activeFilters.dateFrom) {
                dateText += `od ${this.activeFilters.dateFrom}`;
            } else {
                dateText += `do ${this.activeFilters.dateTo}`;
            }
            chips.push({ label: dateText, filter: 'date' });
        }

        if (chips.length === 0) {
            activeFiltersContainer.classList.add('hidden');
            return;
        }

        activeFiltersContainer.classList.remove('hidden');
        activeFiltersContainer.innerHTML = chips.map(chip => `
            <div class="filter-chip">
                ${this.escapeHtml(chip.label)}
                <button class="filter-chip-remove" data-filter="${chip.filter}">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');

        // Add remove listeners
        activeFiltersContainer.querySelectorAll('.filter-chip-remove').forEach(btn => {
            btn.addEventListener('click', () => {
                const filterType = btn.dataset.filter;
                this.removeFilter(filterType);
            });
        });
    }

    removeFilter(filterType) {
        switch (filterType) {
            case 'price':
                this.activeFilters.priceMin = null;
                this.activeFilters.priceMax = null;
                const priceMin = document.getElementById('filter-price-min');
                const priceMax = document.getElementById('filter-price-max');
                if (priceMin) priceMin.value = '';
                if (priceMax) priceMax.value = '';
                break;
            case 'store':
                this.activeFilters.store = null;
                const store = document.getElementById('filter-store');
                if (store) store.value = '';
                break;
            case 'date':
                this.activeFilters.dateFrom = null;
                this.activeFilters.dateTo = null;
                const dateFrom = document.getElementById('filter-date-from');
                const dateTo = document.getElementById('filter-date-to');
                if (dateFrom) dateFrom.value = '';
                if (dateTo) dateTo.value = '';
                break;
        }

        this.updateActiveFiltersDisplay();

        // Re-run search
        const query = this.searchInput.value.trim();
        if (query.length >= 3) {
            this.performSearch(query);
        }
    }

    initializeSorting() {
        const sortSelect = document.getElementById('sort-select');
        if (sortSelect) {
            sortSelect.addEventListener('change', () => {
                this.currentSortOption = sortSelect.value;
                
                // Re-render current results with new sorting
                if (this.currentResults.length > 0) {
                    const sorted = this.applySorting(this.currentResults);
                    this.renderResults(sorted);
                }
            });
        }
    }

    async loadProductsData() {
        if (this.productsPromise) {
            return this.productsPromise;
        }

        this.productsPromise = api.getProductsForReceipt()
            .then(data => {
                this.productsData = Array.isArray(data) ? data : [];
                if (this.productsData.length === 0) {
                    this.setHint('Brak produktów w systemie.');
                }
                return this.productsData;
            })
            .catch(error => {
                this.productsPromise = null;
                throw error;
            });

        return this.productsPromise;
    }

    renderResults(results) {
        if (!this.searchResults) {
            return;
        }

        if (results.length === 0) {
            this.searchResults.innerHTML = '<div class="empty-state"><i class="fas fa-search"></i><p>Brak wyników wyszukiwania</p></div>';
            return;
        }

        this.searchResults.innerHTML = results.map(product => `
            <div class="search-result-card" data-product-id="${product.id_produktu}">
                <div class="search-result-header">
                    <div class="search-result-title">
                        <span class="search-result-badge">
                            <i class="fas fa-shopping-basket"></i>
                            ${this.escapeHtml(product.nazwa)}
                        </span>
                    </div>
                    <div class="search-result-store">
                        <i class="fas fa-store"></i>
                        ${this.escapeHtml(product.nazwa_firmy || 'Brak danych')}
                    </div>
                </div>
                <div class="search-result-body">
                    <div class="search-result-info">
                        <div class="search-info-item">
                            <i class="fas fa-tag"></i>
                            <div>
                                <span class="search-info-label">Cena</span>
                                <strong class="search-info-value">${ui.formatCurrency(product.cena)}</strong>
                            </div>
                        </div>
                        <div class="search-info-item">
                            <i class="fas fa-calendar-alt"></i>
                            <div>
                                <span class="search-info-label">Data zakupu</span>
                                <strong class="search-info-value">${ui.formatDateShort(product.data_dodania)}</strong>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="search-result-footer">
                    <button class="btn btn-primary btn-small view-receipt-btn" data-receipt-id="${product.id_paragonu}">
                        <i class="fas fa-receipt"></i> Zobacz paragon
                    </button>
                    <button class="btn btn-info btn-small view-product-info-btn" data-product-name="${this.escapeHtml(product.nazwa)}">
                        <i class="fas fa-info-circle"></i> Info
                    </button>
                </div>
            </div>
        `).join('');

        this.attachResultListeners();
    }

    attachResultListeners() {
        if (!this.searchResults) {
            return;
        }

        // View receipt buttons
        this.searchResults.querySelectorAll('.view-receipt-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const receiptId = btn.dataset.receiptId;
                if (window.receiptsManager) {
                    window.receiptsManager.showReceiptDetail(receiptId);
                }
            });
        });

        // View product info buttons
        this.searchResults.querySelectorAll('.view-product-info-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const productName = btn.dataset.productName;
                if (window.receiptsManager) {
                    window.receiptsManager.viewProductInfo(productName);
                }
            });
        });
    }

    showStats(count, query) {
        if (!this.searchStats) {
            return;
        }

        this.searchStats.innerHTML = `
            <i class="fas fa-check-circle" style="color: var(--secondary-color); margin-right: 10px;"></i>
            Znaleziono <strong>${count}</strong> ${this.getPolishPlural(count, 'produkt', 'produkty', 'produktów')} dla "<em>${this.escapeHtml(query)}</em>"
        `;
        this.searchStats.style.display = 'block';
    }

    hideStats() {
        if (this.searchStats) {
            this.searchStats.style.display = 'none';
        }
    }

    setHint(message) {
        if (!this.searchHint) {
            return;
        }

        if (!message) {
            this.searchHint.style.display = 'none';
            return;
        }

        this.searchHint.textContent = message;
        this.searchHint.style.display = 'block';
    }

    clearResults() {
        if (this.searchResults) {
            this.searchResults.innerHTML = '';
        }
        if (this.searchDetail) {
            this.searchDetail.innerHTML = '';
            this.searchDetail.classList.add('hidden');
        }
        this.selectedProductId = null;
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

    getPolishPlural(count, singular, plural2to4, plural5plus) {
        if (count === 1) return singular;
        if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) {
            return plural2to4;
        }
        return plural5plus;
    }
}

// Create global instance
window.searchManager = new SearchManager();
