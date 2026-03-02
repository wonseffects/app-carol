/**
 * Gerenciar Amor - Carol Gerente de Vendas
 * Dashboard logic & data persistence (Backend API version)
 */

// --- Constants & Global State ---
const SUPPLIER_DEFAULT_RATIO = 0.7; // 70% cost
const API_URL = 'http://localhost:3000/api/customers';
let customers = [];
let debtChart = null;

// --- DOM Elements ---
const customerForm = document.getElementById('addCustomerForm');
const paymentForm = document.getElementById('paymentForm');
const customerTableBody = document.getElementById('customerTableBody');
const searchInput = document.getElementById('searchCustomer');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    await loadCustomers();
    initChart();
});

// --- Data Management Functions ---

async function loadCustomers() {
    try {
        // Só tenta o servidor se estivermos no localhost
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            const response = await fetch(API_URL);
            if (response.ok) {
                customers = await response.json();
                updateDashboard();
                return;
            }
        }
    } catch (err) {
        console.log('Ambiente Cloud ou Servidor Offline - Usando LocalStorage');
    }

    // Fallback para LocalStorage (Vercel ou Servidor Offline)
    customers = JSON.parse(localStorage.getItem('gerenciar_amor_customers')) || [];
    updateDashboard();
}

async function saveCustomers() {
    // Sempre salva no LocalStorage para garantir que você não perca nada no navegador
    localStorage.setItem('gerenciar_amor_customers', JSON.stringify(customers));

    // Se estiver no PC (localhost), tenta salvar no arquivo db.json
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        try {
            await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(customers)
            });
        } catch (err) {
            console.error('Erro ao salvar no arquivo db.json:', err);
        }
    }
    updateDashboard();
}


function addCustomer(event) {
    event.preventDefault();

    const name = document.getElementById('customerName').value;
    const phone = document.getElementById('customerPhone').value;
    const totalValue = parseFloat(document.getElementById('customerValue').value);
    const manualCost = document.getElementById('customerCost').value;
    const notes = document.getElementById('customerNotes').value;

    const supplierCost = manualCost ? parseFloat(manualCost) : (totalValue * SUPPLIER_DEFAULT_RATIO);

    const newCustomer = {
        id: Date.now(),
        name,
        phone,
        totalValue,
        paidValue: 0,
        supplierCost,
        notes,
        createdAt: new Date().toISOString()
    };

    customers.push(newCustomer);
    saveCustomers();

    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('addCustomerModal'));
    modal.hide();
    customerForm.reset();
}

function deleteCustomer(id) {
    if (confirm('Tem certeza que deseja excluir este comprador?')) {
        customers = customers.filter(c => c.id !== id);
        saveCustomers();
    }
}

function openPaymentModal(id) {
    const customer = customers.find(c => c.id === id);
    if (!customer) return;

    document.getElementById('paymentCustomerId').value = id;
    document.getElementById('paymentCustomerName').innerText = customer.name;
    document.getElementById('paymentValue').value = (customer.totalValue - customer.paidValue).toFixed(2);

    const modal = new bootstrap.Modal(document.getElementById('paymentModal'));
    modal.show();
}

function addPayment(event) {
    event.preventDefault();

    const id = parseInt(document.getElementById('paymentCustomerId').value);
    const paymentAmount = parseFloat(document.getElementById('paymentValue').value);

    const customerIndex = customers.findIndex(c => c.id === id);
    if (customerIndex === -1) return;

    customers[customerIndex].paidValue += paymentAmount;

    // Safety check: can't pay more than owed
    if (customers[customerIndex].paidValue > customers[customerIndex].totalValue) {
        customers[customerIndex].paidValue = customers[customerIndex].totalValue;
    }

    saveCustomers();

    const modal = bootstrap.Modal.getInstance(document.getElementById('paymentModal'));
    modal.hide();
    paymentForm.reset();
}

// --- UI Rendering Functions ---

function formatCurrency(value) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function updateDashboard() {
    renderCustomerList();
    calculateStats();
    updateChart();
}

