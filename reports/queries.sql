
-- =============================================
-- Reporting Queries & Views
-- =============================================

-- 1. On-Hand Inventory Materialized View
-- Optimizes the expensive summation of movements for real-time reporting.
-- Refresh Strategy: Trigger-based or Periodic (e.g., every 5 mins)
CREATE MATERIALIZED VIEW mv_inventory_on_hand AS
SELECT 
    i.id AS item_id,
    i.name AS item_name,
    i.sku,
    i.category,
    i.unit_of_measure,
    l.id AS location_id,
    l.name AS location_name,
    COALESCE(SUM(CASE WHEN im.to_location_id = l.id THEN im.quantity ELSE 0 END), 0) -
    COALESCE(SUM(CASE WHEN im.from_location_id = l.id THEN im.quantity ELSE 0 END), 0) AS on_hand_quantity,
    MAX(im.created_at) as last_movement_at
FROM items i
CROSS JOIN locations l
LEFT JOIN inventory_movements im 
    ON i.id = im.item_id 
    AND (im.to_location_id = l.id OR im.from_location_id = l.id)
GROUP BY i.id, i.name, i.sku, i.category, i.unit_of_measure, l.id, l.name;

CREATE INDEX idx_mv_on_hand_loc_item ON mv_inventory_on_hand(location_id, item_id);

-- 2. Daily Inventory Summary Materialized View
-- Aggregates movements by day for historical trending
CREATE MATERIALIZED VIEW mv_daily_inventory_summary AS
SELECT
    DATE_TRUNC('day', im.created_at) as report_date,
    im.item_id,
    im.to_location_id as location_id, -- Simplification: Inbound logic needs refined splitting
    SUM(CASE WHEN im.to_location_id IS NOT NULL THEN im.quantity ELSE 0 END) as quantity_in,
    SUM(CASE WHEN im.from_location_id IS NOT NULL THEN im.quantity ELSE 0 END) as quantity_out
FROM inventory_movements im
GROUP BY 1, 2, 3;

-- Query A: On-Hand Inventory (with optional As-Of Date)
-- Note: 'As-Of' logic requires backtracking from current state if using MV, 
-- or raw query if MV doesn't support history. Here is the raw optimized query for As-Of.
-- :location_id (optional), :as_of_date (optional)
/*
SELECT 
    i.name, i.sku, l.name as location,
    SUM(CASE 
        WHEN im.to_location_id = l.id THEN im.quantity 
        WHEN im.from_location_id = l.id THEN -im.quantity 
        ELSE 0 
    END) as quantity
FROM items i
CROSS JOIN locations l
JOIN inventory_movements im ON i.id = im.item_id 
    AND (im.to_location_id = l.id OR im.from_location_id = l.id)
WHERE 
    (:location_id IS NULL OR l.id = :location_id)
    AND (:as_of_date IS NULL OR im.created_at <= :as_of_date)
GROUP BY i.id, l.id
HAVING SUM(...) <> 0
*/

-- Query B: Inventory Movement History
-- :start_date, :end_date, :location_id (opt), :product_id (opt)
/*
SELECT 
    im.created_at,
    im.movement_type,
    i.name as item_name,
    fl.name as from_location,
    tl.name as to_location,
    im.quantity,
    u.username as user,
    im.reference_number
FROM inventory_movements im
JOIN items i ON im.item_id = i.id
LEFT JOIN locations fl ON im.from_location_id = fl.id
LEFT JOIN locations tl ON im.to_location_id = tl.id
JOIN users u ON im.user_id = u.id
WHERE 
    im.created_at BETWEEN :start_date AND :end_date
    AND (:location_id IS NULL OR im.from_location_id = :location_id OR im.to_location_id = :location_id)
    AND (:product_id IS NULL OR im.item_id = :product_id)
ORDER BY im.created_at DESC
LIMIT :limit OFFSET :offset
*/

-- Query C: Weekly Summary
-- :week_start_date, :location_id (opt)
/*
SELECT 
    i.name as item_name,
    SUM(CASE WHEN im.to_location_id IS NOT NULL THEN im.quantity ELSE 0 END) as total_in,
    SUM(CASE WHEN im.from_location_id IS NOT NULL THEN im.quantity ELSE 0 END) as total_out,
    (SUM(CASE WHEN im.to_location_id IS NOT NULL THEN im.quantity ELSE 0 END) - 
     SUM(CASE WHEN im.from_location_id IS NOT NULL THEN im.quantity ELSE 0 END)) as net_change
FROM inventory_movements im
JOIN items i ON im.item_id = i.id
WHERE 
    im.created_at >= :week_start_date 
    AND im.created_at < (:week_start_date::date + INTERVAL '1 week')
    AND (:location_id IS NULL OR im.to_location_id = :location_id OR im.from_location_id = :location_id)
GROUP BY i.id, i.name
ORDER BY i.name
*/
