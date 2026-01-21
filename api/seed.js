const db = require('./db');
const { Security } = require('../auth/core');

async function seed() {
    console.log('Starting database seeding...');
    const connection = await db.pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Clean existing data
        console.log('Cleaning existing data...');
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');
        await connection.query('TRUNCATE TABLE inventory_movements');
        await connection.query('TRUNCATE TABLE inventory_reservations');
        await connection.query('TRUNCATE TABLE items');
        await connection.query('TRUNCATE TABLE locations');
        await connection.query('TRUNCATE TABLE refresh_tokens');
        await connection.query('TRUNCATE TABLE users');
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');

        // 2. Seed Users
        console.log('Seeding Users...');
        const adminPassword = await Security.hashPassword('admin123');
        const userPassword = await Security.hashPassword('user123');

        await connection.query(`
            INSERT INTO users (username, email, hashed_password, role) VALUES 
            (?, ?, ?, ?),
            (?, ?, ?, ?)
        `, [
            'admin', 'admin@inventory.com', adminPassword, 'admin',
            'staff', 'staff@inventory.com', userPassword, 'user'
        ]);

        const [users] = await connection.query('SELECT id, username FROM users');
        const adminId = users.find(u => u.username === 'admin').id;
        const staffId = users.find(u => u.username === 'staff').id;

        // 3. Seed Locations
        console.log('Seeding Locations...');
        await connection.query(`
            INSERT INTO locations (name, description) VALUES 
            ('Main Warehouse', 'Primary bulk storage'),
            ('Kitchen', 'Production area'),
            ('Bakery Station', 'Baking and prep area'),
            ('Cold Storage', 'Refrigerated ingredients')
        `);

        const [locations] = await connection.query('SELECT id, name FROM locations');
        const locMap = locations.reduce((acc, l) => ({ ...acc, [l.name]: l.id }), {});

        // 4. Seed Items
        console.log('Seeding Items...');
        // Categories: Baking, Produce, Dairy, Packaging, Finished Goods
        const itemsData = [
            // Ingredients - Baking
            ['ING-001', 'Flour - All Purpose', '50lb bag', 'bag', 'Baking', 'ingredient'],
            ['ING-002', 'Sugar - Granulated', '25lb bag', 'bag', 'Baking', 'ingredient'],
            ['ING-003', 'Yeast', '1lb pack', 'pcs', 'Baking', 'ingredient'],
            ['ING-004', 'Salt', '5lb box', 'box', 'Baking', 'ingredient'],
            // Ingredients - Dairy
            ['ING-005', 'Butter - Unsalted', '1lb block', 'lb', 'Dairy', 'ingredient'],
            ['ING-006', 'Milk - Whole', '1 gallon', 'l', 'Dairy', 'ingredient'],
            ['ING-007', 'Eggs', '30 count tray', 'pcs', 'Dairy', 'ingredient'],
            // Packaging
            ['PKG-001', 'Cookie Box', 'Small dozen box', 'pcs', 'Packaging', 'ingredient'],
            ['PKG-002', 'Bread Bag', 'Plastic bag for loaves', 'pcs', 'Packaging', 'ingredient'],
            // Finished Goods
            ['PRD-001', 'Choc Chip Cookies', 'Dozen cookies', 'pcs', 'Baking', 'finished_good'],
            ['PRD-002', 'Sourdough Loaf', 'Fresh baked loaf', 'pcs', 'Baking', 'finished_good']
        ];

        for (const item of itemsData) {
            await connection.query(
                `INSERT INTO items (sku, name, description, unit_of_measure, category, type, status) VALUES (?, ?, ?, ?, ?, ?, 'active')`,
                item
            );
        }

        const [items] = await connection.query('SELECT id, sku FROM items');
        const itemMap = items.reduce((acc, i) => ({ ...acc, [i.sku]: i.id }), {});

        // 5. Seed Inventory Movements (History)
        console.log('Seeding Inventory Movements...');
        
        // Helper to insert movement
        const addMove = async (sku, from, to, qty, type, user, ref, note, daysAgo = 0) => {
            const date = new Date();
            date.setDate(date.getDate() - daysAgo);
            await connection.query(
                `INSERT INTO inventory_movements 
                (item_id, from_location_id, to_location_id, quantity, movement_type, user_id, reference_number, notes, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    itemMap[sku], 
                    from ? locMap[from] : null, 
                    to ? locMap[to] : null, 
                    qty, 
                    type, 
                    user, 
                    ref, 
                    note,
                    date
                ]
            );
        };

        // Initial Receipts (1 month ago)
        await addMove('ING-001', null, 'Main Warehouse', 100, 'receipt', adminId, 'PO-001', 'Initial Stock', 30); // Flour
        await addMove('ING-002', null, 'Main Warehouse', 50, 'receipt', adminId, 'PO-001', 'Initial Stock', 30); // Sugar
        await addMove('ING-005', null, 'Cold Storage', 200, 'receipt', adminId, 'PO-002', 'Dairy Order', 29); // Butter
        await addMove('ING-006', null, 'Cold Storage', 50, 'receipt', adminId, 'PO-002', 'Dairy Order', 29); // Milk
        await addMove('PKG-001', null, 'Main Warehouse', 500, 'receipt', adminId, 'PO-003', 'Packaging', 28); // Boxes

        // Transfers to Kitchen (2 weeks ago)
        await addMove('ING-001', 'Main Warehouse', 'Kitchen', 10, 'transfer', staffId, 'TR-001', 'Weekly Prep', 14);
        await addMove('ING-002', 'Main Warehouse', 'Kitchen', 5, 'transfer', staffId, 'TR-001', 'Weekly Prep', 14);
        await addMove('ING-005', 'Cold Storage', 'Kitchen', 20, 'transfer', staffId, 'TR-001', 'Weekly Prep', 14);

        // Production (Consumption) (1 week ago)
        // Consumed 5 Flour, 2 Sugar, 5 Butter to make Cookies
        await addMove('ING-001', 'Kitchen', null, 5, 'consumption', staffId, 'BATCH-101', 'Cookie Batch', 7);
        await addMove('ING-002', 'Kitchen', null, 2, 'consumption', staffId, 'BATCH-101', 'Cookie Batch', 7);
        await addMove('ING-005', 'Kitchen', null, 5, 'consumption', staffId, 'BATCH-101', 'Cookie Batch', 7);

        // Production (Receipt of Finished Goods)
        await addMove('PRD-001', null, 'Bakery Station', 50, 'receipt', staffId, 'BATCH-101', 'Cookies Produced', 7);

        // Sales/Shipment (Consumption of Finished Goods + Packaging)
        await addMove('PRD-001', 'Bakery Station', null, 10, 'consumption', staffId, 'ORD-501', 'Customer Order', 2);
        await addMove('PKG-001', 'Main Warehouse', null, 10, 'consumption', staffId, 'ORD-501', 'Packaging Used', 2);

        // Spoilage (Adjustment)
        await addMove('ING-006', 'Cold Storage', null, 2, 'adjustment', adminId, 'ADJ-001', 'Expired Milk', 1);

        // 6. Seed Reservations
        console.log('Seeding Reservations...');
        await connection.query(`
            INSERT INTO inventory_reservations (item_id, location_id, quantity, order_reference, expires_at, status) VALUES
            (?, ?, 20, 'ORD-502', DATE_ADD(NOW(), INTERVAL 2 DAY), 'active'),
            (?, ?, 5, 'ORD-503', DATE_ADD(NOW(), INTERVAL 5 DAY), 'active')
        `, [
            itemMap['PRD-001'], locMap['Bakery Station'], // Reserve 20 cookies
            itemMap['ING-001'], locMap['Main Warehouse']  // Reserve 5 bags flour
        ]);

        await connection.commit();
        console.log('Seeding completed successfully!');
        process.exit(0);

    } catch (error) {
        await connection.rollback();
        console.error('Seeding failed:', error);
        process.exit(1);
    } finally {
        connection.release();
    }
}

seed();
