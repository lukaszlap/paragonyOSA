// Reports Manager
class ReportsManager {
    constructor() {
        this.categories = [];
        this.currentReportContext = null;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const generateReportBtn = document.getElementById('generate-report-btn');
        const searchPriceHistoryBtn = document.getElementById('search-price-history-btn');
        const trendCategorySelect = document.getElementById('report-trend-category');
        const trendMonthsSelect = document.getElementById('report-trend-months');
        const productSearchInput = document.getElementById('product-search');

        if (generateReportBtn) {
            generateReportBtn.addEventListener('click', () => this.generateReport());
        }

        if (searchPriceHistoryBtn) {
            searchPriceHistoryBtn.addEventListener('click', () => this.searchPriceHistory());
        }

        if (trendCategorySelect) {
            trendCategorySelect.addEventListener('change', () => this.handleTrendChange());
        }

        if (trendMonthsSelect) {
            trendMonthsSelect.addEventListener('change', () => this.handleTrendChange());
        }

        if (productSearchInput) {
            productSearchInput.addEventListener('keyup', event => {
                if (event.key === 'Enter') {
                    this.searchPriceHistory();
                }
            });
        }
    }

    async initialize() {
        await this.loadCategories();
        this.setDefaultDates();
        this.resetReportView();
    }

    setDefaultDates() {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const endDateInput = document.getElementById('report-end-date');
        const startDateInput = document.getElementById('report-start-date');

        if (endDateInput) {
            endDateInput.value = this.formatDateForInput(now);
        }

        if (startDateInput) {
            startDateInput.value = this.formatDateForInput(firstDay);
        }
    }

    async loadCategories() {
        try {
            this.categories = await api.getCategories();

            const categoriesSelect = document.getElementById('report-categories');
            const trendSelect = document.getElementById('report-trend-category');

            if (categoriesSelect) {
                categoriesSelect.innerHTML = '';
                this.categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.id_kategorii;
                    option.textContent = category.nazwa;
                    categoriesSelect.appendChild(option);
                });
            }

