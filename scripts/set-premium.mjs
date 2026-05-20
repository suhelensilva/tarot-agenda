import "dotenv/config"
import pg from "pg"

const { Client } = pg
const client = new Client({ connectionString: process.env.DATABASE_URL })
await client.connect()

const res = await client.query(
  `UPDATE users SET plan = 'PREMIUM' WHERE email = 'suhelen.games@gmail.com' RETURNING email, plan`
)
console.log("Updated:", res.rows)
await client.end()
