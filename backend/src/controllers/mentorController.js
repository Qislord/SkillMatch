const path = require("path");
const {
  getUserById,
  appendPortfolioImages,
  removePortfolioImage,
  createMentorSession,
  getMentorSessions,
  deleteMentorSession,
} = require("../services/authService");

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

    const session = await createMentorSession(user.id, {
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
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
