import Button from "../components/button";
import { Link } from "react-router-dom";
function Login() {
  return (
    <>
      <div className="w-full h-screen flex justify-center items-center">
        <div className="w-125 border border-gray-400 rounded-3xl p-4">
          <div className="text-center font-bold">Добро пожаловать</div>
          <div className="flex flex-col mt-5 gap-2">
            <label>Email</label>
            <input className="input-form" placeholder="example@example.com" type="email" />
            <label>Пароль</label>
            <input className="input-form" placeholder="••••••••" type="password" />
            <div className="mt-5">
              <Button height={30} text="Войти"></Button>
            </div>
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
