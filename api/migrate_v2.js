const fs = require('fs');
const path = require('path');
const db = require('./db');

async function migrateV2() {
    console.log('Starting v2 Migration...');
    const connection = await db.pool.getConnection();
    
    try {
        // We will execute the raw SQL by splitting roughly. 
        // Note: The stored procedure syntax with DELIMITER is tricky in node driver.
        // We will execute the CREATE TABLEs directly and then the ALTERs manually logic in JS 
        // to avoid SQL parsing issues with the driver.
        
        // 1. Audit Logs
        await connection.query(`
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
        `);
        console.log('- Audit Logs table ready');

        // 2. Categories
        await connection.query(`
            CREATE TABLE IF NOT EXISTS categories (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                description TEXT,
                parent_id INT,
                path VARCHAR(255),
                status ENUM('active', 'archived') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                created_by INT,
                updated_by INT,
                FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('- Categories table ready');

        // 3. Item Types
        await connection.query(`
            CREATE TABLE IF NOT EXISTS item_types (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                description TEXT,
                schema_definition JSON,
                parent_id INT,
                version INT DEFAULT 1,
                status ENUM('active', 'inactive') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (parent_id) REFERENCES item_types(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('- Item Types table ready');

        // 4. Locations Updates
        const [cols] = await connection.query(`
            SELECT COLUMN_NAME FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'locations' AND COLUMN_NAME = 'address'
        `);
        
        if (cols.length === 0) {
            await connection.query(`
                ALTER TABLE locations 
                ADD COLUMN address TEXT,
                ADD COLUMN latitude DECIMAL(10, 8),
                ADD COLUMN longitude DECIMAL(11, 8),
                ADD COLUMN version INT DEFAULT 1,
                ADD COLUMN status ENUM('active', 'inactive') DEFAULT 'active'
            `);
            console.log('- Locations table updated');
        }

        // 5. Seeds
        await connection.query(`
            INSERT IGNORE INTO categories (name, description, status) VALUES 
            ('Baking', 'Baking ingredients and supplies', 'active'),
            ('Dairy', 'Milk, butter, eggs', 'active'),
            ('Produce', 'Fresh fruits and veg', 'active')
        `);
        
        await connection.query(`
            INSERT IGNORE INTO item_types (name, description, schema_definition, status) VALUES 
            ('Ingredient', 'Raw materials', '{"shelf_life": "number", "allergen": "string"}', 'active'),
            ('Finished Good', 'Sales items', '{"price": "money"}', 'active')
        `);
        console.log('- Seed data inserted');

    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    } finally {
        connection.release();
    }
    process.exit(0);
}

migrateV2();
