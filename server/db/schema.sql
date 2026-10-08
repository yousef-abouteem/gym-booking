-- يحذف الجداول القديمة حتى نقدر نعيد تشغيل الملف أثناء التطوير
DROP TABLE IF EXISTS bookings, class_sessions, class_types, gyms, users;

CREATE TABLE users (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'member'
                CHECK (role IN ('member', 'gym_owner')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE gyms (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  owner_id    BIGINT NOT NULL REFERENCES users(id),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  city        TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE class_types (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  gym_id           BIGINT NOT NULL REFERENCES gyms(id),
  name             TEXT NOT NULL,
  description      TEXT,
  default_capacity INT NOT NULL CHECK (default_capacity > 0),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE class_sessions (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  class_type_id BIGINT NOT NULL REFERENCES class_types(id),
  trainer_name  TEXT,
  start_time    TIMESTAMPTZ NOT NULL,
  end_time      TIMESTAMPTZ NOT NULL,
  capacity      INT NOT NULL CHECK (capacity > 0),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);

CREATE TABLE bookings (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id),
  session_id BIGINT NOT NULL REFERENCES class_sessions(id),
  status     TEXT NOT NULL DEFAULT 'confirmed'
             CHECK (status IN ('confirmed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- العضو لا يحجز نفس الحصة مرتين (الحجوزات الملغاة لا تُحسب)
CREATE UNIQUE INDEX bookings_one_active_per_user
  ON bookings (user_id, session_id)
  WHERE status = 'confirmed';

-- لتسريع عرض الجدول وعدّ المقاعد المحجوزة
CREATE INDEX class_sessions_start_time_idx ON class_sessions (start_time);
CREATE INDEX bookings_session_idx ON bookings (session_id) WHERE status = 'confirmed';