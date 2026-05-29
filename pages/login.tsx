import Button from "../components/button";
import { Link } from "react-router-dom";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5050";

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!email || !password) {
      setErrorMessage("Введите email и пароль");
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.message ?? "Не удалось выполнить вход");
        return;
      }

      setSuccessMessage(`Вход выполнен. Добро пожаловать, ${data.user.name}!`);
      setEmail("");
      setPassword("");
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
          <div className="text-center font-bold">Добро пожаловать</div>
          <div className="flex flex-col mt-5 gap-2">
            <label>Email</label>
            <input
              className="input-form"
              placeholder="example@example.com"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <label>Пароль</label>
            <input
              className="input-form"
              placeholder="••••••••"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <div className="mt-5">
              <Button
                height={30}
                text={isLoading ? "Вход..." : "Войти"}
                onClick={handleLogin}
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
              У вас еще нет аккаунта?{" "}
              <Link
                to="/registration"
                className="text-blue-500 hover:underline text-center"
              >
                Зарегистрироваться
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
export default Login;
