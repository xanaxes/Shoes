const { promises } = require('async/await');
const express = require('express');
const sqlite3 = require('sqlite3').verbose(promises);
const path = require('path');
const app = express();
const PORT = process.env.PORT || dotenv.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Local SQLite Database
const db = new sqlite3.Database('./sneaker_inventory.db', (err) => {
    if (err) console.error('Database connection error:', err.message);
    console.log('Connected to the local sneaker inventory database.');
});

// Create Table
db.run(`CREATE TABLE IF NOT EXISTS sneakers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sku TEXT, model TEXT, size TEXT, condition TEXT, status TEXT,
    purchase_price REAL, listed_price REAL, sold_price REAL, fees REAL, shipping REAL
)`);

// API: Get All Sneakers
app.get('/api/inventory', (req, res) => {
    db.all('SELECT * FROM sneakers ORDER BY id DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Calculate dynamic profit metrics on the fly
        const processed = rows.map(row => {
            const net_profit = row.status === 'Sold' 
                ? (row.sold_price - row.purchase_price - row.fees - row.shipping).toFixed(2)
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
    const sql = `INSERT INTO sneakers (sku, model, size, condition, status, purchase_price, listed_price, sold_price, fees, shipping, status) 
                 VALUES (?, ?, ?, ?, 'Sourced', ?, 0, 0, 0, 0, 'Sourced')`;
    db.run(sql, [sku, model, size, condition, purchase_price], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, status: 'Sourced' });
    });
});

// API: Update Sneaker Status to Sold
app.patch('/api/inventory/:id/sold', (req, res) => {
    const { sold_price, fees, shipping } = req.body;
    const sql = `UPDATE sneakers SET status = 'Sold', sold_price = ?, fees = ?, shipping = ? WHERE id = ?`;
    db.run(sql, [sold_price, fees, shipping, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ updated: this.changes });
    });
});

app.listen(PORT, () => console.log(`Dashboard active at http://localhost:${PORT}`));