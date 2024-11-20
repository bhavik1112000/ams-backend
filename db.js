import pg from "pg";
import dotenv from "dotenv";

const { Pool } = pg;

dotenv.config();

// Set up PostgreSQL connection using Pool
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

// Test PostgreSQL connection
pool
  .connect()
  .then(() => console.log("Connected to PostgreSQL"))
  .catch((err) => console.error("Connection error", err.stack));

// Export the pool for use in other parts of the application
export default pool;
