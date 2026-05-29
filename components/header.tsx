import Button from "../components/button.tsx";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

type CurrentUser = {
  name?: string;
  avatarMimeType?: string | null;
  avatarBase64?: string | null;
  id?: number;
  role?: string;
};

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5050";

function Header() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) {
          setCurrentUser(null);
          return;
        }

        const data = await response.json();
        setCurrentUser(data.user ?? null);
      } catch {
        setCurrentUser(null);
      }
    };

    void fetchCurrentUser();
  }, []);

  useEffect(() => {
    const refreshUser = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) {
          setCurrentUser(null);
          return;
        }

        const data = await response.json();
        setCurrentUser(data.user ?? null);
      } catch {
        setCurrentUser(null);
      }
    };

    const handleProfileUpdate = () => {
      void refreshUser();
    };

    window.addEventListener("user-profile-updated", handleProfileUpdate);

    return () => {
      window.removeEventListener("user-profile-updated", handleProfileUpdate);
    };
  }, []);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (!menuRef.current) {
        return;
      }

      if (!menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleDocumentClick);

    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setCurrentUser(null);
      setIsMenuOpen(false);
      navigate("/login");
    }
  };

  return (
    <div className="w-full flex items-center flex-col">
      <div className="flex items-center justify-around p-10 w-350 h-12.5">
        <div className="text-[24px] font-bold">
          <a href="/">SkillMatch</a>
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
        {currentUser?.name ? (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className="flex items-center gap-2 px-3 py-1 rounded-xl text-md font-bold cursor-pointer"
            >
              <span className="h-7 w-7 overflow-hidden rounded-full border border-gray-400 bg-gray-100">
                {currentUser.avatarMimeType && currentUser.avatarBase64 ? (
                  <img
                    src={`data:${currentUser.avatarMimeType};base64,${currentUser.avatarBase64}`}
                    alt="Аватар"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="h-full w-full flex items-center justify-center text-sm text-gray-500">
                    {currentUser.name[0]}
                  </span>
                )}
              </span>
              {currentUser.name}
            </button>
            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-44 rounded-xl border border-gray-300 bg-white p-2 shadow-lg z-10">
                {currentUser.role === "mentor" && (
                  <Link
                    to={`/mentor/${currentUser.id}`}
                    onClick={() => setIsMenuOpen(false)}
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-100"
                  >
                    Моя страница
                  </Link>
                )}
                <Link
                  to="/profile"
                  onClick={() => setIsMenuOpen(false)}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-100"
                >
                  Личный кабинет
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-100 cursor-pointer"
                >
                  Выйти
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-row gap-5">
            <Link to="/login">
              <Button width={120} height={30} text="Войти"></Button>
            </Link>
            <Link to="/registration">
              <Button width={120} height={30} text="Регистрация"></Button>
            </Link>
          </div>
        )}
      </div>
      <div className="w-full bg-gray-400 h-0.5"></div>
    </div>
  );
}
export default Header;
