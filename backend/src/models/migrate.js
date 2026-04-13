require('dotenv').config();
const mysql = require('mysql2/promise');

/**
 * Run all DDL migrations.
 * Safe to call on every startup — uses IF NOT EXISTS throughout.
 * Can also be run standalone: node src/models/migrate.js
 */
async function migrate() {
  // Connect without a database first so we can CREATE it if needed
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || '127.0.0.1',
    port:     parseInt(process.env.DB_PORT || '3306'),
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    charset:  'utf8mb4',
  });

  const db = process.env.DB_NAME || 'marknotes';

  try {
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${db}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await conn.query(`USE \`${db}\``);

    // Users
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        username   VARCHAR(30)  NOT NULL UNIQUE,
        email      VARCHAR(255) NOT NULL UNIQUE,
        password   VARCHAR(255) NOT NULL,
        created_at DATETIME     DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Tags
    await conn.query(`
      CREATE TABLE IF NOT EXISTS tags (
        id    INT AUTO_INCREMENT PRIMARY KEY,
        name  VARCHAR(100) NOT NULL UNIQUE,
        color VARCHAR(20)  NOT NULL DEFAULT '#6366f1'
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Notes with FULLTEXT index for search
    await conn.query(`
      CREATE TABLE IF NOT EXISTS notes (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        user_id    INT          NOT NULL,
        title      VARCHAR(255) NOT NULL DEFAULT 'Untitled Note',
        content    LONGTEXT     NOT NULL,
        is_pinned  TINYINT(1)   NOT NULL DEFAULT 0,
        created_at DATETIME     DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_notes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FULLTEXT INDEX idx_notes_fts (title, content)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Note ↔ Tag join table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS note_tags (
        note_id INT NOT NULL,
        tag_id  INT NOT NULL,
        PRIMARY KEY (note_id, tag_id),
        CONSTRAINT fk_nt_note FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
        CONSTRAINT fk_nt_tag  FOREIGN KEY (tag_id)  REFERENCES tags(id)  ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Version history
    await conn.query(`
      CREATE TABLE IF NOT EXISTS note_versions (
        id       INT AUTO_INCREMENT PRIMARY KEY,
        note_id  INT          NOT NULL,
        title    VARCHAR(255) NOT NULL,
        content  LONGTEXT     NOT NULL,
        saved_at DATETIME     DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_nv_note FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅  Database migrations applied successfully.');
  } finally {
    await conn.end();
  }
}

// Allow running standalone: node src/models/migrate.js
if (require.main === module) {
  migrate().catch((err) => {
    console.error('❌  Migration failed:', err.message);
    process.exit(1);
  });
}

module.exports = migrate;