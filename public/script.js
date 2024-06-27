let pieChart;
let barChart;
let chartData = [];
let uniqueCategories = new Set();
let quickButtons = [];
let currentIncomePage = 1;
let currentOutcomePage = 1;
let currentAllPage = 1;
const itemsPerPage = 10;

async function initializePage() {
    const incomeForm = document.getElementById('incomeForm');
    const outcomeForm = document.getElementById('outcomeForm');
    const quickButtonForm = document.getElementById('quickButtonForm');

    if (incomeForm) {
        incomeForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const dataName = document.getElementById('incomeName').value.trim();
            const dataValue = Number(document.getElementById('incomeValue').value.trim());
            const dataCategory = document.getElementById('incomeCategory').value.trim();
            const dataLabel = document.getElementById('incomeLabel').value.trim();

            if (dataName && !isNaN(dataValue) && dataLabel) {
                chartData.push({ name: dataName, value: dataValue, category: dataCategory, label: dataLabel, type: 'income' });
                uniqueCategories.add(dataCategory);
                currentIncomePage = 1;
                currentAllPage = 1;
                updateTables();
                updatePieChart();
                updateBarChart();
                updateTotalValue(chartData);
                await saveData();
                incomeForm.reset();
            }
        });
    }

    if (outcomeForm) {
        outcomeForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const dataName = document.getElementById('outcomeName').value.trim();
            const dataValue = Number(document.getElementById('outcomeValue').value.trim());
            const dataCategory = document.getElementById('outcomeCategory').value.trim();
            const dataLabel = document.getElementById('outcomeLabel').value.trim();

            if (dataName && !isNaN(dataValue) && dataLabel) {
                chartData.push({ name: dataName, value: -dataValue, category: dataCategory, label: dataLabel, type: 'outcome' });
                uniqueCategories.add(dataCategory);
                currentOutcomePage = 1;
                currentAllPage = 1;
                updateTables();
                updatePieChart();
                updateBarChart();
                updateTotalValue(chartData);
                await saveData();
                outcomeForm.reset();
            }
        });
    }

    if (quickButtonForm) {
        quickButtonForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const buttonName = document.getElementById('quickButtonName').value.trim();
            const buttonValue = Number(document.getElementById('quickButtonValue').value.trim());
            const buttonCategory = document.getElementById('quickButtonCategory').value.trim();

            if (buttonName && !isNaN(buttonValue) && buttonCategory) {
                quickButtons.push({ name: buttonName, value: buttonValue, category: buttonCategory });
                await saveQuickButtons();
                createQuickButtons();
                quickButtonForm.reset();
            }
        });
    }

    if (document.getElementById('weekSlider')) {
        document.getElementById('weekSlider').addEventListener('input', function(event) {
            event.preventDefault();
            updateBarSliderValue(this.value);
        });
    }

    if (document.getElementById('monthSlider')) {
        document.getElementById('monthSlider').addEventListener('input', function(event) {
            event.preventDefault();
            updatePieSliderValue(this.value);
        });
    }

    await loadInitialData();
    await loadQuickButtons();
}

async function loadInitialData() {
    try {
        const response = await fetch('/data');
        const data = await response.json();
        chartData = data;
        chartData.sort((a, b) => new Date(b.label) - new Date(a.label)); // 초기 로드 시 내림차순 정렬
        data.forEach(item => uniqueCategories.add(item.category));
        updateTables();
        updatePieChart();
        updateBarChart();
        updateTotalValue(data);
    } catch (error) {
        console.error('Error loading initial data:', error);
    }
}

async function loadQuickButtons() {
    try {
        const response = await fetch('/quick-buttons');
        quickButtons = await response.json();
        createQuickButtons();
    } catch (error) {
        console.error('Error loading quick buttons:', error);
    }
}

function createQuickButtons() {
    const container = document.getElementById('quickButtonsContainer');
    if (!container) return;

    container.innerHTML = ''; // 기존 버튼 제거

    quickButtons.forEach(button => {
        const btn = document.createElement('button');
        btn.textContent = `${button.name} (${button.value}, ${button.category})`;
        btn.addEventListener('click', () => {
            const currentDate = new Date().toISOString().split('T')[0];
            chartData.push({ name: button.name, value: button.value, category: button.category, label: currentDate, type: 'outcome' });
            updateTables();
            updatePieChart();
            updateBarChart();
            updateTotalValue(chartData);
            saveData();
        });
        container.appendChild(btn);
    });
}

function updatePieChart() {
    const pieMonths = document.getElementById('monthSlider')?.value;
    if (!pieMonths) return;

    const filteredPieData = filterDataByMonths(pieMonths);
    const outcomeData = filteredPieData.filter(item => item.type === 'outcome').map(item => ({ ...item, value: Math.abs(item.value) }));
    outcomeData.sort((a, b) => new Date(b.label) - new Date(a.label));

    generatePieChart(outcomeData);
}

