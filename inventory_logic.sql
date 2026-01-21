
-- Inventory Logic, Calculations, and Validation
-- Extends the base schema with views, functions, and triggers

-- =============================================
-- 1. Inventory Reservations
-- =============================================
-- (Table definition moved to schema.sql)

-- =============================================
-- 2. Real-time Inventory Views
-- =============================================

-- View: current_inventory_snapshot
-- Calculates the raw physical stock based on all historical movements
CREATE OR REPLACE VIEW current_inventory_snapshot AS
SELECT 
    i.id AS item_id,
    i.sku,
    i.name AS item_name,
    l.id AS location_id,
    l.name AS location_name,
    -- Sum of Inbound (to_location) minus Outbound (from_location)
    COALESCE(SUM(CASE WHEN im.to_location_id = l.id THEN im.quantity ELSE 0 END), 0) -
    COALESCE(SUM(CASE WHEN im.from_location_id = l.id THEN im.quantity ELSE 0 END), 0) AS on_hand_quantity
FROM items i
CROSS JOIN locations l
LEFT JOIN inventory_movements im 
    ON i.id = im.item_id 
    AND (im.to_location_id = l.id OR im.from_location_id = l.id)
GROUP BY i.id, i.sku, i.name, l.id, l.name;

-- View: available_inventory
-- Calculates available stock: On Hand - Active Reservations
CREATE OR REPLACE VIEW available_inventory AS
SELECT 
    cis.item_id,
    cis.sku,
    cis.item_name,
    cis.location_id,
    cis.location_name,
    cis.on_hand_quantity,
    COALESCE(SUM(ir.quantity), 0) AS reserved_quantity,
    cis.on_hand_quantity - COALESCE(SUM(ir.quantity), 0) AS available_quantity
FROM current_inventory_snapshot cis
LEFT JOIN inventory_reservations ir 
    ON cis.item_id = ir.item_id 
    AND cis.location_id = ir.location_id 
    AND ir.status = 'active' 
    AND ir.expires_at > NOW()
GROUP BY 
    cis.item_id, cis.sku, cis.item_name, cis.location_id, cis.location_name, cis.on_hand_quantity;

-- =============================================
-- 3. Stock Availability Helper Function
-- =============================================

CREATE OR REPLACE FUNCTION get_available_stock(
    p_item_id INTEGER, 
    p_location_id INTEGER
) RETURNS INTEGER AS $$
DECLARE
    v_available INTEGER;
BEGIN
    SELECT available_quantity INTO v_available
    FROM available_inventory
    WHERE item_id = p_item_id AND location_id = p_location_id;
    
    RETURN COALESCE(v_available, 0);
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 4. Negative Inventory Prevention Trigger
-- =============================================

CREATE OR REPLACE FUNCTION check_stock_before_movement()
RETURNS TRIGGER AS $$
DECLARE
    v_current_stock INTEGER;
BEGIN
    -- Only check for movements that reduce stock (transfer out, consumption, adjustment out)
    -- 1. Check FROM location if it exists
    IF NEW.from_location_id IS NOT NULL THEN
        -- Calculate current physical stock at the source location
        -- We use physical stock (current_inventory_snapshot) because this is a committed movement.
        -- If you want to enforce reservations strictly, use available_inventory.
        -- Standard practice: committed movements check physical stock; 
        -- order placement checks available stock. Here we check physical to prevent negative inventory.
        
        SELECT on_hand_quantity INTO v_current_stock
        FROM current_inventory_snapshot
        WHERE item_id = NEW.item_id AND location_id = NEW.from_location_id;
        
        IF v_current_stock IS NULL THEN 
            v_current_stock := 0; 
        END IF;

        IF (v_current_stock - NEW.quantity) < 0 THEN
            RAISE EXCEPTION 'Insufficient stock. Item ID: %, Location ID: %, Current: %, Attempted: %', 
                NEW.item_id, NEW.from_location_id, v_current_stock, NEW.quantity
                USING HINT = 'Cannot reduce stock below zero.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_negative_inventory
