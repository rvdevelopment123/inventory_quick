-- Commissary Inventory Management System Schema (MySQL Version)
-- Created: 2026-01-21
-- Description: Comprehensive database schema for tracking inventory movements.

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_refresh_tokens_user (user_id),
    INDEX idx_refresh_tokens_token (token_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Locations Table
CREATE TABLE IF NOT EXISTS locations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Items Table
CREATE TABLE IF NOT EXISTS items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sku VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    unit_of_measure VARCHAR(20) NOT NULL,
    category VARCHAR(50) NOT NULL,
    type ENUM('ingredient', 'finished_good') NOT NULL,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_item_cat (name, category),
    INDEX idx_items_sku (sku)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Inventory Movements Table
CREATE TABLE IF NOT EXISTS inventory_movements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    from_location_id INT,
    to_location_id INT,
    quantity INT NOT NULL,
    movement_type ENUM('receipt', 'consumption', 'transfer', 'adjustment') NOT NULL,
    user_id INT NOT NULL,
    reference_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE RESTRICT,
    FOREIGN KEY (from_location_id) REFERENCES locations(id) ON DELETE RESTRICT,
    FOREIGN KEY (to_location_id) REFERENCES locations(id) ON DELETE RESTRICT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,

    CONSTRAINT check_positive_quantity CHECK (quantity > 0),
    
    INDEX idx_movements_item_id (item_id),
    INDEX idx_movements_from_loc (from_location_id),
    INDEX idx_movements_to_loc (to_location_id),
    INDEX idx_movements_type (movement_type),
    INDEX idx_movements_date (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Inventory Reservations Table
CREATE TABLE IF NOT EXISTS inventory_reservations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    location_id INT NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    order_reference VARCHAR(100),
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('active', 'fulfilled', 'cancelled') NOT NULL DEFAULT 'active',

    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE RESTRICT,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE RESTRICT,
    INDEX idx_reservations_item_loc (item_id, location_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================
-- Seed Data
-- =============================================

-- Seed Locations
INSERT IGNORE INTO locations (name, description) VALUES
('Main Warehouse', 'Primary storage facility for bulk inventory'),
('Secondary Storage', 'Overflow storage and staging area');

-- Seed Sample User
INSERT IGNORE INTO users (username, email, hashed_password, role) VALUES
('admin_user', 'admin@commissary.com', 'hashed_secret_123', 'admin'),
('standard_user', 'user@commissary.com', 'hashed_secret_456', 'user');

-- Seed Sample Items
INSERT IGNORE INTO items (sku, name, description, unit_of_measure, category, type, status) VALUES
('ING-001', 'Flour - All Purpose', '50lb bag of AP flour', 'bag', 'Baking', 'ingredient', 'active'),
('ING-002', 'Sugar - Granulated', '25lb bag of sugar', 'bag', 'Baking', 'ingredient', 'active'),
('PKG-001', 'Takeout Container 16oz', 'Plastic container with lid', 'case', 'Packaging', 'ingredient', 'active');

-- Sample Usage (Assuming IDs 1, 2, 3 etc. exist from seed)
-- Note: Subqueries in VALUES are supported in MySQL, similar to Postgres.

INSERT INTO inventory_movements 
(item_id, from_location_id, to_location_id, quantity, movement_type, user_id, reference_number, notes)
VALUES 
(
    (SELECT id FROM items WHERE sku = 'ING-001' LIMIT 1), 
    NULL, 
    (SELECT id FROM locations WHERE name = 'Main Warehouse' LIMIT 1), 
    100, 
    'receipt', 
    (SELECT id FROM users WHERE username = 'admin_user' LIMIT 1), 
    'PO-2023-001', 
    'Weekly delivery'
);

INSERT INTO inventory_movements 
(item_id, from_location_id, to_location_id, quantity, movement_type, user_id, notes)
VALUES 
(
    (SELECT id FROM items WHERE sku = 'ING-001' LIMIT 1), 
    (SELECT id FROM locations WHERE name = 'Main Warehouse' LIMIT 1), 
    (SELECT id FROM locations WHERE name = 'Secondary Storage' LIMIT 1), 
    20, 
    'transfer', 
    (SELECT id FROM users WHERE username = 'admin_user' LIMIT 1), 
    'Restock Secondary'
);

INSERT INTO inventory_movements 
(item_id, from_location_id, to_location_id, quantity, movement_type, user_id, notes)
VALUES 
(
    (SELECT id FROM items WHERE sku = 'ING-001' LIMIT 1), 
    (SELECT id FROM locations WHERE name = 'Main Warehouse' LIMIT 1), 
    NULL, 
    5, 
    'consumption', 
    (SELECT id FROM users WHERE username = 'admin_user' LIMIT 1), 
    'Production Batch A'
);
