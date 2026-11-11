import "server-only";
import mysql, { type Pool, type RowDataPacket } from "mysql2/promise";
import { ApiError } from "./validation";
let pool: Pool | undefined;
export function databaseConfigured() { return !!(process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME); }
export function database(): Pool {
  if (!databaseConfigured()) throw new ApiError(503,"Studio storage is not configured yet.");
  return pool ??= mysql.createPool({host:process.env.DB_HOST,port:Number(process.env.DB_PORT || 3306),user:process.env.DB_USER,password:process.env.DB_PASSWORD || "",database:process.env.DB_NAME,connectionLimit:5,waitForConnections:true,queueLimit:25,charset:"utf8mb4",timezone:"Z",connectTimeout:10000});
}
export async function claimLoginAttempt(now = Date.now()) {
  const connection = await database().getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute("INSERT IGNORE INTO portfolio_login_limits (id,window_start,attempts) VALUES (1,?,0)",[now]);
    const [rows] = await connection.execute<RowDataPacket[]>("SELECT window_start,attempts FROM portfolio_login_limits WHERE id=1 FOR UPDATE");
    const fresh = now - Number(rows[0].window_start) >= 15 * 60 * 1000;
    if (!fresh && Number(rows[0].attempts) >= 10) throw new ApiError(429,"Too many sign-in attempts. Please try again in 15 minutes.");
    await connection.execute("UPDATE portfolio_login_limits SET window_start=?, attempts=? WHERE id=1",[fresh ? now : rows[0].window_start,fresh ? 1 : Number(rows[0].attempts)+1]);
    await connection.commit();
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}