            if (trendSelect) {
                trendSelect.innerHTML = '';
                if (!this.categories.length) {
                    const option = document.createElement('option');
                    option.value = '';
                    option.textContent = 'Brak kategorii';
                    trendSelect.appendChild(option);
                } else {
                    this.categories.forEach(category => {
                        const option = document.createElement('option');
                        option.value = category.id_kategorii;
                        option.textContent = category.nazwa;
                        trendSelect.appendChild(option);
                    });

                    trendSelect.value = this.categories[0].id_kategorii;
                    this.handleTrendChange();
                }
            }
        } catch (error) {
            console.error('Error loading categories:', error);
            ui.showToast('Nie udało się pobrać listy kategorii', 'error');
        }
    }

    async generateReport() {
        const startDateInput = document.getElementById('report-start-date');
        const endDateInput = document.getElementById('report-end-date');
        const categoriesSelect = document.getElementById('report-categories');

        if (!startDateInput || !endDateInput) {
            ui.showToast('Brak pól daty w widoku raportów', 'error');
            return;
        }

        const startDateValue = startDateInput.value;
        const endDateValue = endDateInput.value;

        if (!startDateValue || !endDateValue) {
            ui.showToast('Wybierz zakres dat', 'warning');
            return;
        }

        const startDate = this.createDateFromInput(startDateValue);
        const endDate = this.createDateFromInput(endDateValue);

        if (!startDate || !endDate || startDate > endDate) {
            ui.showToast('Nieprawidłowy zakres dat', 'warning');
            return;
        }

        const selectedCategories = categoriesSelect
            ? Array.from(categoriesSelect.selectedOptions).map(option => option.value)
            : [];

        ui.showLoader();

        try {
            const { current, previous, previousRange } = await this.fetchReportData(
                startDateValue,
                endDateValue,
                selectedCategories
            );

            if (!current || current.length === 0) {
                this.resetReportView();
                ui.showToast('Brak danych dla wybranego zakresu', 'info');
                return;
            }

            this.currentReportContext = {
                startDate: startDateValue,
                endDate: endDateValue,
                categories: selectedCategories,
                previousRange
            };

            this.buildReport(current, previous, previousRange);
            ui.showToast('Raport wygenerowany', 'success');
        } catch (error) {
            console.error('Report generation error:', error);
            ui.showToast(error.message || 'Błąd generowania raportu', 'error');
        } finally {
            ui.hideLoader();
        }
    }

    async fetchReportData(startDate, endDate, selectedCategories) {
        const useFiltered = Array.isArray(selectedCategories) && selectedCategories.length > 0;
        const currentPromise = useFiltered
            ? api.getFilteredReport(startDate, endDate, selectedCategories)
            : api.getReport(startDate, endDate);

        const start = this.createDateFromInput(startDate);
        const end = this.createDateFromInput(endDate);

        const rangeInfo = this.calculatePreviousRange(start, end);
        let comparisonPromise = Promise.resolve([]);
        let previousRange = null;

        if (rangeInfo) {
            const { previousStart, previousEnd } = rangeInfo;
            const previousStartStr = this.formatDateForInput(previousStart);
            const previousEndStr = this.formatDateForInput(previousEnd);
            previousRange = { start: previousStartStr, end: previousEndStr };

            comparisonPromise = useFiltered
                ? api.getFilteredReport(previousStartStr, previousEndStr, selectedCategories)
                : api.getReport(previousStartStr, previousEndStr);
        }

        const [current, previous] = await Promise.all([currentPromise, comparisonPromise]);
        return { current, previous, previousRange };
    }

    buildReport(currentData, previousData = [], previousRange = null) {
        const normalizedCurrent = this.normalizeReportDataset(currentData);
        const normalizedPrevious = this.normalizeReportDataset(previousData);

        const summary = this.calculateSummary(normalizedCurrent, normalizedPrevious, previousRange);
        this.renderSummary(summary);
        this.displayCategoryChart(summary.categoryBreakdown);
        this.displayTimelineChart(summary.timelineBreakdown);
        this.renderCategoryTable(summary.categoryBreakdown);
        this.renderInsights(summary.insights);
    }

    calculateSummary(currentData, previousData, previousRange) {
        const categoryMap = new Map();
        const timelineMap = new Map();
        let totalSpent = 0;

        currentData.forEach(item => {
            totalSpent += item.amount;

            const categoryTotal = categoryMap.get(item.category) || 0;
            categoryMap.set(item.category, categoryTotal + item.amount);

            if (item.date) {
                const timelineTotal = timelineMap.get(item.date) || 0;
                timelineMap.set(item.date, timelineTotal + item.amount);
            }
        });

        const previousCategoryMap = new Map();
        const previousTimelineMap = new Map();
        let previousTotal = 0;

        previousData.forEach(item => {
            previousTotal += item.amount;

            const categoryTotal = previousCategoryMap.get(item.category) || 0;
            previousCategoryMap.set(item.category, categoryTotal + item.amount);

            if (item.date) {
                const timelineTotal = previousTimelineMap.get(item.date) || 0;
                previousTimelineMap.set(item.date, timelineTotal + item.amount);
            }
        });

        const categoryBreakdown = Array.from(categoryMap.entries())
            .map(([name, amount]) => {
                const previousAmount = previousCategoryMap.get(name) || 0;
                const share = totalSpent > 0 ? amount / totalSpent : 0;
                const changeValue = amount - previousAmount;
                const changePercent = this.calculateChangePercent(amount, previousAmount);
                return {
                    name,
                    amount,
                    share,
                    previousAmount,
                    change: changeValue,
                    changePercent
                };
            })
            .sort((a, b) => b.amount - a.amount);

        const timelineBreakdown = Array.from(timelineMap.entries())
            .map(([date, amount]) => ({
                date,
                label: date,
                value: amount
            }))
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        const uniqueDays = timelineBreakdown.length || 1;
        const averageDaily = totalSpent / uniqueDays;

        const previousUniqueDays = previousTimelineMap.size || 1;
        const previousAverage = previousTotal / previousUniqueDays;

        const topCategory = categoryBreakdown[0] || null;
        const peakDay = timelineBreakdown.reduce((acc, current) => {
            if (!acc || current.value > acc.value) {
                return current;
            }
            return acc;
        }, null);

        const insights = this.generateInsights({
            totalSpent,
            previousTotal,
            averageDaily,
            previousAverage,
            topCategory,
            peakDay,
            categoryBreakdown,
            previousRange
        });

        return {
            totalSpent,
            previousTotal,
            totalChangePercent: this.calculateChangePercent(totalSpent, previousTotal),
            averageDaily,
            averageDailyChangePercent: this.calculateChangePercent(averageDaily, previousAverage),
            topCategory,
            peakDay,
            categoryBreakdown,
            timelineBreakdown,
            insights
        };
    }

    renderSummary(summary) {
        const totalElement = document.getElementById('report-total-amount');
        const totalChangeElement = document.getElementById('report-total-change');
        const averageElement = document.getElementById('report-average-amount');
        const averageChangeElement = document.getElementById('report-average-change');
        const topCategoryElement = document.getElementById('report-top-category');
        const topCategoryShareElement = document.getElementById('report-top-category-share');
        const peakDayElement = document.getElementById('report-peak-day');
        const peakDayAmountElement = document.getElementById('report-peak-day-amount');

        if (totalElement) {
            totalElement.textContent = ui.formatCurrency(summary.totalSpent);
        }

        this.updateChangeIndicator(totalChangeElement, summary.totalChangePercent, 'Brak danych');

        if (averageElement) {
            averageElement.textContent = ui.formatCurrency(summary.averageDaily);
        }

        this.updateChangeIndicator(averageChangeElement, summary.averageDailyChangePercent, 'Brak danych');

        if (summary.topCategory) {
            if (topCategoryElement) {
                topCategoryElement.textContent = summary.topCategory.name;
            }
            if (topCategoryShareElement) {
                const sharePercent = (summary.topCategory.share * 100).toFixed(1);
                const amountLabel = ui.formatCurrency(summary.topCategory.amount);
                topCategoryShareElement.textContent = `${amountLabel} - ${sharePercent}% udziału`;
            }
        } else {
            if (topCategoryElement) {
                topCategoryElement.textContent = '--';
            }
            if (topCategoryShareElement) {
                topCategoryShareElement.textContent = 'Brak danych';
            }
        }

        if (summary.peakDay) {
            if (peakDayElement) {
                peakDayElement.textContent = ui.formatDateShort(summary.peakDay.date);
            }
            if (peakDayAmountElement) {
                peakDayAmountElement.textContent = ui.formatCurrency(summary.peakDay.value);
            }
        } else {
            if (peakDayElement) {
                peakDayElement.textContent = '--';
            }
            if (peakDayAmountElement) {
                peakDayAmountElement.textContent = 'Brak danych';
            }
        }
    }

    updateChangeIndicator(element, changePercent, fallbackLabel) {
        if (!element) {
            return;
        }

        element.classList.remove('positive', 'negative');

        if (changePercent === null || Number.isNaN(changePercent)) {
            element.textContent = fallbackLabel;
            return;
        }

        const rounded = Number(changePercent.toFixed(1));
        const prefix = rounded >= 0 ? '+' : '';
        element.textContent = `${prefix}${rounded}%`;
        element.classList.add(rounded >= 0 ? 'positive' : 'negative');
    }

    renderCategoryTable(categoryBreakdown) {
        const tableBody = document.getElementById('report-category-table');
        if (!tableBody) {
            return;
        }

        tableBody.innerHTML = '';

        if (!categoryBreakdown || categoryBreakdown.length === 0) {
            const emptyRow = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = 4;
            cell.textContent = 'Brak danych do wyświetlenia';
            emptyRow.appendChild(cell);
            tableBody.appendChild(emptyRow);
            return;
        }

        categoryBreakdown.forEach(item => {
            const row = document.createElement('tr');

            const nameCell = document.createElement('td');
            nameCell.textContent = item.name;

            const amountCell = document.createElement('td');
            amountCell.textContent = ui.formatCurrency(item.amount);

            const shareCell = document.createElement('td');
            shareCell.textContent = `${(item.share * 100).toFixed(1)}%`;

            const changeCell = document.createElement('td');
            changeCell.innerHTML = this.formatChangeLabel(item.change, item.changePercent, item.previousAmount);

            row.appendChild(nameCell);
            row.appendChild(amountCell);
            row.appendChild(shareCell);
            row.appendChild(changeCell);

            tableBody.appendChild(row);
        });
    }

    formatChangeLabel(changeValue, changePercent, previousAmount) {
        if (previousAmount === 0) {
            return '<span class="report-change-neutral">Nowa kategoria</span>';
        }

        if (changePercent === null || Number.isNaN(changePercent)) {
            return '<span class="report-change-neutral">Brak danych</span>';
        }

        const rounded = Number(changePercent.toFixed(1));
        const prefix = rounded >= 0 ? '+' : '';
        const cssClass = rounded > 0 ? 'report-change-negative' : (rounded < 0 ? 'report-change-positive' : 'report-change-neutral');
        const valueLabel = ui.formatCurrency(changeValue);
        return `<span class="${cssClass}">${prefix}${rounded}% (${valueLabel})</span>`;
    }

    renderInsights(insights) {
        const insightsList = document.getElementById('report-insights');
        if (!insightsList) {
            return;
        }

        insightsList.innerHTML = '';

        if (!insights || insights.length === 0) {
            const item = document.createElement('li');
            item.className = 'report-insight-item';
            item.innerHTML = `
                <div class="report-insight-icon"><i class="fas fa-info-circle"></i></div>
                <div class="report-insight-content">
                    <h4>Brak szczególnych obserwacji</h4>
                    <p>Wygeneruj raport z szerszym zakresem dat lub innymi filtrami, aby zobaczyć więcej wniosków.</p>
                </div>
            `;
            insightsList.appendChild(item);
            return;
        }

    insights.forEach(insight => {
            const item = document.createElement('li');
            item.className = `report-insight-item ${insight.type || ''}`.trim();

            const iconWrapper = document.createElement('div');
            iconWrapper.className = 'report-insight-icon';
            iconWrapper.innerHTML = `<i class="${insight.icon}"></i>`;

            const contentWrapper = document.createElement('div');
            contentWrapper.className = 'report-insight-content';

            const title = document.createElement('h4');
            title.textContent = insight.title;

            const body = document.createElement('p');
            body.textContent = insight.body;

            contentWrapper.appendChild(title);
            contentWrapper.appendChild(body);

            item.appendChild(iconWrapper);
            item.appendChild(contentWrapper);

            insightsList.appendChild(item);
        });
    }

    displayCategoryChart(categoryBreakdown) {
        const container = document.getElementById('category-chart');
        if (!container) {
            return;
        }

        container.innerHTML = '';
        container.classList.remove('has-chart');

        if (!categoryBreakdown || categoryBreakdown.length === 0) {
            container.textContent = 'Brak danych do wyświetlenia.';
            return;
        }

        container.classList.add('has-chart');

        const barsWrapper = document.createElement('div');
        barsWrapper.className = 'chart-bars';

        const maxValue = Math.max(...categoryBreakdown.map(item => item.amount), 1);
        const palette = ['#4A90E2', '#50C878', '#F39C12', '#E74C3C', '#9B59B6', '#1ABC9C', '#34495E'];

        categoryBreakdown.forEach((item, index) => {
            const bar = document.createElement('div');
            bar.className = 'chart-bar';

            const header = document.createElement('div');
            header.className = 'chart-bar-header';
            header.innerHTML = `
                <span>${ui.escapeHtml(item.name)}</span>
                <span>${ui.formatCurrency(item.amount)} - ${(item.share * 100).toFixed(1)}%</span>
            `;

            const track = document.createElement('div');
            track.className = 'chart-bar-track';

            const fill = document.createElement('div');
            fill.className = 'chart-bar-fill';
            fill.style.background = palette[index % palette.length];
            const widthPercent = Math.max((item.amount / maxValue) * 100, 4);
            fill.style.width = `${widthPercent}%`;

            track.appendChild(fill);
            bar.appendChild(header);
            bar.appendChild(track);
            barsWrapper.appendChild(bar);
        });

        container.appendChild(barsWrapper);
    }

    displayTimelineChart(timelineBreakdown) {
        const container = document.getElementById('timeline-chart');
        if (!container) {
            return;
        }

        container.innerHTML = '';
        container.classList.remove('has-chart');

        if (!timelineBreakdown || timelineBreakdown.length === 0) {
            container.textContent = 'Brak danych czasowych dla raportu.';
            return;
        }

        const labelledData = timelineBreakdown.map(point => ({
            label: point.label,
            value: point.value
        }));

        this.renderLineChart(container, labelledData, {
            color: '#4A90E2',
            fillColor: 'rgba(74, 144, 226, 0.15)',
            axisLabelFormatter: label => ui.formatDateShort(label)
        });
    }

    renderLineChart(container, dataPoints, options = {}) {
        const { color = '#4A90E2', fillColor = 'rgba(74, 144, 226, 0.12)', axisLabelFormatter = label => label } = options;

        const validPoints = dataPoints.filter(point => Number.isFinite(point.value));
        if (!validPoints.length) {
            container.textContent = 'Brak danych do wizualizacji.';
            return;
        }

        container.classList.add('has-chart');
        const wrapper = document.createElement('div');
        wrapper.className = 'chart-line-wrapper';

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.classList.add('chart-line-svg');
        const width = 1000;
        const height = 280;
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

        const topMargin = 20;
        const bottomMargin = 40;
        const chartHeight = height - topMargin - bottomMargin;
        const baseline = height - bottomMargin;

        const maxValue = Math.max(...validPoints.map(point => point.value), 1);
        const step = validPoints.length > 1 ? width / (validPoints.length - 1) : 0;

        const coordinates = validPoints.map((point, index) => {
            const x = validPoints.length === 1 ? width / 2 : index * step;
            const ratio = point.value / maxValue;
            const y = baseline - ratio * chartHeight;
            return { x, y };
        });

        const areaPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        let areaD = `M ${coordinates[0].x} ${baseline}`;
        coordinates.forEach(coord => {
            areaD += ` L ${coord.x} ${coord.y}`;
        });
        areaD += ` L ${coordinates[coordinates.length - 1].x} ${baseline} Z`;
        areaPath.setAttribute('d', areaD);
        areaPath.setAttribute('fill', fillColor);
        areaPath.setAttribute('stroke', 'none');

        const linePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        let lineD = `M ${coordinates[0].x} ${coordinates[0].y}`;
        coordinates.slice(1).forEach(coord => {
            lineD += ` L ${coord.x} ${coord.y}`;
        });
        linePath.setAttribute('d', lineD);
        linePath.setAttribute('fill', 'none');
        linePath.setAttribute('stroke', color);
        linePath.setAttribute('stroke-width', '3');
        linePath.setAttribute('stroke-linecap', 'round');

        svg.appendChild(areaPath);
        svg.appendChild(linePath);

        coordinates.forEach((coord, index) => {
            const pointCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            pointCircle.setAttribute('cx', coord.x);
            pointCircle.setAttribute('cy', coord.y);
            pointCircle.setAttribute('r', '5');
            pointCircle.setAttribute('fill', color);
            pointCircle.setAttribute('opacity', '0.8');
            svg.appendChild(pointCircle);
        });

        const axisLabels = document.createElement('div');
        axisLabels.className = 'chart-line-axis';

        const labelCount = Math.min(6, validPoints.length);
        const labelStep = Math.max(1, Math.floor(validPoints.length / labelCount));

        const labels = [];
        validPoints.forEach((point, index) => {
            if (index % labelStep === 0 || index === validPoints.length - 1) {
                labels.push(axisLabelFormatter(point.label));
            }
        });

        axisLabels.innerHTML = labels
            .map(label => `<span>${ui.escapeHtml(label)}</span>`)
            .join('');

        wrapper.appendChild(svg);
        wrapper.appendChild(axisLabels);

        container.appendChild(wrapper);
    }

    async handleTrendChange() {
        const trendCategorySelect = document.getElementById('report-trend-category');
        const trendMonthsSelect = document.getElementById('report-trend-months');

        if (!trendCategorySelect || !trendMonthsSelect) {
            return;
        }

        const categoryId = trendCategorySelect.value;
        const months = Number.parseInt(trendMonthsSelect.value, 10) || 6;

        if (!categoryId) {
            const chartContainer = document.getElementById('report-trend-chart');
            const metaContainer = document.getElementById('report-trend-meta');
            if (chartContainer) {
                chartContainer.innerHTML = 'Wybierz kategorię, aby zobaczyć trend.';
                chartContainer.classList.remove('has-chart');
            }
            if (metaContainer) {
                metaContainer.innerHTML = '';
            }
            return;
        }

        await this.loadCategoryTrend(categoryId, months);
    }

    async loadCategoryTrend(categoryId, months) {
        const chartContainer = document.getElementById('report-trend-chart');
        const metaContainer = document.getElementById('report-trend-meta');

        if (!chartContainer) {
            return;
        }

        chartContainer.classList.remove('has-chart');
        chartContainer.textContent = 'Ładowanie trendu...';
        if (metaContainer) {
            metaContainer.innerHTML = '';
        }

        try {
            const trendData = await api.getCategoryMonthsReport(categoryId, months);

            if (!Array.isArray(trendData) || trendData.length === 0) {
                chartContainer.textContent = 'Brak danych dla wybranej kategorii.';
                return;
            }

            const normalized = trendData
                .map(item => ({
                    label: item.miesiac,
                    value: this.parseAmount(item.suma_cen)
                }))
                .filter(item => Number.isFinite(item.value));

            chartContainer.innerHTML = '';

            this.renderLineChart(chartContainer, normalized, {
                color: '#9B59B6',
                fillColor: 'rgba(155, 89, 182, 0.15)',
                axisLabelFormatter: label => this.formatMonthLabel(label)
            });

            this.renderTrendMeta(normalized, metaContainer);
        } catch (error) {
            console.error('Trend loading error:', error);
            chartContainer.textContent = 'Nie udało się załadować trendu.';
        }
    }

    renderTrendMeta(data, metaContainer) {
        if (!metaContainer) {
            return;
        }

        metaContainer.innerHTML = '';

        if (!data || data.length === 0) {
            return;
        }

        const total = data.reduce((sum, item) => sum + item.value, 0);
        const average = total / data.length;
        const latest = data[data.length - 1];
        const previous = data.length > 1 ? data[data.length - 2] : null;
        const best = data.reduce((acc, item) => (item.value > acc.value ? item : acc), data[0]);

        const changePercent = previous ? this.calculateChangePercent(latest.value, previous.value) : null;

        const items = [
            {
                label: 'Średnio',
                value: ui.formatCurrency(average)
            },
            {
                label: 'Ostatni miesiąc',
                value: ui.formatCurrency(latest.value)
            },
            {
                label: 'Zmiana m/m',
                value: this.formatPercentLabel(changePercent)
            },
            {
                label: 'Najwyższy miesiąc',
                value: `${this.formatMonthLabel(best.label)} - ${ui.formatCurrency(best.value)}`
            }
        ];

        items.forEach(item => {
            const box = document.createElement('div');
            box.className = 'trend-meta-item';
            box.innerHTML = `
                <span>${item.label}</span>
                <strong>${item.value}</strong>
            `;
            metaContainer.appendChild(box);
        });
    }

    async searchPriceHistory() {
        const productSearch = document.getElementById('product-search');
        if (!productSearch) {
            return;
        }

        const productName = productSearch.value.trim();

        if (!productName) {
            ui.showToast('Wprowadź nazwę produktu', 'warning');
            return;
        }

        ui.showLoader();

        try {
            const history = await api.getProductPriceHistory(productName);
            this.renderPriceHistory(history, productName);
        } catch (error) {
            console.error('Price history error:', error);
            ui.showToast(error.message || 'Nie udało się pobrać historii cen', 'error');
        } finally {
            ui.hideLoader();
        }
    }

    renderPriceHistory(history, queryName) {
        const container = document.getElementById('price-history-result');
        if (!container) {
            return;
        }

        container.innerHTML = '';
        container.classList.add('price-history-result');

        if (!Array.isArray(history) || history.length === 0) {
            container.textContent = 'Brak danych cenowych dla tego produktu.';
            return;
        }

        const sorted = [...history].sort((a, b) => new Date(b.data_dodania) - new Date(a.data_dodania));
        const amounts = sorted.map(item => this.parseAmount(item.cena)).filter(Number.isFinite);

        if (!amounts.length) {
            container.textContent = 'Brak danych do analizy cen.';
            return;
        }

        const average = amounts.reduce((sum, value) => sum + value, 0) / amounts.length;
        const min = Math.min(...amounts);
        const max = Math.max(...amounts);
        const latest = amounts[0];
        const oldest = amounts[amounts.length - 1];
        const changeValue = latest - oldest;
        const changePercent = oldest !== 0 ? (changeValue / oldest) * 100 : null;

        const heading = document.createElement('h4');
        heading.textContent = sorted[0]?.nazwa || queryName;

        const statsGrid = document.createElement('div');
        statsGrid.className = 'price-history-stats';
        statsGrid.innerHTML = `
            <div class="price-history-stat">
                <span>Średnia cena</span>
                <strong>${ui.formatCurrency(average)}</strong>
            </div>
            <div class="price-history-stat">
                <span>Najniższa cena</span>
                <strong>${ui.formatCurrency(min)}</strong>
            </div>
            <div class="price-history-stat">
                <span>Najwyższa cena</span>
                <strong>${ui.formatCurrency(max)}</strong>
            </div>
            <div class="price-history-stat">
                <span>Zmiana</span>
                <strong>${this.formatChangeSummary(changeValue, changePercent)}</strong>
            </div>
        `;

        const chartWrapper = document.createElement('div');
        chartWrapper.className = 'price-history-chart chart-placeholder';

        const chartData = sorted
            .map(item => ({
                label: item.data_dodania,
                value: this.parseAmount(item.cena)
            }))
            .filter(point => Number.isFinite(point.value))
            .reverse();

        this.renderLineChart(chartWrapper, chartData, {
            color: '#16A085',
            fillColor: 'rgba(22, 160, 133, 0.18)',
            axisLabelFormatter: label => ui.formatDateShort(label)
        });

        const listWrapper = document.createElement('div');
        listWrapper.className = 'price-history-list';
        sorted.forEach(item => {
            const row = document.createElement('div');
            row.className = 'price-history-item';
            row.innerHTML = `
                <span>${ui.formatDateShort(item.data_dodania)}</span>
                <span>${ui.formatCurrency(item.cena)}</span>
            `;
            listWrapper.appendChild(row);
        });

        container.appendChild(heading);
        container.appendChild(statsGrid);
        container.appendChild(chartWrapper);
        container.appendChild(listWrapper);
    }

    generateInsights(context) {
        const insights = [];

        if (context.totalSpent === 0) {
            return insights;
        }

        const totalChange = this.calculateChangePercent(context.totalSpent, context.previousTotal);
        if (totalChange !== null && !Number.isNaN(totalChange)) {
            if (totalChange > 5) {
                insights.push({
                    type: 'warning',
                    icon: 'fas fa-arrow-trend-up',
                    title: 'Wydatki wzrosły względem poprzedniego okresu',
                    body: `Łączna kwota jest wyższa o ${totalChange.toFixed(1)}% niż wcześniej. Rozważ ograniczenie kosztów w najbardziej rosnących kategoriach.`
                });
            } else if (totalChange < -5) {
                insights.push({
                    type: 'positive',
                    icon: 'fas fa-arrow-down',
                    title: 'Wydatki spadły',
                    body: `Udało się obniżyć całkowite wydatki o ${Math.abs(totalChange).toFixed(1)}%. Kontynuuj dobre praktyki.`
                });
            }
        }

        if (context.topCategory) {
            const sharePercent = context.topCategory.share * 100;
            if (sharePercent > 35) {
                const categoryName = context.topCategory.name;
                insights.push({
                    type: 'warning',
                    icon: 'fas fa-fire',
                    title: `Kategoria "${categoryName}" dominuje w wydatkach`,
                    body: `Ta kategoria odpowiada za ${sharePercent.toFixed(1)}% wszystkich kosztów. Warto sprawdzić, czy część zakupów można przenieść do innych grup.`
                });
            } else if (sharePercent < 15) {
                insights.push({
                    type: 'positive',
                    icon: 'fas fa-balance-scale',
                    title: 'Wydatki są równomiernie rozłożone',
                    body: 'Żadna kategoria nie przekracza 15% całkowitych kosztów, co świadczy o zbalansowanym budżecie.'
                });
            }
        }

        const growingCategory = context.categoryBreakdown
            .filter(item => item.changePercent !== null && item.changePercent > 0)
            .sort((a, b) => b.changePercent - a.changePercent)[0];

        if (growingCategory && growingCategory.changePercent > 10) {
            const categoryName = growingCategory.name;
            insights.push({
                type: 'warning',
                icon: 'fas fa-chart-line',
                title: `Dynamiczny wzrost w kategorii "${categoryName}"`,
                body: `Wydatki wzrosły tu o ${growingCategory.changePercent.toFixed(1)}% (${ui.formatCurrency(growingCategory.change)}). Sprawdź najnowsze paragony w tej kategorii.`
            });
        }

        if (context.peakDay) {
            insights.push({
                type: 'negative',
                icon: 'fas fa-calendar-plus',
                title: 'Dzień największych wydatków',
                body: `Najwięcej wydano ${ui.formatDateShort(context.peakDay.date)} - ${ui.formatCurrency(context.peakDay.value)}. Zastanów się, czy to powtarzalny schemat.`
            });
        }

        return insights.slice(0, 4);
    }

    resetReportView() {
        const defaults = [
            { id: 'report-total-amount', value: '--' },
            { id: 'report-total-change', value: 'Brak danych', resetClasses: true },
            { id: 'report-average-amount', value: '--' },
            { id: 'report-average-change', value: 'Brak danych', resetClasses: true },
            { id: 'report-top-category', value: '--' },
            { id: 'report-top-category-share', value: 'Brak danych' },
            { id: 'report-peak-day', value: '--' },
            { id: 'report-peak-day-amount', value: 'Brak danych' }
        ];

        defaults.forEach(item => {
            const element = document.getElementById(item.id);
            if (!element) {
                return;
            }
            element.textContent = item.value;
            if (item.resetClasses) {
                element.classList.remove('positive', 'negative');
            }
        });

        const categoryChart = document.getElementById('category-chart');
        const timelineChart = document.getElementById('timeline-chart');
        const tableBody = document.getElementById('report-category-table');
        const insightsList = document.getElementById('report-insights');

        if (categoryChart) {
            categoryChart.classList.remove('has-chart');
            categoryChart.textContent = 'Wygeneruj raport, aby zobaczyć dane.';
        }

        if (timelineChart) {
            timelineChart.classList.remove('has-chart');
            timelineChart.textContent = 'Wygeneruj raport, aby zobaczyć dane.';
        }

        if (tableBody) {
            tableBody.innerHTML = '';
        }

        if (insightsList) {
            insightsList.innerHTML = '';
        }
    }

    calculateChangePercent(currentValue, previousValue) {
        if (!Number.isFinite(currentValue) || !Number.isFinite(previousValue)) {
            return null;
        }

        if (previousValue === 0) {
            return currentValue === 0 ? 0 : null;
        }

        return ((currentValue - previousValue) / previousValue) * 100;
    }

    formatChangeSummary(changeValue, changePercent) {
        if (changePercent === null || Number.isNaN(changePercent)) {
            return `${ui.formatCurrency(changeValue)} (${changeValue >= 0 ? '+' : ''}${changeValue.toFixed(2)} PLN)`;
        }

        const prefix = changePercent >= 0 ? '+' : '';
        return `${ui.formatCurrency(changeValue)} (${prefix}${changePercent.toFixed(1)}%)`;
    }

    formatPercentLabel(changePercent) {
        if (changePercent === null || Number.isNaN(changePercent)) {
            return 'Brak danych';
        }
        const prefix = changePercent >= 0 ? '+' : '';
        return `${prefix}${changePercent.toFixed(1)}%`;
    }

    normalizeReportDataset(dataset) {
        if (!Array.isArray(dataset)) {
            return [];
        }

        return dataset.map(item => ({
            category: item.kategoria || 'Inne',
            date: this.normalizeDate(item.data),
            amount: this.parseAmount(item.suma_cen)
        })).filter(item => Number.isFinite(item.amount));
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

    normalizeDate(value) {
        if (!value) {
            return null;
        }

        if (value instanceof Date && !Number.isNaN(value.getTime())) {
            return value.toISOString().split('T')[0];
        }

        const stringValue = String(value).trim();
        if (!stringValue) {
            return null;
        }

        if (/^\d{4}-\d{2}-\d{2}$/.test(stringValue)) {
            return stringValue;
        }

        const match = stringValue.match(/(\d{4})[\-\/.](\d{2})[\-\/.](\d{2})/);
        if (match) {
            return `${match[1]}-${match[2]}-${match[3]}`;
        }

        const isoCandidate = stringValue.replace(' ', 'T');
        const timestamp = Date.parse(isoCandidate);
        if (!Number.isNaN(timestamp)) {
            return new Date(timestamp).toISOString().split('T')[0];
        }

        return null;
    }

    formatMonthLabel(monthString) {
        if (!monthString) {
            return '--';
        }

        const [year, month] = monthString.split('-');
        if (year && month) {
            return `${month}.${year}`;
        }
        return monthString;
    }

    formatDateForInput(date) {
        if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
            return '';
        }
        return date.toISOString().split('T')[0];
    }

    createDateFromInput(value) {
        if (!value) {
            return null;
        }
        const parsed = new Date(`${value}T00:00:00`);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    calculatePreviousRange(startDate, endDate) {
        if (!(startDate instanceof Date) || Number.isNaN(startDate.getTime()) || !(endDate instanceof Date) || Number.isNaN(endDate.getTime())) {
            return null;
        }

        const rangeDays = Math.max(1, Math.floor((endDate - startDate) / (24 * 60 * 60 * 1000)) + 1);
        const previousEnd = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
        const previousStart = new Date(previousEnd.getTime() - (rangeDays - 1) * 24 * 60 * 60 * 1000);

        return { previousStart, previousEnd };
    }
}

// Create global instance
window.reportsManager = new ReportsManager();
