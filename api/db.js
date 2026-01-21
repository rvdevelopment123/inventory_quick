const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'mac1',
  password: process.env.DB_PASSWORD || 'ashblue',
  database: process.env.DB_NAME || 'inv_quick',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
});

module.exports = {
  query: async (text, params) => {
    const [results, ] = await pool.execute(text, params);
    return { rows: results, rowCount: results.length }; // Adapter to match pg interface loosely
  },
  pool
};
