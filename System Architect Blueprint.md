# Website Stack

-  Fast reliable and **Expandable** stack for my inventory.

```
  <--->  [ Frontend: HTML/Tailwind/JS ]
  <--->  [ Backend: Node.js/Express ]
  <--->  [ Database: SQLite ]
```

1. **Frontend:** A single responsive dashboard to input new shoes, view current stock, and mark items as sold.
    
2.  **Backend:** A REST API that handles adding items, updating their status (e.g., changing from "Listed" to "Sold"), and running your profit/ROI calculations server-side.
    
3.  **Database:** SQLite is perfect here. It's zero-configuration, runs out of a single local file in your directory, and requires no heavy database servers to manage.

## Database schema design

- You want your database table to closely reflect the physical lifecycle of your stock. Open a terminal in your project directory and initialize your database with this structured layout:

> `server.sql` SQL Server compatible `CREATE TABLE`

```
CREATE TABLE inventory (
    id INT IDENTITY(1,1) PRIMARY KEY,
    sku NVARCHAR(100) NOT NULL,
    model NVARCHAR(200) NOT NULL,
    size FLOAT NOT NULL,
    [condition] NVARCHAR(50) NOT NULL,
    [status] NVARCHAR(50) DEFAULT 'Sourced', -- Sourced, Listed, Sold
    purchase_price FLOAT NOT NULL,
    listed_price FLOAT NULL,
    sold_price FLOAT NULL,
    platform_fees FLOAT DEFAULT 0,
    shipping_cost FLOAT DEFAULT 0,
    net_profit AS (
        ISNULL(sold_price,0) - ISNULL(purchase_price,0) - ISNULL(platform_fees,0) - ISNULL(shipping_cost,0)
    ) PERSISTED,
    created_at DATETIME2 DEFAULT CURRENT_TIMESTAMP
);
```

## Full-Stack Prototype Implementation

- Here is a complete, production-ready implementation contained in a clean directory structure.

> `server.js` (Backend)

```
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
    const sql = `INSERT INTO sneakers (sku, model, size, condition, status, purchase_price, listed_price, sold_price, fees, shipping) 
                 VALUES (?, ?, ?, ?, 'Sourced', ?, 0, 0, 0, 0)`;
    db.run(sql, [sku, model, size, condition, purchase_price], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, status: 'Sourced' });
    });
});

// API: Update Sneaker Status to Sold
app.put('/api/inventory/:id/sold', (req, res) => {
    const { sold_price, fees, shipping } = req.body;
    const sql = `UPDATE sneakers SET status = 'Sold', sold_price = ?, fees = ?, shipping = ? WHERE id = ?`;
    db.run(sql, [sold_price, fees, shipping, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ updated: this.changes });
    });
});

app.listen(PORT, () => console.log(`Dashboard active at http://localhost:${PORT}`));
```