import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { pool } from "../db";
import jwt from "jsonwebtoken";

const router = Router();

const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(72),
  role: z.enum(["member", "gym_owner"]).default("member"),
});

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  const { name, email, password, role } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, created_at`,
      [name, email, passwordHash, role]
    );
    res.status(201).json({ user: result.rows[0] });
  } catch (err: any) {
    if (err.code === "23505") {
      res.status(409).json({ error: "Email already registered" });
      return;
    }
    throw err;
  }
});

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET is not set");

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});


router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  const { email, password } = parsed.data;
  const result = await pool.query(
    "SELECT id, name, email, role, password_hash FROM users WHERE email = $1",
    [email]
  );
  const user = result.rows[0];

  const valid = user && (await bcrypt.compare(password, user.password_hash));
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, {
    expiresIn: "7d",
  });

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

export default router;