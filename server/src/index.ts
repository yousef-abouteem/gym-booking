import "dotenv/config";
import express from "express";
import { pool } from "./db";
import authRouter from "./routes/auth";
import gymsRouter from "./routes/gyms";
import bookingsRouter from "./routes/bookings";

const app = express();
app.use(express.json());
app.use("/api/auth", authRouter);
app.use("/api/gyms", gymsRouter);
app.use("/api", bookingsRouter);

app.get("/api/health", async (_req, res) => {
  const result = await pool.query("SELECT NOW()");
  res.json({ status: "ok", dbTime: result.rows[0].now });
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});