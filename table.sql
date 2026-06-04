-- SQL Server compatible CREATE TABLE
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