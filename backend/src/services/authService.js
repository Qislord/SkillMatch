const bcrypt = require("bcryptjs");
const pool = require("../db");
const { randomUUID } = require("crypto");

const SALT_ROUNDS = 10;

async function createUsersTableIfNotExists() {
  await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name VARCHAR(150) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role VARCHAR(20) NOT NULL CHECK (role IN ('mentor', 'student')),
            skills TEXT[] NOT NULL DEFAULT '{}',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    `);

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS bio TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS avatar_mime_type VARCHAR(100),
    ADD COLUMN IF NOT EXISTS avatar_base64 TEXT,
    ADD COLUMN IF NOT EXISTS professions TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS rate_per_hour NUMERIC,
    ADD COLUMN IF NOT EXISTS portfolio JSONB DEFAULT '[]'::jsonb;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS mentor_sessions (
      id SERIAL PRIMARY KEY,
      mentor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
      ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);
  await pool.query(`
    ALTER TABLE mentor_sessions
    ADD COLUMN IF NOT EXISTS mentor_id INTEGER,
    ADD COLUMN IF NOT EXISTS starts_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS ends_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  `);
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function sanitizeUser(userRow) {
  return {
    id: userRow.id,
    name: userRow.name,
    email: userRow.email,
    role: userRow.role,
    skills: userRow.skills ?? [],
    bio: userRow.bio ?? "",
    avatarMimeType: userRow.avatar_mime_type ?? null,
    avatarBase64: userRow.avatar_base64 ?? null,
    professions: userRow.professions ?? [],
    ratePerHour:
      userRow.rate_per_hour != null ? Number(userRow.rate_per_hour) : null,
    portfolio: userRow.portfolio ?? [],
    createdAt: userRow.created_at,
  };
}

async function registerUser({ name, email, password, role, skills }) {
  const normalizedEmail = normalizeEmail(email);

  const existingUser = await pool.query(
    "SELECT id FROM users WHERE email = $1",
    [normalizedEmail],
  );

  if (existingUser.rows.length > 0) {
    const error = new Error("Пользователь с таким email уже существует");
    error.statusCode = 409;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const result = await pool.query(
    `
            INSERT INTO users (name, email, password_hash, role, skills)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, name, email, role, skills, bio, avatar_mime_type, avatar_base64, professions, rate_per_hour, portfolio, created_at;
        `,
    [name.trim(), normalizedEmail, hashedPassword, role, skills],
  );

  return sanitizeUser(result.rows[0]);
}

async function loginUser({ email, password }) {
  const normalizedEmail = normalizeEmail(email);

  const result = await pool.query(
    `
            SELECT id, name, email, role, skills, bio, avatar_mime_type, avatar_base64, professions, rate_per_hour, portfolio, created_at, password_hash
            FROM users
            WHERE email = $1;
        `,
    [normalizedEmail],
  );

  if (result.rows.length === 0) {
    const error = new Error("Неверный email или пароль");
    error.statusCode = 401;
    throw error;
  }

  const user = result.rows[0];
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);

  if (!isPasswordValid) {
    const error = new Error("Неверный email или пароль");
    error.statusCode = 401;
    throw error;
  }

  return sanitizeUser(user);
}

async function getUserById(userId) {
  const result = await pool.query(
    `
            SELECT id, name, email, role, skills, bio, avatar_mime_type, avatar_base64, professions, rate_per_hour, portfolio, created_at
            FROM users
            WHERE id = $1;
        `,
    [userId],
  );

  if (result.rows.length === 0) {
    return null;
  }

  return sanitizeUser(result.rows[0]);
}

async function updateUserProfile(
  userId,
  { skills, bio, professions, ratePerHour },
) {
  const result = await pool.query(
    `
            UPDATE users
            SET skills = $2, bio = $3, professions = $4, rate_per_hour = $5
            WHERE id = $1
            RETURNING id, name, email, role, skills, bio, professions, rate_per_hour, portfolio, avatar_mime_type, avatar_base64, created_at;
        `,
    [userId, skills, bio, professions, ratePerHour],
  );

  if (result.rows.length === 0) {
    return null;
  }

  return sanitizeUser(result.rows[0]);
}

async function appendPortfolioImages(
  userId,
  images /* array of { mimeType, base64 } */,
) {
  const current = await pool.query(
    "SELECT portfolio FROM users WHERE id = $1",
    [userId],
  );
  if (current.rows.length === 0) return null;
  const existing = current.rows[0].portfolio || [];
  const imagesWithId = images.map((img) => ({
    id: randomUUID(),
    mimeType: img.mimeType,
    base64: img.base64,
    createdAt: new Date().toISOString(),
  }));
  const merged = existing.concat(imagesWithId);
  const result = await pool.query(
    `UPDATE users SET portfolio = $2 WHERE id = $1 RETURNING id, name, email, role, skills, bio, professions, rate_per_hour, portfolio, avatar_mime_type, avatar_base64, created_at;`,
    [userId, JSON.stringify(merged)],
  );

  return sanitizeUser(result.rows[0]);
}

async function removePortfolioImage(userId, imageId) {
  const current = await pool.query(
    "SELECT portfolio FROM users WHERE id = $1",
    [userId],
  );
  if (current.rows.length === 0) return null;
  const existing = current.rows[0].portfolio || [];
  const filtered = existing.filter((item) => item.id !== imageId);
  if (filtered.length === existing.length) return null;
  const result = await pool.query(
    `UPDATE users SET portfolio = $2 WHERE id = $1 RETURNING id, name, email, role, skills, bio, professions, rate_per_hour, portfolio, avatar_mime_type, avatar_base64, created_at;`,
    [userId, JSON.stringify(filtered)],
  );
  return sanitizeUser(result.rows[0]);
}

async function createMentorSession(userId, { startsAt, endsAt }) {
  const attempts = [
    {
      cols: ["mentor_id", "starts_at", "ends_at"],
      q: `INSERT INTO mentor_sessions (mentor_id, starts_at, ends_at) VALUES ($1, $2, $3) RETURNING id, mentor_id AS mentor_id, starts_at, ends_at, created_at;`,
    },
    {
      cols: ["mentor_id", "start_at", "end_at"],
      q: `INSERT INTO mentor_sessions (mentor_id, start_at, end_at) VALUES ($1, $2, $3) RETURNING id, mentor_id AS mentor_id, start_at AS starts_at, end_at AS ends_at, created_at;`,
    },
    {
      cols: ["user_id", "starts_at", "ends_at"],
      q: `INSERT INTO mentor_sessions (user_id, starts_at, ends_at) VALUES ($1, $2, $3) RETURNING id, user_id AS mentor_id, starts_at, ends_at, created_at;`,
    },
    {
      cols: ["user_id", "start_at", "end_at"],
      q: `INSERT INTO mentor_sessions (user_id, start_at, end_at) VALUES ($1, $2, $3) RETURNING id, user_id AS mentor_id, start_at AS starts_at, end_at AS ends_at, created_at;`,
    },
  ];

  for (const a of attempts) {
    try {
      const result = await pool.query(a.q, [userId, startsAt, endsAt]);
      return result.rows[0];
    } catch (err) {
      // try next
    }
  }

  throw new Error("Не удалось создать сессию — несовместимая схема БД");
}

async function getMentorSessions(userId) {
  const attempts = [
    // prefer start_at / end_at variants first (older schema)
    `SELECT id, mentor_id AS mentor_id, start_at AS starts_at, end_at AS ends_at, created_at FROM mentor_sessions WHERE mentor_id = $1 ORDER BY start_at;`,
    `SELECT id, mentor_id AS mentor_id, starts_at, ends_at, created_at FROM mentor_sessions WHERE mentor_id = $1 ORDER BY starts_at;`,
    `SELECT id, user_id AS mentor_id, start_at AS starts_at, end_at AS ends_at, created_at FROM mentor_sessions WHERE user_id = $1 ORDER BY start_at;`,
    `SELECT id, user_id AS mentor_id, starts_at, ends_at, created_at FROM mentor_sessions WHERE user_id = $1 ORDER BY starts_at;`,
  ];

  for (const q of attempts) {
    try {
      const result = await pool.query(q, [userId]);
      if (result.rows.length > 0) {
        return result.rows;
      }
      // otherwise try next query variant
    } catch (err) {
      console.debug(
        "[getMentorSessions] query failed, trying next. err=",
        err && err.message,
      );
      // try next
    }
  }

  return [];
}

async function deleteMentorSession(userId, sessionId) {
  const attempts = [
    `DELETE FROM mentor_sessions WHERE id = $2 AND mentor_id = $1 RETURNING id;`,
    `DELETE FROM mentor_sessions WHERE id = $2 AND user_id = $1 RETURNING id;`,
    `DELETE FROM mentor_sessions WHERE id = $2 AND mentor_id = $1 RETURNING id;`,
  ];

  for (const q of attempts) {
    try {
      const result = await pool.query(q, [userId, sessionId]);
      if (result.rows.length > 0) return true;
    } catch (err) {
      // try next
    }
  }

  return false;
}

async function getMentorsList() {
  const result = await pool.query(
    `SELECT id, name, email, role, professions, rate_per_hour, avatar_mime_type, avatar_base64, bio FROM users WHERE role = 'mentor' ORDER BY name;`,
  );
  return result.rows.map((r) => ({
    id: r.id,
    name: r.name,
    profession: (r.professions && r.professions[0]) || null,
    ratePerHour: r.rate_per_hour != null ? Number(r.rate_per_hour) : null,
    avatarMimeType: r.avatar_mime_type || null,
    avatarBase64: r.avatar_base64 || null,
    bio: r.bio || "",
  }));
}

async function createSessionBooking(sessionId, userId) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS session_bookings (
      id SERIAL PRIMARY KEY,
      session_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // prevent duplicate booking
  const exists = await pool.query(
    `SELECT id FROM session_bookings WHERE session_id = $1 AND user_id = $2`,
    [sessionId, userId],
  );
  if (exists.rows.length > 0) return { already: true };

  const inserted = await pool.query(
    `INSERT INTO session_bookings (session_id, user_id) VALUES ($1, $2) RETURNING id, session_id, user_id, created_at`,
    [sessionId, userId],
  );
  return inserted.rows[0];
}

async function updateUserAvatar(userId, { avatarMimeType, avatarBase64 }) {
  const result = await pool.query(
    `
            UPDATE users
            SET avatar_mime_type = $2, avatar_base64 = $3
            WHERE id = $1
            RETURNING id, name, email, role, skills, bio, avatar_mime_type, avatar_base64, created_at;
        `,
    [userId, avatarMimeType, avatarBase64],
  );

  if (result.rows.length === 0) {
    return null;
  }

  return sanitizeUser(result.rows[0]);
}

module.exports = {
  createUsersTableIfNotExists,
  registerUser,
  loginUser,
  getUserById,
  updateUserProfile,
  updateUserAvatar,
  appendPortfolioImages,
  removePortfolioImage,
  createMentorSession,
  getMentorSessions,
  deleteMentorSession,
  getMentorsList,
  createSessionBooking,
};
