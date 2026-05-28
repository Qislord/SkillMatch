import { Link } from "react-router-dom";
import Button from "../components/button";
import { useState } from "react";
import { IoClose } from "react-icons/io5";
function Registration() {
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [name, setName] = useState("");

  const addSkill = () => {
    const newSkill = skillInput.trim();

    if (!newSkill) {
      return;
    }

    setSkills((prevSkills) => [...prevSkills, newSkill]);
    setSkillInput("");
  };

  const removeSkill = (skillIndex: number) => {
    setSkills((prevSkills) =>
      prevSkills.filter((_, index) => index !== skillIndex),
    );
  };

  return (
    <>
      <div className="w-full h-screen flex justify-center items-center">
        <div className="w-125 border border-gray-400 rounded-3xl p-4">
          <div className="text-center font-bold">Зарегистрируйтесь</div>
          <div className="flex flex-col mt-5 gap-2">
            <label>ФИО</label>
            <input
              className="input-form"
              placeholder="Иванов Иван Иванович"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <label>Email</label>
            <input
              className="input-form"
              placeholder="example@example.com"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            {email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && (
              <div className="text-red-500 text-sm">
                Пожалуйста, введите корректный email
              </div>
            )}
            <label>Пароль</label>
            <input
              className="input-form"
              placeholder="••••••••"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {password.length > 0 && password.length < 8 && (
              <div className="text-red-500 text-sm">
                Пароль должен содержать не менее 8 символов
              </div>
            )}
            <label>Повторите пароль</label>
            <input
              className="input-form"
              placeholder="••••••••"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
            {password !== confirmPassword && (
              <div className="text-red-500 text-sm">Пароли не совпадают</div>
            )}
            <label>Укажите ваши навыки</label>
            <div className="flex flex-row justify-between items-center gap-2">
              <input
                className="input-form"
                placeholder="React"
                type="text"
                value={skillInput}
                onChange={(event) => setSkillInput(event.target.value)}
              />
              <Button
                width={120}
                height={30}
                onClick={addSkill}
                text="Добавить"
              ></Button>
            </div>

            {skills.length > 0 && (
              <div className="flex flex-wrap gap-2">
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

            <div>
              <label>Выберите роль</label>
              <select
                className="input-form w-full"
                value={role}
                onChange={(event) => setRole(event.target.value)}
              >
                <option value="" disabled hidden></option>
                <option value="mentor">Ментор</option>
                <option value="student">Ученик</option>
              </select>
            </div>
            <div className="mt-5">
              <Button height={30} text="Зарегистрироваться"></Button>
            </div>
            <div className=" text-sm text-center">
              Уже есть аккаунт?{" "}
              <Link
                to="/login"
                className="text-blue-500 hover:underline text-center"
              >
                Войти
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Registration;
