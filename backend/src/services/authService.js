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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS mentor_reviews (
      id SERIAL PRIMARY KEY,
      mentor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE (mentor_id, user_id)
    );
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
            SET skills = $2,
                bio = $3,
                professions = COALESCE($4, professions),
                rate_per_hour = COALESCE($5, rate_per_hour)
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

async function cleanupExpiredMentorSessions(userId) {
  const now = new Date().toISOString();
  await ensureSessionBookingsTable();

  await pool.query(
    `DELETE FROM session_bookings
     WHERE session_id IN (
       SELECT id FROM mentor_sessions
       WHERE COALESCE(end_at, ends_at) < $1
         AND COALESCE(mentor_id, user_id) = $2
     );`,
    [now, userId],
  );

  await pool.query(
    `DELETE FROM mentor_sessions
     WHERE COALESCE(end_at, ends_at) < $1
       AND COALESCE(mentor_id, user_id) = $2;`,
    [now, userId],
  );
}

async function getMentorSessions(userId) {
  await cleanupExpiredMentorSessions(userId);

  const query = `
    SELECT id,
           COALESCE(mentor_id, user_id) AS mentor_id,
           COALESCE(start_at, starts_at) AS starts_at,
           COALESCE(end_at, ends_at) AS ends_at,
           created_at
    FROM mentor_sessions
    WHERE COALESCE(mentor_id, user_id) = $1
    ORDER BY starts_at;
  `;

  const result = await pool.query(query, [userId]);
  return result.rows;
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

async function getMentorsList({
  query,
  minRating = 0,
  currentUserSkills,
} = {}) {
  const searchWords =
    typeof query === "string" ? query.trim().split(/\s+/).filter(Boolean) : [];

  const whereClauses = ["u.role = 'mentor'"];
  const params = [];
  let paramIndex = 1;

  if (searchWords.length > 0) {
    const likeParams = searchWords.map((word) => `%${word}%`);
    params.push(...likeParams);
    const placeholders = likeParams.map(() => `$${paramIndex++}`);

    whereClauses.push(
      `(ARRAY_TO_STRING(u.professions, ' ') ILIKE ANY(ARRAY[${placeholders.join(",")}])
       OR ARRAY_TO_STRING(u.skills, ' ') ILIKE ANY(ARRAY[${placeholders.join(",")}])
       OR u.name ILIKE ANY(ARRAY[${placeholders.join(",")}]))`,
    );
  }

  const havingClause =
    minRating > 0
      ? `HAVING COALESCE(ROUND(AVG(mr.rating)::numeric, 0), 0) >= $${paramIndex}`
      : "";
  if (minRating > 0) {
    params.push(minRating);
    paramIndex++;
  }

  const useSkillMatching =
    Array.isArray(currentUserSkills) &&
    currentUserSkills.length > 0 &&
    searchWords.length === 0;

  if (useSkillMatching) {
    params.push(currentUserSkills);
  }

  const selectSkillMatch = useSkillMatching
    ? `, cardinality(ARRAY(SELECT DISTINCT s FROM unnest(u.skills) AS s WHERE s = ANY($${paramIndex}::text[]))) AS skill_match_count`
    : "";

  const orderBy = useSkillMatching
    ? "skill_match_count DESC, rating DESC, u.name"
    : "rating DESC, u.name";

  const querySql = `
    SELECT u.id,
           u.name,
           u.email,
           u.role,
           u.skills,
           u.professions,
           u.rate_per_hour,
           u.avatar_mime_type,
           u.avatar_base64,
           u.bio,
           COALESCE(ROUND(AVG(mr.rating)::numeric, 0), 0) AS rating,
           COUNT(mr.id) AS review_count
           ${selectSkillMatch}
    FROM users u
    LEFT JOIN mentor_reviews mr ON mr.mentor_id = u.id
    WHERE ${whereClauses.join(" AND ")}
    GROUP BY u.id
    ${havingClause}
    ORDER BY ${orderBy};
  `;

  const result = await pool.query(querySql, params);
  return result.rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    role: r.role,
    skills: r.skills || [],
    professions: r.professions || [],
    profession: (r.professions && r.professions[0]) || null,
    ratePerHour: r.rate_per_hour != null ? Number(r.rate_per_hour) : null,
    avatarMimeType: r.avatar_mime_type || null,
    avatarBase64: r.avatar_base64 || null,
    bio: r.bio || "",
    rating: r.rating != null ? Number(r.rating) : 0,
    reviewCount: Number(r.review_count),
  }));
}

async function ensureSessionBookingsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS session_bookings (
      id SERIAL PRIMARY KEY,
      session_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);
}

async function findMentorSessionById(sessionId) {
  const query = `
    SELECT
      id,
      COALESCE(mentor_id, user_id) AS mentor_id,
      COALESCE(start_at, starts_at) AS starts_at,
      COALESCE(end_at, ends_at) AS ends_at
    FROM mentor_sessions
    WHERE id = $1;
  `;

  const result = await pool.query(query, [sessionId]);
  return result.rows.length > 0 ? result.rows[0] : null;
}

async function createSessionBooking(sessionId, userId) {
  await ensureSessionBookingsTable();

  const session = await findMentorSessionById(sessionId);
  if (!session) {
    return { notFound: true };
  }

  const exists = await pool.query(
    `SELECT id FROM session_bookings WHERE session_id = $1`,
    [sessionId],
  );
  if (exists.rows.length > 0) return { already: true };

  const inserted = await pool.query(
    `INSERT INTO session_bookings (session_id, user_id) VALUES ($1, $2) RETURNING id, session_id, user_id, created_at`,
    [sessionId, userId],
  );
  return inserted.rows[0];
}

