const fs = require('fs');
const path = require('path');
const db = require('./db');

async function migrate() {
  try {
    const schemaPath = path.join(__dirname, '../schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // Split by semicolon, but handle cases where semicolons might be in strings (simplified for this schema)
    // The schema provided is clean, so splitting by ';' should generally work, 
    // but empty statements need filtering.
    const statements = schemaSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`Found ${statements.length} statements to execute.`);

    const connection = await db.pool.getConnection();
    
    try {
        // Disable foreign key checks temporarily to allow out-of-order creation if needed
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');

        for (const statement of statements) {
            try {
                await connection.query(statement);
            } catch (err) {
                // Ignore "Table already exists" or similar warnings if using IF NOT EXISTS,
                // but log errors.
                console.error('Error executing statement:', statement.substring(0, 50) + '...');
                console.error(err.message);
            }
        }

        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('Migration completed successfully.');
    } finally {
        connection.release();
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
