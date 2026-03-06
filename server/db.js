const mysql = require('mysql2/promise');

const pool = mysql.createPool(process.env.DATABASE_URL || {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'runtracker',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : false,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

module.exports = pool;
