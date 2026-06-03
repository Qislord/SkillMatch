import MentorCard from "./mentor-card.tsx";
import { useEffect, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5050";

function Search() {
  const [mentors, setMentors] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [minRating, setMinRating] = useState("0");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.append("q", query.trim());
        if (minRating !== "0") params.append("minRating", minRating);

        const url = `${API_BASE_URL}/api/mentor${params.toString() ? `?${params.toString()}` : ""}`;
        const res = await fetch(url, {
          method: "GET",
          credentials: "include",
        });
        if (!res.ok) {
          setMentors([]);
          return;
        }
        const data = await res.json();
        setMentors(data.mentors || []);
      } catch (e) {
        setMentors([]);
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [query, minRating]);

  return (
    <>
      <div className="text-2xl font-bold mb-4 mt-4 text-center">
        Наши менторы
      </div>
      <div className="w-full flex items-center justify-center mt-4">
        <div className="w-full max-w-6xl px-4">
          <div className="grid gap-4 md:grid-cols-[1fr_160px]">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по навыкам и профессии"
              className="search-input w-full h-12.5 border border-gray-400 rounded-xl p-2 outline-none focus:ring-0"
            />
            <div className="flex items-center gap-3">
              {/* <label className="text-sm text-gray-700">Рейтинг</label> */}
              <select
                value={minRating}
                onChange={(e) => setMinRating(e.target.value)}
                className="border border-gray-400 h-full rounded-xl w-full"
              >
                <option value="0">Все</option>
                <option value="1">От 1★</option>
                <option value="2">От 2★</option>
                <option value="3">От 3★</option>
                <option value="4">От 4★</option>
                <option value="5">От 5★</option>
              </select>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-600">
            {isLoading ? "Загрузка..." : `${mentors.length} менторов найдены`}
          </div>

          {mentors.length === 0 && !isLoading ? (
            <div className="mt-4 text-sm text-gray-500">
              Менторы не найдены. Попробуйте другой запрос.
            </div>
          ) : (
            <div className="w-full flex flex-wrap items-stretch justify-left gap-10 mt-4">
              {mentors.map((m) => (
                <div
                  key={m.id}
                  className="w-full sm:w-auto flex items-stretch justify-center"
                >
                  <MentorCard
                    id={m.id}
                    photo={
                      m.avatarBase64
                        ? `data:${m.avatarMimeType};base64,${m.avatarBase64}`
                        : "./images/img3.avif"
                    }
                    name={m.name}
                    profession={m.profession || ""}
                    experience={m.experience != null ? m.experience : 0}
                    skills={m.skills || []}
                    price={m.ratePerHour ?? 0}
                    raiting={m.rating ?? 0}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default Search;
