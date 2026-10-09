// يعيد بناء قاعدة البيانات ويملؤها ببيانات تجريبية واقعية
// ⚠️ يحذف كل البيانات الموجودة
import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import bcrypt from "bcryptjs";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// إسطنبول على UTC+3 طوال السنة، فنحسب الأوقات بتوقيتها
// حتى تبقى صحيحة مهما كان توقيت الخادم الذي يشغّل السكربت
const ISTANBUL_OFFSET = 3;

function at(daysFromToday: number, hour: number, minute = 0) {
  const now = new Date();
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + daysFromToday,
      hour - ISTANBUL_OFFSET,
      minute
    )
  );
}

async function insert(sql: string, params: unknown[]): Promise<string> {
  const result = await pool.query(sql, params);
  return result.rows[0].id;
}

async function main() {
  console.log("Resetting database...");
  const schema = readFileSync(join(__dirname, "../db/schema.sql"), "utf8");
  await pool.query(schema);

  // ── المستخدمون ──
  const hash = await bcrypt.hash("password123", 12);
  const user = (name: string, email: string, role: string) =>
    insert(
      "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id",
      [name, email, hash, role]
    );

  const yousef = await user("Yousef", "yousef@test.com", "member");
  const sara = await user("Sara", "sara@test.com", "member");
  const ahmed = await user("Ahmed", "owner@test.com", "gym_owner");
  const omar = await user("Omar", "owner2@test.com", "gym_owner");

  // ── النوادي ──
  const gym = (owner: string, name: string, slug: string, city: string, description: string) =>
    insert(
      "INSERT INTO gyms (owner_id, name, slug, city, description) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      [owner, name, slug, city, description]
    );

  const powerFit = await gym(ahmed, "Power Fit", "power-fit", "Istanbul",
    "CrossFit and strength training for every level.");
  const zen = await gym(ahmed, "Zen Studio", "zen-studio", "Istanbul",
    "Yoga and pilates in a calm, sunlit space.");
  const ironHouse = await gym(omar, "Iron House", "iron-house", "Istanbul",
    "Old-school barbell gym focused on real strength.");
  const boxing = await gym(omar, "Bosphorus Boxing Club", "bosphorus-boxing", "Istanbul",
    "Boxing classes from first punch to ring-ready.");

  // ── أنواع الحصص ──
  const classType = (gymId: string, name: string, description: string, capacity: number) =>
    insert(
      "INSERT INTO class_types (gym_id, name, description, default_capacity) VALUES ($1, $2, $3, $4) RETURNING id",
      [gymId, name, description, capacity]
    );

  // ترتيب الإنشاء مهم: CrossFit يجب أن يأخذ الرقم 1 لأن race-test.ts يعتمد عليه
  const crossfit = await classType(powerFit, "CrossFit", "High-intensity functional training", 15);
  const strength = await classType(powerFit, "Strength", "Squat, bench and deadlift technique", 10);
  const yoga = await classType(zen, "Yoga Flow", "Relaxing flow for all levels", 12);
  const pilates = await classType(zen, "Pilates", "Core-focused mat pilates", 8);
  const powerlifting = await classType(ironHouse, "Powerlifting", "Small-group heavy lifting", 4);
  const hiit = await classType(ironHouse, "HIIT", "30 minutes, all out", 20);
  const boxingBasics = await classType(boxing, "Boxing Basics", "Footwork, stance and combos", 10);
  const sparring = await classType(boxing, "Sparring", "Controlled sparring rounds", 2);

  // ── جدول أسبوعي ──
  type Slot = {
    type: string;
    trainer: string;
    hour: number;
    minute?: number;
    minutes: number;
    capacity: number;
    everyOtherDay?: boolean;
    bookOnFirstDay?: string[]; // أعضاء يحجزون هذه الحصة في أول يوم
  };

  const plan: Slot[] = [
    { type: crossfit, trainer: "Coach Ali", hour: 7, minutes: 60, capacity: 15, bookOnFirstDay: [yousef, sara] },
    { type: crossfit, trainer: "Coach Ali", hour: 18, minutes: 60, capacity: 15 },
    { type: strength, trainer: "Coach Mert", hour: 19, minute: 30, minutes: 75, capacity: 10, everyOtherDay: true },
    { type: yoga, trainer: "Elif", hour: 8, minutes: 60, capacity: 12, bookOnFirstDay: [sara] },
    { type: yoga, trainer: "Elif", hour: 19, minutes: 60, capacity: 12 },
    { type: pilates, trainer: "Deniz", hour: 12, minutes: 45, capacity: 8, everyOtherDay: true },
    { type: powerlifting, trainer: "Omar", hour: 17, minutes: 90, capacity: 4, bookOnFirstDay: [yousef, sara] },
    { type: hiit, trainer: "Can", hour: 18, minute: 30, minutes: 30, capacity: 20 },
    { type: boxingBasics, trainer: "Coach Burak", hour: 19, minutes: 60, capacity: 10 },
    { type: sparring, trainer: "Coach Burak", hour: 20, minute: 30, minutes: 45, capacity: 2, bookOnFirstDay: [yousef, sara] },
  ];

  let sessionCount = 0;
  let bookingCount = 0;

  for (let day = 1; day <= 7; day++) {
    for (const slot of plan) {
      if (slot.everyOtherDay && day % 2 === 0) continue;

      const start = at(day, slot.hour, slot.minute ?? 0);
      const end = new Date(start.getTime() + slot.minutes * 60_000);

      const sessionId = await insert(
        `INSERT INTO class_sessions (class_type_id, trainer_name, start_time, end_time, capacity)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [slot.type, slot.trainer, start, end, slot.capacity]
      );
      sessionCount++;

      if (day === 1 && slot.bookOnFirstDay) {
        for (const member of slot.bookOnFirstDay) {
          await pool.query("INSERT INTO bookings (user_id, session_id) VALUES ($1, $2)", [
            member,
            sessionId,
          ]);
          bookingCount++;
        }
      }
    }
  }

  console.log(`✓ 4 users, 4 gyms, 8 class types, ${sessionCount} sessions, ${bookingCount} bookings`);
  console.log("  Login with any of these (password: password123):");
  console.log("  yousef@test.com, sara@test.com (members)");
  console.log("  owner@test.com, owner2@test.com (gym owners)");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());