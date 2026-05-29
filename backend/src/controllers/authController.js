const {
  getUserById,
  loginUser,
  registerUser,
  updateUserAvatar,
  updateUserProfile,
} = require("../services/authService");
const path = require("path");

function validateRegistrationPayload(payload) {
  const { name, email, password, role, skills } = payload;

  if (!name || !email || !password || !role) {
    return "Заполните все обязательные поля";
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return "Введите корректный email";
  }

  if (password.length < 8) {
    return "Пароль должен быть не менее 8 символов";
  }

  if (!["mentor", "student"].includes(role)) {
    return "Некорректная роль";
  }

  if (!Array.isArray(skills)) {
    return "Навыки должны быть массивом";
  }

  return null;
}

async function register(req, res, next) {
  try {
    const validationError = validateRegistrationPayload(req.body);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const user = await registerUser(req.body);
    req.session.userId = user.id;
    return res.status(201).json({ message: "Регистрация успешна", user });
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Введите email и пароль" });
    }

    const user = await loginUser({ email, password });
    req.session.userId = user.id;
    return res.status(200).json({ message: "Вход выполнен", user });
  } catch (error) {
    return next(error);
  }
}

async function me(req, res, next) {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Пользователь не авторизован" });
    }

    const user = await getUserById(req.session.userId);

    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ message: "Пользователь не авторизован" });
    }

    return res.status(200).json({ user });
  } catch (error) {
    return next(error);
  }
}

async function logout(req, res, next) {
  try {
    req.session.destroy((error) => {
      if (error) {
        return next(error);
      }

      res.clearCookie("connect.sid");
      return res.status(200).json({ message: "Выход выполнен" });
    });
  } catch (error) {
    return next(error);
  }
}

async function updateProfile(req, res, next) {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Пользователь не авторизован" });
    }

    const { skills, bio, professions, ratePerHour } = req.body;

    if (!Array.isArray(skills)) {
      return res.status(400).json({ message: "Навыки должны быть массивом" });
    }

    if (typeof bio !== "string") {
      return res.status(400).json({ message: "О себе должно быть строкой" });
    }

    if (bio.length > 1500) {
      return res
        .status(400)
        .json({ message: "Описание не должно превышать 1500 символов" });
    }

    const normalizedSkills = [
      ...new Set(skills.map((skill) => String(skill).trim())),
    ]
      .filter((skill) => skill.length > 0)
      .slice(0, 30);

    // Only allow professions and ratePerHour for mentors
    const currentUser = await getUserById(req.session.userId);
    const profs = Array.isArray(professions)
      ? professions
          .map((p) => String(p).trim())
          .filter(Boolean)
          .slice(0, 20)
      : undefined;
    const rate =
      typeof ratePerHour === "number" || typeof ratePerHour === "string"
        ? Number(ratePerHour)
        : undefined;

    const updatePayload = {
      skills: normalizedSkills,
      bio: bio.trim(),
    };

    if (currentUser && currentUser.role === "mentor") {
      updatePayload.professions = profs ?? currentUser.professions ?? [];
      updatePayload.ratePerHour = Number.isFinite(rate)
        ? rate
        : currentUser.ratePerHour;
    }

    const user = await updateUserProfile(req.session.userId, updatePayload);

    if (!user) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    return res.status(200).json({ message: "Профиль обновлен", user });
  } catch (error) {
    return next(error);
  }
}

async function uploadAvatar(req, res, next) {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Пользователь не авторизован" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Выберите изображение" });
    }

    const allowedExtensions = new Set([
      ".jpg",
      ".jpeg",
      ".png",
      ".webp",
      ".gif",
      ".avif",
    ]);
    const extension = path.extname(req.file.originalname || "").toLowerCase();
    const hasImageMimeType = req.file.mimetype?.startsWith("image/");
    const hasAllowedExtension = allowedExtensions.has(extension);

    if (!hasImageMimeType && !hasAllowedExtension) {
      return res
        .status(400)
        .json({ message: "Можно загружать только изображения" });
    }

    const mimeByExtension = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
      ".gif": "image/gif",
      ".avif": "image/avif",
    };
    const avatarMimeType = hasImageMimeType
      ? req.file.mimetype
      : mimeByExtension[extension];

    const user = await updateUserAvatar(req.session.userId, {
      avatarMimeType,
      avatarBase64: req.file.buffer.toString("base64"),
    });

    if (!user) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    return res.status(200).json({ message: "Аватар обновлен", user });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  register,
  login,
  me,
  logout,
  updateProfile,
  uploadAvatar,
};