function updateBarChart() {
    const barWeeks = document.getElementById('weekSlider')?.value;
    if (!barWeeks) return;

    const filteredBarData = filterDataByWeeks(barWeeks);
    generateBarChart(filteredBarData);
}

function generatePieChart(data) {
    const ctx = document.getElementById('pieChart')?.getContext('2d');
    if (!ctx) return;

    const groupedData = data.reduce((acc, item) => {
        if (!acc[item.category]) {
            acc[item.category] = 0;
        }
        acc[item.category] += item.value;
        return acc;
    }, {});

    const labels = Object.keys(groupedData);
    const values = Object.values(groupedData);

    if (pieChart) {
        pieChart.destroy();
    }

    pieChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: labels.map(() => `hsl(${Math.random() * 360}, 100%, 75%)`)
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Pie Chart'
                }
            }
        }
    });
}

function generateBarChart(data) {
    const ctx = document.getElementById('barChart')?.getContext('2d');
    if (!ctx) return;

    let groupedData;
    if (data.length > 14) {
        const interval = Math.ceil(data.length / 14);
        groupedData = data.reduce((acc, item, index) => {
            const groupIndex = Math.floor(index / interval);
            const groupLabelStart = new Date(item.label);
            const groupLabelEnd = new Date(item.label);
            groupLabelEnd.setDate(groupLabelEnd.getDate() + interval);
            const groupLabel = `${groupLabelStart.toLocaleDateString()} - ${groupLabelEnd.toLocaleDateString()}`;
            if (!acc[groupLabel]) {
                acc[groupLabel] = 0;
            }
            acc[groupLabel] += Math.abs(item.value);
            return acc;
        }, {});
    } else {
        groupedData = data.reduce((acc, item) => {
            acc[item.label] = (acc[item.label] || 0) + Math.abs(item.value);
            return acc;
        }, {});
    }

    const labels = Object.keys(groupedData);
    const values = Object.values(groupedData);

    // Sort labels and values in ascending order of labels
    const sortedIndices = labels.map((label, index) => ({ label, value: values[index] }))
        .sort((a, b) => new Date(a.label) - new Date(b.label))
        .map(item => labels.indexOf(item.label));
    const sortedLabels = sortedIndices.map(index => labels[index]);
    const sortedValues = sortedIndices.map(index => values[index]);

    if (barChart) {
        barChart.destroy();
    }

    barChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedLabels,
            datasets: [{
                label: 'Values by Date',
                data: sortedValues,
                backgroundColor: sortedLabels.map(() => `hsl(${Math.random() * 360}, 100%, 75%)`)
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Bar Chart'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function filterDataByMonths(months) {
    const now = new Date();
    return chartData.filter(item => {
        const itemDate = new Date(item.label);
        const diffMonths = (now.getFullYear() - itemDate.getFullYear()) * 12 + (now.getMonth() - itemDate.getMonth());
        return diffMonths < months;
    });
}

function filterDataByWeeks(weeks) {
    const now = new Date();
    return chartData.filter(item => {
        const itemDate = new Date(item.label);
        const diffWeeks = Math.floor((now - itemDate) / (1000 * 60 * 60 * 24 * 7));
        if (weeks <= 12) {
            return diffWeeks < weeks;
        } else {
            const diffMonths = (now.getFullYear() - itemDate.getFullYear()) * 12 + (now.getMonth() - itemDate.getMonth());
            return diffMonths < weeks / 4;
        }
    }).filter(item => item.type === 'outcome');
}

function updateTables() {
    const allTableBody = document.getElementById('dataTable')?.querySelector('tbody');
    const incomeTableBody = document.getElementById('incomeTable')?.querySelector('tbody');
    const outcomeTableBody = document.getElementById('outcomeTable')?.querySelector('tbody');
    const incomePaginationContainer = document.getElementById('incomePagination');
    const outcomePaginationContainer = document.getElementById('outcomePagination');
    const allPaginationContainer = document.getElementById('allPagination');

    if (allTableBody) allTableBody.innerHTML = '';
    if (incomeTableBody) incomeTableBody.innerHTML = '';
    if (outcomeTableBody) outcomeTableBody.innerHTML = '';
    if (incomePaginationContainer) incomePaginationContainer.innerHTML = '';
    if (outcomePaginationContainer) outcomePaginationContainer.innerHTML = '';
    if (allPaginationContainer) allPaginationContainer.innerHTML = '';

    const sortedChartData = chartData.slice().sort((a, b) => new Date(b.label) - new Date(a.label));

    // Pagination for all data
    const allStart = (currentAllPage - 1) * itemsPerPage;
    const allEnd = allStart + itemsPerPage;
    const paginatedAllData = sortedChartData.slice(allStart, allEnd);

    paginatedAllData.forEach((item, index) => {
        const row = createTableRow(item, index + allStart);
        if (allTableBody) allTableBody.appendChild(row);
    });

    const allTotalPages = Math.ceil(sortedChartData.length / itemsPerPage);
    for (let i = 1; i <= allTotalPages; i++) {
        const pageButton = createPageButton(i, () => {
            currentAllPage = i;
            updateTables();
        });
        if (allPaginationContainer) allPaginationContainer.appendChild(pageButton);
    }

    // Pagination for income data
    const incomeData = sortedChartData.filter(item => item.type === 'income');
    const incomeStart = (currentIncomePage - 1) * itemsPerPage;
    const incomeEnd = incomeStart + itemsPerPage;
    const paginatedIncomeData = incomeData.slice(incomeStart, incomeEnd);

    paginatedIncomeData.forEach((item, index) => {
        const row = createTableRow(item, index + incomeStart);
        if (incomeTableBody) incomeTableBody.appendChild(row);
    });

    const incomeTotalPages = Math.ceil(incomeData.length / itemsPerPage);
    for (let i = 1; i <= incomeTotalPages; i++) {
        const pageButton = createPageButton(i, () => {
            currentIncomePage = i;
            updateTables();
        });
        if (incomePaginationContainer) incomePaginationContainer.appendChild(pageButton);
    }

    // Pagination for outcome data
    const outcomeData = sortedChartData.filter(item => item.type === 'outcome');
    const outcomeStart = (currentOutcomePage - 1) * itemsPerPage;
    const outcomeEnd = outcomeStart + itemsPerPage;
    const paginatedOutcomeData = outcomeData.slice(outcomeStart, outcomeEnd);

    paginatedOutcomeData.forEach((item, index) => {
        const row = createTableRow(item, index + outcomeStart);
        if (outcomeTableBody) outcomeTableBody.appendChild(row);
    });

    const outcomeTotalPages = Math.ceil(outcomeData.length / itemsPerPage);
    for (let i = 1; i <= outcomeTotalPages; i++) {
        const pageButton = createPageButton(i, () => {
            currentOutcomePage = i;
            updateTables();
        });
        if (outcomePaginationContainer) outcomePaginationContainer.appendChild(pageButton);
    }
}

function createTableRow(item, index) {
    const row = document.createElement('tr');
    const nameCell = document.createElement('td');
    const labelCell = document.createElement('td');
    const valueCell = document.createElement('td');
    const categoryCell = document.createElement('td');
    const typeCell = document.createElement('td');
    const actionCell = document.createElement('td');
    nameCell.textContent = item.name;
    labelCell.textContent = item.label;
    valueCell.textContent = item.value;
    categoryCell.textContent = item.category;
    typeCell.textContent = item.type;

    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.className = 'delete-button';
    deleteButton.onclick = (event) => {
        event.preventDefault();
        deleteData(index);
    };
    actionCell.appendChild(deleteButton);

    row.appendChild(nameCell);
    row.appendChild(labelCell);
    row.appendChild(valueCell);
    row.appendChild(categoryCell);
    row.appendChild(typeCell);
    row.appendChild(actionCell);

    return row;
}

function createPageButton(pageNumber, onClick) {
    const pageButton = document.createElement('button');
    pageButton.textContent = pageNumber;
    pageButton.onclick = onClick;
    return pageButton;
}

function deleteData(index) {
    chartData.splice(index, 1);
    updateTables();
    updatePieChart();
    updateBarChart();
    updateTotalValue(chartData);
    saveData();
}

function updateTotalValue(data) {
    const totalValueElement = document.getElementById('totalValue');
    if (!totalValueElement) return;
    const totalValue = data.reduce((sum, item) => sum + item.value, 0);
    totalValueElement.textContent = `Total Money: ${totalValue.toLocaleString()} 원`;
}

async function saveData() {
    try {
        await fetch('/data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(chartData),
        });
    } catch (error) {
        console.error('Error saving data:', error);
    }
}

async function saveQuickButtons() {
    try {
        await fetch('/quick-buttons', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(quickButtons),
        });
    } catch (error) {
        console.error('Error saving quick buttons:', error);
    }
}

function updatePieSliderValue(value) {
    document.getElementById('pieSliderValue').textContent = value;
    updatePieChart();
}

function updateBarSliderValue(value) {
    document.getElementById('barSliderValue').textContent = value <= 12 ? `${value} 주` : `${Math.floor(value / 4)} 개월`;
    updateBarChart();
}

window.onload = initializePage;
