import Button from "./button";
import { FaStar } from "react-icons/fa";
function MentorCard({
  photo,
  skills,
  name,
  profession,
  experience,
  price,
  raiting,
}: {
  photo?: string;
  skills: string[];
  name: string;
  profession: string;
  experience: number;
  price: number;
  raiting: number;
}) {
  return (
    <div className="flex items-center justify-center">
      <div className="w-80 h-150 ">
        <div className="w-full h-3/5 rounded-xl overflow-hidden">
          <img
            src={photo}
            alt="Mentor"
            className="w-full h-full aspect-3/4 object-cover"
          />
        </div>
        <div className="w-full flex flex-row justify-left items-center m-2 gap-2">
          <div className="font-bold">{name}</div>
          <div className="border border-gray-400 rounded-xl p-1">
            {profession}
          </div>
        </div>
        <div>
          {skills && skills.length > 0 && (
            <div className="w-full flex flex-wrap justify-left items-center gap-1 m-2">
              Скилы:
              {skills.map((skill, index) => (
                <div
                  key={index}
                  className="border text-xs border-gray-400 rounded-xl p-1"
                >
                  {skill}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="w-full flex items-center justify-left m-2">
          Опыт работы: {experience} лет
        </div>
        <div className="w-full flex items-center justify-left m-2">
          Цена: {price} руб/час
        </div>
        <div className="flex flex-row items-center m-2 gap-1">
          Рейтинг: {raiting}{" "}
          {Array.from({
            length: Math.max(0, Math.min(5, Math.floor(raiting))),
          }).map((_, index) => (
            <FaStar key={index} color="#ffc107" />
          ))}
        </div>
        <Button height={30} text="Подробнее о менторе"></Button>
      </div>
    </div>
  );
}
export default MentorCard;
