class GuideManager {
    constructor() {
        const source = window.guideDatabase || {};
        this.meta = source.meta || {};
        this.sections = Array.isArray(source.sections) ? source.sections.slice() : [];
        this.quickStart = Array.isArray(source.quickStart) ? source.quickStart.slice() : [];
        this.filteredSections = this.sections.slice();
        this.activeSectionId = null;
        this.initialized = false;

        this.view = null;
        this.searchInput = null;
        this.sectionsList = null;
        this.quickLinksContainer = null;
        this.sectionContainer = null;
        this.placeholder = null;
        this.placeholderIcon = null;
        this.placeholderTitle = null;
        this.placeholderSubtitle = null;
        this.metaVersion = null;
        this.metaUpdated = null;
        this.metaCount = null;
        this.metaSummary = null;
    }

    async initialize() {
        if (this.initialized) {
            this.highlightActiveItem();
            return;
        }

        this.cacheDomReferences();
        if (!this.view) {
            return;
        }

        this.renderMeta();
        this.renderQuickLinks();
        this.updateSectionList();
        this.bindEvents();

        if (this.sections.length > 0) {
            this.selectSection(this.sections[0].id);
        } else {
            this.showPlaceholder({
                icon: 'fas fa-book-open',
                title: 'Brak sekcji instrukcji',
                subtitle: 'Dodaj dane w guideDatabase.js, aby wyswietlic tresc.'
            });
        }

        this.initialized = true;
    }

    cacheDomReferences() {
        this.view = document.getElementById('guide-view');
        if (!this.view) {
            return;
        }

        this.searchInput = document.getElementById('guide-search-input');
        this.sectionsList = document.getElementById('guide-sections-list');
        this.quickLinksContainer = document.getElementById('guide-quick-links');
        this.sectionContainer = document.getElementById('guide-section-content');
        this.placeholder = document.getElementById('guide-placeholder');
        this.placeholderIcon = document.getElementById('guide-placeholder-icon');
        this.placeholderTitle = document.getElementById('guide-placeholder-title');
        this.placeholderSubtitle = document.getElementById('guide-placeholder-subtitle');
        this.metaVersion = document.getElementById('guide-meta-version');
        this.metaUpdated = document.getElementById('guide-meta-updated');
        this.metaCount = document.getElementById('guide-meta-count');
        this.metaSummary = document.getElementById('guide-meta-summary');
    }

    renderMeta() {
        if (this.metaVersion) {
            this.metaVersion.textContent = this.meta.version || '1.0.0';
        }

        if (this.metaUpdated) {
            this.metaUpdated.textContent = this.meta.updatedAt || '';
        }

        if (this.metaCount) {
            this.metaCount.textContent = String(this.sections.length);
        }

        if (this.metaSummary) {
            this.metaSummary.textContent = this.meta.summary || '';
        }
    }

    renderQuickLinks() {
        if (!this.quickLinksContainer) {
            return;
        }

        if (this.quickStart.length === 0) {
            this.quickLinksContainer.innerHTML = '<p class="guide-empty">Brak szybkich skrotow.</p>';
            return;
        }

        const html = this.quickStart.map(item => {
            const icon = this.escapeHtml(item.icon || 'fa-circle');
            const label = this.escapeHtml(item.label || 'Sekcja');
            const id = this.escapeAttr(item.id || '');
            return `
                <button class="guide-quick-link" type="button" data-guide-target="${id}">
                    <i class="fas ${icon}"></i>
                    <span>${label}</span>
                </button>
            `;
        }).join('');

        this.quickLinksContainer.innerHTML = html;
    }

    bindEvents() {
        if (this.searchInput) {
            this.searchInput.addEventListener('input', event => {
                this.handleSearchInput(event.target.value || '');
            });
        }

        if (this.quickLinksContainer) {
            this.quickLinksContainer.addEventListener('click', event => {
                const target = event.target.closest('[data-guide-target]');
                if (!target) {
                    return;
                }
                const sectionId = target.getAttribute('data-guide-target');
                if (!sectionId) {
                    return;
                }
                if (this.searchInput) {
                    this.searchInput.value = '';
                }
                this.filteredSections = this.sections.slice();
                this.updateSectionList();
                this.selectSection(sectionId);
            });
        }
    }

