import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { pool } from "../db";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

const createGymSchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes"),
  city: z.string().trim().min(2).max(100),
  description: z.string().trim().max(1000).optional(),
});

// إنشاء نادٍ: لصاحب النادي فقط
router.post("/", requireAuth, requireRole("gym_owner"), async (req, res) => {
  const parsed = createGymSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  const { name, slug, city, description } = parsed.data;

  try {
    const result = await pool.query(
      `INSERT INTO gyms (owner_id, name, slug, city, description)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, slug, city, description, created_at`,
      [req.user!.id, name, slug, city, description ?? null]
    );
    res.status(201).json({ gym: result.rows[0] });
  } catch (err: any) {
    if (err.code === "23505") {
      res.status(409).json({ error: "Slug already taken" });
      return;
    }
    throw err;
  }
});

// قائمة النوادي: متاحة للجميع، ويمكن الفلترة بالمدينة
router.get("/", async (req, res) => {
  const city = typeof req.query.city === "string" ? req.query.city : null;
  const result = await pool.query(
    `SELECT id, name, slug, city, description
     FROM gyms
     WHERE ($1::text IS NULL OR city ILIKE $1)
     ORDER BY name`,
    [city]
  );
  res.json({ gyms: result.rows });
});

// نادٍ واحد عن طريق الـ slug
router.get("/:slug", async (req, res) => {
  const result = await pool.query(
    "SELECT id, name, slug, city, description FROM gyms WHERE slug = $1",
    [req.params.slug]
  );
  if (!result.rows[0]) {
    res.status(404).json({ error: "Gym not found" });
    return;
  }
  res.json({ gym: result.rows[0] });
});

// يتأكد أن المستخدم هو صاحب النادي الموجود في الرابط
async function requireGymOwner(req: Request, res: Response, next: NextFunction) {
  const result = await pool.query(
    "SELECT id, owner_id FROM gyms WHERE slug = $1",
    [req.params.slug]
  );
  const gym = result.rows[0];

  if (!gym) {
    res.status(404).json({ error: "Gym not found" });
    return;
  }
  if (gym.owner_id !== req.user!.id) {
    res.status(403).json({ error: "You do not own this gym" });
    return;
  }

  res.locals.gymId = gym.id;
  next();
}

const createClassTypeSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(1000).optional(),
  default_capacity: z.number().int().min(1).max(500),
});

// إنشاء نوع حصة: لصاحب هذا النادي فقط
router.post(
  "/:slug/class-types",
  requireAuth,
  requireRole("gym_owner"),
  requireGymOwner,
  async (req, res) => {
    const parsed = createClassTypeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }

    const { name, description, default_capacity } = parsed.data;
    const result = await pool.query(
      `INSERT INTO class_types (gym_id, name, description, default_capacity)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, description, default_capacity`,
      [res.locals.gymId, name, description ?? null, default_capacity]
    );
    res.status(201).json({ classType: result.rows[0] });
  }
);

// أنواع الحصص لنادٍ معيّن: متاحة للجميع
router.get("/:slug/class-types", async (req, res) => {
  const result = await pool.query(
    `SELECT ct.id, ct.name, ct.description, ct.default_capacity
     FROM class_types ct
     JOIN gyms g ON g.id = ct.gym_id
     WHERE g.slug = $1
     ORDER BY ct.name`,
    [req.params.slug]
  );
  res.json({ classTypes: result.rows });
});

const createSessionSchema = z
  .object({
    class_type_id: z.coerce.string().regex(/^\d+$/),
    trainer_name: z.string().trim().max(100).optional(),
    start_time: z.string().datetime({ offset: true }),
    end_time: z.string().datetime({ offset: true }),
    capacity: z.number().int().min(1).max(500).optional(),
  })
  .refine((d) => new Date(d.end_time) > new Date(d.start_time), {
    message: "end_time must be after start_time",
    path: ["end_time"],
  })
  .refine((d) => new Date(d.start_time) > new Date(), {
    message: "start_time must be in the future",
    path: ["start_time"],
  });

// إنشاء موعد حصة: لصاحب هذا النادي فقط
router.post(
  "/:slug/sessions",
  requireAuth,
  requireRole("gym_owner"),
  requireGymOwner,
  async (req, res) => {
    const parsed = createSessionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }

    const { class_type_id, trainer_name, start_time, end_time, capacity } = parsed.data;

    // التحقق الثاني: نوع الحصة يجب أن يتبع هذا النادي تحديدًا
    const typeResult = await pool.query(
      "SELECT default_capacity FROM class_types WHERE id = $1 AND gym_id = $2",
      [class_type_id, res.locals.gymId]
    );
    if (!typeResult.rows[0]) {
      res.status(404).json({ error: "Class type not found in this gym" });
      return;
    }

    const result = await pool.query(
      `INSERT INTO class_sessions (class_type_id, trainer_name, start_time, end_time, capacity)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, class_type_id, trainer_name, start_time, end_time, capacity`,
      [
        class_type_id,
        trainer_name ?? null,
        start_time,
        end_time,
        capacity ?? typeResult.rows[0].default_capacity,
      ]
    );
    res.status(201).json({ session: result.rows[0] });
  }
);

// الحصص القادمة لنادٍ معيّن مع عدد المقاعد المتبقية: متاحة للجميع
router.get("/:slug/sessions", async (req, res) => {
  const result = await pool.query(
    `SELECT s.id, ct.name AS class_name, s.trainer_name,
            s.start_time, s.end_time, s.capacity,
            (s.capacity - COUNT(b.id))::int AS spots_left
     FROM class_sessions s
     JOIN class_types ct ON ct.id = s.class_type_id
     JOIN gyms g ON g.id = ct.gym_id
     LEFT JOIN bookings b ON b.session_id = s.id AND b.status = 'confirmed'
     WHERE g.slug = $1 AND s.start_time > now()
     GROUP BY s.id, ct.name
     ORDER BY s.start_time`,
    [req.params.slug]
  );
  res.json({ sessions: result.rows });
});


// قائمة المحجوزين في حصة: لصاحب هذا النادي فقط
router.get(
  "/:slug/sessions/:id/bookings",
  requireAuth,
  requireRole("gym_owner"),
  requireGymOwner,
  async (req, res) => {
    const sessionId = req.params.id;
    if (typeof sessionId !== "string" || !/^\d+$/.test(sessionId)) {
      res.status(400).json({ error: "Invalid session id" });
      return;
    }

    // نتأكد أن الحصة تتبع هذا النادي، وإلا يقدر المالك يرى محجوزي نادٍ آخر
    const sessionCheck = await pool.query(
      `SELECT 1 FROM class_sessions s
       JOIN class_types ct ON ct.id = s.class_type_id
       WHERE s.id = $1 AND ct.gym_id = $2`,
      [sessionId, res.locals.gymId]
    );
    if (!sessionCheck.rows[0]) {
      res.status(404).json({ error: "Session not found in this gym" });
      return;
    }

    const result = await pool.query(
      `SELECT b.id, u.name, u.email, b.created_at
       FROM bookings b
       JOIN users u ON u.id = b.user_id
       WHERE b.session_id = $1 AND b.status = 'confirmed'
       ORDER BY b.created_at`,
      [sessionId]
    );
    res.json({ attendees: result.rows });
  }
);


export default router;