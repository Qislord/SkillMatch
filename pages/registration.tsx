import { Link } from "react-router-dom";
import Button from "../components/button";
import { useState } from "react";
import { IoClose } from "react-icons/io5";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5050";

function Registration() {
  const navigate = useNavigate();
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [name, setName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isPasswordValid = password.length >= 8;
  const isConfirmPasswordValid = password === confirmPassword;

  const canSubmit =
    name.trim().length > 0 &&
    isEmailValid &&
    isPasswordValid &&
    isConfirmPasswordValid &&
    role.length > 0 &&
    !isLoading;

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

  const handleRegistration = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!canSubmit) {
      setErrorMessage("Проверьте поля формы перед отправкой");
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          skills,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.message ?? "Не удалось зарегистрироваться");
        return;
      }

      setSuccessMessage("Вы успешно зарегистрированы. Теперь можно войти.");
      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setRole("");
      setSkills([]);
      setSkillInput("");
      navigate("/");
    } catch {
      setErrorMessage("Не удалось подключиться к серверу");
    } finally {
      setIsLoading(false);
    }
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
            {email.length > 0 && !isEmailValid && (
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
            {password.length > 0 && !isPasswordValid && (
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
            {confirmPassword.length > 0 && !isConfirmPasswordValid && (
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
                <option value="student">Обучающийся</option>
              </select>
            </div>
            <div className="mt-5">
              <Button
                height={30}
                text={isLoading ? "Регистрация..." : "Зарегистрироваться"}
                onClick={handleRegistration}
              ></Button>
            </div>
            {errorMessage && (
              <div className="text-red-500 text-sm text-center">
                {errorMessage}
              </div>
            )}
            {successMessage && (
              <div className="text-green-600 text-sm text-center">
                {successMessage}
              </div>
            )}
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
