import { FaStar } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
function MentorCard({
  photo,
  skills,
  name,
  profession,
  experience,
  price,
  raiting,
  id,
}: {
  photo?: string;
  skills: string[];
  name: string;
  profession: string;
  experience: number;
  price: number;
  raiting: number;
  id?: number;
}) {
  const navigate = useNavigate();
  const displayedSkills = skills?.slice(0, 3) ?? [];
  const extraSkillsCount = skills?.length ? Math.max(0, skills.length - 3) : 0;

  return (
    <div className="w-full flex items-stretch justify-center">
      <div
        className="w-80 h-full min-h-136 flex flex-col justify-between rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden transition hover:shadow-lg cursor-pointer"
        onClick={() => id && navigate(`/mentor/${id}`)}
      >
        <div>
          <div className="w-full h-56 overflow-hidden bg-gray-200">
            <img
              src={photo}
              alt="Mentor"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="p-4">
            <div className="flex flex-wrap gap-2 items-center mb-3">
              <div className="font-bold text-lg">{name}</div>
              <div className="rounded-full border border-gray-300 bg-gray-100 px-3 py-1 text-xs text-gray-700">
                {profession}
              </div>
            </div>
            {displayedSkills.length > 0 && (
              <div className="mb-3">
                <div className="text-sm font-semibold text-gray-700 mb-2">
                  Навыки:
                </div>
                <div className="flex flex-wrap gap-2">
                  {displayedSkills.map((skill, index) => (
                    <span
                      key={index}
                      className="border text-xs border-gray-400 rounded-full px-2 py-1"
                    >
                      {skill}
                    </span>
                  ))}
                  {extraSkillsCount > 0 && (
                    <span className="border text-xs border-gray-400 rounded-full px-2 py-1 text-gray-600">
                      +{extraSkillsCount}
                    </span>
                  )}
                </div>
              </div>
            )}
            <div className="text-sm text-gray-600 mb-3">
              Опыт работы: {experience} лет
            </div>
            <div className="text-sm text-gray-600 mb-3">
              Цена: {price} руб/час
            </div>
          </div>
        </div>
        <div className="px-4 pb-4">
          <div className="flex items-center gap-1 mb-3 text-sm text-gray-700">
            Рейтинг: {Math.round(raiting * 10) / 10}
            {Array.from({
              length: Math.max(0, Math.min(5, Math.floor(raiting))),
            }).map((_, index) => (
              <FaStar key={index} color="#ffc107" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
export default MentorCard;