function calculateStats() {
    const totalRevenue = customers.reduce((sum, c) => sum + c.totalValue, 0);
    const totalPaid = customers.reduce((sum, c) => sum + c.paidValue, 0);
    const totalSupplierCost = customers.reduce((sum, c) => sum + c.supplierCost, 0);

    document.getElementById('totalRevenue').innerText = formatCurrency(totalRevenue);
    document.getElementById('totalPaid').innerText = formatCurrency(totalPaid);
    document.getElementById('supplierDebt').innerText = formatCurrency(totalSupplierCost);

    const progressPercent = totalSupplierCost > 0 ? (Math.min((totalPaid / totalSupplierCost) * 100, 100)).toFixed(0) : 0;

    const progressBar = document.getElementById('supplierProgressBar');
    if (progressBar) {
        progressBar.style.width = progressPercent + '%';
        progressBar.innerText = progressPercent + '%';
        progressBar.setAttribute('aria-valuenow', progressPercent);
    }

    const remainingSupplier = Math.max(totalSupplierCost - totalPaid, 0);
    const remainingEl = document.getElementById('supplierRemaining');
    if (remainingEl) remainingEl.innerText = formatCurrency(remainingSupplier);

    const progressTextEl = document.getElementById('supplierProgressText');
    if (progressTextEl) progressTextEl.innerText = `${progressPercent}% quitado`;
}

function renderCustomerList() {
    const searchTerm = searchInput.value.toLowerCase();
    const filtered = customers.filter(c => c.name.toLowerCase().includes(searchTerm));

    customerTableBody.innerHTML = '';

    filtered.forEach(customer => {
        const percentPaid = ((customer.paidValue / customer.totalValue) * 100).toFixed(0);
        const remaining = customer.totalValue - customer.paidValue;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div class="fw-bold">${customer.name}</div>
                <div class="small text-muted">${customer.phone || 'Sem telefone'}</div>
                <div class="small text-pink" style="font-size: 0.75rem;">${customer.notes ? '📝 ' + customer.notes : ''}</div>
            </td>
            <td>
                <div class="customer-progress-container">
                    <div class="d-flex justify-content-between mb-1 small">
                        <span>${percentPaid}%</span>
                        <span class="text-muted">Falta ${formatCurrency(remaining)}</span>
                    </div>
                    <div class="progress" style="height: 8px;">
                        <div class="progress-bar bg-gradient-pink" role="progressbar" style="width: ${percentPaid}%"></div>
                    </div>
                </div>
            </td>
            <td class="fw-bold">${formatCurrency(customer.totalValue)}</td>
            <td class="text-success fw-medium">${formatCurrency(customer.paidValue)}</td>
            <td>
                <button class="btn btn-action btn-pay" onclick="openPaymentModal(${customer.id})" title="Registrar Pagamento">
                    <i class="bi bi-cash-stack"></i>
                </button>
                <button class="btn btn-action btn-delete" onclick="deleteCustomer(${customer.id})" title="Excluir">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        customerTableBody.appendChild(row);
    });

    if (filtered.length === 0) {
        customerTableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">Nenhum comprador encontrado.</td></tr>';
    }
}

// --- Chart Functions ---

function initChart() {
    const canvas = document.getElementById('debtChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    debtChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Pago (Clientes)', 'Pendente (Clientes)', 'Dívida Fornecedor'],
            datasets: [{
                data: [0, 0, 0],
                backgroundColor: ['#4D00B8', '#FF007A', '#fd7e14'],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: { family: 'Poppins' }
                    }
                }
            },
            cutout: '70%'
        }
    });
    updateChart();
}

function updateChart() {
    if (!debtChart) return;

    const totalPaid = customers.reduce((sum, c) => sum + c.paidValue, 0);
    const totalOwedByCustomers = customers.reduce((sum, c) => sum + (c.totalValue - c.paidValue), 0);
    const totalSupplierCost = customers.reduce((sum, c) => sum + c.supplierCost, 0);

    debtChart.data.datasets[0].data = [totalPaid, totalOwedByCustomers, totalSupplierCost];
    debtChart.update();
}

// --- Backup & Restore Functions ---

function exportData() {
    if (customers.length === 0) {
        alert('Não há dados para exportar.');
        return;
    }

    const dataStr = JSON.stringify(customers, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_gerenciar_amor_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const imported = JSON.parse(e.target.result);
            if (Array.isArray(imported)) {
                if (confirm('Isso irá substituir seus dados atuais pelos dados do arquivo. Deseja continuar?')) {
                    customers = imported;
                    saveCustomers();
                    alert('Dados importados com sucesso!');
                }
            } else {
                alert('O arquivo de backup parece inválido.');
            }
        } catch (err) {
            alert('Erro ao ler o arquivo de backup.');
            console.error(err);
        }
        event.target.value = ''; // Reset input
    };
    reader.readAsText(file);
}

function clearAllData() {
    if (confirm('ATENÇÃO: Isso apagará TODOS os seus clientes e pagamentos permanentemente. Tem certeza?')) {
        customers = [];
        saveCustomers();
        alert('Todos os dados foram apagados.');
    }
}

// --- Event Listeners ---
customerForm.addEventListener('submit', addCustomer);
paymentForm.addEventListener('submit', addPayment);
searchInput.addEventListener('input', renderCustomerList);
