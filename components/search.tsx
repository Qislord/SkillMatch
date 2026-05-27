import MentorCard from "./mentor-card.tsx";

function Search() {
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
            <MentorCard
              photo="./images/img3.avif"
              name="Даниил Исхаков"
              profession="Data Scientist"
              experience={12}
              skills={["Python", "Machine Learning", "Statistics"]}
              price={1200}
              raiting={2}
            />
            <MentorCard
              photo="./images/img3.avif"
              name="Даниил Исхаков"
              profession="Data Scientist"
              experience={12}
              skills={["Python", "Machine Learning", "Statistics"]}
              price={1200}
              raiting={2}
            />
            <MentorCard
              photo="./images/img3.avif"
              name="Даниил Исхаков"
              profession="Data Scientist"
              experience={12}
              skills={["Python", "Machine Learning", "Statistics"]}
              price={1200}
              raiting={2}
            />
            <MentorCard
              photo="./images/img3.avif"
              name="Даниил Исхаков"
              profession="Data Scientist"
              experience={12}
              skills={["Python", "Machine Learning", "Statistics"]}
              price={1200}
              raiting={2}
            />
            <MentorCard
              photo="./images/img3.avif"
              name="Даниил Исхаков"
              profession="Data Scientist"
              experience={12}
              skills={["Python", "Machine Learning", "Statistics"]}
              price={1200}
              raiting={2}
            />
            <MentorCard
              photo="./images/img3.avif"
              name="Даниил Исхаков"
              profession="Data Scientist"
              experience={12}
              skills={["Python", "Machine Learning", "Statistics"]}
              price={1200}
              raiting={2}
            />
          </div>
        </div>
      </div>
    </>
  );
}
export default Search;
