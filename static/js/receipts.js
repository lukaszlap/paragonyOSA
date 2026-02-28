// Receipts Manager
class ReceiptsManager {
    constructor() {
        this.currentPage = 0;
        this.pageSize = CONFIG.DEFAULT_PAGE_SIZE;
        this.currentReceiptId = null;
        this.aiPdfConfig = {
            dishes: {
                buttonId: 'download-dishes-pdf',
                containerId: 'generated-recipes-container',
                filePrefix: 'Wygenerowany_przepis',
                title: 'Wygenerowany przepis'
            },
            health: {
                buttonId: 'download-health-pdf',
                containerId: 'health-analysis-container',
                filePrefix: 'Analiza_zdrowotnosci',
                title: 'Analiza zdrowotności AI'
            },
            seasonal: {
                buttonId: 'download-seasonal-pdf',
                containerId: 'seasonal-container',
                filePrefix: 'Analiza_sezonowosci',
                title: 'Analiza sezonowości AI'
            }
        };
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const prevPageBtn = document.getElementById('prev-page');
        const nextPageBtn = document.getElementById('next-page');
        const searchBtn = document.getElementById('search-btn');
        const searchInput = document.getElementById('search-receipts');
        const backBtn = document.getElementById('back-to-receipts');
        const editReceiptBtn = document.getElementById('edit-receipt-btn');
        const deleteReceiptBtn = document.getElementById('delete-receipt-btn');
        const suggestDishesBtn = document.getElementById('suggest-dishes-btn');
        const healthAnalysisBtn = document.getElementById('health-analysis-btn');
        const seasonalRecommendationsBtn = document.getElementById('seasonal-recommendations-btn');
        const dishesExportBtn = document.getElementById('download-dishes-pdf');
        const healthExportBtn = document.getElementById('download-health-pdf');
        const seasonalExportBtn = document.getElementById('download-seasonal-pdf');

        if (prevPageBtn) {
            prevPageBtn.addEventListener('click', () => this.previousPage());
        }

        if (nextPageBtn) {
            nextPageBtn.addEventListener('click', () => this.nextPage());
        }

        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.searchReceipts());
        }

        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.searchReceipts();
                }
            });
        }

        if (backBtn) {
            backBtn.addEventListener('click', () => {
                ui.showContentView('receipts-view');
                this.loadReceipts();
            });
        }

        if (editReceiptBtn) {
            editReceiptBtn.addEventListener('click', () => this.editReceipt());
        }

        if (deleteReceiptBtn) {
            deleteReceiptBtn.addEventListener('click', () => this.deleteReceipt());
        }

        if (suggestDishesBtn) {
            suggestDishesBtn.addEventListener('click', () => this.suggestDishes());
        }

        if (healthAnalysisBtn) {
            healthAnalysisBtn.addEventListener('click', () => this.getHealthAnalysis());
        }

        if (seasonalRecommendationsBtn) {
            seasonalRecommendationsBtn.addEventListener('click', () => this.getSeasonalRecommendations());
        }

        if (dishesExportBtn) {
            dishesExportBtn.addEventListener('click', () => this.handlePdfExport('dishes'));
        }

        if (healthExportBtn) {
            healthExportBtn.addEventListener('click', () => this.handlePdfExport('health'));
        }

        if (seasonalExportBtn) {
            seasonalExportBtn.addEventListener('click', () => this.handlePdfExport('seasonal'));
        }
    }

    handlePdfExport(sectionKey) {
        const config = this.aiPdfConfig[sectionKey];
        if (!config) {
            return;
        }

        this.exportSectionToPdf(config);
    }

    async exportSectionToPdf(config) {
        if (!config) {
            return;
        }

        if (typeof html2pdf === 'undefined') {
            ui.showToast('Biblioteka eksportu PDF nie została jeszcze załadowana.', 'error');
            return;
        }

        const container = document.getElementById(config.containerId);
        if (!container) {
            ui.showToast('Nie znaleziono sekcji do eksportu.', 'error');
            return;
        }

        if (!this.hasRenderableContent(container)) {
            ui.showToast('Brak wyników do zapisania w PDF.', 'warning');
            return;
        }

        const clone = container.cloneNode(true);
        const wrapper = document.createElement('section');
        wrapper.className = 'ai-section-export';
        const heading = document.createElement('h2');
        heading.textContent = config.title;
        heading.style.marginBottom = '16px';
        wrapper.appendChild(heading);
        wrapper.appendChild(clone);

        const filename = `${config.filePrefix || 'Paragon_AI'}_${this.currentReceiptId || 'raport'}.pdf`;

        try {
            await html2pdf()
                .set({
                    margin: 0.5,
                    filename,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
                    jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
                })
                .from(wrapper)
                .save();
        } catch (error) {
            console.error('PDF export error:', error);
            ui.showToast('Nie udało się wygenerować pliku PDF.', 'error');
        }
    }

    hasRenderableContent(element) {
        if (!element) {
            return false;
        }

        const textContent = (element.innerText || element.textContent || '').trim();
        const hasMedia = element.querySelector('img, canvas, svg, table, article, section');
        return textContent.length > 0 || Boolean(hasMedia);
    }

    togglePdfExport(sectionKey, enabled) {
        const config = this.aiPdfConfig[sectionKey];
        if (!config) {
            return;
        }

        const button = document.getElementById(config.buttonId);
        if (!button) {
            return;
        }

        button.disabled = !enabled;
        button.setAttribute('aria-disabled', (!enabled).toString());
    }

    async initialize() {
        await this.loadReceipts();
    }

    async loadReceipts() {
        try {
            const receipts = await api.getReceipts(this.currentPage, this.pageSize);
            const container = document.getElementById('receipts-list');

            if (!receipts || receipts.length === 0) {
                ui.showEmptyState('receipts-list', 'Brak paragonów', 'fas fa-receipt');
                return;
            }

            container.innerHTML = receipts
                .map(receipt => ui.createReceiptCard(receipt))
                .join('');

            // Add click handlers
            container.querySelectorAll('.receipt-card').forEach(card => {
                card.addEventListener('click', () => {
                    const receiptId = card.dataset.id;
                    this.showReceiptDetail(receiptId);
                });
            });

            // Update pagination
            document.getElementById('page-info').textContent = `Strona ${this.currentPage + 1}`;

        } catch (error) {
            ui.showToast(error.message || 'Błąd ładowania paragonów', 'error');
        } finally {
            ui.hideLoader();
        }
    }

    async previousPage() {
        if (this.currentPage > 0) {
            this.currentPage--;
            await this.loadReceipts();
        }
    }

    async nextPage() {
        this.currentPage++;
        const receipts = await api.getReceipts(this.currentPage, this.pageSize);
        
        if (!receipts || receipts.length === 0) {
            this.currentPage--;
            ui.showToast('To jest ostatnia strona', 'info');
        } else {
            await this.loadReceipts();
        }
    }

    async searchReceipts() {
        const searchInput = document.getElementById('search-receipts');
        const query = searchInput.value.trim();

        if (!query) {
            ui.showToast('Wprowadź nazwę firmy', 'warning');
            return;
        }

        ui.showLoader();

        try {
            const receipts = await api.searchByCompany(query);
            const container = document.getElementById('receipts-list');

            if (!receipts || receipts.length === 0) {
                ui.showEmptyState('receipts-list', `Nie znaleziono paragonów dla "${query}"`, 'fas fa-search');
                return;
            }

            container.innerHTML = receipts
                .map(receipt => ui.createReceiptCard(receipt))
                .join('');

            // Add click handlers
            container.querySelectorAll('.receipt-card').forEach(card => {
                card.addEventListener('click', () => {
                    const receiptId = card.dataset.id;
                    this.showReceiptDetail(receiptId);
                });
            });

        } catch (error) {
            ui.showToast(error.message || 'Błąd wyszukiwania', 'error');
        } finally {
            ui.hideLoader();
        }
    }

    async showReceiptDetail(receiptId) {
        // If switching to a different receipt, clear AI cache and containers
        if (this.currentReceiptId !== receiptId) {
            this.clearContainersContent();
        }
        
        this.currentReceiptId = receiptId;
        ui.showContentView('receipt-detail-view');
        
        ui.showLoader();

        try {
            // Load receipt data
            const receipt = await api.getReceipt(receiptId);

            const receiptImage = document.getElementById('receipt-image');
            const imageSection = document.querySelector('.receipt-image-section');
            if (receiptImage && imageSection) {
                const placeholder = imageSection.querySelector('.receipt-image-empty-state');
                if (receipt.obraz) {
                    const imageSrc = `data:image/jpeg;base64,${receipt.obraz}`;
                    receiptImage.src = imageSrc;
                    receiptImage.classList.remove('hidden');
                    receiptImage.style.cursor = 'default';
                    receiptImage.onclick = null;
                    
                    if (placeholder) {
                        placeholder.remove();
                    }
                } else {
                    receiptImage.removeAttribute('src');
                    receiptImage.classList.add('hidden');
                    receiptImage.style.cursor = 'default';
                    receiptImage.onclick = null;
                    if (!placeholder) {
                        const emptyState = document.createElement('div');
                        emptyState.className = 'receipt-image-empty-state';
                        emptyState.innerHTML = `
                            <i class="fas fa-image"></i>
                            <p>Brak podglądu paragonu</p>
                        `;
                        imageSection.appendChild(emptyState);
                    }
                }
            }

            const safeText = (value, fallback = '--') => ui.escapeHtml(value ? String(value) : fallback);
            const infoEntries = [
                {
                    icon: 'fas fa-store',
                    label: 'Firma',
                    value: safeText(receipt.nazwa_firmy)
                },
                {
                    icon: 'fas fa-city',
                    label: 'Miasto',
                    value: safeText(receipt.nazwa_miasta ? `${receipt.nazwa_miasta}${receipt.kod_pocztowy ? ` (${receipt.kod_pocztowy})` : ''}` : '')
                },
                {
                    icon: 'fas fa-map-marker-alt',
                    label: 'Adres',
                    value: safeText(receipt.ulica)
                },
                {
                    icon: 'fas fa-calendar-day',
                    label: 'Data',
                    value: safeText(ui.formatDate(receipt.data_dodania))
                }
            ];

            const discountValue = Number(receipt.rabat);
            if (Number.isFinite(discountValue) && discountValue > 0) {
                infoEntries.push({
                    icon: 'fas fa-percent',
                    label: 'Rabat',
                    value: safeText(ui.formatCurrency(discountValue))
                });
            }

            const infoContainer = document.getElementById('receipt-info-content');
            infoContainer.innerHTML = `
                <div class="receipt-info-grid">
                    ${infoEntries.map(entry => `
                        <div class="receipt-info-card">
                            <div class="receipt-info-icon"><i class="${entry.icon}"></i></div>
                            <div class="receipt-info-copy">
                                <span class="receipt-info-label">${entry.label}</span>
                                <span class="receipt-info-value">${entry.value}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="receipt-total-highlight">
                    <div class="receipt-total-amount">${ui.formatCurrency(receipt.suma)}</div>
                    <div class="receipt-total-meta">
                        <i class="fas fa-wallet"></i>
                        Łączna kwota zakupu
                    </div>
                </div>
                ${receipt.opis ? `
                <div class="receipt-note" style="margin-top: 2rem;">
                    <i class="fas fa-sticky-note"></i>
                    <p>${safeText(receipt.opis)}</p>
                </div>
                ` : ''}
            `;

            // Load products
            await this.loadReceiptProducts(receiptId);

        } catch (error) {
            ui.showToast(error.message || 'Błąd ładowania paragonu', 'error');
        } finally {
            ui.hideLoader();
        }
    }

    async loadReceiptProducts(receiptId) {
        try {
            const products = await api.getProducts(receiptId);
            const container = document.getElementById('receipt-products-list');

            if (!products || products.length === 0) {
                container.innerHTML = '<p>Brak produktów</p>';
                return;
            }

            container.innerHTML = `
                <table class="products-table">
                    <caption class="sr-only">Produkty z wybranego paragonu</caption>
                    <thead>
                        <tr>
                            <th>Nazwa</th>
                            <th>Kategoria</th>
                            <th>Cena</th>
                            <th>Ilość</th>
                            <th>VAT</th>
                            <th>Akcje</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${products.map(product => ui.createProductRow(product)).join('')}
                    </tbody>
                </table>
            `;

            // Add event listeners for product actions
            this.attachProductActionListeners();

        } catch (error) {
            console.error('Error loading products:', error);
        }
    }

    attachProductActionListeners() {
        // View product info buttons
        document.querySelectorAll('.view-product-info-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const productName = btn.dataset.name;
                this.viewProductInfo(productName);
            });
        });

        // Edit product buttons
        document.querySelectorAll('.edit-product-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const productId = btn.dataset.id;
                this.editProduct(productId);
            });
        });

        // Delete product buttons
        document.querySelectorAll('.delete-product-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const productId = btn.dataset.id;
                this.deleteProduct(productId);
            });
        });
    }

    async editProduct(productId) {
        await this.openEditProductModal(productId);
    }

    async openEditProductModal(productId) {
        const modal = document.getElementById('edit-product-modal');
        if (!modal) {
            ui.showToast('Błąd: Modal edycji nie został znaleziony', 'error');
            return;
        }

        ui.showLoader();

        try {
            // Load current product data
            const products = await api.getProducts(this.currentReceiptId);
            const product = products.find(p => p.id_produktu == productId);

            if (!product) {
                ui.showToast('Produkt nie został znaleziony', 'error');
                return;
            }

            // Load categories
            const categories = await api.getCategories();

            // Debug: Log the structure
            console.log('Product data:', product);
            console.log('Categories data:', categories);

            // Populate category dropdown - handle different possible field names
            const categorySelect = document.getElementById('edit-product-category');
            
            if (!categorySelect) {
                throw new Error('Nie znaleziono elementu select kategorii');
            }

            if (categories && Array.isArray(categories) && categories.length > 0) {
                const categoryOptions = categories.map(cat => {
                    // Try different field name variants
                    const name = cat.nazwa_kategorii || cat.nazwa_Kategorii || cat.Nazwa_Kategorii || 
                                cat.nazwaKategorii || cat.kategoria || cat.nazwa || cat.name || 
                                JSON.stringify(cat); // fallback to show structure
                    return `<option value="${ui.escapeHtml(name)}">${ui.escapeHtml(name)}</option>`;
                }).join('');
                categorySelect.innerHTML = '<option value="">Wybierz kategorię...</option>' + categoryOptions;
                console.log('Categories populated:', categorySelect.options.length - 1, 'options');
            } else {
                console.warn('No categories data available:', categories);
                categorySelect.innerHTML = '<option value="">Brak dostępnych kategorii</option>';
            }

            // Populate form with current data
            document.getElementById('edit-product-id').value = product.id_produktu;
            document.getElementById('edit-product-name').value = product.nazwa_produktu || '';
            document.getElementById('edit-product-category').value = product.nazwa_kategorii || '';
            document.getElementById('edit-product-price').value = product.cena || 0;
            document.getElementById('edit-product-quantity').value = product.ilosc || 1;
            document.getElementById('edit-product-unit').value = product.jednostka || 'szt';
            document.getElementById('edit-product-tax').value = product.typ_podatku || 'A';

            // Calculate and show unit price
            this.updateCalculatedUnitPrice();

            // Show modal
            modal.classList.remove('hidden');

            // Setup auto-calculation for unit price
            document.getElementById('edit-product-price').oninput = () => this.updateCalculatedUnitPrice();
            document.getElementById('edit-product-quantity').oninput = () => this.updateCalculatedUnitPrice();

            // Setup form handler
            const form = document.getElementById('edit-product-form');
            form.onsubmit = async (e) => {
                e.preventDefault();
                await this.saveProductChanges();
            };

            // Setup delete button
            document.getElementById('delete-product-from-modal').onclick = async () => {
                modal.classList.add('hidden');
                await this.deleteProduct(productId);
            };

            // Setup close handlers
            modal.querySelectorAll('.close-modal').forEach(btn => {
                btn.onclick = () => {
                    modal.classList.add('hidden');
                    this.clearFormErrors('edit-product-form');
                };
            });

            modal.onclick = (e) => {
                if (e.target === modal) {
                    modal.classList.add('hidden');
                    this.clearFormErrors('edit-product-form');
                }
            };

        } catch (error) {
            console.error('Error opening edit product modal:', error);
            ui.showToast(error.message || 'Błąd ładowania danych produktu', 'error');
        } finally {
            ui.hideLoader();
        }
    }

    updateCalculatedUnitPrice() {
        const price = parseFloat(document.getElementById('edit-product-price').value) || 0;
        const quantity = parseFloat(document.getElementById('edit-product-quantity').value) || 1;
        
        const unitPrice = quantity > 0 ? (price / quantity) : 0;
        document.getElementById('calculated-unit-price').textContent = `${unitPrice.toFixed(2)} zł`;
    }

    async saveProductChanges() {
        // Clear previous errors
        this.clearFormErrors('edit-product-form');

        // Get form data
        const productId = document.getElementById('edit-product-id').value;
        const formData = {
            nazwa_Produktu: document.getElementById('edit-product-name').value.trim(),
            cena: parseFloat(document.getElementById('edit-product-price').value),
            ilosc: parseFloat(document.getElementById('edit-product-quantity').value),
            jednostka: document.getElementById('edit-product-unit').value,
            typ_Podatku: document.getElementById('edit-product-tax').value,
            nazwa_Kategorii: document.getElementById('edit-product-category').value.trim()
        };

        // Validate
        const errors = this.validateProductForm(formData);
        if (errors.length > 0) {
            errors.forEach(error => {
                const errorElement = document.getElementById(`edit-product-${error.field}-error`);
                if (errorElement) {
                    errorElement.textContent = error.message;
                }
            });
            ui.showToast('Popraw błędy w formularzu', 'error');
            return;
        }

        ui.showLoader();

        try {
            await api.updateProduct(productId, formData);
            ui.showToast('Produkt zaktualizowany pomyślnie', 'success');
            
            // Close modal
            document.getElementById('edit-product-modal').classList.add('hidden');
            
            // Reload products list and receipt (because suma might have changed)
            await this.loadReceiptProducts(this.currentReceiptId);
            await this.showReceiptDetail(this.currentReceiptId);

        } catch (error) {
            console.error('Error saving product:', error);
            ui.showToast(error.message || 'Błąd aktualizacji produktu', 'error');
        } finally {
            ui.hideLoader();
        }
    }

    validateProductForm(data) {
        const errors = [];

        if (!data.nazwa_Produktu) {
            errors.push({ field: 'name', message: 'Podaj nazwę produktu' });
        }

        if (!data.nazwa_Kategorii) {
            errors.push({ field: 'category', message: 'Wybierz kategorię' });
        }

        if (isNaN(data.cena) || data.cena < 0) {
            errors.push({ field: 'price', message: 'Cena musi być liczbą dodatnią' });
        }

        if (isNaN(data.ilosc) || data.ilosc <= 0) {
            errors.push({ field: 'quantity', message: 'Ilość musi być większa od zera' });
        }

        return errors;
    }

    async deleteProduct(productId) {
        const confirmed = await this.showConfirmDialog(
            'Czy na pewno chcesz usunąć ten produkt?',
            'Po usunięciu produktu suma paragonu zostanie automatycznie przeliczona.'
        );

        if (!confirmed) return;

        ui.showLoader();

        try {
            await api.deleteProduct(productId);
            ui.showToast('Produkt usunięty pomyślnie', 'success');
            
            // Reload products list and receipt (because suma might have changed)
            await this.loadReceiptProducts(this.currentReceiptId);
            await this.showReceiptDetail(this.currentReceiptId);

        } catch (error) {
            ui.showToast(error.message || 'Błąd usuwania produktu', 'error');
        } finally {
            ui.hideLoader();
        }
    }

    async showConfirmDialog(title, message) {
        return new Promise((resolve) => {
            const modal = document.getElementById('confirm-delete-modal');
            if (!modal) {
                resolve(false);
                return;
            }

            const messageElement = document.getElementById('confirm-delete-message');
            messageElement.innerHTML = `<strong>${ui.escapeHtml(title)}</strong><br>${ui.escapeHtml(message)}`;

            modal.classList.remove('hidden');

            const confirmBtn = document.getElementById('confirm-delete-action');
            const cancelBtns = modal.querySelectorAll('.close-modal');

            const cleanup = () => {
                modal.classList.add('hidden');
                confirmBtn.onclick = null;
                cancelBtns.forEach(btn => btn.onclick = null);
                modal.onclick = null;
            };

            confirmBtn.onclick = () => {
                cleanup();
                resolve(true);
            };

            cancelBtns.forEach(btn => {
                btn.onclick = () => {
                    cleanup();
                    resolve(false);
                };
            });

            modal.onclick = (e) => {
                if (e.target === modal) {
                    cleanup();
                    resolve(false);
                }
            };
        });
    }

    async viewProductInfo(productName) {
        ui.showLoader();

        try {
            const response = await api.getProductInfo(productName);
            
            // Parse response if it's a string
            let productData;
            if (typeof response === 'string') {
                try {
                    productData = JSON.parse(response);
                } catch (e) {
                    console.error('Error parsing product info:', e);
                    ui.showToast('Błąd parsowania danych produktu', 'error');
                    return;
                }
            } else {
                productData = response;
            }

            // Check if product data is available
            if (!productData || productData.length === 0) {
                ui.showToast('Nie znaleziono informacji o tym produkcie', 'warning');
                return;
            }

            // Get first result and validate it has required data
            const product = Array.isArray(productData) ? productData[0] : productData;
            
            if (!product || !product.nazwa_produktu) {
                ui.showToast('Brak wymaganych danych o produkcie', 'warning');
                console.warn('Product data missing nazwa_produktu:', product);
                return;
            }

            // Show product info in modal
            this.showProductInfoModal(product);

        } catch (error) {
            console.error('Error loading product info:', error);
            ui.showToast(error.message || 'Błąd ładowania informacji o produkcie', 'error');
        } finally {
            ui.hideLoader();
        }
    }

    showProductInfoModal(product) {
        const modal = document.getElementById('product-info-modal');
        if (!modal) {
            console.error('Product info modal not found in DOM');
            ui.showToast('Błąd: Modal nie został znaleziony', 'error');
            return;
        }

        const title = document.getElementById('product-info-title');
        const content = document.getElementById('product-info-content');

        if (!title || !content) {
            console.error('Product info modal elements not found');
            ui.showToast('Błąd: Elementy modalu nie zostały znalezione', 'error');
            return;
        }

        // Additional validation for product data
        if (!product) {
            console.error('Product data is null or undefined');
            ui.showToast('Błąd: Brak danych produktu', 'error');
            return;
        }

        if (!product.nazwa_produktu) {
            console.error('Product missing nazwa_produktu field:', product);
            ui.showToast('Błąd: Produkt nie ma nazwy', 'error');
            return;
        }

        title.textContent = product.nazwa_produktu || 'Informacje o produkcie';

    const safe = (value, fallback = '--') => ui.escapeHtml(value ? String(value) : fallback);
        const nutritionValues = product.wartosci_odzywcze || {};

        const chipList = [
            product.marka ? `<span class="product-info-chip"><i class="fas fa-tag"></i>${safe(product.marka)}</span>` : '',
            product.ean ? `<span class="product-info-chip"><i class="fas fa-barcode"></i>${safe(product.ean)}</span>` : '',
            product.kategoria ? `<span class="product-info-chip"><i class="fas fa-layer-group"></i>${safe(product.kategoria)}</span>` : '',
            product.kraj_pochodzenia ? `<span class="product-info-chip"><i class="fas fa-globe-europe"></i>${safe(product.kraj_pochodzenia)}</span>` : ''
        ].filter(Boolean).join('');

        const detailRows = [
            product.producent ? { label: 'Producent', value: product.producent } : null,
            product.opis ? { label: 'Opis', value: product.opis } : null,
            product.kategoria_glowna ? { label: 'Kategoria główna', value: product.kategoria_glowna } : null
        ].filter(Boolean);

        const nutritionMap = [
            { label: 'Kalorie', value: nutritionValues.kalorie ? `${nutritionValues.kalorie} kcal` : null },
            { label: 'Tłuszcz', value: nutritionValues.tluszcz ? `${nutritionValues.tluszcz} g` : null },
            { label: 'Węglowodany', value: nutritionValues.weglowodany ? `${nutritionValues.weglowodany} g` : null },
            { label: 'Cukry', value: nutritionValues.cukry ? `${nutritionValues.cukry} g` : null },
            { label: 'Białko', value: nutritionValues.bialko ? `${nutritionValues.bialko} g` : null },
            { label: 'Błonnik', value: nutritionValues.blonnik ? `${nutritionValues.blonnik} g` : null },
            { label: 'Sól', value: nutritionValues.sol ? `${nutritionValues.sol} g` : null },
            { label: 'Sód', value: nutritionValues.sod ? `${nutritionValues.sod} g` : null }
        ].filter(item => item.value);

        const nutritionSection = nutritionMap.length > 0
            ? `
                <div class="product-info-section">
                    <h4><i class="fas fa-apple-alt"></i> Wartości odżywcze (na 100 g)</h4>
                    <div class="nutrition-grid">
                        ${nutritionMap.map(item => `
                            <div class="nutrition-item">
                                <span>${item.label}</span>
                                <strong>${item.value}</strong>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `
            : `<div class="product-info-empty">Brak danych o wartościach odżywczych.</div>`;

        const ingredientsSection = nutritionValues.ingredients_text
            ? `
                <div class="product-info-section">
                    <h4><i class="fas fa-list"></i> Składniki</h4>
                    <p>${safe(nutritionValues.ingredients_text)}</p>
                </div>
            `
            : '';

        const allergensSection = nutritionValues.allergens
            ? `
                <div class="product-info-section alert">
                    <h4><i class="fas fa-exclamation-triangle"></i> Alergeny</h4>
                    <p>${safe(nutritionValues.allergens)}</p>
                </div>
            `
            : '';

        const detailsSection = detailRows.length > 0
            ? `
                <div class="product-info-section">
                    <h4><i class="fas fa-circle-info"></i> Informacje dodatkowe</h4>
                    <div class="product-info-grid">
                        ${detailRows.map(row => `
                            <div class="product-info-field">
                                <span class="field-label">${row.label}</span>
                                <span class="field-value">${safe(row.value)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `
            : '';

        content.innerHTML = `
            <div class="product-info-layout">
                <div class="product-info-hero">
                    ${product.image_thumb_url ? `
                        <img src="${product.image_thumb_url}" alt="${safe(product.nazwa_produktu || 'Produkt')}" />
                    ` : `
                        <div class="product-info-placeholder">
                            <i class="fas fa-box-open"></i>
                        </div>
                    `}
                </div>
                <div class="product-info-main">
                    ${chipList ? `<div class="product-info-chips">${chipList}</div>` : ''}
                    ${ingredientsSection}
                    ${allergensSection}
                    ${detailsSection}
                </div>
            </div>
            ${nutritionSection}
        `;

        modal.classList.remove('hidden');

        // Close modal handlers
        const closeBtn = modal.querySelector('.close-modal');
        if (closeBtn) {
            closeBtn.onclick = () => {
                modal.classList.add('hidden');
            };
        }

        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        };
    }

    async editReceipt() {
        await this.openEditReceiptModal();
    }

    async openEditReceiptModal() {
        const modal = document.getElementById('edit-receipt-modal');
        if (!modal) {
            ui.showToast('Błąd: Modal edycji nie został znaleziony', 'error');
            return;
        }

        ui.showLoader();

        try {
            // Load current receipt data
            const receipt = await api.getReceipt(this.currentReceiptId);
            
            // Load reference data (companies, cities)
            const [companies, cities] = await Promise.all([
                api.getCompanies(),
                api.getCities()
            ]);

            // Debug: Log the structure
            console.log('Receipt data:', receipt);
            console.log('Companies data:', companies);
            console.log('Cities data:', cities);

            // Populate dropdowns
            const companySelect = document.getElementById('edit-receipt-company');
            const citySelect = document.getElementById('edit-receipt-city');

            if (!companySelect || !citySelect) {
                throw new Error('Nie znaleziono elementów formularza');
            }

            // Handle companies - try different possible field names
            if (companies && Array.isArray(companies) && companies.length > 0) {
                const companyOptions = companies.map(company => {
                    // Try different field name variants
                    const name = company.nazwa_firmy || company.nazwa_Firmy || company.Nazwa_Firmy || 
                                company.nazwaFirmy || company.firma || company.nazwa || company.name || 
                                JSON.stringify(company); // fallback to show structure
                    return `<option value="${ui.escapeHtml(name)}">${ui.escapeHtml(name)}</option>`;
                }).join('');
                companySelect.innerHTML = '<option value="">Wybierz firmę...</option>' + companyOptions;
                console.log('Companies populated:', companySelect.options.length - 1, 'options');
            } else {
                console.warn('No companies data available:', companies);
                companySelect.innerHTML = '<option value="">Brak dostępnych firm</option>';
            }

            // Handle cities - try different possible field names
            if (cities && Array.isArray(cities) && cities.length > 0) {
                const cityOptions = cities.map(city => {
                    // Try different field name variants
                    const name = city.nazwa_miasta || city.nazwa_Miasta || city.Nazwa_Miasta || 
                                city.nazwaMiasta || city.miasto || city.nazwa || city.name || 
                                JSON.stringify(city); // fallback to show structure
                    return `<option value="${ui.escapeHtml(name)}">${ui.escapeHtml(name)}</option>`;
                }).join('');
                citySelect.innerHTML = '<option value="">Wybierz miasto...</option>' + cityOptions;
                console.log('Cities populated:', citySelect.options.length - 1, 'options');
            } else {
                console.warn('No cities data available:', cities);
                citySelect.innerHTML = '<option value="">Brak dostępnych miast</option>';
            }

            // Populate form with current data
            document.getElementById('edit-receipt-company').value = receipt.nazwa_firmy || '';
            document.getElementById('edit-receipt-city').value = receipt.nazwa_miasta || '';
            document.getElementById('edit-receipt-street').value = receipt.ulica || '';
            document.getElementById('edit-receipt-total').value = receipt.suma || 0;
            document.getElementById('edit-receipt-discount').value = receipt.rabat || 0;
            document.getElementById('edit-receipt-description').value = receipt.opis || '';

            // Show modal
            modal.classList.remove('hidden');

            // Setup form handler
            const form = document.getElementById('edit-receipt-form');
            form.onsubmit = async (e) => {
                e.preventDefault();
                await this.saveReceiptChanges();
            };

            // Setup close handlers
            modal.querySelectorAll('.close-modal').forEach(btn => {
                btn.onclick = () => {
                    modal.classList.add('hidden');
                    this.clearFormErrors('edit-receipt-form');
                };
            });

            modal.onclick = (e) => {
                if (e.target === modal) {
                    modal.classList.add('hidden');
                    this.clearFormErrors('edit-receipt-form');
                }
            };

        } catch (error) {
            console.error('Error opening edit modal:', error);
            ui.showToast(error.message || 'Błąd ładowania danych', 'error');
        } finally {
            ui.hideLoader();
        }
    }

    async saveReceiptChanges() {
        // Clear previous errors
        this.clearFormErrors('edit-receipt-form');

        // Get form data
        const formData = {
            nazwa_Firmy: document.getElementById('edit-receipt-company').value.trim(),
            nazwa_Miasta: document.getElementById('edit-receipt-city').value.trim(),
            ulica: document.getElementById('edit-receipt-street').value.trim(),
            suma: parseFloat(document.getElementById('edit-receipt-total').value),
            rabat: parseFloat(document.getElementById('edit-receipt-discount').value) || 0,
            opis: document.getElementById('edit-receipt-description').value.trim()
        };

        // Validate
        const errors = this.validateReceiptForm(formData);
        if (errors.length > 0) {
            errors.forEach(error => {
                const errorElement = document.getElementById(`edit-receipt-${error.field}-error`);
                if (errorElement) {
                    errorElement.textContent = error.message;
                }
            });
            ui.showToast('Popraw błędy w formularzu', 'error');
            return;
        }

        ui.showLoader();

        try {
            await api.updateReceipt(this.currentReceiptId, formData);
            ui.showToast('Paragon zaktualizowany pomyślnie', 'success');
            
            // Close modal
            document.getElementById('edit-receipt-modal').classList.add('hidden');
            
            // Reload receipt details
            await this.showReceiptDetail(this.currentReceiptId);

        } catch (error) {
            console.error('Error saving receipt:', error);
            ui.showToast(error.message || 'Błąd aktualizacji paragonu', 'error');
        } finally {
            ui.hideLoader();
        }
    }

    validateReceiptForm(data) {
        const errors = [];

        if (!data.nazwa_Firmy) {
            errors.push({ field: 'company', message: 'Wybierz firmę' });
        }

        if (!data.nazwa_Miasta) {
            errors.push({ field: 'city', message: 'Wybierz miasto' });
        }

        if (isNaN(data.suma) || data.suma < 0) {
            errors.push({ field: 'total', message: 'Suma musi być liczbą dodatnią' });
        }

        if (isNaN(data.rabat)) {
            errors.push({ field: 'discount', message: 'Rabat musi być liczbą' });
        }

        return errors;
    }

    clearFormErrors(formId) {
        const form = document.getElementById(formId);
        if (form) {
            form.querySelectorAll('.form-error').forEach(errorElement => {
                errorElement.textContent = '';
            });
        }
    }

    async deleteReceipt() {
        const confirmed = await this.showConfirmDialog(
            'Czy na pewno chcesz usunąć ten paragon?',
            'Operacja usunie paragon wraz ze wszystkimi produktami. Tej operacji nie można cofnąć.'
        );

        if (!confirmed) return;

        ui.showLoader();

        try {
            await api.deleteReceipt(this.currentReceiptId);
            ui.showToast('Paragon usunięty pomyślnie', 'success');
            ui.showContentView('receipts-view');
            await this.loadReceipts();
        } catch (error) {
            ui.showToast(error.message || 'Błąd usuwania paragonu', 'error');
        } finally {
            ui.hideLoader();
        }
    }

    async suggestDishes() {
        this.showAILoadingState('dishes', true);
        this.showAILoadingMessage(true);

        try {
            // Check if data is already cached for this receipt
            const cachedData = this.getCachedData('recipes');
            if (cachedData) {
                this.displayDishSuggestions(cachedData);
                this.showAILoadingState('dishes', false);
                this.showAILoadingMessage(false);
                return;
            }

            // Fetch from API
            const response = await api.suggestDishes(this.currentReceiptId);

            if (Array.isArray(response.recipes) && response.recipes.length > 0) {
                // Cache the response
                this.setCachedData('recipes', response);
                this.displayDishSuggestions(response);
            } else {
                this.displayDishSuggestionsError();
            }

        } catch (error) {
            console.error('Error loading dish suggestions:', error);
            ui.showToast(error.message || 'Błąd ładowania sugestii', 'error');
            this.displayDishSuggestionsError();
        } finally {
            this.showAILoadingState('dishes', false);
            this.showAILoadingMessage(false);
        }
    }

    displayDishSuggestions(response) {
        const container = document.getElementById('dishes-suggestions');
        container.innerHTML = `
            <div class="suggestions-grid">
                ${response.recipes.map(dish => this.createDishSuggestionCard(dish)).join('')}
            </div>
        `;

        container.querySelectorAll('.create-recipe-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.createRecipe(btn.dataset.name, btn.dataset.desc);
            });
        });

        // Don't enable PDF export yet - wait for actual recipe generation
        this.togglePdfExport('dishes', false);
    }

    displayDishSuggestionsError() {
        const container = document.getElementById('dishes-suggestions');
        container.innerHTML = `
            <div class="suggestions-empty-state">
                <i class="fas fa-utensils"></i>
                <p>Brak sugestii dań dla wybranych produktów.</p>
            </div>
        `;

        this.togglePdfExport('dishes', false);
    }

    createDishSuggestionCard(dish) {
        const nameRaw = dish?.Dish_name || 'Propozycja dania';
        const descriptionRaw = dish?.Dish_description || 'Brak opisu.';
        const name = ui.escapeHtml(nameRaw);
        const description = ui.escapeHtml(descriptionRaw);
        
        // Generate small preview image for dish card
        const imageUrl = this.createDishCardImage(nameRaw);

        return `
            <article class="dish-card">
                <div class="dish-card-image-container">
                    <img class="dish-card-image" src="${imageUrl}" alt="${name}" loading="lazy" />
                </div>
                <header class="dish-card-header">
                    <div class="dish-card-icon"><i class="fas fa-utensils"></i></div>
                    <div class="dish-card-copy">
                        <h4>${name}</h4>
                        <p>${description}</p>
                    </div>
                </header>
                <div class="dish-card-actions">
                    <button class="btn btn-primary btn-small create-recipe-btn" data-name="${ui.escapeHtml(nameRaw)}" data-desc="${ui.escapeHtml(descriptionRaw)}">
                        <i class="fas fa-book"></i>
                        Generuj przepis
                    </button>
                </div>
            </article>
        `;
    }

    createDishCardImage(dishName) {
        // Simple prompt for dish card preview images
        const prompt = this.translateToImagePrompt(dishName, '');
        const encodedPrompt = encodeURIComponent(prompt);
        
        // Smaller image for cards: 300x200
        return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=300&height=200&nologo=true`;
    }

    async createRecipe(dishName, dishDescription) {
        this.showAILoadingState('dishes', true);
        this.showAILoadingMessage(true);

        try {
            const response = await api.createRecipe(this.currentReceiptId, dishName, dishDescription);
            
            if (response.status === 'success' || response.recipe) {
                // Show recipe in container at the bottom of suggestions
                this.showRecipeInContainer(dishName, response.recipe || response.message);
            } else if (response.message) {
                // If there's a message, show it in the container
                this.showRecipeInContainer(dishName, response.message);
            } else {
                ui.showToast('Błąd generowania przepisu', 'error');
            }

        } catch (error) {
            console.error('Error creating recipe:', error);
            ui.showToast(error.message || 'Błąd generowania przepisu', 'error');
        } finally {
            this.showAILoadingState('dishes', false);
            this.showAILoadingMessage(false);
        }
    }

    showRecipeInContainer(dishName, recipeContent) {
        const container = document.getElementById('generated-recipes-container');
        
        // Check if recipeContent is a structured JSON object or plain text
        let recipeHTML = '';
        
        if (typeof recipeContent === 'object' && recipeContent !== null) {
            // Structured recipe - render beautifully
            recipeHTML = this.createStructuredRecipe(dishName, recipeContent);
        } else if (typeof recipeContent === 'string') {
            // Fallback to markdown rendering for plain text
            const html = this.markdownToHtml(recipeContent.trim());
            recipeHTML = `
                <div class="recipe-container">
                    <div class="recipe-header">
                        <h3><i class="fas fa-book-open"></i> ${ui.escapeHtml(dishName)}</h3>
                    </div>
                    <div class="recipe-content">
                        ${html || '<p>Przepis został wygenerowany pomyślnie, ale nie zawierał treści.</p>'}
                    </div>
                </div>
            `;
        } else {
            recipeHTML = `
                <div class="recipe-container">
                    <div class="recipe-header">
                        <h3><i class="fas fa-book-open"></i> ${ui.escapeHtml(dishName)}</h3>
                    </div>
                    <div class="recipe-content">
                        <p>Przepis został wygenerowany pomyślnie, ale nie zawierał treści.</p>
                    </div>
                </div>
            `;
        }
        
        container.innerHTML += recipeHTML;
        
        // Setup image load handlers after DOM insertion
        this.setupRecipeImageHandlers();
        
        // Scroll to recipe
        container.scrollIntoView({ behavior: 'smooth', block: 'end' });

        // Show toolbar and enable PDF export for generated recipes
        const toolbar = document.getElementById('recipes-pdf-toolbar');
        if (toolbar) {
            toolbar.style.display = 'flex';
        }
        this.togglePdfExport('dishes', this.hasRenderableContent(container));
    }

    setupRecipeImageHandlers() {
        // Find all recipe images that need handlers
        const recipeImages = document.querySelectorAll('.recipe-image');
        
        recipeImages.forEach(img => {
            if (!img.dataset.handlerAttached) {
                img.dataset.handlerAttached = 'true';
                
                img.addEventListener('load', function() {
                    this.style.opacity = '1';
                    const placeholder = document.getElementById(this.id + '-placeholder');
                    if (placeholder) {
                        placeholder.style.display = 'none';
                    }
                });
                
                img.addEventListener('error', function() {
                    const wrapper = this.parentElement;
                    if (wrapper) {
                        wrapper.innerHTML = `
                            <div class="recipe-image-error">
                                <i class="fas fa-image"></i>
                                <span>Nie udało się wygenerować obrazu</span>
                            </div>
                        `;
                    }
                });
            }
        });
    }

    createStructuredRecipe(dishName, recipe) {
        // Generate AI image for the recipe
        const imageHTML = this.createRecipeImage(recipe.nazwa || dishName, recipe.opis);
        
        // Meta information
        const metaHTML = this.createRecipeMeta(recipe);
        
        // Description section
        const descriptionHTML = recipe.opis ? `
            <div class="recipe-description">
                <i class="fas fa-quote-left"></i> ${ui.escapeHtml(recipe.opis)}
            </div>
        ` : '';
        
        // Ingredients section
        const ingredientsHTML = this.createIngredientsSection(recipe.skladniki);
        
        // Steps section
        const stepsHTML = this.createStepsSection(recipe.kroki);
        
        // Tips section
        const tipsHTML = recipe.wskazowki && recipe.wskazowki.length > 0 ? `
            <div class="recipe-section">
                <div class="recipe-tips">
                    <div class="recipe-tips-header">
                        <i class="fas fa-lightbulb"></i>
                        <h5>Wskazówki</h5>
                    </div>
                    <ul class="recipe-tips-list">
                        ${recipe.wskazowki.map(tip => `
                            <li>${ui.escapeHtml(tip)}</li>
                        `).join('')}
                    </ul>
                </div>
            </div>
        ` : '';
        
        // Nutrition section
        const nutritionHTML = recipe.wartosci_odzywcze ? this.createNutritionSection(recipe.wartosci_odzywcze) : '';
        
        return `
            <div class="recipe-container">
                <div class="recipe-header">
                    <h3><i class="fas fa-book-open"></i> ${ui.escapeHtml(recipe.nazwa || dishName)}</h3>
                </div>
                <div class="recipe-hero">
                    ${imageHTML}
                    ${metaHTML}
                </div>
                <div class="recipe-content">
                    ${descriptionHTML}
                    ${ingredientsHTML}
                    ${stepsHTML}
                    ${tipsHTML}
                    ${nutritionHTML}
                </div>
            </div>
        `;
    }

    createRecipeImage(dishName, description) {
        // Create AI image prompt - now simple!
        const prompt = this.translateToImagePrompt(dishName, description);
        const encodedPrompt = encodeURIComponent(prompt);
        
        // Pollinations AI image URL with 600x400 dimensions
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=600&height=400&nologo=true`;
        
        // Generate unique ID for this image
        const imageId = `recipe-img-${Date.now()}`;
        
        // Set timeout to load image after DOM is ready
        setTimeout(() => {
            const img = document.getElementById(imageId);
            if (img) {
                img.src = imageUrl;
            }
        }, 100);
        
        return `
            <div class="recipe-image-container">
                <div class="recipe-image-wrapper" id="${imageId}-wrapper">
                    <div class="recipe-image-placeholder" id="${imageId}-placeholder">
                        <i class="fas fa-utensils"></i>
                        <span>Generowanie obrazu...</span>
                    </div>
                    <img 
                        class="recipe-image" 
                        id="${imageId}"
                        alt="${ui.escapeHtml(dishName)}"
                        style="opacity: 0;"
                    />
                </div>
                <div class="recipe-image-caption">
                    <i class="fas fa-robot"></i> Obraz wygenerowany przez AI
                </div>
            </div>
        `;
    }

    translateToImagePrompt(dishName, description) {
        // Create simple, clear prompts for better AI results
        const translations = {
            'małatka': 'salad',
            'makaron': 'pasta',
            'sos': 'sauce',
            'pomidorowy': 'tomato',
            'kurczak': 'chicken',
            'ryż': 'rice',
            'ziemniaki': 'potatoes',
            'zupa': 'soup',
            'mięso': 'meat',
            'ryba': 'fish',
            'warzywa': 'vegetables',
            'owoc': 'fruit',
            'owoce': 'fruits',
            'jabłko': 'apple',
            'mandarynka': 'mandarin',
            'grejpfrut': 'grapefruit',
            'cytryna': 'lemon',
            'cytrus': 'citrus',
            'deser': 'dessert',
            'ciasto': 'cake',
            'pizza': 'pizza',
            'burger': 'burger',
            'kanapka': 'sandwich',
            'pierogi': 'dumplings',
            'naleśniki': 'pancakes',
            'omlet': 'omelette',
            'frytki': 'fries',
            'kotlet': 'cutlet'
        };
        
        let prompt = dishName.toLowerCase();
        
        // Replace Polish terms with English
        Object.entries(translations).forEach(([pl, en]) => {
            prompt = prompt.replace(new RegExp(pl, 'gi'), en);
        });
        
        // Simple, clear prompt - just the dish name
        return prompt.trim();
    }

    createRecipeMeta(recipe) {
        const items = [];
        
        if (recipe.czas_przygotowania) {
            items.push(`
                <div class="recipe-meta-item">
                    <i class="fas fa-clock"></i>
                    <div>
                        <div class="meta-label">Czas</div>
                        <div class="meta-value">${ui.escapeHtml(recipe.czas_przygotowania)}</div>
                    </div>
                </div>
            `);
        }
        
        if (recipe.trudnosc) {
            let difficultyIcon = 'fa-chart-line';
            if (recipe.trudnosc.toLowerCase().includes('łatwy')) difficultyIcon = 'fa-smile';
            else if (recipe.trudnosc.toLowerCase().includes('trudny')) difficultyIcon = 'fa-fire';
            
            items.push(`
                <div class="recipe-meta-item">
                    <i class="fas ${difficultyIcon}"></i>
                    <div>
                        <div class="meta-label">Trudność</div>
                        <div class="meta-value">${ui.escapeHtml(recipe.trudnosc)}</div>
                    </div>
                </div>
            `);
        }
        
        if (recipe.porcje) {
            items.push(`
                <div class="recipe-meta-item">
                    <i class="fas fa-users"></i>
                    <div>
                        <div class="meta-label">Porcje</div>
                        <div class="meta-value">${ui.escapeHtml(recipe.porcje)}</div>
                    </div>
                </div>
            `);
        }
        
        return items.length > 0 ? `<div class="recipe-meta">${items.join('')}</div>` : '';
    }

    createIngredientsSection(skladniki) {
        if (!Array.isArray(skladniki) || skladniki.length === 0) return '';
        
        const ingredientsItems = skladniki.map(item => `
            <div class="recipe-ingredient-item">
                <i class="fas fa-check-circle"></i>
                <span class="ingredient-name">${ui.escapeHtml(item.nazwa || '')}</span>
                <span class="ingredient-amount">${ui.escapeHtml(item.ilosc || '')}</span>
            </div>
        `).join('');
        
        return `
            <div class="recipe-section">
                <div class="recipe-section-header">
                    <i class="fas fa-shopping-basket"></i>
                    <h4>Składniki</h4>
                </div>
                <div class="recipe-ingredients">
                    ${ingredientsItems}
                </div>
            </div>
        `;
    }

    createStepsSection(kroki) {
        if (!Array.isArray(kroki) || kroki.length === 0) return '';
        
        const stepsItems = kroki.map((step, index) => {
            // Remove "Krok X:" prefix if present
            const cleanStep = step.replace(/^Krok\s+\d+:\s*/i, '');
            
            return `
                <div class="recipe-step">
                    <div class="recipe-step-number">${index + 1}</div>
                    <div class="recipe-step-content">
                        <div class="recipe-step-text">${ui.escapeHtml(cleanStep)}</div>
                    </div>
                </div>
            `;
        }).join('');
        
        return `
            <div class="recipe-section">
                <div class="recipe-section-header">
                    <i class="fas fa-list-ol"></i>
                    <h4>Sposób Przygotowania</h4>
                </div>
                <div class="recipe-steps">
                    ${stepsItems}
                </div>
            </div>
        `;
    }

    createNutritionSection(wartosci) {
        if (!wartosci || typeof wartosci !== 'object') return '';
        
        const items = [];
        
        if (wartosci.kalorie) {
            items.push(`
                <div class="recipe-nutrition-item">
                    <i class="fas fa-fire"></i>
                    <div class="nutrition-value">${ui.escapeHtml(String(wartosci.kalorie))}</div>
                    <div class="nutrition-label">Kalorie</div>
                </div>
            `);
        }
        
        if (wartosci.bialko) {
            items.push(`
                <div class="recipe-nutrition-item">
                    <i class="fas fa-drumstick-bite"></i>
                    <div class="nutrition-value">${ui.escapeHtml(String(wartosci.bialko))}</div>
                    <div class="nutrition-label">Białko</div>
                </div>
            `);
        }
        
        if (wartosci.tluszcze) {
            items.push(`
                <div class="recipe-nutrition-item">
                    <i class="fas fa-oil-can"></i>
                    <div class="nutrition-value">${ui.escapeHtml(String(wartosci.tluszcze))}</div>
                    <div class="nutrition-label">Tłuszcze</div>
                </div>
            `);
        }
        
        if (wartosci.weglowodany) {
            items.push(`
                <div class="recipe-nutrition-item">
                    <i class="fas fa-bread-slice"></i>
                    <div class="nutrition-value">${ui.escapeHtml(String(wartosci.weglowodany))}</div>
                    <div class="nutrition-label">Węglowodany</div>
                </div>
            `);
        }
        
        return items.length > 0 ? `
            <div class="recipe-section">
                <div class="recipe-section-header">
                    <i class="fas fa-heartbeat"></i>
                    <h4>Wartości Odżywcze (na porcję)</h4>
                </div>
                <div class="recipe-nutrition">
                    ${items.join('')}
                </div>
            </div>
        ` : '';
    }

    showRecipeModal(dishName, recipeContent) {
        const modal = document.getElementById('recipe-modal');
        const title = document.getElementById('recipe-title');
        const content = document.getElementById('recipe-content');

        title.textContent = dishName;

        const html = this.markdownToHtml(typeof recipeContent === 'string' ? recipeContent.trim() : '');
        content.innerHTML = html || '<p>Przepis został wygenerowany pomyślnie, ale nie zawierał treści.</p>';

        modal.classList.remove('hidden');

        // Close modal on close button or outside click
        const closeBtn = modal.querySelector('.close-modal');
        closeBtn.onclick = () => modal.classList.add('hidden');

        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        };
    }

    markdownToHtml(markdown) {
        if (!markdown) {
            return '';
        }

        const lines = markdown.split('\n');
        const html = [];
        let inUl = false;
        let inOl = false;
        let inCode = false;
        let codeBuffer = [];

        const flushLists = () => {
            if (inUl) {
                html.push('</ul>');
                inUl = false;
            }
            if (inOl) {
                html.push('</ol>');
                inOl = false;
            }
        };

        lines.forEach(line => {
            const trimmed = line.trim();

            if (trimmed.startsWith('```')) {
                if (!inCode) {
                    flushLists();
                    inCode = true;
                    codeBuffer = [];
                } else {
                    inCode = false;
                    html.push(`<pre><code>${this.escapeHtml(codeBuffer.join('\n'))}</code></pre>`);
                    codeBuffer = [];
                }
                return;
            }

            if (inCode) {
                codeBuffer.push(line);
                return;
            }

            if (!trimmed) {
                flushLists();
                return;
            }

            const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
            if (headingMatch) {
                flushLists();
                const level = headingMatch[1].length;
                html.push(`<h${level}>${this.inlineMarkdown(headingMatch[2])}</h${level}>`);
                return;
            }

            if (/^[-*]\s+/.test(trimmed)) {
                if (!inUl) {
                    flushLists();
                    html.push('<ul>');
                    inUl = true;
                }
                html.push(`<li>${this.inlineMarkdown(trimmed.replace(/^[-*]\s+/, ''))}</li>`);
                return;
            }

            if (/^\d+\.\s+/.test(trimmed)) {
                if (!inOl) {
                    flushLists();
                    html.push('<ol>');
                    inOl = true;
                }
                html.push(`<li>${this.inlineMarkdown(trimmed.replace(/^\d+\.\s+/, ''))}</li>`);
                return;
            }

            flushLists();
            html.push(`<p>${this.inlineMarkdown(trimmed)}</p>`);
        });

        flushLists();

        if (inCode) {
            html.push(`<pre><code>${this.escapeHtml(codeBuffer.join('\n'))}</code></pre>`);
        }

        return html.join('\n');
    }

    inlineMarkdown(text) {
        let escaped = this.escapeHtml(text);

        escaped = escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        escaped = escaped.replace(/\*(.+?)\*/g, '<em>$1</em>');
        escaped = escaped.replace(/`([^`]+)`/g, '<code>$1</code>');
        escaped = escaped.replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

        return escaped;
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

    async getHealthAnalysis() {
        this.showAILoadingState('health', true);
        this.showAILoadingMessage(true);

        try {
            // Check if data is already cached for this receipt
            const cachedData = this.getCachedData('health');
            if (cachedData) {
                this.displayHealthAnalysis(cachedData);
                this.showAILoadingState('health', false);
                this.showAILoadingMessage(false);
                return;
            }

            // Fetch from API
            const response = await api.getHealthAnalysis(this.currentReceiptId);
            
            if (response.status === 'success') {
                // Cache the response
                this.setCachedData('health', response);
                this.displayHealthAnalysis(response);
            } else {
                this.displayHealthAnalysisError();
            }

        } catch (error) {
            console.error('Error loading health analysis:', error);
            ui.showToast(error.message || 'Błąd ładowania analizy zdrowotności', 'error');
            this.displayHealthAnalysisError();
        } finally {
            this.showAILoadingState('health', false);
            this.showAILoadingMessage(false);
        }
    }

    displayHealthAnalysis(response) {
        const container = document.getElementById('health-analysis-container');
        container.innerHTML = this.createHealthAnalysisCard(response);
        
        // Show toolbar
        const toolbar = document.getElementById('health-pdf-toolbar');
        if (toolbar) {
            toolbar.style.display = 'flex';
        }
        
        this.togglePdfExport('health', this.hasRenderableContent(container));
    }

    displayHealthAnalysisError() {
        const container = document.getElementById('health-analysis-container');
        container.innerHTML = `
            <div class="analysis-empty-state">
                <i class="fas fa-heartbeat"></i>
                <p>Brak danych do analizy zdrowotności.</p>
            </div>
        `;
        
        // Hide toolbar
        const toolbar = document.getElementById('health-pdf-toolbar');
        if (toolbar) {
            toolbar.style.display = 'none';
        }
        
        this.togglePdfExport('health', false);
    }

    createHealthAnalysisCard(data) {
        const kalorieText = data.analiza_kalorii?.szacunkowe_kalorie_na_porcje || 'Brak danych';
        const ocena = data.ocena_zdrowotnosci || 'Nieznana';
        
        let ratingBadgeClass = 'rating-good';
        let ratingIcon = 'fa-check-circle';
        
        if (ocena.includes('Zdrowy') || ocena.includes('Wysokoenerget')) {
            ratingBadgeClass = 'rating-good';
            ratingIcon = 'fa-check-circle';
        } else if (ocena.includes('Umiarkowany')) {
            ratingBadgeClass = 'rating-moderate';
            ratingIcon = 'fa-exclamation-circle';
        } else {
            ratingBadgeClass = 'rating-warning';
            ratingIcon = 'fa-alert-circle';
        }

        const makroHTML = this.createMacroChart(data.makroelementy);
        const alertsHTML = this.createAlertsHTML(data);
        const badgesHTML = this.createDietaryBadgesHTML(data.oznaczenia_dietetyczne);
        const recommendationsHTML = this.createRecommendationsHTML(data.rekomendacje_zdrowotne);

        return `
            <div class="health-analysis-card">
                <div class="analysis-header">
                    <div class="calories-display">
                        <span class="calorie-value">${kalorieText}</span>
                        <span class="calorie-unit">kcal</span>
                    </div>
                    <div class="rating-badge ${ratingBadgeClass}">
                        <i class="fas ${ratingIcon}"></i>
                        <span>${ocena}</span>
                    </div>
                </div>

                ${data.analiza_kalorii?.opis ? `<p class="analysis-description">${ui.escapeHtml(data.analiza_kalorii.opis)}</p>` : ''}

                ${makroHTML}

                ${alertsHTML}

                ${data.oznaczenia_dietetyczne ? `
                    <div class="dietary-section">
                        <h4><i class="fas fa-tags"></i> Oznaczenia Dietetyczne</h4>
                        <div class="badges-container">
                            ${badgesHTML}
                        </div>
                    </div>
                ` : ''}

                ${data.rekomendacje_zdrowotne ? `
                    <div class="recommendations-section">
                        <h4><i class="fas fa-lightbulb"></i> Rekomendacje</h4>
                        <ul class="recommendations-list">
                            ${recommendationsHTML}
                        </ul>
                    </div>
                ` : ''}

                ${data.wskazowki_dla_diety ? `
                    <div class="diet-tips-section">
                        <p class="diet-tips">${ui.escapeHtml(data.wskazowki_dla_diety)}</p>
                    </div>
                ` : ''}

                ${data.podsumowanie ? `
                    <div class="summary-section">
                        <h4><i class="fas fa-chart-line"></i> Podsumowanie</h4>
                        <p>${ui.escapeHtml(data.podsumowanie)}</p>
                    </div>
                ` : ''}
            </div>
        `;
    }

    createMacroChart(makro) {
        if (!makro) return '';

        const bialka = makro.bialka_procent || 0;
        const tluszcze = makro.tluszcze_procent || 0;
        const weglowodany = makro.weglowodany_procent || 0;

        return `
            <div class="macro-section">
                <h4><i class="fas fa-pie-chart"></i> Makroelementy</h4>
                <div class="macro-chart">
                    <div class="macro-bar">
                        <div class="macro-segment protein" style="width: ${bialka}%;" title="Białka: ${bialka}%"></div>
                        <div class="macro-segment fat" style="width: ${tluszcze}%;" title="Tłuszcze: ${tluszcze}%"></div>
                        <div class="macro-segment carbs" style="width: ${weglowodany}%;" title="Węglowodany: ${weglowodany}%"></div>
                    </div>
                </div>
                <div class="macro-legend">
                    <div class="legend-item"><span class="legend-color protein"></span>Białka: ${bialka}%</div>
                    <div class="legend-item"><span class="legend-color fat"></span>Tłuszcze: ${tluszcze}%</div>
                    <div class="legend-item"><span class="legend-color carbs"></span>Węglowodany: ${weglowodany}%</div>
                </div>
                ${makro.opis ? `<p class="macro-description">${ui.escapeHtml(makro.opis)}</p>` : ''}
            </div>
        `;
    }

    createAlertsHTML(data) {
        let alertsHTML = '';

        if (Array.isArray(data.produkty_wysoko_cukrowe) && data.produkty_wysoko_cukrowe.length > 0) {
            alertsHTML += `
                <div class="alerts-section">
                    <h4><i class="fas fa-warning"></i> Produkty Wysoko-Cukrowe</h4>
                    <div class="alerts-list">
                        ${data.produkty_wysoko_cukrowe.map(prod => `
                            <div class="alert-item alert-sugar">
                                <span class="alert-title">${ui.escapeHtml(prod.nazwa)}</span>
                                <span class="alert-message">${ui.escapeHtml(prod.zalecenie)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        if (Array.isArray(data.produkty_wysoko_tluszczowe) && data.produkty_wysoko_tluszczowe.length > 0) {
            alertsHTML += `
                <div class="alerts-section">
                    <h4><i class="fas fa-oil-can"></i> Produkty Wysoko-Tłuszczowe</h4>
                    <div class="alerts-list">
                        ${data.produkty_wysoko_tluszczowe.map(prod => `
                            <div class="alert-item alert-fat">
                                <span class="alert-title">${ui.escapeHtml(prod.nazwa)}</span>
                                <span class="alert-message">${ui.escapeHtml(prod.zalecenie)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        if (Array.isArray(data.produkty_wysoko_solone) && data.produkty_wysoko_solone.length > 0) {
            alertsHTML += `
                <div class="alerts-section">
                    <h4><i class="fas fa-shaker-alt"></i> Produkty Wysoko-Solone</h4>
                    <div class="alerts-list">
                        ${data.produkty_wysoko_solone.map(prod => `
                            <div class="alert-item alert-salt">
                                <span class="alert-title">${ui.escapeHtml(prod.nazwa)}</span>
                                <span class="alert-message">${ui.escapeHtml(prod.zalecenie)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        return alertsHTML;
    }

    createDietaryBadgesHTML(badges) {
        if (!Array.isArray(badges)) return '';

        return badges.map(badge => {
            const badgeClass = badge.dostepne ? 'badge-available' : 'badge-unavailable';
            const icon = badge.dostepne ? 'fa-check' : 'fa-times';
            return `
                <span class="dietary-badge ${badgeClass}">
                    <i class="fas ${icon}"></i>
                    ${ui.escapeHtml(badge.typ)}
                </span>
            `;
        }).join('');
    }

    createRecommendationsHTML(recommendations) {
        if (!Array.isArray(recommendations)) return '';

        return recommendations.map(rec => `
            <li><i class="fas fa-check"></i> ${ui.escapeHtml(rec)}</li>
        `).join('');
    }

    async getSeasonalRecommendations() {
        this.showAILoadingState('seasonal', true);
        this.showAILoadingMessage(true);

        try {
            // Check if data is already cached for this receipt
            const cachedData = this.getCachedData('seasonal');
            if (cachedData) {
                this.displaySeasonalRecommendations(cachedData);
                this.showAILoadingState('seasonal', false);
                this.showAILoadingMessage(false);
                return;
            }

            // Fetch from API
            const response = await api.getSeasonalRecommendations(this.currentReceiptId);

            if (response.status === 'success') {
                // Cache the response
                this.setCachedData('seasonal', response);
                this.displaySeasonalRecommendations(response);
            } else {
                this.displaySeasonalRecommendationsError();
            }

        } catch (error) {
            console.error('Error loading seasonal recommendations:', error);
            ui.showToast(error.message || 'Błąd ładowania rekomendacji sezonowości', 'error');
            this.displaySeasonalRecommendationsError();
        } finally {
            this.showAILoadingState('seasonal', false);
            this.showAILoadingMessage(false);
        }
    }

    displaySeasonalRecommendations(response) {
        const container = document.getElementById('seasonal-container');
        container.innerHTML = this.createSeasonalCard(response);
        
        // Show toolbar
        const toolbar = document.getElementById('seasonal-pdf-toolbar');
        if (toolbar) {
            toolbar.style.display = 'flex';
        }
        
        this.togglePdfExport('seasonal', this.hasRenderableContent(container));
    }

    displaySeasonalRecommendationsError() {
        const container = document.getElementById('seasonal-container');
        container.innerHTML = `
            <div class="analysis-empty-state">
                <i class="fas fa-leaf"></i>
                <p>Brak danych do analizy sezonowości.</p>
            </div>
        `;
        
        // Hide toolbar
        const toolbar = document.getElementById('seasonal-pdf-toolbar');
        if (toolbar) {
            toolbar.style.display = 'none';
        }
        
        this.togglePdfExport('seasonal', false);
    }

    createSeasonalCard(data) {
        const produktyHTML = this.createSeasonalProductsHTML(data.produkty_sezonowe);
        const oszczednosci = data.oszczednosci?.szacunkowa_roznica_wydatkow || 'Brak danych';
        const okresyHTML = this.createBestPeriodsHTML(data.najlepsze_okresy_zakupow);

        return `
            <div class="seasonal-card">
                ${data.oszczednosci?.szacunkowa_roznica_wydatkow ? `
                    <div class="savings-banner">
                        <i class="fas fa-money-bill-alt"></i>
                        <span>${ui.escapeHtml(oszczednosci)}</span>
                    </div>
                ` : ''}

                ${produktyHTML}

                ${data.podsumowanie ? `
                    <div class="seasonal-summary">
                        <h4><i class="fas fa-calendar-alt"></i> Podsumowanie</h4>
                        <p>${ui.escapeHtml(data.podsumowanie)}</p>
                    </div>
                ` : ''}

                ${okresyHTML}

                ${Array.isArray(data.porady_przechowywania_ogolne) && data.porady_przechowywania_ogolne.length > 0 ? `
                    <div class="storage-tips">
                        <h4><i class="fas fa-box"></i> Porady Przechowywania</h4>
                        <ul>
                            ${data.porady_przechowywania_ogolne.map(tip => `
                                <li>${ui.escapeHtml(tip)}</li>
                            `).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        `;
    }

    createSeasonalProductsHTML(produkty) {
        if (!Array.isArray(produkty) || produkty.length === 0) return '';

        return `
            <div class="seasonal-products-section">
                <h4><i class="fas fa-leaf"></i> Produkty Sezonowe</h4>
                <div class="seasonal-products-list">
                    ${produkty.map(prod => `
                        <div class="seasonal-product-item">
                            <div class="product-header">
                                <span class="product-name">${ui.escapeHtml(prod.nazwa)}</span>
                                <span class="season-badge" data-season="${prod.typ_sezonowosci || 'unknown'}">${ui.escapeHtml(prod.typ_sezonowosci || 'Całoroczny')}</span>
                            </div>
                            ${prod.najlepszy_okres ? `<p class="best-period"><i class="fas fa-calendar"></i> ${ui.escapeHtml(prod.najlepszy_okres)}</p>` : ''}
                            ${prod.obecna_cena_sezonowosc ? `<p class="current-season"><i class="fas fa-check-circle"></i> ${ui.escapeHtml(prod.obecna_cena_sezonowosc)}</p>` : ''}
                            ${prod.szacunkowa_roznica_ceny ? `<p class="price-diff"><i class="fas fa-arrow-down"></i> Potencjalna oszczędność: ${prod.szacunkowa_roznica_ceny}%</p>` : ''}
                            ${prod.porady_przechowywania ? `<p class="storage-tip"><i class="fas fa-cube"></i> ${ui.escapeHtml(prod.porady_przechowywania)}</p>` : ''}
                            ${prod.najlepsze_zastosowanie ? `<p class="best-use"><i class="fas fa-utensils"></i> ${ui.escapeHtml(prod.najlepsze_zastosowanie)}</p>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    createBestPeriodsHTML(okresy) {
        if (!okresy) return '';

        const monthMap = {
            'wiosna': 'Wiosna (III-V)',
            'lato': 'Lato (VI-VIII)',
            'jesien': 'Jesień (IX-XI)',
            'zima': 'Zima (XII-II)'
        };

        return `
            <div class="best-periods-section">
                <h4><i class="fas fa-seedling"></i> Najlepsze Okresy Zakupów</h4>
                <div class="periods-grid">
                    ${Object.entries(okresy).map(([key, value]) => `
                        <div class="period-card period-${key}">
                            <h5>${monthMap[key] || key}</h5>
                            <p>${ui.escapeHtml(value)}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    showAILoadingState(feature, show) {
        const btn = document.querySelector(`[data-ai-feature="${feature}"]`);
        if (!btn) return;

        const indicator = btn.querySelector('.ai-loading-indicator');
        if (!indicator) return;

        if (show) {
            indicator.classList.remove('hidden');
            btn.disabled = true;
        } else {
            indicator.classList.add('hidden');
            btn.disabled = false;
        }
    }

    showAILoadingMessage(show) {
        const message = document.getElementById('ai-loading-message');
        if (!message) return;

        if (show) {
            message.classList.remove('hidden');
        } else {
            message.classList.add('hidden');
        }
    }

    // ===== CACHE MANAGEMENT =====

    getCacheKey(feature, receiptId) {
        return `${CONFIG.STORAGE_KEYS.AI_CACHE_PREFIX}${feature}_${receiptId}`;
    }

    getCachedData(feature) {
        if (!this.currentReceiptId) return null;
        
        const cacheKey = this.getCacheKey(feature, this.currentReceiptId);
        const cached = localStorage.getItem(cacheKey);
        
        if (cached) {
            try {
                return JSON.parse(cached);
            } catch (e) {
                console.error('Error parsing cached data:', e);
                return null;
            }
        }
        return null;
    }

    setCachedData(feature, data) {
        if (!this.currentReceiptId) return;
        
        const cacheKey = this.getCacheKey(feature, this.currentReceiptId);
        try {
            localStorage.setItem(cacheKey, JSON.stringify(data));
        } catch (e) {
            console.error('Error caching data:', e);
        }
    }

    clearCacheForFeature(feature) {
        if (!this.currentReceiptId) return;
        
        const cacheKey = this.getCacheKey(feature, this.currentReceiptId);
        localStorage.removeItem(cacheKey);
    }

    clearAllAICache() {
        if (!this.currentReceiptId) return;
        
        // Clear all AI cache for this receipt
        this.clearCacheForFeature('health');
        this.clearCacheForFeature('seasonal');
        this.clearCacheForFeature('recipes');
    }

    clearContainersContent() {
        const containers = [
            'dishes-suggestions',
            'generated-recipes-container',
            'health-analysis-container',
            'seasonal-container'
        ];
        
        containers.forEach(containerId => {
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = '';
            }
        });

        // Hide recipes toolbar
        const toolbar = document.getElementById('recipes-pdf-toolbar');
        if (toolbar) {
            toolbar.style.display = 'none';
        }
        
        // Hide health toolbar
        const healthToolbar = document.getElementById('health-pdf-toolbar');
        if (healthToolbar) {
            healthToolbar.style.display = 'none';
        }
        
        // Hide seasonal toolbar
        const seasonalToolbar = document.getElementById('seasonal-pdf-toolbar');
        if (seasonalToolbar) {
            seasonalToolbar.style.display = 'none';
        }

        Object.keys(this.aiPdfConfig).forEach(sectionKey => this.togglePdfExport(sectionKey, false));
    }
}

// Create global instance
window.receiptsManager = new ReceiptsManager();
