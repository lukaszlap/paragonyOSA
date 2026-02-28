// Limits Manager
class LimitsManager {
    constructor() {
        this.categories = [];
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const addLimitBtn = document.getElementById('add-limit-btn');
        const addLimitForm = document.getElementById('add-limit-form');
        const editLimitForm = document.getElementById('edit-limit-form');
        const closeModalBtns = document.querySelectorAll('.close-modal');

        if (addLimitBtn) {
            addLimitBtn.addEventListener('click', () => this.showAddLimitModal());
        }

        if (addLimitForm) {
            addLimitForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveNewLimit();
            });
        }

        if (editLimitForm) {
            editLimitForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveEditedLimit();
            });
        }

        closeModalBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const modal = btn.closest('.modal');
                if (modal) {
                    modal.classList.add('hidden');
                    this.clearFormErrors(modal.querySelector('form'));
                }
            });
        });

        // Close modal on outside click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.add('hidden');
                    const form = modal.querySelector('form');
                    if (form) this.clearFormErrors(form);
                }
            });
        });
    }

    async initialize() {
        await this.loadCategories();
        await this.loadLimits();
    }

    async loadCategories() {
        try {
            this.categories = await api.getCategories();
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }

    async loadLimits() {
        ui.showLoader();

        try {
            const limits = await api.getLimits();
            const container = document.getElementById('limits-list');

            if (!limits || limits.length === 0) {
                ui.showEmptyState('limits-list', 'Brak ustawionych limitów', 'fas fa-chart-pie');
                return;
            }

            container.innerHTML = limits
                .map(limit => ui.createLimitCard(limit))
                .join('');

            // Add event listeners
            this.attachLimitActionListeners();

        } catch (error) {
            ui.showToast(error.message || 'Błąd ładowania limitów', 'error');
        } finally {
            ui.hideLoader();
        }
    }

    attachLimitActionListeners() {
        // Edit limit buttons
        document.querySelectorAll('.edit-limit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const limitId = btn.dataset.id;
                this.editLimit(limitId);
            });
        });

        // Delete limit buttons
        document.querySelectorAll('.delete-limit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const limitId = btn.dataset.id;
                this.deleteLimit(limitId);
            });
        });
    }

    showAddLimitModal() {
        // Populate categories
        ui.populateSelect('add-limit-category', this.categories, 'id_kategorii', 'nazwa');
        
        // Clear form
        const form = document.getElementById('add-limit-form');
        if (form) {
            form.reset();
            this.clearFormErrors(form);
        }
        
        // Show modal
        const modal = document.getElementById('add-limit-modal');
        if (modal) modal.classList.remove('hidden');
    }

    async saveNewLimit() {
        const categoryId = document.getElementById('add-limit-category').value;
        const amount = document.getElementById('add-limit-amount').value;

        // Clear previous errors
        this.clearFormErrors(document.getElementById('add-limit-form'));

        // Validation
        if (!categoryId) {
            this.showFieldError('add-limit-category', 'Wybierz kategorię');
            return;
        }

        if (!amount || parseFloat(amount) <= 0) {
            this.showFieldError('add-limit-amount', 'Podaj poprawną wartość limitu');
            return;
        }

        ui.showLoader();

        try {
            await api.addLimit(parseInt(categoryId), parseFloat(amount));
            ui.showToast('Limit został dodany pomyślnie', 'success');
            
            // Hide modal and reload
            const modal = document.getElementById('add-limit-modal');
            if (modal) modal.classList.add('hidden');
            
            await this.loadLimits();
        } catch (error) {
            ui.showToast(error.message || 'Błąd dodawania limitu', 'error');
        } finally {
            ui.hideLoader();
        }
    }

    async editLimit(limitId) {
        ui.showLoader();

        try {
            // Find the limit data from current list
            const limits = await api.getLimits();
            const limit = limits.find(l => l.id == limitId);

            if (!limit) {
                ui.showToast('Nie znaleziono limitu', 'error');
                return;
            }

            // Populate edit modal
            document.getElementById('edit-limit-id').value = limit.id;
            document.getElementById('edit-limit-category-name').value = limit.NazwaKategorii;
            document.getElementById('edit-limit-category-display').innerHTML = `
                <i class="fas fa-tag"></i> ${ui.escapeHtml(limit.NazwaKategorii)}
            `;
            document.getElementById('edit-limit-amount').value = limit.Limit;

            // Show current spending info
            const percentage = (limit.Wydano / limit.Limit) * 100;
            const currentInfoDiv = document.getElementById('edit-limit-current-info');
            
            let statusClass = 'info';
            let statusIcon = 'fa-info-circle';
            if (percentage > 100) {
                statusClass = 'danger';
                statusIcon = 'fa-exclamation-triangle';
            } else if (percentage >= 90) {
                statusClass = 'warning';
                statusIcon = 'fa-exclamation-circle';
            }

            currentInfoDiv.innerHTML = `
                <div class="alert alert-${statusClass}">
                    <i class="fas ${statusIcon}"></i>
                    <div>
                        <strong>Aktualnie wydano:</strong> ${ui.formatCurrency(limit.Wydano)} 
                        (${percentage.toFixed(1)}% z obecnego limitu)
                    </div>
                </div>
            `;

            // Clear any previous errors
            this.clearFormErrors(document.getElementById('edit-limit-form'));

            // Show modal
            const modal = document.getElementById('edit-limit-modal');
            if (modal) modal.classList.remove('hidden');

        } catch (error) {
            ui.showToast(error.message || 'Błąd ładowania danych limitu', 'error');
        } finally {
            ui.hideLoader();
        }
    }

    async saveEditedLimit() {
        const limitId = document.getElementById('edit-limit-id').value;
        const categoryName = document.getElementById('edit-limit-category-name').value;
        const newAmount = document.getElementById('edit-limit-amount').value;

        // Clear previous errors
        this.clearFormErrors(document.getElementById('edit-limit-form'));

        // Validation
        if (!newAmount || parseFloat(newAmount) <= 0) {
            this.showFieldError('edit-limit-amount', 'Podaj poprawną wartość limitu');
            return;
        }

        ui.showLoader();

        try {
            await api.updateLimit(limitId, { 
                limit: parseFloat(newAmount),
                nazwaKategorii: categoryName 
            });
            
            ui.showToast('Limit został zaktualizowany pomyślnie', 'success');
            
            // Hide modal and reload
            const modal = document.getElementById('edit-limit-modal');
            if (modal) modal.classList.add('hidden');
            
            await this.loadLimits();
        } catch (error) {
            ui.showToast(error.message || 'Błąd aktualizacji limitu', 'error');
        } finally {
            ui.hideLoader();
        }
    }

    async deleteLimit(limitId) {
        if (!confirm('Czy na pewno chcesz usunąć ten limit? Ta operacja jest nieodwracalna.')) {
            return;
        }

        ui.showLoader();

        try {
            await api.deleteLimit(limitId);
            ui.showToast('Limit został usunięty pomyślnie', 'success');
            await this.loadLimits();
        } catch (error) {
            ui.showToast(error.message || 'Błąd usuwania limitu', 'error');
        } finally {
            ui.hideLoader();
        }
    }

    showFieldError(fieldId, message) {
        const errorElement = document.getElementById(`${fieldId}-error`);
        const inputElement = document.getElementById(fieldId);
        
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
        
        if (inputElement) {
            inputElement.classList.add('error');
        }
    }

    clearFormErrors(form) {
        if (!form) return;
        
        // Clear all error messages
        form.querySelectorAll('.form-error').forEach(error => {
            error.textContent = '';
            error.style.display = 'none';
        });
        
        // Remove error class from inputs
        form.querySelectorAll('.form-input.error').forEach(input => {
            input.classList.remove('error');
        });
    }
}

// Create global instance
window.limitsManager = new LimitsManager();
