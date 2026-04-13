const mysql = require('mysql2/promise');

// Create a connection pool — reuses connections efficiently
const pool = mysql.createPool({
  host:     process.env.DB_HOST     || '127.0.0.1',
  port:     parseInt(process.env.DB_PORT || '3306'),
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'marknotes',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  timezone:           'Z',          // store/retrieve as UTC
  charset:            'utf8mb4',
});

module.exports = pool;