async function getBookedSessionIds(sessionIds) {
  if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
    return [];
  }

  const result = await pool.query(
    `SELECT DISTINCT session_id FROM session_bookings WHERE session_id = ANY($1::int[])`,
    [sessionIds],
  );

  return result.rows.map((row) => row.session_id);
}

async function deleteSessionBooking(sessionId, userId) {
  await ensureSessionBookingsTable();

  const result = await pool.query(
    `DELETE FROM session_bookings WHERE session_id = $1 AND user_id = $2 RETURNING id`,
    [sessionId, userId],
  );

  return result.rows.length > 0;
}

async function getBookedSessionIdsByUser(userId, sessionIds) {
  if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
    return [];
  }

  const result = await pool.query(
    `SELECT session_id FROM session_bookings WHERE user_id = $1 AND session_id = ANY($2::int[])`,
    [userId, sessionIds],
  );

  return result.rows.map((row) => row.session_id);
}

async function getBookingsByUser(userId) {
  await ensureSessionBookingsTable();

  const query = `
    SELECT sb.id AS booking_id,
           sb.created_at AS booked_at,
           ms.id AS session_id,
           mentor.id AS mentor_id,
           mentor.name AS mentor_name,
           mentor.email AS mentor_email,
           COALESCE(ms.start_at, ms.starts_at) AS starts_at,
           COALESCE(ms.end_at, ms.ends_at) AS ends_at
    FROM session_bookings sb
    JOIN mentor_sessions ms ON ms.id = sb.session_id
    JOIN users mentor ON mentor.id = COALESCE(ms.mentor_id, ms.user_id)
    WHERE sb.user_id = $1
    ORDER BY starts_at;
  `;

  const result = await pool.query(query, [userId]);
  return result.rows;
}

async function getBookingsForMentor(userId) {
  await ensureSessionBookingsTable();

  const query = `
    SELECT sb.id AS booking_id,
           sb.created_at AS booked_at,
           ms.id AS session_id,
           student.id AS student_id,
           student.name AS student_name,
           student.email AS student_email,
           COALESCE(ms.start_at, ms.starts_at) AS starts_at,
           COALESCE(ms.end_at, ms.ends_at) AS ends_at
    FROM session_bookings sb
    JOIN mentor_sessions ms ON ms.id = sb.session_id
    JOIN users student ON student.id = sb.user_id
    WHERE COALESCE(ms.mentor_id, ms.user_id) = $1
    ORDER BY starts_at;
  `;

  const result = await pool.query(query, [userId]);
  return result.rows;
}

async function ensureMentorReviewsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS mentor_reviews (
      id SERIAL PRIMARY KEY,
      mentor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE (mentor_id, user_id)
    );
  `);
}

async function createOrUpdateMentorReview(mentorId, userId, rating, comment) {
  await ensureMentorReviewsTable();

  const result = await pool.query(
    `INSERT INTO mentor_reviews (mentor_id, user_id, rating, comment)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (mentor_id, user_id)
     DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, updated_at = NOW()
     RETURNING id, mentor_id, user_id, rating, comment, created_at, updated_at;`,
    [mentorId, userId, rating, comment],
  );

  return result.rows[0];
}

async function getMentorReviews(mentorId) {
  await ensureMentorReviewsTable();

  const result = await pool.query(
    `SELECT mr.id,
            mr.rating,
            mr.comment,
            mr.created_at,
            mr.updated_at,
            u.id AS user_id,
            u.name AS user_name
         FROM mentor_reviews mr
         JOIN users u ON u.id = mr.user_id
         WHERE mr.mentor_id = $1
         ORDER BY mr.updated_at DESC;`,
    [mentorId],
  );

  return result.rows.map((row) => ({
    id: row.id,
    rating: Number(row.rating),
    comment: row.comment || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    userId: row.user_id,
    userName: row.user_name,
  }));
}

async function getMentorReviewByUser(mentorId, userId) {
  await ensureMentorReviewsTable();

  const result = await pool.query(
    `SELECT mr.id,
            mr.rating,
            mr.comment,
            mr.created_at,
            mr.updated_at
         FROM mentor_reviews mr
         WHERE mr.mentor_id = $1 AND mr.user_id = $2;`,
    [mentorId, userId],
  );

  return result.rows.length > 0
    ? {
        id: result.rows[0].id,
        rating: Number(result.rows[0].rating),
        comment: result.rows[0].comment || "",
        createdAt: result.rows[0].created_at,
        updatedAt: result.rows[0].updated_at,
      }
    : null;
}

async function deleteMentorReview(mentorId, userId) {
  await ensureMentorReviewsTable();

  const result = await pool.query(
    `DELETE FROM mentor_reviews WHERE mentor_id = $1 AND user_id = $2 RETURNING id;`,
    [mentorId, userId],
  );

  return result.rows.length > 0;
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
  deleteSessionBooking,
  getBookedSessionIds,
  getBookedSessionIdsByUser,
  createOrUpdateMentorReview,
  getMentorReviews,
  getMentorReviewByUser,
  deleteMentorReview,
  getBookingsByUser,
  getBookingsForMentor,
};