    handleSearchInput(query) {
        const value = String(query).trim().toLowerCase();
        if (!value) {
            this.filteredSections = this.sections.slice();
            this.updateSectionList();
            if (this.activeSectionId) {
                this.highlightActiveItem();
            }
            return;
        }

        this.filteredSections = this.sections.filter(section => {
            const haystack = [
                section.title,
                section.summary,
                Array.isArray(section.keywords) ? section.keywords.join(' ') : ''
            ].join(' ').toLowerCase();
            return haystack.includes(value);
        });

        this.updateSectionList();

        if (this.filteredSections.length === 0) {
            if (this.sectionContainer) {
                this.sectionContainer.innerHTML = '';
                this.sectionContainer.classList.add('hidden');
            }
            this.showPlaceholder({
                icon: 'fas fa-circle-question',
                title: 'Brak wynikow',
                subtitle: `Nie znaleziono sekcji dla "${value}".`
            });
            return;
        }

    const current = this.filteredSections.find(section => section.id === this.activeSectionId);
    const nextSection = current || this.filteredSections[0];
    this.selectSection(nextSection.id);
    }

    updateSectionList() {
        if (!this.sectionsList) {
            return;
        }

        if (this.filteredSections.length === 0) {
            this.sectionsList.innerHTML = '<p class="guide-empty">Brak sekcji do wyswietlenia.</p>';
            return;
        }

        const items = this.filteredSections.map(section => {
            const isActive = section.id === this.activeSectionId;
            const icon = this.escapeHtml(section.icon || 'fa-circle');
            const title = this.escapeHtml(section.title || 'Sekcja');
            const summary = this.escapeHtml(section.summary || '');
            const id = this.escapeAttr(section.id || '');
            return `
                <button class="guide-section-item${isActive ? ' active' : ''}" type="button" data-section-id="${id}">
                    <span class="guide-section-item-icon"><i class="fas ${icon}"></i></span>
                    <span class="guide-section-item-text">
                        <span class="guide-section-item-title">${title}</span>
                        <span class="guide-section-item-summary">${summary}</span>
                    </span>
                </button>
            `;
        }).join('');

        this.sectionsList.innerHTML = items;

        this.sectionsList.querySelectorAll('.guide-section-item').forEach(button => {
            button.addEventListener('click', () => {
                const sectionId = button.getAttribute('data-section-id');
                if (!sectionId) {
                    return;
                }
                this.selectSection(sectionId);
            });
        });

        this.highlightActiveItem();
    }

    selectSection(sectionId) {
        const section = this.sections.find(item => item.id === sectionId);
        if (!section) {
            return;
        }

        this.activeSectionId = section.id;
        this.highlightActiveItem();

        this.renderSectionContent(section);
        this.scrollActiveSidebarItem();
    }

