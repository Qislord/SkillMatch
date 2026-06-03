const path = require("path");
const { createHmac } = require("crypto");
const {
  getUserById,
  appendPortfolioImages,
  removePortfolioImage,
  createMentorSession,
  getMentorSessions,
  deleteMentorSession,
} = require("../services/authService");

const ZOOM_API_BASE = "https://api.zoom.us/v2";
const ZOOM_API_USER =
  process.env.ZOOM_API_USER_ID || process.env.ZOOM_ID || "me";
const ZOOM_API_KEY = process.env.ZOOM_API_KEY || process.env.ZOOM_ORGANIZED_KEY;
const ZOOM_API_SECRET = process.env.ZOOM_API_SECRET;
const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID;
const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET;
const ZOOM_ACCOUNT_ID = process.env.ZOOM_ACCOUNT_ID;
const ZOOM_STATIC_TOKEN =
  process.env.ZOOM_API_TOKEN || process.env.ZOOM_BEARER_TOKEN;

let cachedZoomToken = null;
let cachedZoomTokenExpiresAt = 0;

function base64UrlEncode(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=+$/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function createZoomJwt(apiKey, apiSecret) {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64UrlEncode(
    JSON.stringify({ iss: apiKey, exp: now + 60 * 60 }),
  );
  const signature = base64UrlEncode(
    createHmac("sha256", apiSecret)
      .update(`${header}.${payload}`)
      .digest("base64"),
  );
  return `${header}.${payload}.${signature}`;
}

async function requestZoomOAuthToken() {
  if (!ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET) {
    throw new Error(
      "Для запроса Zoom токена нужны ZOOM_CLIENT_ID и ZOOM_CLIENT_SECRET",
    );
  }

  const params = new URLSearchParams();
  if (ZOOM_ACCOUNT_ID) {
    params.set("grant_type", "account_credentials");
    params.set("account_id", ZOOM_ACCOUNT_ID);
  } else {
    params.set("grant_type", "client_credentials");
  }

  const response = await fetch(
    `https://zoom.us/oauth/token?${params.toString()}`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`,
        ).toString("base64")}`,
      },
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Не удалось получить Zoom токен: ${response.status} ${body}`,
    );
  }

  const data = await response.json();
  if (!data.access_token || !data.expires_in) {
    throw new Error("Zoom OAuth ответ не содержит access_token");
  }

  cachedZoomToken = data.access_token;
  cachedZoomTokenExpiresAt = Date.now() + (data.expires_in - 30) * 1000;
  return cachedZoomToken;
}

async function getZoomAccessToken() {
  if (cachedZoomToken && Date.now() < cachedZoomTokenExpiresAt) {
    return cachedZoomToken;
  }

  if (ZOOM_STATIC_TOKEN) {
    return ZOOM_STATIC_TOKEN;
  }

  if (ZOOM_API_KEY && ZOOM_API_SECRET) {
    cachedZoomToken = createZoomJwt(ZOOM_API_KEY, ZOOM_API_SECRET);
    cachedZoomTokenExpiresAt = Date.now() + 55 * 60 * 1000;
    return cachedZoomToken;
  }

  if (ZOOM_CLIENT_ID && ZOOM_CLIENT_SECRET) {
    return await requestZoomOAuthToken();
  }

  throw new Error(
    "Zoom токен не настроен. Укажите ZOOM_API_TOKEN/ZOOM_BEARER_TOKEN, либо ZOOM_API_KEY+ZOOM_API_SECRET, либо ZOOM_CLIENT_ID+ZOOM_CLIENT_SECRET.",
  );
}

async function ensureMentor(req, res) {
  if (!req.session.userId) {
    res.status(401).json({ message: "Пользователь не авторизован" });
    return null;
  }

  const user = await getUserById(req.session.userId);
  if (!user) {
    res.status(401).json({ message: "Пользователь не авторизован" });
    return null;
  }

  if (user.role !== "mentor") {
    res.status(403).json({ message: "Доступ запрещен: требуется роль ментор" });
    return null;
  }

  return user;
}

async function uploadPortfolio(req, res, next) {
  try {
    const user = await ensureMentor(req, res);
    if (!user) return;

    if (!req.files || req.files.length === 0) {
      return res
        .status(400)
        .json({ message: "Выберите хотя бы одно изображение" });
    }

    const allowedExtensions = new Set([
      ".jpg",
      ".jpeg",
      ".png",
      ".webp",
      ".gif",
      ".avif",
    ]);

    const mimeByExtension = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
      ".gif": "image/gif",
      ".avif": "image/avif",
    };

    const images = [];
    for (const file of req.files) {
      const extension = path.extname(file.originalname || "").toLowerCase();
      const hasImageMimeType = file.mimetype?.startsWith("image/");
      const hasAllowedExtension = allowedExtensions.has(extension);

      if (!hasImageMimeType && !hasAllowedExtension) {
        return res
          .status(400)
          .json({ message: "Можно загружать только изображения" });
      }

      const mimeType = hasImageMimeType
        ? file.mimetype
        : mimeByExtension[extension];
      images.push({ mimeType, base64: file.buffer.toString("base64") });
    }

    const updated = await appendPortfolioImages(user.id, images);
    if (!updated) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    return res
      .status(200)
      .json({ message: "Портфолио обновлено", user: updated });
  } catch (error) {
    return next(error);
  }
}

async function createZoomMeeting(start, end, mentorName) {
  const token = await getZoomAccessToken();
  const durationMinutes = Math.max(1, Math.round((end - start) / 60000));

  const response = await fetch(
    `${ZOOM_API_BASE}/users/${encodeURIComponent(ZOOM_API_USER)}/meetings`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        topic: `Сессия с ${mentorName}`,
        type: 2,
        start_time: start.toISOString(),
        duration: durationMinutes,
        timezone: "UTC",
        settings: {
          join_before_host: true,
          waiting_room: false,
          approval_type: 0,
          meeting_authentication: false,
        },
      }),
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Не удалось создать Zoom встречу: ${response.status} ${errorBody}`,
    );
  }

  const data = await response.json();
  return data.join_url || data.start_url || null;
}

