import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App.tsx";
import Login from "../pages/login.tsx";
import Registration from "../pages/registration.tsx";
import Profile from "../pages/profile.tsx";
import MentorPage from "../pages/mentor.tsx";
import "../style/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/login" element={<Login />} />
        <Route path="/registration" element={<Registration />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/mentor/:id" element={<MentorPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
