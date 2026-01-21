-- =============================================
-- Inventory Calculation Examples
-- =============================================

-- 1. Calculate Current On-Hand Quantity for a Specific Item at a Specific Location
-- Replace :item_id and :location_id with actual values
SELECT 
    i.name as item_name,
    l.name as location_name,
    COALESCE(SUM(CASE WHEN im.to_location_id = l.id THEN im.quantity ELSE 0 END), 0) -
    COALESCE(SUM(CASE WHEN im.from_location_id = l.id THEN im.quantity ELSE 0 END), 0) as on_hand_quantity
FROM items i
CROSS JOIN locations l
LEFT JOIN inventory_movements im ON i.id = im.item_id AND (im.to_location_id = l.id OR im.from_location_id = l.id)
WHERE i.id = 1 AND l.id = 1
GROUP BY i.id, l.id;

-- 2. System-wide Inventory Report (All Items, All Locations)
-- Shows positive stock only
WITH item_balance AS (
    SELECT 
        item_id,
        location_id,
        SUM(quantity_change) as on_hand
    FROM (
        -- Incoming
        SELECT item_id, to_location_id as location_id, quantity as quantity_change
        FROM inventory_movements
        WHERE to_location_id IS NOT NULL
        
        UNION ALL
        
        -- Outgoing
        SELECT item_id, from_location_id as location_id, -quantity as quantity_change
        FROM inventory_movements
        WHERE from_location_id IS NOT NULL
    ) movements
    GROUP BY item_id, location_id
)
SELECT 
    i.sku,
    i.name as item_name,
    l.name as location_name,
    ib.on_hand,
    i.unit_of_measure
FROM item_balance ib
JOIN items i ON ib.item_id = i.id
JOIN locations l ON ib.location_id = l.id
WHERE ib.on_hand > 0
ORDER BY i.name, l.name;

-- 3. Transaction History for an Item
SELECT 
    im.created_at,
    im.movement_type,
    fl.name as from_location,
    tl.name as to_location,
    im.quantity,
    u.username as performed_by,
    im.reference_number
FROM inventory_movements im
LEFT JOIN locations fl ON im.from_location_id = fl.id
LEFT JOIN locations tl ON im.to_location_id = tl.id
JOIN users u ON im.user_id = u.id
WHERE im.item_id = 1
ORDER BY im.created_at DESC;
