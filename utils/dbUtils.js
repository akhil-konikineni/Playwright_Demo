import mysql from 'mysql2/promise';
export async function createDbConnection() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.QA_DB_HOST,
      user: process.env.QA_DB_USER,
      password: process.env.QA_DB_PASSWORD,
      database: process.env.QA_DB_NAME,
    });

    console.log("✅ DB connection established");
    return connection;

  } catch (error) {
    console.error("Error connecting to DB:", error);
    throw error;
  }
}