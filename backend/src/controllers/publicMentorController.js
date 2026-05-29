const {
  getMentorsList,
  getUserById,
  getMentorSessions,
  createSessionBooking,
} = require("../services/authService");

async function listPublicMentors(req, res, next) {
  try {
    const mentors = await getMentorsList();
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
    return res.status(200).json({ mentor: user, sessions });
  } catch (err) {
    return next(err);
  }
}

async function bookSession(req, res, next) {
  try {
    if (!req.session.userId)
      return res.status(401).json({ message: "Пользователь не авторизован" });
    const sessionId = Number(req.params.id);
    if (Number.isNaN(sessionId))
      return res.status(400).json({ message: "Неверный id сессии" });
    const booking = await createSessionBooking(sessionId, req.session.userId);
    if (booking.already)
      return res.status(409).json({ message: "Вы уже записаны на эту сессию" });
    return res.status(201).json({ message: "Запись выполнена", booking });
  } catch (err) {
    return next(err);
  }
}

module.exports = { listPublicMentors, getPublicMentor, bookSession };
