const API_BASE = '/api';

// Load inventory on page load
document.addEventListener('DOMContentLoaded', () => {
    loadInventory();
    document.getElementById('addForm').addEventListener('submit', handleAddSneaker);
});

async function loadInventory() {
    try {
        const response = await fetch(`${API_BASE}/inventory`);
        const data = await response.json();

        if (!response.ok) {
            showAlert(`Error: ${data.error}`, 'error');
            return;
        }

        displayInventory(data);
        updateSummary(data);
    } catch (err) {
        showAlert(`Failed to load inventory: ${err.message}`, 'error');
    }
}

function displayInventory(items) {
    const container = document.getElementById('inventory-container');

    if (items.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px 20px;">No items yet. Add your first sneaker!</p>';
        return;
    }

    let html = `
        <table class="inventory-table">
            <thead>
                <tr>
                    <th>SKU</th>
                    <th>Model</th>
                    <th>Size</th>
                    <th>Condition</th>
                    <th>Status</th>
                    <th>Purchase Price</th>
                    <th>Sold Price</th>
                    <th>Profit</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    items.forEach(item => {
        const statusClass = item.status === 'Sold' ? 'status-sold' : 'status-sourced';
        const statusLabel = item.status;
        const profit = parseFloat(item.net_profit) || 0;
        const profitClass = profit > 0 ? 'profit-positive' : 'profit-neutral';
        const profitText = profit > 0 ? `+$${profit.toFixed(2)}` : `$${profit.toFixed(2)}`;

        html += `
            <tr>
                <td>${item.sku}</td>
                <td>${item.model}</td>
                <td>${item.size}</td>
                <td>${item.condition}</td>
                <td><span class="${statusClass}">${statusLabel}</span></td>
                <td>$${item.purchase_price.toFixed(2)}</td>
                <td>${item.sold_price ? `$${parseFloat(item.sold_price).toFixed(2)}` : '-'}</td>
                <td><span class="${profitClass}">${profitText}</span></td>
                <td>
                    ${item.status === 'Sourced' ? `
                        <button class="action-button" onclick="toggleSoldForm(${item.id})">Mark Sold</button>
                    ` : '-'}
                </td>
            </tr>
            ${item.status === 'Sourced' ? `
                <tr>
                    <td colspan="9">
                        <div class="sold-form" id="form-${item.id}">
                            <div class="form-group">
                                <label for="sold-price-${item.id}">Sold Price ($)</label>
                                <input type="number" id="sold-price-${item.id}" step="0.01" placeholder="Selling price" required>
                            </div>
                            <div class="form-group">
                                <label for="platform-fees-${item.id}">Platform Fees ($)</label>
                                <input type="number" id="platform-fees-${item.id}" step="0.01" value="0" placeholder="Marketplace fees">
                            </div>
                            <div class="form-group">
                                <label for="shipping-${item.id}">Shipping Cost ($)</label>
                                <input type="number" id="shipping-${item.id}" step="0.01" value="0" placeholder="Shipping cost">
                            </div>
                            <button onclick="handleMarkSold(${item.id})">Confirm Sale</button>
                            <button onclick="toggleSoldForm(${item.id})" style="background: #6c757d; margin-top: 10px;">Cancel</button>
                        </div>
                    </td>
                </tr>
            ` : ''}
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

function updateSummary(items) {
    const totalItems = items.length;
    const totalSourced = items.filter(i => i.status === 'Sourced').length;
    const totalSold = items.filter(i => i.status === 'Sold').length;
    const totalProfit = items.reduce((sum, i) => sum + (parseFloat(i.net_profit) || 0), 0);

    document.getElementById('totalItems').textContent = totalItems;
    document.getElementById('totalSourced').textContent = totalSourced;
    document.getElementById('totalSold').textContent = totalSold;
    document.getElementById('totalProfit').textContent = `$${totalProfit.toFixed(2)}`;
}

function toggleSoldForm(id) {
    const form = document.getElementById(`form-${id}`);
    form.classList.toggle('show');
}

async function handleAddSneaker(e) {
    e.preventDefault();

    const formData = {
        sku: document.getElementById('sku').value,
        model: document.getElementById('model').value,
        size: parseFloat(document.getElementById('size').value),
        condition: document.getElementById('condition').value,
        purchase_price: parseFloat(document.getElementById('purchase_price').value)
    };

    try {
        const response = await fetch(`${API_BASE}/inventory`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (!response.ok) {
            showAlert(`Error: ${data.error}`, 'error');
            return;
        }

        showAlert('Sneaker added successfully!', 'success');
        document.getElementById('addForm').reset();
        loadInventory();
    } catch (err) {
        showAlert(`Failed to add sneaker: ${err.message}`, 'error');
    }
}

async function handleMarkSold(id) {
    const soldPrice = parseFloat(document.getElementById(`sold-price-${id}`).value);
    const platformFees = parseFloat(document.getElementById(`platform-fees-${id}`).value) || 0;
    const shippingCost = parseFloat(document.getElementById(`shipping-${id}`).value) || 0;

    if (!soldPrice) {
        showAlert('Please enter a sold price', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/inventory/${id}/sold`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sold_price: soldPrice, platform_fees: platformFees, shipping_cost: shippingCost })
        });

        const data = await response.json();

        if (!response.ok) {
            showAlert(`Error: ${data.error}`, 'error');
            return;
        }

        showAlert('Sale recorded successfully!', 'success');
        loadInventory();
    } catch (err) {
        showAlert(`Failed to record sale: ${err.message}`, 'error');
    }
}

function showAlert(message, type) {
    const container = document.getElementById('alert-container');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;

    container.appendChild(alert);

    setTimeout(() => {
        alert.remove();
    }, 4000);
}
