import { Router } from "express";
import { pool } from "../db";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
const isId = (v: unknown): v is string => typeof v === "string" && /^\d+$/.test(v);

// حجز مقعد في حصة: للأعضاء فقط
router.post("/sessions/:id/bookings", requireAuth, requireRole("member"), async (req, res) => {
  const sessionId = req.params.id;
  if (!isId(sessionId)) {
    res.status(400).json({ error: "Invalid session id" });
    return;
  }

  // اتصال مخصص من الـ pool، لأن كل خطوات الـ Transaction يجب أن تمر عبر نفس الاتصال
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // نقفل صف الحصة: أي طلب حجز آخر لنفس الحصة ينتظر هنا حتى ننتهي
    const sessionResult = await client.query(
     "SELECT capacity, start_time FROM class_sessions WHERE id = $1 FOR UPDATE",
      [sessionId]
    );
    const session = sessionResult.rows[0];

    if (!session) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Session not found" });
      return;
    }
    if (new Date(session.start_time) <= new Date()) {
      await client.query("ROLLBACK");
      res.status(400).json({ error: "Session already started" });
      return;
    }

    const countResult = await client.query(
      "SELECT COUNT(*)::int AS booked FROM bookings WHERE session_id = $1 AND status = 'confirmed'",
      [sessionId]
    );
    if (countResult.rows[0].booked >= session.capacity) {
      await client.query("ROLLBACK");
      res.status(409).json({ error: "Session is full" });
      return;
    }

    const result = await client.query(
      `INSERT INTO bookings (user_id, session_id)
       VALUES ($1, $2)
       RETURNING id, session_id, status, created_at`,
      [req.user!.id, sessionId]
    );

    await client.query("COMMIT");
    res.status(201).json({ booking: result.rows[0] });
  } catch (err: any) {
    await client.query("ROLLBACK");
    if (err.code === "23505") {
      res.status(409).json({ error: "You already booked this session" });
      return;
    }
    throw err;
  } finally {
    client.release(); // نرجع الاتصال للـ pool مهما حصل
  }
});

// إلغاء حجز: صاحب الحجز فقط
router.delete("/bookings/:id", requireAuth, async (req, res) => {
  if (!isId(req.params.id)) {
    res.status(400).json({ error: "Invalid booking id" });
    return;
  }

  const result = await pool.query(
    `UPDATE bookings SET status = 'cancelled'
     WHERE id = $1 AND user_id = $2 AND status = 'confirmed'
     RETURNING id, session_id, status`,
    [req.params.id, req.user!.id]
  );
  if (!result.rows[0]) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }
  res.json({ booking: result.rows[0] });
});

// حجوزاتي
router.get("/me/bookings", requireAuth, async (req, res) => {
  const result = await pool.query(
    `SELECT b.id, b.status, b.created_at,
            s.id AS session_id, ct.name AS class_name,
            g.name AS gym_name, g.slug AS gym_slug,
            s.start_time, s.end_time
     FROM bookings b
     JOIN class_sessions s ON s.id = b.session_id
     JOIN class_types ct ON ct.id = s.class_type_id
     JOIN gyms g ON g.id = ct.gym_id
     WHERE b.user_id = $1
     ORDER BY s.start_time`,
    [req.user!.id]
  );
  res.json({ bookings: result.rows });
});

export default router;