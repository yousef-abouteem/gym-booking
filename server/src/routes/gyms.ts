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


export default router;