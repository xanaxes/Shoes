-- Summary of sneaker inventory by condition
SELECT
    [condition],
    COUNT(*) AS total_items,
    SUM(purchase_price) AS total_purchase_value,
    SUM(ISNULL(sold_price, 0)) AS total_sold_value,
    SUM(net_profit) AS total_profit
FROM
    inventory
WHERE
    [status] = 'Sold'
GROUP BY
    [condition]
ORDER BY
    total_profit DESC;