const {
  getMentorsList,
  getUserById,
  getMentorSessions,
  createSessionBooking,
  getBookedSessionIds,
  getBookedSessionIdsByUser,
  createOrUpdateMentorReview,
  getMentorReviews,
  deleteMentorReview,
} = require("../services/authService");

async function listPublicMentors(req, res, next) {
  try {
    const currentUser = req.session.userId
      ? await getUserById(req.session.userId)
      : null;

    const mentors = await getMentorsList({
      query: typeof req.query.q === "string" ? req.query.q : "",
      minRating: Number(req.query.minRating) || 0,
      currentUserSkills: currentUser?.skills ?? [],
    });
    return res.status(200).json({ mentors });
  } catch (err) {
    return next(err);
  }
}

async function getPublicMentor(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id))
      return res.status(400).json({ message: "Неверный id" });
    const user = await getUserById(id);
    if (!user || user.role !== "mentor")
      return res.status(404).json({ message: "Ментор не найден" });

    const sessions = await getMentorSessions(id);
    const sessionIds = sessions.map((session) => session.id);
    const bookedSessionIds = await getBookedSessionIds(sessionIds);
    let currentUserBookedIds = [];

    if (req.session.userId) {
      const currentUser = await getUserById(req.session.userId);
      if (currentUser && currentUser.role === "student") {
        currentUserBookedIds = await getBookedSessionIdsByUser(
          currentUser.id,
          sessionIds,
        );
      }
    }

    const availableSessions = sessions.filter(
      (session) => !bookedSessionIds.includes(session.id),
    );

    const reviews = await getMentorReviews(id);
    const averageRating = reviews.length
      ? Math.round(
          reviews.reduce((sum, item) => sum + item.rating, 0) / reviews.length,
        )
      : 0;
    const reviewCount = reviews.length;

    const sessionsWithStatus = availableSessions.map((session) => ({
      ...session,
      bookedByCurrentUser: currentUserBookedIds.includes(session.id),
    }));

    const mentor = {
      ...user,
      rating: averageRating,
      reviewCount,
    };

    return res
      .status(200)
      .json({ mentor, sessions: sessionsWithStatus, reviews });
  } catch (err) {
    return next(err);
  }
}

async function bookSession(req, res, next) {
  try {
    if (!req.session.userId)
      return res.status(401).json({ message: "Пользователь не авторизован" });

    const currentUser = await getUserById(req.session.userId);
    if (!currentUser)
      return res.status(401).json({ message: "Пользователь не авторизован" });

    if (currentUser.role === "mentor") {
      return res
        .status(403)
        .json({ message: "Менторы не могут записываться на сессии" });
    }

    const sessionId = Number(req.params.id);
    if (Number.isNaN(sessionId))
      return res.status(400).json({ message: "Неверный id сессии" });

    const booking = await createSessionBooking(sessionId, req.session.userId);
    if (booking.notFound)
      return res.status(404).json({ message: "Сессия не найдена" });
    if (booking.already)
      return res.status(409).json({ message: "Вы уже записаны на эту сессию" });
    return res.status(201).json({ message: "Запись выполнена", booking });
  } catch (err) {
    return next(err);
  }
}

async function leaveReview(req, res, next) {
  try {
    if (!req.session.userId)
      return res.status(401).json({ message: "Пользователь не авторизован" });

    const currentUser = await getUserById(req.session.userId);
    if (!currentUser)
      return res.status(401).json({ message: "Пользователь не авторизован" });

    if (currentUser.role === "mentor") {
      return res
        .status(403)
        .json({ message: "Менторы не могут оставлять отзывы" });
    }

    const mentorId = Number(req.params.id);
    if (Number.isNaN(mentorId))
      return res.status(400).json({ message: "Неверный id ментора" });

    const { rating, comment } = req.body;
    const parsedRating = Number(rating);
    if (
      !Number.isFinite(parsedRating) ||
      parsedRating < 1 ||
      parsedRating > 5
    ) {
      return res.status(400).json({ message: "Оценка должна быть от 1 до 5" });
    }

    const normalizedComment = typeof comment === "string" ? comment.trim() : "";

    const review = await createOrUpdateMentorReview(
      mentorId,
      currentUser.id,
      parsedRating,
      normalizedComment,
    );

    return res.status(201).json({ message: "Отзыв сохранён", review });
  } catch (err) {
    return next(err);
  }
}

async function deleteReview(req, res, next) {
  try {
    if (!req.session.userId)
      return res.status(401).json({ message: "Пользователь не авторизован" });

    const currentUser = await getUserById(req.session.userId);
    if (!currentUser)
      return res.status(401).json({ message: "Пользователь не авторизован" });

    if (currentUser.role === "mentor") {
      return res
        .status(403)
        .json({ message: "Менторы не могут удалять отзывы" });
    }

    const mentorId = Number(req.params.id);
    if (Number.isNaN(mentorId))
      return res.status(400).json({ message: "Неверный id ментора" });

    const deleted = await deleteMentorReview(mentorId, currentUser.id);
    if (!deleted) {
      return res.status(404).json({ message: "Отзыв не найден" });
    }
    return res.status(200).json({ message: "Отзыв удалён" });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listPublicMentors,
  getPublicMentor,
  bookSession,
  leaveReview,
  deleteReview,
};