BEFORE INSERT ON inventory_movements
FOR EACH ROW
EXECUTE FUNCTION check_stock_before_movement();

-- =============================================
-- 5. Atomic Transfer Procedure
-- =============================================

CREATE OR REPLACE PROCEDURE execute_transfer(
    p_item_id INTEGER,
    p_from_location_id INTEGER,
    p_to_location_id INTEGER,
    p_quantity INTEGER,
    p_user_id INTEGER,
    p_notes TEXT DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_available_qty INTEGER;
BEGIN
    -- 1. Validate Input
    IF p_from_location_id = p_to_location_id THEN
        RAISE EXCEPTION 'Source and destination locations must be different.';
    END IF;
    
    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'Transfer quantity must be positive.';
    END IF;

    -- 2. Check Availability (Application Level Check)
    -- Although the trigger protects data integrity, this check provides a user-friendly error
    -- and allows for reservation logic if we wanted to incorporate it here.
    v_available_qty := get_available_stock(p_item_id, p_from_location_id);
    
    IF v_available_qty < p_quantity THEN
         RAISE EXCEPTION 'Insufficient available stock for transfer. Available: %, Requested: %', v_available_qty, p_quantity;
    END IF;

    -- 3. Execute Transfer (Atomic Insert)
    -- In this schema, a transfer is a single row, so it is inherently atomic.
    -- The trigger `check_stock_before_movement` will run BEFORE this insert commits
    -- to ensure the source location has enough physical stock.
    INSERT INTO inventory_movements (
        item_id, 
        from_location_id, 
        to_location_id, 
        quantity, 
        movement_type, 
        user_id, 
        notes,
        created_at
    ) VALUES (
        p_item_id,
        p_from_location_id,
        p_to_location_id,
        p_quantity,
        'transfer',
        p_user_id,
        p_notes,
        NOW()
    );
    
    -- Transaction is managed by the caller (or implicitly committed if single statement)
END;
$$;

-- =============================================
-- 6. Consume Stock Procedure (Respects Reservations)
-- =============================================

CREATE OR REPLACE PROCEDURE consume_stock(
    p_item_id INTEGER,
    p_location_id INTEGER,
    p_quantity INTEGER,
    p_user_id INTEGER,
    p_notes TEXT DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_available_qty INTEGER;
BEGIN
    -- 1. Validate Input
    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'Consumption quantity must be positive.';
    END IF;

    -- 2. Check Availability (Application Level Check)
    v_available_qty := get_available_stock(p_item_id, p_location_id);
    
    IF v_available_qty < p_quantity THEN
         RAISE EXCEPTION 'Insufficient available stock for consumption. Available: %, Requested: %', v_available_qty, p_quantity;
    END IF;

    -- 3. Execute Consumption (Atomic Insert)
    INSERT INTO inventory_movements (
        item_id, 
        from_location_id, 
        to_location_id, 
        quantity, 
        movement_type, 
        user_id, 
        notes,
        created_at
    ) VALUES (
        p_item_id,
        p_location_id,
        NULL,
        p_quantity,
        'consumption',
        p_user_id,
        p_notes,
        NOW()
    );
END;
$$;

-- =============================================
-- 7. Receive Stock Procedure (Stock In)
-- =============================================

CREATE OR REPLACE PROCEDURE receive_stock(
    p_item_id INTEGER,
    p_location_id INTEGER,
    p_quantity INTEGER,
    p_user_id INTEGER,
    p_reference_number VARCHAR(100) DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- 1. Validate Input
    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'Receipt quantity must be positive.';
    END IF;

    -- 2. Execute Receipt (Atomic Insert)
    INSERT INTO inventory_movements (
        item_id, 
        from_location_id, 
        to_location_id, 
        quantity, 
        movement_type, 
        user_id, 
        reference_number,
        notes,
        created_at
    ) VALUES (
        p_item_id,
        NULL,
        p_location_id,
        p_quantity,
        'receipt',
        p_user_id,
        p_reference_number,
        p_notes,
        NOW()
    );
END;
$$;
