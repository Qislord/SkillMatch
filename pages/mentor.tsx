import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../components/header";
import Button from "../components/button";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5050";

function MentorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [mentor, setMentor] = useState<any | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [ownReview, setOwnReview] = useState<any | null>(null);
  const [ratingScore, setRatingScore] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isDeletingReview, setIsDeletingReview] = useState(false);
  const [loadingSessionId, setLoadingSessionId] = useState<number | null>(null);
  const [pendingBookingSession, setPendingBookingSession] = useState<
    any | null
  >(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadMentor = async () => {
    if (!id) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/mentor/${id}`, {
        method: "GET",
        credentials: "include",
      });
      if (!res.ok) {
        navigate("/");
        return;
      }
      const data = await res.json();
      setMentor(data.mentor);
      setSessions(data.sessions || []);
      setReviews(data.reviews || []);
    } catch (e) {
      navigate("/");
    }
  };

  const loadCurrentUser = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
        method: "GET",
        credentials: "include",
      });
      if (!res.ok) {
        setCurrentUser(null);
        return;
      }
      const data = await res.json();
      setCurrentUser(data.user);
    } catch {
      setCurrentUser(null);
    }
  };

  useEffect(() => {
    void loadMentor();
  }, [id]);

  useEffect(() => {
    void loadCurrentUser();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const review =
      reviews.find((review) => review.userId === currentUser.id) ?? null;
    setOwnReview(review);

    if (review) {
      setRatingScore(review.rating);
      setReviewComment(review.comment || "");
    } else {
      setRatingScore(5);
      setReviewComment("");
    }
  }, [currentUser, reviews]);

  const submitReview = async () => {
    setError("");
    setSuccess("");
    setIsSubmittingReview(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/mentor/${id}/review`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rating: ratingScore, comment: reviewComment }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Не удалось отправить отзыв");
        return;
      }
      setSuccess("Отзыв сохранён");
      await loadMentor();
    } catch {
      setError("Не удалось подключиться к серверу");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const deleteReview = async () => {
    if (!ownReview) return;
    setError("");
    setSuccess("");
    setIsDeletingReview(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/mentor/${id}/review`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Не удалось удалить отзыв");
        return;
      }
      setSuccess("Отзыв удалён");
      setOwnReview(null);
      setRatingScore(5);
      setReviewComment("");
      await loadMentor();
    } catch {
      setError("Не удалось подключиться к серверу");
    } finally {
      setIsDeletingReview(false);
    }
  };

  const openBookingConfirm = (session: any) => {
    setError("");
    setSuccess("");
    setPendingBookingSession(session);
    setIsBookingModalOpen(true);
  };

  const confirmBooking = async () => {
    if (!pendingBookingSession) return;
    const sessionId = pendingBookingSession.id;
    setError("");
    setSuccess("");
    setLoadingSessionId(sessionId);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/mentor/sessions/${sessionId}/book`,
        {
          method: "POST",
          credentials: "include",
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Не удалось записаться");
        return;
      }
      setSuccess("Успешно записаны");
      setIsBookingModalOpen(false);
      setPendingBookingSession(null);
      await loadMentor();
    } catch (e) {
      setError("Не удалось подключиться к серверу");
    } finally {
      setLoadingSessionId(null);
    }
  };

  const closeBookingModal = () => {
    setPendingBookingSession(null);
    setIsBookingModalOpen(false);
  };

  const cancelBooking = async (sessionId: number) => {
    setError("");
    setSuccess("");
    setLoadingSessionId(sessionId);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/auth/bookings/${sessionId}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Не удалось отменить запись");
        return;
      }
      setSuccess("Запись отменена");
      await loadMentor();
    } catch (e) {
      setError("Не удалось подключиться к серверу");
    } finally {
      setLoadingSessionId(null);
    }
  };

  if (!mentor)
    return (
      <>
        <Header />
        <div className="p-6">Загрузка...</div>
      </>
    );

  const avatarSrc = mentor.avatarBase64
    ? `data:${mentor.avatarMimeType};base64,${mentor.avatarBase64}`
    : "./images/img3.avif";

  return (
    <>
      <Header />
      <div className="w-full flex justify-center px-4 py-8">
        <div className="w-full max-w-3xl rounded-3xl border border-gray-300 p-6">
          <div className="flex gap-6">
            <div className="w-32 h-32 rounded-full overflow-hidden">
              <img
                src={avatarSrc}
                alt={mentor.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1">
              <div className="text-2xl font-bold">{mentor.name}</div>
              <div className="text-sm text-gray-600">
                {mentor.professions?.[0] || "Профессия не указана"}
              </div>
              {mentor.professions?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {mentor.professions.map(
                    (profession: string, index: number) => (
                      <span
                        key={`${profession}-${index}`}
                        className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs text-blue-700"
                      >
                        {profession}
                      </span>
                    ),
                  )}
                </div>
              )}
              <div className="mt-3">{mentor.bio}</div>
              <div className="mt-4 font-semibold text-lg">
                Цена: {mentor.ratePerHour ?? 0} руб/час
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="font-semibold mb-2">Портфолио</h3>
            <div className="grid grid-cols-3 gap-2">
              {(mentor.portfolio || []).map((it: any) => (
                <div key={it.id} className="border rounded overflow-hidden">
                  <img
                    src={`data:${it.mimeType};base64,${it.base64}`}
                    className="w-full h-36 object-cover"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <h3 className="font-semibold mb-2">Доступные сессии</h3>
            {sessions.length === 0 ? (
              <div className="text-sm text-gray-500">Сессий нет</div>
            ) : (
              <ul className="space-y-2">
                {sessions.map((s: any) => (
                  <li
                    key={s.id}
                    className="flex flex-col gap-2 border p-3 rounded bg-white"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        {new Date(s.starts_at).toLocaleString()} —{" "}
                        {new Date(s.ends_at).toLocaleString()}
                      </div>
                      <div className="flex items-center gap-2">
                        {s.bookedByCurrentUser ? (
                          <span className="rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700">
                            Вы записаны
                          </span>
                        ) : null}
                        <Button
                          height={32}
                          text={
                            s.bookedByCurrentUser
                              ? loadingSessionId === s.id
                                ? "Отмена..."
                                : "Отменить"
                              : loadingSessionId === s.id
                                ? "Загрузка..."
                                : "Записаться"
                          }
                          onClick={() =>
                            s.bookedByCurrentUser
                              ? cancelBooking(s.id)
                              : openBookingConfirm(s)
                          }
                        />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-6 border-t pt-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold mb-2">Отзывы</h3>
                <div className="text-sm text-gray-600">
                  Средний рейтинг:{" "}
                  <span className="font-semibold text-blue-700">
                    {mentor.rating ?? 0}
                  </span>
                  {mentor.reviewCount != null
                    ? ` · ${mentor.reviewCount} отзывов`
                    : ""}
                </div>
              </div>
            </div>

            {currentUser &&
            currentUser.role === "student" &&
            currentUser.id !== mentor.id ? (
              <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="mb-3 text-sm font-medium">Оставить отзыв</div>
                {ownReview && (
                  <div className="mb-3 rounded-xl border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-900">
                    Вы уже оставили отзыв. Чтобы написать новый, удалите
                    текущий.
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm mb-3">
                  {Array.from({ length: 5 }, (_, index) => index + 1).map(
                    (score) => (
                      <button
                        key={score}
                        type="button"
                        disabled={Boolean(ownReview)}
                        className={`rounded-full px-3 py-1 border ${
                          ratingScore >= score
                            ? "border-blue-500 bg-blue-500 text-white"
                            : "border-gray-300 bg-white text-gray-700"
                        } ${ownReview ? "cursor-not-allowed opacity-60" : ""}`}
                        onClick={() => !ownReview && setRatingScore(score)}
                      >
                        {score}★
                      </button>
                    ),
                  )}
                </div>
                <textarea
                  className="input-form w-full min-h-25 resize-none"
                  placeholder="Ваш отзыв..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  disabled={Boolean(ownReview)}
                />
                <div className="mt-3 flex flex-wrap gap-2 justify-end">
                  <Button
                    height={36}
                    text={
                      ownReview
                        ? "Отзыв сохранён"
                        : isSubmittingReview
                          ? "Сохранение..."
                          : "Сохранить отзыв"
                    }
                    onClick={submitReview}
                    disabled={Boolean(ownReview) || isSubmittingReview}
                  />
                  {ownReview && (
                    <Button
                      height={36}
                      text={isDeletingReview ? "Удаление..." : "Удалить отзыв"}
                      onClick={deleteReview}
                      disabled={isDeletingReview}
                    />
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-4 text-sm text-gray-500">
                Войдите как обучающийся, чтобы оставить отзыв.
              </div>
            )}

            <div className="mt-5 space-y-4">
              {reviews.length === 0 ? (
                <div className="text-sm text-gray-500">Пока нет отзывов</div>
              ) : (
                reviews.map((review) => (
                  <div
                    key={review.id}
                    className="rounded-2xl border border-gray-200 bg-white p-4"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="font-semibold text-gray-900">
                        {review.userName}
                      </div>
                      <div className="text-sm text-yellow-600">
                        {Array.from({ length: review.rating }).map((_, i) => (
                          <span key={i}>★</span>
                        ))}
                        {Array.from({ length: 5 - review.rating }).map(
                          (_, i) => (
                            <span key={i} className="text-gray-300">
                              ★
                            </span>
                          ),
                        )}
                      </div>
                    </div>
                    {review.comment ? (
                      <div className="text-sm text-gray-700">
                        {review.comment}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">
                        Без комментария
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {error && <div className="mt-3 text-sm text-red-500">{error}</div>}
          {success && (
            <div className="mt-3 text-sm text-green-600">{success}</div>
          )}
        </div>
      </div>

      {isBookingModalOpen && pendingBookingSession ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-semibold mb-3">Подтвердите запись</h2>
            <div className="text-sm text-gray-700 mb-4">
              Вы хотите записаться на сессию{" "}
              {new Date(pendingBookingSession.starts_at).toLocaleString()} –{" "}
              {new Date(pendingBookingSession.ends_at).toLocaleString()}?
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button height={40} text="Отмена" onClick={closeBookingModal} />
              <Button
                height={40}
                text={
                  loadingSessionId === pendingBookingSession.id
                    ? "Запись..."
                    : "Подтвердить"
                }
                onClick={confirmBooking}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default MentorPage;
