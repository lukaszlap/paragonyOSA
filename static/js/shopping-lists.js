// Shopping Lists Manager
class ShoppingListsManager {
    constructor() {
        this.availableProducts = [];
        this.selectedProducts = [];
        this.summaryModalId = 'shopping-list-summary-modal';
        this.summaryTitleElement = document.getElementById('shopping-list-summary-title');
        this.summaryContainer = document.getElementById('shopping-list-summary-container');
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const createListBtn = document.getElementById('create-list-btn');
        const saveListBtn = document.getElementById('save-shopping-list-btn');
        const filterInput = document.getElementById('filter-products');
        const closeModalBtns = document.querySelectorAll('.close-modal');
        const summaryCloseBtn = document.getElementById('close-summary-btn');

        if (createListBtn) {
            createListBtn.addEventListener('click', () => this.showCreateListModal());
        }

        if (saveListBtn) {
            saveListBtn.addEventListener('click', () => this.saveShoppingList());
        }

        if (filterInput) {
            filterInput.addEventListener('input', (e) => this.filterProducts(e.target.value));
        }

        closeModalBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const modal = btn.closest('.modal');
                if (modal) {
                    ui.hideModal(modal.id);
                }
            });
        });

        if (summaryCloseBtn) {
            summaryCloseBtn.addEventListener('click', () => ui.hideModal(this.summaryModalId));
        }
    }

    async initialize() {
        await this.loadShoppingLists();
    }

    async loadShoppingLists() {
        ui.showLoader();

        try {
            const lists = await api.getShoppingLists();
            const container = document.getElementById('shopping-lists-container');
            if (!container) {
                return;
            }

            if (!lists || lists.length === 0) {
                container.innerHTML = '';
                ui.showEmptyState('shopping-lists-container', 'Brak list zakupów', 'fas fa-shopping-cart');
                return;
            }

            // Load content for each list (simplified - in production, load on demand)
            const listsHtml = [];
            
            for (const list of lists.slice(0, 10)) {
                try {
                    const content = await api.getShoppingListContent(list.id);
                    const items = content?.items || [];
                    const summary = content?.summary || null;
                    listsHtml.push(ui.createShoppingListCard(list, items, summary));
                } catch (e) {
                    listsHtml.push(ui.createShoppingListCard(list, []));
                }
            }

            container.innerHTML = listsHtml.join('');

            // Add event listeners
            this.attachListActionListeners();

        } catch (error) {
            ui.showToast(error.message || 'Błąd ładowania list', 'error');
        } finally {
            ui.hideLoader();
        }
    }

    attachListActionListeners() {
        // View list buttons
        document.querySelectorAll('.view-list-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const listId = btn.dataset.id;
                this.viewList(listId);
            });
        });

        // Delete list buttons
        document.querySelectorAll('.delete-list-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const listId = btn.dataset.id;
                this.deleteList(listId);
            });
        });
    }

    async showCreateListModal() {
        ui.showModal('shopping-list-modal');
        
        ui.showLoader();

        try {
            // Load available products
            this.availableProducts = await api.getProductsForReceipt();
            this.selectedProducts = [];
            
            this.renderAvailableProducts();
            this.renderSelectedProducts();

        } catch (error) {
            ui.showToast(error.message || 'Błąd ładowania produktów', 'error');
        } finally {
            ui.hideLoader();
        }
    }

    renderAvailableProducts(filter = '') {
        const container = document.getElementById('available-products');
        if (!container) return;

        const filtered = this.availableProducts.filter(product => {
            const inSelected = this.selectedProducts.some(p => p.id_produktu === product.id_produktu);
            const matchesFilter = !filter || product.nazwa.toLowerCase().includes(filter.toLowerCase());
            return !inSelected && matchesFilter;
        });

        if (filtered.length === 0) {
            container.innerHTML = '<p style="padding: 20px; text-align: center;">Brak produktów</p>';
            return;
        }

        container.innerHTML = filtered.map(product => `
            <div class="product-item" data-id="${product.id_produktu}">
                <strong>${product.nazwa}</strong>
                <small>${product.nazwa_firmy || ''} • ${ui.formatCurrency(product.cena)}</small>
            </div>
        `).join('');

        // Add click listeners
        container.querySelectorAll('.product-item').forEach(item => {
            item.addEventListener('click', () => {
                const productId = parseInt(item.dataset.id);
                this.addProductToList(productId);
            });
        });
    }

    renderSelectedProducts() {
        const container = document.getElementById('selected-products-list');
        if (!container) return;

        if (this.selectedProducts.length === 0) {
            container.innerHTML = '<p style="padding: 20px; text-align: center;">Wybierz produkty</p>';
            return;
        }

        container.innerHTML = this.selectedProducts.map(product => `
            <div class="product-item selected" data-id="${product.id_produktu}">
                <div>
                    <strong>${product.nazwa}</strong>
                    <small>${ui.formatCurrency(product.cena)}</small>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <input type="number" 
                           class="product-quantity" 
                           data-id="${product.id_produktu}" 
                           value="${product.ilosc || 1}" 
                           min="1" 
                           style="width: 60px; padding: 5px;">
                    <button class="btn btn-danger btn-small remove-product-btn" data-id="${product.id_produktu}">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `).join('');

        // Add listeners for quantity changes
        container.querySelectorAll('.product-quantity').forEach(input => {
            input.addEventListener('change', (e) => {
                const productId = parseInt(input.dataset.id);
                const quantity = parseInt(e.target.value);
                this.updateProductQuantity(productId, quantity);
            });
        });

        // Add listeners for remove buttons
        container.querySelectorAll('.remove-product-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const productId = parseInt(btn.dataset.id);
                this.removeProductFromList(productId);
            });
        });
    }

    addProductToList(productId) {
        const product = this.availableProducts.find(p => p.id_produktu === productId);
        if (!product) return;

        this.selectedProducts.push({
            ...product,
            ilosc: 1
        });

        this.renderAvailableProducts();
        this.renderSelectedProducts();
    }

    removeProductFromList(productId) {
        this.selectedProducts = this.selectedProducts.filter(p => p.id_produktu !== productId);
        this.renderAvailableProducts();
        this.renderSelectedProducts();
    }

    updateProductQuantity(productId, quantity) {
        const product = this.selectedProducts.find(p => p.id_produktu === productId);
        if (product) {
            product.ilosc = quantity;
        }
    }

    filterProducts(filter) {
        this.renderAvailableProducts(filter);
    }

    async saveShoppingList() {
        if (this.selectedProducts.length === 0) {
            ui.showToast('Wybierz przynajmniej jeden produkt', 'warning');
            return;
        }

        ui.showLoader();
        let summaryToShow = null;
        let summaryTitle = null;

        try {
            const listData = this.selectedProducts.map(product => ({
                id_Produktu: product.id_produktu,
                ilosc: product.ilosc
            }));

            const response = await api.createShoppingList(listData);
            if (response && response.summary) {
                summaryToShow = response.summary;
                summaryTitle = response.listId ? `Podsumowanie listy #${response.listId}` : 'Podsumowanie listy zakupów';
            }

            ui.showToast('Lista zakupów utworzona', 'success');
            ui.hideModal('shopping-list-modal');
            this.selectedProducts = [];
            this.renderSelectedProducts();
            await this.loadShoppingLists();

        } catch (error) {
            ui.showToast(error.message || 'Błąd tworzenia listy', 'error');
        } finally {
            ui.hideLoader();
            if (summaryToShow) {
                this.showSummaryModal(summaryToShow, summaryTitle || undefined);
            }
        }
    }

    async viewList(listId) {
        ui.showLoader();

        try {
            const response = await api.getShoppingListContent(listId);
            const items = Array.isArray(response?.items) ? response.items : Array.isArray(response) ? response : [];
            const summary = response?.summary || null;
            this.showSummaryModal(summary, `Lista zakupów #${listId}`, items);

        } catch (error) {
            ui.showToast(error.message || 'Błąd ładowania listy', 'error');
        } finally {
            ui.hideLoader();
        }
    }

    async deleteList(listId) {
        if (!ui.confirm('Czy na pewno chcesz usunąć tę listę?')) {
            return;
        }

        ui.showLoader();

        try {
            await api.deleteShoppingList(listId);
            ui.showToast('Lista usunięta', 'success');
            await this.loadShoppingLists();
        } catch (error) {
            ui.showToast(error.message || 'Błąd usuwania listy', 'error');
        } finally {
            ui.hideLoader();
        }
    }

    showSummaryModal(summary, title = 'Podsumowanie listy zakupów', fallbackItems = []) {
        const effectiveSummary = summary || this.buildFallbackSummary(fallbackItems);

        if (!effectiveSummary) {
            ui.showToast('Brak danych do wyświetlenia podsumowania', 'info');
            return;
        }

        if (this.summaryTitleElement) {
            this.summaryTitleElement.textContent = title;
        }

        if (this.summaryContainer) {
            this.summaryContainer.innerHTML = this.buildSummaryMarkup(effectiveSummary);
        }

        ui.showModal(this.summaryModalId);
    }

    buildSummaryMarkup(summary) {
        const formatCurrency = (value) => {
            const numeric = typeof value === 'number' ? value : Number(value);
            return ui.formatCurrency(Number.isFinite(numeric) ? numeric : 0);
        };

        const currentTotal = Number(summary.currentEstimatedTotal) || 0;
        const bestTotalRaw = Number(summary.bestPerProductTotal);
        const bestTotal = Number.isFinite(bestTotalRaw) && bestTotalRaw > 0 ? bestTotalRaw : currentTotal;

        const overviewBlock = `
            <div class="summary-overview">
                <div class="summary-card">
                    <span class="summary-label">Suma wg obecnych cen</span>
                    <strong>${formatCurrency(currentTotal)}</strong>
                </div>
                <div class="summary-card">
                    <span class="summary-label">Najtańszy wariant</span>
                    <strong>${formatCurrency(bestTotal)}</strong>
                </div>
                <div class="summary-card">
                    <span class="summary-label">Liczba produktów</span>
                    <strong>${summary.requestedItems || 0}</strong>
                </div>
            </div>
        `;

        let strategyDescription = 'Brak rekomendacji – za mało danych cenowych.';
        if (summary.recommendedStrategy === 'single_store' && summary.recommendedStore) {
            strategyDescription = `Kup wszystko w sklepie <strong>${summary.recommendedStore.store}</strong> (około ${formatCurrency(summary.recommendedStore.total_cost)}).`;
        } else if (summary.recommendedStrategy === 'per_product' && bestTotal > 0) {
            strategyDescription = `Wybieraj najtańsze sklepy dla każdego produktu (około ${formatCurrency(bestTotal)}).`;
        }

        const strategyBlock = `
            <div class="summary-section strategy">
                <h3>Rekomendacja zakupu</h3>
                <p>${strategyDescription}</p>
            </div>
        `;

        let storeTotalsBlock = '';
        const storeTotals = summary.storeRecommendations?.storeTotals || [];
        if (Array.isArray(storeTotals) && storeTotals.length > 0) {
            const cards = storeTotals.map(store => {
                const coverageBase = summary.requestedItems || 0;
                const coverageText = coverageBase
                    ? `${store.covered_items}/${coverageBase} produktów`
                    : `${store.covered_items} produktów`;
                const missingText = store.missing_items
                    ? `<small class="store-total-missing">Brak cen dla ${store.missing_items}</small>`
                    : '';
                const isRecommended = summary.recommendedStore && store.store === summary.recommendedStore.store && store.missing_items === 0;
                const classes = [
                    'store-total-card',
                    isRecommended ? 'recommended' : '',
                    store.missing_items ? 'partial' : ''
                ].filter(Boolean).join(' ');

                return `
                    <div class="${classes}">
                        <div class="store-total-header">
                            <strong>${store.store}</strong>
                            <span>${formatCurrency(store.total_cost)}</span>
                        </div>
                        <div class="store-total-meta">
                            <small>${coverageText}</small>
                            ${missingText}
                        </div>
                    </div>
                `;
            }).join('');

            storeTotalsBlock = `
                <div class="summary-section">
                    <h3>Porównanie sklepów</h3>
                    <div class="store-totals-grid">
                        ${cards}
                    </div>
                </div>
            `;
        }

        let productsBlock = '';
        if (Array.isArray(summary.productInsights) && summary.productInsights.length > 0) {
            const productCards = summary.productInsights.map(item => {
                const best = item.bestOption;
                const hasBest = !!(best && best.store);
                const bestLine = hasBest
                    ? `<p class="product-line best"><strong>Najtaniej:</strong> ${best.store} • ${formatCurrency(best.total_price)}</p>`
                    : '<p class="product-line warning"><strong>Najtaniej:</strong> Brak danych</p>';

                const options = Array.isArray(item.storeOptions) && item.storeOptions.length > 0
                    ? item.storeOptions.slice(0, 6).map(option => {
                        const classes = ['store-chip'];
                        if (hasBest && option.store === best.store) {
                            classes.push('best');
                        }
                        return `<span class="${classes.join(' ')}">${option.store}: ${formatCurrency(option.total_price)}</span>`;
                    }).join('')
                    : '<span class="store-chip muted">Brak danych cenowych</span>';

                const unitLabel = item.unit ? ` ${item.unit}` : '';

                return `
                    <div class="product-insight-card">
                        <div class="product-insight-header">
                            <h4>${item.name}</h4>
                            <span>${item.requestedQuantity}${unitLabel}</span>
                        </div>
                        <p class="product-line"><strong>Obecnie:</strong> ${item.currentStore || '—'} • ${formatCurrency(item.currentTotalPrice)}</p>
                        ${bestLine}
                        <div class="store-options">${options}</div>
                    </div>
                `;
            }).join('');

            productsBlock = `
                <div class="summary-section">
                    <h3>Szczegóły produktów</h3>
                    <div class="product-insights-grid">
                        ${productCards}
                    </div>
                </div>
            `;
        }

        const missingPrices = (summary.storeRecommendations?.missingPrices || []).filter(Boolean);
        const missingBlock = missingPrices.length > 0
            ? `
                <div class="summary-section warning">
                    <h3>Brakujące dane cenowe</h3>
                    <p>Brakuje cen dla: ${missingPrices.join(', ')}</p>
                </div>
            `
            : '';

        return [overviewBlock, strategyBlock, storeTotalsBlock, productsBlock, missingBlock]
            .filter(Boolean)
            .join('');
    }

    buildFallbackSummary(items = []) {
        if (!Array.isArray(items) || items.length === 0) {
            return null;
        }

        const totalCurrent = items.reduce((sum, item) => {
            const price = Number(item.cena) || 0;
            const quantity = Number(item.ilosc_lista || item.ilosc || 1) || 1;
            return sum + price * quantity;
        }, 0);

        return {
            listId: items[0]?.id_listy || null,
            requestedItems: items.length,
            currentEstimatedTotal: Number(totalCurrent.toFixed(2)),
            bestPerProductTotal: Number(totalCurrent.toFixed(2)),
            recommendedStrategy: 'none',
            recommendedStore: null,
            productInsights: items.map(item => {
                const quantity = Number(item.ilosc_lista || item.ilosc || 1) || 1;
                const unitPrice = Number(item.cena) || 0;
                const totalPrice = unitPrice * quantity;
                return {
                    productId: item.id_produktu,
                    name: item.nazwa,
                    unit: item.jednostka || '',
                    requestedQuantity: quantity,
                    currentStore: item.sklep || '',
                    currentUnitPrice: unitPrice,
                    currentTotalPrice: totalPrice,
                    bestOption: null,
                    storeOptions: []
                };
            }),
            storeRecommendations: {
                bestStore: null,
                storeTotals: [],
                missingPrices: []
            },
            generatedAt: new Date().toISOString()
        };
    }
}

// Create global instance
window.shoppingListsManager = new ShoppingListsManager();
