import Button from "../components/button.tsx";
function Header() {
  return (
    <div className="w-full flex items-center flex-col">
      <div className="flex items-center justify-around p-10 w-350 h-12.5">
        <div className="text-[24px] font-bold">
          <a href="#home">SkillMatch</a>
        </div>
        <nav>
          <ul className="flex flex-row gap-20">
            <li>
              <a href="#home">Главная</a>
            </li>
            <li>
              <a href="#about">О компании</a>
            </li>
            <li>
              <a href="#contact">Контакты</a>
            </li>
          </ul>
        </nav>
        <div className="flex flex-row gap-5">
          <Button width={120} height={30} text="Войти"></Button>
          <Button width={120} height={30} text="Регистрация"></Button>
        </div>
      </div>
      <div className="w-full bg-gray-400 h-0.5"></div>
    </div>
  );
}
export default Header;
