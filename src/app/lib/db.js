import mysql from "mysql2/promise";

const usaSSL = process.env.DB_SSL === "true";

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
    ssl: usaSSL
      ? { minVersion: "TLSv1.2", rejectUnauthorized: true }
      : undefined,
  });

if (process.env.NODE_ENV !== "production") globalThis.mysqlPool = db;