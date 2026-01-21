-- Schema Update v2: Comprehensive CRUD Support

-- 1. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT NOT NULL,
    action VARCHAR(20) NOT NULL,
    changes JSON,
    user_id INT,
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_entity (entity_type, entity_id),
    INDEX idx_audit_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Categories Table (Enhanced)
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    parent_id INT,
    path VARCHAR(255), -- Materialized path for hierarchy optimization
    status ENUM('active', 'archived') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    updated_by INT,
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Item Types Table (Schema Support)
CREATE TABLE IF NOT EXISTS item_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    schema_definition JSON, -- Custom fields definition
    parent_id INT,
    version INT DEFAULT 1,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES item_types(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Locations Table Updates (Geo & Address)
DROP PROCEDURE IF EXISTS UpgradeLocationsV2;
DELIMITER //
CREATE PROCEDURE UpgradeLocationsV2()
BEGIN
    -- Address
    IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'locations' AND COLUMN_NAME = 'address') THEN
        ALTER TABLE locations ADD COLUMN address TEXT;
    END IF;
    
    -- Geolocation
    IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'locations' AND COLUMN_NAME = 'latitude') THEN
        ALTER TABLE locations ADD COLUMN latitude DECIMAL(10, 8);
        ALTER TABLE locations ADD COLUMN longitude DECIMAL(11, 8);
    END IF;

    -- Versioning & Status
    IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'locations' AND COLUMN_NAME = 'version') THEN
        ALTER TABLE locations ADD COLUMN version INT DEFAULT 1;
    END IF;
    
    IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'locations' AND COLUMN_NAME = 'status') THEN
        ALTER TABLE locations ADD COLUMN status ENUM('active', 'inactive') DEFAULT 'active';
    END IF;
END //
DELIMITER ;
CALL UpgradeLocationsV2();
DROP PROCEDURE UpgradeLocationsV2;

-- 5. Seed Data
INSERT IGNORE INTO categories (name, description, status) VALUES 
('Baking', 'Baking ingredients and supplies', 'active'),
('Dairy', 'Milk, butter, eggs', 'active'),
('Produce', 'Fresh fruits and veg', 'active');

INSERT IGNORE INTO item_types (name, description, schema_definition, status) VALUES 
('Ingredient', 'Raw materials', '{"shelf_life": "number", "allergen": "string"}', 'active'),
('Finished Good', 'Sales items', '{"price": "money"}', 'active');
