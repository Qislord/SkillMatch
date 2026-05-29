import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IoClose } from "react-icons/io5";
import Header from "../components/header";
import Button from "../components/button";
import { formatSessionRange } from "../utils/formatDateRange";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5050";

type UserProfile = {
  id: number;
  name: string;
  email: string;
  role: string;
  skills: string[];
  bio: string;
  avatarMimeType: string | null;
  avatarBase64: string | null;
  professions?: string[];
  ratePerHour?: number | null;
  experience?: number | null;
  portfolio?: Array<{
    id: string;
    mimeType: string;
    base64: string;
    createdAt?: string;
  }>;
};

function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [bio, setBio] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [profession, setProfession] = useState<string>("");
  const [ratePerHour, setRatePerHour] = useState<string>("");
  const [experience, setExperience] = useState<string>("");
  const [portfolioFiles, setPortfolioFiles] = useState<File[]>([]);
  const [isUploadingPortfolio, setIsUploadingPortfolio] = useState(false);
  const [portfolioPreview, setPortfolioPreview] = useState<
    Array<{ id?: string; mimeType: string; base64: string; createdAt?: string }>
  >([]);
  const [sessions, setSessions] = useState<Array<any>>([]);
  const [sessionStart, setSessionStart] = useState<string>("");
  const [sessionEnd, setSessionEnd] = useState<string>("");
  const [bookings, setBookings] = useState<Array<any>>([]);
  const [pendingCancelBooking, setPendingCancelBooking] = useState<any | null>(
    null,
  );
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCancellingBooking, setIsCancellingBooking] = useState(false);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);

  const avatarSrc = useMemo(() => {
    if (!profile?.avatarMimeType || !profile.avatarBase64) {
      return "";
    }

    return `data:${profile.avatarMimeType};base64,${profile.avatarBase64}`;
  }, [profile]);

  const localizedRole = useMemo(() => {
    if (profile?.role === "mentor") {
      return "Ментор";
    }

    if (profile?.role === "student") {
      return "Обучающийся";
    }

    return profile?.role ?? "";
  }, [profile?.role]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) {
          navigate("/login");
          return;
        }

        const data = await response.json();
        const user = data.user as UserProfile;

        setProfile(user);
        setSkills(user.skills ?? []);
        setBio(user.bio ?? "");
        setProfession(user.professions?.[0] ?? "");
        setRatePerHour(
          user.ratePerHour != null ? String(user.ratePerHour) : "",
        );
        setExperience(user.experience != null ? String(user.experience) : "");
        setPortfolioPreview(user.portfolio ?? []);
      } catch {
        navigate("/login");
      }
    };

    void loadProfile();
  }, [navigate]);

  useEffect(() => {
    if (!profile) return;
    void fetchBookings();
  }, [profile]);

  const addSkill = () => {
    const normalized = skillInput.trim();

    if (!normalized) {
      return;
    }

    setSkills((prevSkills) => {
      if (prevSkills.includes(normalized)) {
        return prevSkills;
      }

      return [...prevSkills, normalized];
    });

    setSkillInput("");
  };

  const removeSkill = (skillIndex: number) => {
    setSkills((prevSkills) =>
      prevSkills.filter((_, index) => index !== skillIndex),
    );
  };

  const saveProfile = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    try {
      setIsSavingProfile(true);

      const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          skills,
          bio,
          professions: profession ? [profession] : [],
          ratePerHour,
          experience,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.message ?? "Не удалось сохранить профиль");
        return;
      }

      setProfile(data.user);
      window.dispatchEvent(new Event("user-profile-updated"));
      setSuccessMessage("Профиль успешно обновлен");
    } catch {
      setErrorMessage("Не удалось подключиться к серверу");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // single profession string handled via `profession` state

  const onSelectPortfolioFiles = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).slice(0, 8);
    setPortfolioFiles(arr);
  };

  const uploadPortfolio = async () => {
    if (portfolioFiles.length === 0) {
      setErrorMessage("Выберите файлы для загрузки");
      return;
    }

    setIsUploadingPortfolio(true);
    setErrorMessage("");
    try {
      const form = new FormData();
      for (const f of portfolioFiles) {
        form.append("images", f);
      }

      const response = await fetch(`${API_BASE_URL}/api/mentor/portfolio`, {
        method: "POST",
        credentials: "include",
        body: form,
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.message ?? "Не удалось загрузить портфолио");
        return;
      }

      setProfile(data.user);
      setPortfolioPreview(data.user.portfolio ?? []);
      setPortfolioFiles([]);
      window.dispatchEvent(new Event("user-profile-updated"));
      setSuccessMessage("Портфолио обновлено");
    } catch (e) {
      setErrorMessage("Не удалось подключиться к серверу");
    } finally {
      setIsUploadingPortfolio(false);
    }
  };

  const removePortfolioItem = async (imageId: string) => {
    setErrorMessage("");
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/mentor/portfolio/${encodeURIComponent(imageId)}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.message ?? "Не удалось удалить изображение");
        return;
      }

      setProfile(data.user);
      setPortfolioPreview(data.user.portfolio ?? []);
      setSuccessMessage("Изображение удалено");
    } catch {
      setErrorMessage("Не удалось подключиться к серверу");
    }
  };

  const fetchSessions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/mentor/sessions`, {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) return;
      const data = await response.json();
      setSessions(data.sessions ?? []);
    } catch {
      // ignore
    }
  };

  const fetchBookings = async () => {
    setIsLoadingBookings(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/bookings`, {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) {
        setBookings([]);
        return;
      }
      const data = await response.json();
      setBookings(data.bookings || []);
    } catch {
      setBookings([]);
    } finally {
      setIsLoadingBookings(false);
    }
  };

  useEffect(() => {
    if (profile?.role === "mentor") {
      void fetchSessions();
    }
  }, [profile?.role]);

  const createSessionReq = async () => {
    setErrorMessage("");
    try {
      const startIso = new Date(sessionStart).toISOString();
      const endIso = new Date(sessionEnd).toISOString();
      const response = await fetch(`${API_BASE_URL}/api/mentor/sessions`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startsAt: startIso, endsAt: endIso }),
      });
      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.message ?? "Не удалось создать сессию");
        return;
      }
      await fetchSessions();
      await fetchBookings();
      setSessionStart("");
      setSessionEnd("");
      setSuccessMessage("Сессия создана");
    } catch {
      setErrorMessage("Не удалось подключиться к серверу");
    }
  };

  const deleteSessionReq = async (id: number) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/mentor/sessions/${id}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );
      if (!response.ok) return;
      await fetchSessions();
      setSuccessMessage("Сессия удалена");
    } catch {
      // ignore
    }
  };

  const openCancelConfirm = (booking: any) => {
    setErrorMessage("");
    setSuccessMessage("");
    setPendingCancelBooking(booking);
    setIsCancelModalOpen(true);
  };

  const closeCancelConfirm = () => {
    setPendingCancelBooking(null);
    setIsCancelModalOpen(false);
  };

  const cancelBooking = async (sessionId: number) => {
    setErrorMessage("");
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/bookings/${sessionId}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );
      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.message ?? "Не удалось отменить запись");
        return;
      }
      setSuccessMessage("Запись отменена");
      await fetchBookings();
    } catch {
      setErrorMessage("Не удалось подключиться к серверу");
    }
  };

  const confirmCancelBooking = async () => {
    if (!pendingCancelBooking) return;
    setIsCancellingBooking(true);
    try {
      await cancelBooking(pendingCancelBooking.session_id);
      setIsCancelModalOpen(false);
      setPendingCancelBooking(null);
    } finally {
      setIsCancellingBooking(false);
    }
  };

  const uploadAvatar = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!avatarFile) {
      setErrorMessage("Сначала выберите изображение");
      return;
    }

    const formData = new FormData();
    formData.append("avatar", avatarFile);

    try {
      setIsSavingAvatar(true);

      const response = await fetch(`${API_BASE_URL}/api/auth/avatar`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.message ?? "Не удалось загрузить аватар");
        return;
      }

      setProfile(data.user);
      setAvatarFile(null);
      window.dispatchEvent(new Event("user-profile-updated"));
      setSuccessMessage("Аватар успешно обновлен");
    } catch {
      setErrorMessage("Не удалось подключиться к серверу");
    } finally {
      setIsSavingAvatar(false);
    }
  };

  return (
    <>
      <Header />
      <div className="w-full flex justify-center px-4 py-8">
        <div className="w-full max-w-4xl rounded-3xl border border-gray-300 p-6">
          <h1 className="text-2xl font-bold mb-6">Личный кабинет</h1>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-18 w-18 overflow-hidden rounded-full border border-gray-400 bg-gray-100">
                  {avatarSrc ? (
                    <img
                      src={avatarSrc}
                      alt="Аватар пользователя"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-xl font-semibold text-gray-500">
                      {profile?.name?.[0] ?? "U"}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <label className="block text-sm mb-1">Фото профиля</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) =>
                      setAvatarFile(event.target.files?.[0] ?? null)
                    }
                    className="block w-full text-sm border p-2 border-gray-400 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
                  />
                </div>
              </div>

              <Button
                height={34}
                text={isSavingAvatar ? "Загрузка..." : "Сохранить аватар"}
                onClick={uploadAvatar}
              ></Button>

              <div>
                <label className="block text-sm mb-1">Имя</label>
                <div className="flex items-center gap-2">
                  <input
                    className="input-form opacity-50"
                    value={profile?.name ?? ""}
                    readOnly
                    disabled
                  />
                  {profile?.role === "mentor" && (
                    <Button
                      height={28}
                      text="Моя страница"
                      onClick={() =>
                        (window.location.href = `/mentor/${profile.id}`)
                      }
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm mb-1">Роль</label>
                <input
                  className="input-form opacity-50"
                  value={localizedRole}
                  readOnly
                  disabled
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1">О себе</label>
                <textarea
                  className="input-form min-h-32 resize-none"
                  value={bio}
                  maxLength={1500}
                  onChange={(event) => setBio(event.target.value)}
                  placeholder="Расскажите кратко о себе"
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Навыки</label>
                <div className="flex gap-2">
                  <input
                    className="input-form"
                    type="text"
                    value={skillInput}
                    placeholder="Например, TypeScript"
                    onChange={(event) => setSkillInput(event.target.value)}
                  />
                  <Button
                    width={120}
                    height={34}
                    text="Добавить"
                    onClick={addSkill}
                  ></Button>
                </div>

                {skills.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {skills.map((skill, index) => (
                      <span
                        key={`${skill}-${index}`}
                        className="flex items-center gap-1 rounded-full border border-gray-400 px-3 py-1 text-sm"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeSkill(index)}
                          className="flex h-4 w-4 items-center justify-center rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-900"
                        >
                          <IoClose size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {profile?.role === "mentor" && (
            <div className="mt-6 border-t pt-6">
              <h2 className="text-xl font-semibold mb-4">Менторский профиль</h2>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm mb-1">Профессии</label>
                  <div>
                    <input
                      className="input-form"
                      type="text"
                      value={profession}
                      placeholder="Например, Data Engineer"
                      onChange={(e) => setProfession(e.target.value)}
                    />
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm mb-1">Цена в час (₽)</label>
                    <input
                      className="input-form"
                      type="number"
                      value={ratePerHour}
                      onChange={(e) => setRatePerHour(e.target.value)}
                      placeholder="Например, 1500"
                    />
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm mb-1">
                      Опыт работы (лет)
                    </label>
                    <input
                      className="input-form"
                      type="number"
                      min="0"
                      value={experience}
                      onChange={(e) => setExperience(e.target.value)}
                      placeholder="Например, 3"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm mb-1">
                    Портфолио (изображения)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => onSelectPortfolioFiles(e.target.files)}
                    className="block w-full text-sm border p-2 border-gray-400 rounded-lg cursor-pointer bg-gray-50"
                  />
                  <div className="flex gap-2 mt-2">
                    <Button
                      height={34}
                      text={isUploadingPortfolio ? "Загрузка..." : "Загрузить"}
                      onClick={uploadPortfolio}
                    />
                  </div>

                  {portfolioPreview.length > 0 && (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {portfolioPreview.map((item) => (
                        <div
                          key={item.id}
                          className="relative border rounded overflow-hidden"
                        >
                          <img
                            src={`data:${item.mimeType};base64,${item.base64}`}
                            alt={`portfolio-${item.id}`}
                            className="w-full h-24 object-cover"
                          />
                          <button
                            onClick={() =>
                              item.id && removePortfolioItem(item.id)
                            }
                            className="absolute top-1 right-1 bg-white rounded-full p-1 text-red-600"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <h3 className="font-semibold mb-2">Сессии</h3>
                <div className="flex gap-2 items-center">
                  <input
                    type="datetime-local"
                    className="input-form"
                    value={sessionStart}
                    onChange={(e) => setSessionStart(e.target.value)}
                  />
                  <input
                    type="datetime-local"
                    className="input-form"
                    value={sessionEnd}
                    onChange={(e) => setSessionEnd(e.target.value)}
                  />
                  <Button
                    height={34}
                    text="Создать"
                    onClick={createSessionReq}
                  />
                </div>

                <div className="mt-3">
                  {sessions.length === 0 ? (
                    <div className="text-sm text-gray-500">
                      Нет созданных сессий
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {sessions.map((s: any) => (
                        <li
                          key={s.id}
                          className="flex items-center justify-between border p-2 rounded"
                        >
                          <div>
                            <div className="text-sm">
                              {formatSessionRange(s.starts_at, s.ends_at)}
                            </div>
                            {s.meeting_link && (
                              <div className="mt-1 text-sm text-blue-600">
                                <a
                                  href={s.meeting_link}
                                  target="_blank"
                                  rel="noreferrer noopener"
                                  className="underline"
                                >
                                  Ссылка на Zoom
                                </a>
                              </div>
                            )}
                          </div>
                          <div>
                            <Button
                              height={28}
                              text="Удалить"
                              onClick={() => deleteSessionReq(s.id)}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 border-t pt-6">
            <h2 className="text-xl font-semibold mb-4">
              {profile?.role === "mentor" ? "Ученики" : "Мои записи"}
            </h2>
            {isLoadingBookings ? (
              <div className="text-sm text-gray-500">Загрузка...</div>
            ) : bookings.length === 0 ? (
              <div className="text-sm text-gray-500">
                {profile?.role === "mentor"
                  ? "Пока нет учеников, записавшихся на ваши сессии"
                  : "Вы еще не записаны на сессии"}
              </div>
            ) : (
              <ul className="space-y-3">
                {bookings.map((booking) => (
                  <li
                    key={booking.booking_id}
                    className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-col gap-1">
                        <div className="font-semibold text-gray-900">
                          {profile?.role === "mentor"
                            ? booking.student_name || booking.student_email
                            : booking.mentor_name || booking.mentor_email}
                        </div>
                        <div className="text-sm text-gray-600">
                          {formatSessionRange(
                            booking.starts_at,
                            booking.ends_at,
                          )}
                        </div>
                        {booking.meeting_link && (
                          <div className="text-sm text-blue-600">
                            <a
                              href={booking.meeting_link}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="underline"
                            >
                              Ссылка на Zoom
                            </a>
                          </div>
                        )}
                        <div className="text-sm text-gray-500">
                          {profile?.role === "mentor"
                            ? `Email ученика: ${booking.student_email}`
                            : `Ментор: ${booking.mentor_name} (${booking.mentor_email})`}
                        </div>
                      </div>
                      {profile?.role !== "mentor" && (
                        <div className="mt-3 sm:mt-0">
                          <Button
                            height={34}
                            text="Отменить запись"
                            onClick={() => openCancelConfirm(booking)}
                          />
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              height={40}
              text={isSavingProfile ? "Сохранение..." : "Сохранить профиль"}
              onClick={saveProfile}
            />
          </div>

          {errorMessage && (
            <div className="mt-5 text-sm text-red-500">{errorMessage}</div>
          )}
          {successMessage && (
            <div className="mt-5 text-sm text-green-600">{successMessage}</div>
          )}
        </div>
      </div>

      {isCancelModalOpen && pendingCancelBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Подтвердите отмену</h2>
                <p className="mt-3 text-sm text-gray-600">
                  Вы уверены, что хотите отменить запись на сессию
                  <span className="font-medium">
                    {formatSessionRange(
                      pendingCancelBooking.starts_at,
                      pendingCancelBooking.ends_at,
                    )}
                  </span>
                  ?
                </p>
              </div>
              <button
                type="button"
                onClick={closeCancelConfirm}
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              >
                <IoClose size={24} />
              </button>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button height={40} text="Нет" onClick={closeCancelConfirm} />
              <Button
                height={40}
                text={isCancellingBooking ? "Отмена..." : "Подтвердить"}
                onClick={confirmCancelBooking}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Profile;