async function removePortfolio(req, res, next) {
  try {
    const user = await ensureMentor(req, res);
    if (!user) return;

    const id = req.params.id;
    if (!id || typeof id !== "string") {
      return res.status(400).json({ message: "Неверный id" });
    }

    const updated = await removePortfolioImage(user.id, id);
    if (!updated) return res.status(404).json({ message: "Элемент не найден" });

    return res
      .status(200)
      .json({ message: "Изображение удалено", user: updated });
  } catch (error) {
    return next(error);
  }
}

async function createSession(req, res, next) {
  try {
    const user = await ensureMentor(req, res);
    if (!user) return;

    const { startsAt, endsAt } = req.body;
    if (!startsAt || !endsAt) {
      return res.status(400).json({ message: "Укажите время начала и конца" });
    }

    const start = new Date(startsAt);
    const end = new Date(endsAt);
    const now = new Date();
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: "Неверный формат даты" });
    }

    if (start <= now) {
      return res
        .status(400)
        .json({ message: "Начало сессии должно быть в будущем" });
    }

    if (end <= start) {
      return res
        .status(400)
        .json({ message: "Конец должен быть позже начала" });
    }

    const meetingLink = await createZoomMeeting(start, end, user.name);

    const session = await createMentorSession(user.id, {
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
      meetingLink,
    });
    return res.status(201).json({ message: "Сессия создана", session });
  } catch (error) {
    return next(error);
  }
}

async function listSessions(req, res, next) {
  try {
    const user = await ensureMentor(req, res);
    if (!user) return;

    const sessions = await getMentorSessions(user.id);
    return res.status(200).json({ sessions });
  } catch (error) {
    return next(error);
  }
}

async function deleteSession(req, res, next) {
  try {
    const user = await ensureMentor(req, res);
    if (!user) return;

    const sessionId = Number(req.params.id);
    if (Number.isNaN(sessionId)) {
      return res.status(400).json({ message: "Неверный id сессии" });
    }

    const ok = await deleteMentorSession(user.id, sessionId);
    if (!ok) {
      return res.status(404).json({ message: "Сессия не найдена" });
    }

    return res.status(200).json({ message: "Сессия удалена" });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  uploadPortfolio,
  removePortfolio,
  createSession,
  listSessions,
  deleteSession,
};
