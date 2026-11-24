import mysql from "mysql2/promise";

export const db =
  globalThis.mysqlPool ??
  mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 10,
    waitForConnections: true,
  });

// evita criar várias conexões a cada reload no modo dev
if (process.env.NODE_ENV !== "production") globalThis.mysqlPool = db;