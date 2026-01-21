-- Test Scenarios for Inventory Logic
-- Run this script to verify the logic implemented in inventory_logic.sql

-- =============================================
-- 1. Setup Environment
-- =============================================
\echo 'Starting Test Scenarios...'

-- Clear previous test data (optional, but good for repeatability)
TRUNCATE inventory_movements CASCADE;
TRUNCATE inventory_reservations CASCADE;
-- Reset sequences if needed, but for now we'll just add to existing seed data logic or rely on clean slate if this was a test db.
-- For this script, we assume the seed data from schema.sql is already present OR we will re-insert it.

-- Re-insert basic seed data to ensure known state
DELETE FROM inventory_movements;
-- (Assuming Items and Locations exist as per schema.sql)

-- =============================================
-- 2. Test Stock In (Receipt)
-- =============================================
\echo 'Testing Stock In...'
INSERT INTO inventory_movements (item_id, to_location_id, quantity, movement_type, user_id, reference_number)
VALUES (1, 1, 100, 'receipt', 1, 'PO-TEST-001'); -- 100 Flour at Main Warehouse

-- Verify Stock
SELECT * FROM current_inventory_snapshot WHERE item_id = 1 AND location_id = 1;
-- Expected: 100

-- =============================================
-- 3. Test Negative Inventory Prevention (Consumption)
-- =============================================
\echo 'Testing Negative Inventory Prevention...'
DO $$
BEGIN
    BEGIN
        -- Using raw insert to test the DB trigger (Physical Check)
        INSERT INTO inventory_movements (item_id, from_location_id, quantity, movement_type, user_id)
        VALUES (1, 1, 150, 'consumption', 1); -- Try to consume 150 (only 100 avail)
        RAISE NOTICE 'FAIL: Should have blocked negative inventory';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'PASS: Blocked negative inventory: %', SQLERRM;
    END;
END $$;

-- =============================================
-- 4. Test Atomic Transfer (Success)
-- =============================================
\echo 'Testing Atomic Transfer (Success)...'
CALL execute_transfer(
    p_item_id := 1,
    p_from_location_id := 1,
    p_to_location_id := 2,
    p_quantity := 20,
    p_user_id := 1,
    p_notes := 'Transfer to Secondary'
);

-- Verify Stock
-- Main: 80, Secondary: 20
SELECT location_name, on_hand_quantity FROM current_inventory_snapshot WHERE item_id = 1 ORDER BY location_name;

-- =============================================
-- 5. Test Atomic Transfer (Fail - Insufficient Funds)
-- =============================================
\echo 'Testing Atomic Transfer (Failure)...'
DO $$
BEGIN
    BEGIN
        CALL execute_transfer(
            p_item_id := 1,
            p_from_location_id := 2, -- Secondary has 20
            p_to_location_id := 1,
            p_quantity := 50,        -- Try to move 50
            p_user_id := 1
        );
        RAISE NOTICE 'FAIL: Should have blocked transfer';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'PASS: Blocked invalid transfer: %', SQLERRM;
    END;
END $$;

-- =============================================
-- 6. Test Reservations
-- =============================================
\echo 'Testing Reservations...'
-- Reserve 10 items at Main Warehouse (Current: 80)
INSERT INTO inventory_reservations (item_id, location_id, quantity, order_reference, expires_at)
VALUES (1, 1, 10, 'ORDER-001', NOW() + INTERVAL '1 day');

-- Available should be 70 (80 - 10)
SELECT on_hand_quantity, reserved_quantity, available_quantity FROM available_inventory WHERE item_id = 1 AND location_id = 1;

-- Try to consume 75 (Physical 80, but Available 70)
-- Using consume_stock procedure which respects reservations
DO $$
BEGIN
    BEGIN
        CALL consume_stock(
            p_item_id := 1, 
            p_location_id := 1, 
            p_quantity := 75, 
            p_user_id := 1
        );
        RAISE NOTICE 'FAIL: Should have blocked consumption due to reservation';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'PASS: Blocked consumption exceeding available stock: %', SQLERRM;
    END;
END $$;

\echo 'All Tests Completed.'
