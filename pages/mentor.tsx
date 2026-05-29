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
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/mentor/${id}`);
        if (!res.ok) {
          navigate("/");
          return;
        }
        const data = await res.json();
        setMentor(data.mentor);
        setSessions(data.sessions || []);
      } catch (e) {
        navigate("/");
      }
    };
    void load();
  }, [id]);

  const book = async (sessionId: number) => {
    setError("");
    setSuccess("");
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
    } catch (e) {
      setError("Не удалось подключиться к серверу");
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
              <div className="text-sm text-gray-600">{mentor.profession}</div>
              <div className="mt-2">{mentor.bio}</div>
              <div className="mt-3 font-semibold">
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
                    className="flex items-center justify-between border p-2 rounded"
                  >
                    <div>
                      {new Date(s.starts_at).toLocaleString()} —{" "}
                      {new Date(s.ends_at).toLocaleString()}
                    </div>
                    <div>
                      <Button
                        height={32}
                        text="Записаться"
                        onClick={() => book(s.id)}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && <div className="mt-3 text-sm text-red-500">{error}</div>}
          {success && (
            <div className="mt-3 text-sm text-green-600">{success}</div>
          )}
        </div>
      </div>
    </>
  );
}

export default MentorPage;