    renderSectionContent(section) {
        if (!this.sectionContainer) {
            return;
        }

        this.hidePlaceholder();
        this.sectionContainer.classList.remove('hidden');

        const icon = this.escapeHtml(section.icon || 'fa-circle');
        const title = this.escapeHtml(section.title || 'Sekcja');
        const summary = this.escapeHtml(section.summary || '');

        const focusHtml = Array.isArray(section.focusAreas) && section.focusAreas.length > 0
            ? `
                <div class="guide-focus-grid">
                    ${section.focusAreas.map(area => `
                        <div class="guide-focus-card">
                            <h3>${this.escapeHtml(area.label || '')}</h3>
                            <p>${this.escapeHtml(area.description || '')}</p>
                        </div>
                    `).join('')}
                </div>
            `
            : '';

        const stepsHtml = Array.isArray(section.steps) && section.steps.length > 0
            ? `
                <div class="guide-block">
                    <h3><i class="fas fa-route"></i> Plan dzialania</h3>
                    <ol class="guide-steps">
                        ${section.steps.map(step => `<li>${this.escapeHtml(step)}</li>`).join('')}
                    </ol>
                </div>
            `
            : '';

        const tipsHtml = Array.isArray(section.tips) && section.tips.length > 0
            ? `
                <div class="guide-block">
                    <h3><i class="fas fa-lightbulb"></i> Wskazowki</h3>
                    <ul class="guide-tips">
                        ${section.tips.map(tip => `<li><i class="fas fa-check"></i>${this.escapeHtml(tip)}</li>`).join('')}
                    </ul>
                </div>
            `
            : '';

        const assistantHtml = Array.isArray(section.assistantExamples) && section.assistantExamples.length > 0
            ? `
                <div class="guide-block">
                    <h3><i class="fas fa-robot"></i> Przykladowe pytania do Asystenta</h3>
                    <div class="guide-examples">
                        ${section.assistantExamples.map(example => `
                            <div class="guide-example-card">
                                <h4>${this.escapeHtml(example.title || '')}</h4>
                                <div class="guide-example-line">
                                    <span class="guide-example-label">Polecenie</span>
                                    <code>${this.escapeHtml(example.prompt || '')}</code>
                                </div>
                                ${example.followUp ? `
                                    <div class="guide-example-line">
                                        <span class="guide-example-label">Kolejny krok</span>
                                        <code>${this.escapeHtml(example.followUp)}</code>
                                    </div>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `
            : '';

        const relatedHtml = Array.isArray(section.related) && section.related.length > 0
            ? `
                <div class="guide-block guide-related">
                    <h3><i class="fas fa-link"></i> Powiazane module</h3>
                    <div class="guide-related-chips">
                        ${section.related.map(item => `
                            <button class="guide-related-chip" type="button" data-related-section="${this.escapeAttr(item.id || '')}">
                                <i class="fas fa-arrow-right"></i>${this.escapeHtml(item.label || '')}
                            </button>
                        `).join('')}
                    </div>
                </div>
            `
            : '';

        this.sectionContainer.innerHTML = `
            <div class="guide-section-header">
                <div class="guide-section-icon"><i class="fas ${icon}"></i></div>
                <div>
                    <h2>${title}</h2>
                    <p>${summary}</p>
                </div>
            </div>
            ${focusHtml}
            ${stepsHtml}
            ${tipsHtml}
            ${assistantHtml}
            ${relatedHtml}
        `;

        this.sectionContainer.querySelectorAll('.guide-related-chip').forEach(button => {
            button.addEventListener('click', () => {
                const targetId = button.getAttribute('data-related-section');
                if (!targetId) {
                    return;
                }
                if (this.searchInput) {
                    this.searchInput.value = '';
                }
                this.filteredSections = this.sections.slice();
                this.updateSectionList();
                this.selectSection(targetId);
            });
        });

        this.sectionContainer.scrollTop = 0;
    }

    showPlaceholder(config) {
        if (!this.placeholder || !this.placeholderIcon || !this.placeholderTitle || !this.placeholderSubtitle) {
            return;
        }

        this.placeholder.classList.remove('hidden');
        this.placeholderIcon.innerHTML = `<i class="${this.escapeHtml(config.icon || 'fas fa-book-open')}"></i>`;
        this.placeholderTitle.textContent = config.title || '';
        this.placeholderSubtitle.textContent = config.subtitle || '';
    }

    hidePlaceholder() {
        if (this.placeholder) {
            this.placeholder.classList.add('hidden');
        }
    }

    highlightActiveItem() {
        if (!this.sectionsList) {
            return;
        }

        this.sectionsList.querySelectorAll('.guide-section-item').forEach(button => {
            const isActive = button.getAttribute('data-section-id') === this.activeSectionId;
            button.classList.toggle('active', Boolean(isActive));
        });
    }

    scrollActiveSidebarItem() {
        if (!this.sectionsList) {
            return;
        }

        const activeItem = this.sectionsList.querySelector('.guide-section-item.active');
        if (!activeItem) {
            return;
        }

        activeItem.scrollIntoView({ block: 'nearest' });
    }

    escapeHtml(value) {
        if (typeof ui !== 'undefined' && ui && typeof ui.escapeHtml === 'function') {
            return ui.escapeHtml(value);
        }

        if (value === null || value === undefined) {
            return '';
        }

        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        };

        return String(value).replace(/[&<>"']/g, char => map[char]);
    }

    escapeAttr(value) {
        return this.escapeHtml(value).replace(/"/g, '&quot;');
    }
}

window.guideManager = new GuideManager();
