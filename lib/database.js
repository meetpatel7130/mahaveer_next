import mysql from "mysql2/promise";

const globalForMySQL = globalThis;

export function getPool() {
  if (!process.env.MYSQL_DATABASE) {
    throw new Error(
      "MYSQL_DATABASE is required. Configure the MySQL connection in mahaveer_next/.env.local.",
    );
  }

  globalForMySQL.mysqlPool ??= mysql.createPool({
    host: process.env.MYSQL_HOST || "127.0.0.1",
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "demo123",
    database: process.env.MYSQL_DATABASE || "mahaveer",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: "Z",
    decimalNumbers: true,
  });

  return globalForMySQL.mysqlPool;
}

async function ensureQuotationTermsColumn(pool) {
  if (!globalForMySQL.mysqlQuotationTermsReady) {
    globalForMySQL.mysqlQuotationTermsReady = (async () => {
      const [quotationColumns] = await pool.execute(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'quotations'
            AND COLUMN_NAME = 'terms_conditions'`,
      );
      if (quotationColumns.length === 0) {
        await pool.query("ALTER TABLE quotations ADD COLUMN terms_conditions JSON NULL");
      }
    })().catch((error) => {
      globalForMySQL.mysqlQuotationTermsReady = undefined;
      throw error;
    });
  }

  await globalForMySQL.mysqlQuotationTermsReady;
}

export async function initializeDatabase() {
  if (!globalForMySQL.mysqlSchemaReady) {
    globalForMySQL.mysqlSchemaReady = (async () => {
      const pool = getPool();
      const statements = [
        `CREATE TABLE IF NOT EXISTS users (
          id CHAR(36) PRIMARY KEY,
          full_name VARCHAR(255) NOT NULL,
          email VARCHAR(320) NOT NULL UNIQUE,
          mobile VARCHAR(40) NOT NULL UNIQUE,
          username VARCHAR(100) NOT NULL UNIQUE,
          password_hash VARCHAR(255) NOT NULL,
          user_type ENUM('admin', 'sales') NOT NULL DEFAULT 'sales',
          last_login DATETIME(3) NULL,
          created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
        ) ENGINE=InnoDB`,
        `CREATE TABLE IF NOT EXISTS sessions (
          id CHAR(64) PRIMARY KEY,
          user_id CHAR(36) NOT NULL,
          expires_at DATETIME(3) NOT NULL,
          created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          INDEX sessions_user_id (user_id),
          INDEX sessions_expires_at (expires_at),
          CONSTRAINT sessions_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB`,
        `CREATE TABLE IF NOT EXISTS companies (
          id CHAR(36) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          image VARCHAR(1024) NULL,
          website VARCHAR(2048) NULL,
          mobile VARCHAR(40) NULL,
          created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
          INDEX companies_created_at (created_at)
        ) ENGINE=InnoDB`,
        `CREATE TABLE IF NOT EXISTS categories (
          id CHAR(36) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          img VARCHAR(1024) NULL,
          added_by_whom CHAR(36) NULL,
          created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
          INDEX categories_created_at (created_at),
          INDEX categories_added_by_whom (added_by_whom)
        ) ENGINE=InnoDB`,
        `CREATE TABLE IF NOT EXISTS products (
          id CHAR(36) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          category_id CHAR(36) NOT NULL,
          company_id CHAR(36) NOT NULL,
          material VARCHAR(255) NULL,
          hsn_code VARCHAR(100) NULL,
          gst_percentage DECIMAL(8, 3) NOT NULL DEFAULT 0,
          img VARCHAR(1024) NULL,
          description TEXT NULL,
          sku JSON NOT NULL,
          added_by_whom CHAR(36) NULL,
          created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
          INDEX products_created_at (created_at),
          INDEX products_category_id (category_id),
          INDEX products_company_id (company_id)
        ) ENGINE=InnoDB`,
        `CREATE TABLE IF NOT EXISTS quotations (
          id CHAR(36) PRIMARY KEY,
          q_id VARCHAR(9) NOT NULL UNIQUE,
          client_name VARCHAR(255) NOT NULL,
          firm_name VARCHAR(255) NULL,
          mobile VARCHAR(40) NULL,
          email VARCHAR(320) NULL,
          address TEXT NULL,
          gst_number VARCHAR(100) NULL,
          discount DECIMAL(12, 2) NULL,
          products JSON NOT NULL,
          terms_conditions JSON NULL,
          subtotal DECIMAL(14, 2) NULL,
          gst_amount DECIMAL(14, 2) NULL,
          grandtotal DECIMAL(14, 2) NULL,
          created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
          INDEX quotations_created_at (created_at),
          INDEX quotations_client_name (client_name),
          INDEX quotations_firm_name (firm_name)
        ) ENGINE=InnoDB`,
        `CREATE TABLE IF NOT EXISTS quotation_sequences (
          id TINYINT UNSIGNED PRIMARY KEY,
          next_value INT UNSIGNED NOT NULL
        ) ENGINE=InnoDB`,
        `CREATE TABLE IF NOT EXISTS app_settings (
          setting_key VARCHAR(100) PRIMARY KEY,
          setting_value VARCHAR(255) NOT NULL
        ) ENGINE=InnoDB`,
      ];

      for (const statement of statements) {
        await pool.query(statement);
      }
      await pool.query(
        "INSERT IGNORE INTO quotation_sequences (id, next_value) VALUES (1, 1)",
      );
      await pool.query(
        "INSERT IGNORE INTO app_settings (setting_key, setting_value) VALUES ('admin_bootstrap', 'available')",
      );
    })().catch((error) => {
      globalForMySQL.mysqlSchemaReady = undefined;
      throw error;
    });
  }

  await globalForMySQL.mysqlSchemaReady;
  const pool = getPool();
  await ensureQuotationTermsColumn(pool);
  return pool;
}
