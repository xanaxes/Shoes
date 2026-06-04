const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Local SQLite Database
const db = new sqlite3.Database('./sneaker_inventory.db', (err) => {
    if (err) console.error('Database connection error:', err.message);
    console.log('Connected to the local sneaker inventory database.');
});

// Create Table
db.run(`CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sku TEXT NOT NULL,
    model TEXT NOT NULL,
    size REAL NOT NULL,
    condition TEXT NOT NULL,
    status TEXT DEFAULT 'Sourced',
    purchase_price REAL NOT NULL,
    listed_price REAL,
    sold_price REAL,
    platform_fees REAL DEFAULT 0,
    shipping_cost REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// API: Get All Sneakers
app.get('/api/inventory', (req, res) => {
    db.all('SELECT * FROM inventory ORDER BY id DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Calculate dynamic profit metrics on the fly
        const processed = rows.map(row => {
            const net_profit = row.status === 'Sold' 
                ? (row.sold_price - row.purchase_price - row.platform_fees - row.shipping_cost).toFixed(2)
                : '0.00';
            const roi = row.status === 'Sold' && row.purchase_price > 0
                ? ((net_profit / row.purchase_price) * 100).toFixed(1)
                : '0.0';
            return { ...row, net_profit, roi };
        });
        res.json(processed);
    });
});

// API: Add New Sneaker
app.post('/api/inventory', (req, res) => {
    const { sku, model, size, condition, purchase_price } = req.body;
    const sql = `INSERT INTO inventory (sku, model, size, condition, status, purchase_price, listed_price, sold_price, platform_fees, shipping_cost) 
                 VALUES (?, ?, ?, ?, 'Sourced', ?, 0, 0, 0, 0)`;
    db.run(sql, [sku, model, size, condition, purchase_price], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, status: 'Sourced' });
    });
});

// API: Update Sneaker Status to Sold
app.patch('/api/inventory/:id/sold', (req, res) => {
    const { sold_price, platform_fees, shipping_cost } = req.body;
    const sql = `UPDATE inventory SET status = 'Sold', sold_price = ?, platform_fees = ?, shipping_cost = ? WHERE id = ?`;
    db.run(sql, [sold_price, platform_fees || 0, shipping_cost || 0, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ updated: this.changes });
    });
});

app.listen(PORT, () => console.log(`Dashboard active at http://localhost:${PORT}`));