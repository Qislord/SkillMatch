import MentorCard from "./mentor-card.tsx";
import { useEffect, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5050";

function Search() {
  const [mentors, setMentors] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/mentor`, {
          method: "GET",
        });
        if (!res.ok) return;
        const data = await res.json();
        setMentors(data.mentors || []);
      } catch (e) {
        // ignore
      }
    };
    void load();
  }, []);

  return (
    <>
      <div className="text-2xl font-bold mb-4 mt-4 text-center">
        Наши менторы
      </div>
      <div className="w-full flex items-center justify-center mt-4">
        <div className="w-350 ">
          <input
            type="search"
            placeholder="Поиск менторов..."
            className="search-input w-full h-12.5 border border-gray-400 rounded-xl p-2 outline-none focus:ring-0"
          />
          <div className="w-full flex flex-wrap items-center justify-left gap-10 mt-4">
            {mentors.map((m) => (
              <MentorCard
                key={m.id}
                id={m.id}
                photo={
                  m.avatarBase64
                    ? `data:${m.avatarMimeType};base64,${m.avatarBase64}`
                    : "./images/img3.avif"
                }
                name={m.name}
                profession={m.profession || ""}
                experience={0}
                skills={[]}
                price={m.ratePerHour ?? 0}
                raiting={0}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export default Search;
