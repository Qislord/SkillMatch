const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const pool = require("./src/db");
const {
  createUsersTableIfNotExists,
  registerUser,
  updateUserProfile,
  updateUserAvatar,
  appendPortfolioImages,
  createMentorSession,
  createOrUpdateMentorReview,
} = require("./src/services/authService");

function makeSvgAvatar(name, color) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const svg = `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><rect width="240" height="240" fill="${color}"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="80" fill="#ffffff">${initials}</text></svg>`;
  return Buffer.from(svg).toString("base64");
}

function makePortfolioImage(topic, color) {
  const svg = `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="400" height="220"><rect width="400" height="220" fill="${color}"/><text x="50%" y="40%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="32" fill="#ffffff">${topic}</text><text x="50%" y="65%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" fill="#ffffff">Портфолио</text></svg>`;
  return Buffer.from(svg).toString("base64");
}

function futureDate(offsetDays, hour, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

const mentors = [
  {
    name: "Алена Иванова",
    email: "alena.ivanova@testmentor.ru",
    password: "Mentor2026!",
    skills: ["JavaScript", "React", "TypeScript", "CSS"],
    bio: "Помогаю создавать современные интерфейсы и прокачивать frontend-навыки.",
    professions: ["Frontend Developer"],
    ratePerHour: 1800,
    avatarColor: "#4F46E5",
    portfolioTopic: "React UI",
    sessions: [
      { start: futureDate(1, 8), end: futureDate(1, 10) },
      { start: futureDate(3, 14), end: futureDate(3, 16) },
    ],
  },
  {
    name: "Дмитрий Смирнов",
    email: "dmitry.smirnov@testmentor.ru",
    password: "Mentor2026!",
    skills: ["Python", "Django", "PostgreSQL", "API"],
    bio: "Настраиваю серверные части, строю архитектуру и помогаю запускать проекты на Django.",
    professions: ["Backend Developer"],
    ratePerHour: 2200,
    avatarColor: "#0F766E",
    portfolioTopic: "Django API",
    sessions: [
      { start: futureDate(2, 10), end: futureDate(2, 12) },
      { start: futureDate(4, 16), end: futureDate(4, 18) },
    ],
  },
  {
    name: "Екатерина Белова",
    email: "ekaterina.belova@testmentor.ru",
    password: "Mentor2026!",
    skills: ["Product Design", "Figma", "UX", "Research"],
    bio: "Помогаю формировать продуктовые решения, чтобы интерфейсы были понятны пользователям.",
    professions: ["Product Designer"],
    ratePerHour: 2500,
    avatarColor: "#BE123C",
    portfolioTopic: "UX Research",
    sessions: [
      { start: futureDate(1, 13), end: futureDate(1, 15) },
      { start: futureDate(5, 9), end: futureDate(5, 11) },
    ],
  },
  {
    name: "Илья Кузнецов",
    email: "ilya.kuznetsov@testmentor.ru",
    password: "Mentor2026!",
    skills: ["Data Science", "Machine Learning", "Python", "SQL"],
    bio: "Обучаю работе с данными, моделям машинного обучения и аналитике продуктов.",
    professions: ["Data Scientist"],
    ratePerHour: 2700,
    avatarColor: "#F97316",
    portfolioTopic: "ML Models",
    sessions: [
      { start: futureDate(2, 11), end: futureDate(2, 13) },
      { start: futureDate(6, 15), end: futureDate(6, 17) },
    ],
  },
  {
    name: "Мария Лебедева",
    email: "maria.lebedeva@testmentor.ru",
    password: "Mentor2026!",
    skills: ["Project Management", "SCRUM", "Roadmap", "Stakeholders"],
    bio: "Веду команды к результату и делюсь практиками управления проектами и продуктами.",
    professions: ["Project Manager"],
    ratePerHour: 2000,
    avatarColor: "#2563EB",
    portfolioTopic: "PM Scrum",
    sessions: [
      { start: futureDate(3, 9), end: futureDate(3, 11) },
      { start: futureDate(5, 13), end: futureDate(5, 15) },
    ],
  },
  {
    name: "Никита Орлов",
    email: "nikita.orlov@testmentor.ru",
    password: "Mentor2026!",
    skills: ["DevOps", "Docker", "Kubernetes", "CI/CD"],
    bio: "Настраиваю автоматизацию запуска сервисов и помогаю внедрять стабильные DevOps-процессы.",
    professions: ["DevOps Engineer"],
    ratePerHour: 2300,
    avatarColor: "#0EA5E9",
    portfolioTopic: "K8s Pipeline",
    sessions: [
      { start: futureDate(1, 18), end: futureDate(1, 20) },
      { start: futureDate(4, 10), end: futureDate(4, 12) },
    ],
  },
  {
    name: "Ольга Федорова",
    email: "olga.fedorova@testmentor.ru",
    password: "Mentor2026!",
    skills: ["Marketing", "Growth Hacking", "SMM", "Analytics"],
    bio: "Помогаю находить рост через маркетинг и аналитику, запускаю кампании и оцениваю их эффективность.",
    professions: ["Marketing Specialist"],
    ratePerHour: 1900,
    avatarColor: "#9333EA",
    portfolioTopic: "Growth Plan",
    sessions: [
      { start: futureDate(2, 14), end: futureDate(2, 16) },
      { start: futureDate(6, 9), end: futureDate(6, 11) },
    ],
  },
  {
    name: "Роман Крылов",
    email: "roman.krylov@testmentor.ru",
    password: "Mentor2026!",
    skills: ["iOS", "Swift", "UIKit", "Architecture"],
    bio: "Учу строить мобильные приложение на Swift и поддерживать чистый архитектурный код.",
    professions: ["iOS Developer"],
    ratePerHour: 2400,
    avatarColor: "#15803D",
    portfolioTopic: "iOS App",
    sessions: [
      { start: futureDate(3, 16), end: futureDate(3, 18) },
      { start: futureDate(7, 11), end: futureDate(7, 13) },
    ],
  },
  {
    name: "Светлана Орлова",
    email: "svetlana.orlova@testmentor.ru",
    password: "Mentor2026!",
    skills: ["Blockchain", "Solidity", "Smart Contracts", "Web3"],
    bio: "Провожу обучение по разработке смарт-контрактов и архитектуре Web3-продуктов.",
    professions: ["Blockchain Developer"],
    ratePerHour: 2800,
    avatarColor: "#14B8A6",
    portfolioTopic: "Smart Contracts",
    sessions: [
      { start: futureDate(4, 12), end: futureDate(4, 14) },
      { start: futureDate(8, 15), end: futureDate(8, 17) },
    ],
  },
  {
    name: "Андрей Волков",
    email: "andrey.volkov@testmentor.ru",
    password: "Mentor2026!",
    skills: ["C++", "GameDev", "Unreal Engine", "Performance"],
    bio: "Наставник по игровому движку Unreal, оптимизации и архитектуре игровых систем.",
    professions: ["Game Developer"],
    ratePerHour: 2600,
    avatarColor: "#CA8A04",
    portfolioTopic: "Game Systems",
    sessions: [
      { start: futureDate(5, 18), end: futureDate(5, 20) },
      { start: futureDate(9, 10), end: futureDate(9, 12) },
    ],
  },
];

const students = [
  {
    name: "Артем Нечаев",
    email: "artem.nechaev@teststudent.ru",
    password: "Student2026!",
    skills: ["Sales", "Soft Skills"],
  },
  {
    name: "Виктория Максимова",
    email: "viktoria.maksimova@teststudent.ru",
    password: "Student2026!",
    skills: ["Business Analysis"],
  },
  {
    name: "Григорий Лазарев",
    email: "grigory.lazarev@teststudent.ru",
    password: "Student2026!",
    skills: ["UX", "Research"],
  },
  {
    name: "Елена Мельникова",
    email: "elena.melnikova@teststudent.ru",
    password: "Student2026!",
    skills: ["Python", "Marketing"],
  },
  {
    name: "Игорь Семенов",
    email: "igor.semenov@teststudent.ru",
    password: "Student2026!",
    skills: ["DevOps", "Linux"],
  },
];

const reviews = [
  {
    mentorEmail: "alena.ivanova@testmentor.ru",
    studentEmail: "artem.nechaev@teststudent.ru",
    rating: 5,
    comment:
      "Отличная практика, получила понятную и структурированную помощь по React.",
  },
  {
    mentorEmail: "dmitry.smirnov@testmentor.ru",
    studentEmail: "viktoria.maksimova@teststudent.ru",
    rating: 4,
    comment: "Полезные советы по архитектуре Django и работе с БД.",
  },
  {
    mentorEmail: "ekaterina.belova@testmentor.ru",
    studentEmail: "grigory.lazarev@teststudent.ru",
    rating: 5,
    comment: "У Екатерины отличный взгляд на UX и понятные объяснения.",
  },
  {
    mentorEmail: "ilya.kuznetsov@testmentor.ru",
    studentEmail: "elena.melnikova@teststudent.ru",
    rating: 5,
    comment:
      "Очень помог разложить ML-проблему на этапы и выбрать правильные метрики.",
  },
  {
    mentorEmail: "maria.lebedeva@testmentor.ru",
    studentEmail: "igor.semenov@teststudent.ru",
    rating: 4,
    comment: "Практичные советы по управлению командой и построению roadmaps.",
  },
  {
    mentorEmail: "nikita.orlov@testmentor.ru",
    studentEmail: "artem.nechaev@teststudent.ru",
    rating: 5,
    comment: "Отлично разобрали CI/CD и настройку Kubernetes.",
  },
  {
    mentorEmail: "olga.fedorova@testmentor.ru",
    studentEmail: "viktoria.maksimova@teststudent.ru",
    rating: 4,
    comment: "Много полезной практики по Growth Hacking и аналитике.",
  },
  {
    mentorEmail: "roman.krylov@testmentor.ru",
    studentEmail: "grigory.lazarev@teststudent.ru",
    rating: 5,
    comment: "Отличный урок по Swift и архитектуре iOS-приложений.",
  },
  {
    mentorEmail: "svetlana.orlova@testmentor.ru",
    studentEmail: "elena.melnikova@teststudent.ru",
    rating: 5,
    comment: "Понравилась глубина по Solidity и разбор безопасности кода.",
  },
  {
    mentorEmail: "andrey.volkov@testmentor.ru",
    studentEmail: "igor.semenov@teststudent.ru",
    rating: 4,
    comment: "Хорошие примеры по GameDev и оптимизации производительности.",
  },
];

async function seed() {
  try {
    console.log("Начинаю создание тестовых менторов...");
    await createUsersTableIfNotExists();

    for (const mentor of mentors) {
      const existing = await pool.query(
        "SELECT id FROM users WHERE email = $1",
        [mentor.email],
      );

      if (existing.rows.length > 0) {
        console.log(`Пропускаю ${mentor.email}, уже существует`);
        continue;
      }

      const user = await registerUser({
        name: mentor.name,
        email: mentor.email,
        password: mentor.password,
        role: "mentor",
        skills: mentor.skills,
      });

      await updateUserProfile(user.id, {
        skills: mentor.skills,
        bio: mentor.bio,
        professions: mentor.professions,
        ratePerHour: mentor.ratePerHour,
      });

      await updateUserAvatar(user.id, {
        avatarMimeType: "image/svg+xml",
        avatarBase64: makeSvgAvatar(mentor.name, mentor.avatarColor),
      });

      await appendPortfolioImages(user.id, [
        {
          mimeType: "image/svg+xml",
          base64: makePortfolioImage(mentor.portfolioTopic, mentor.avatarColor),
        },
      ]);

      for (const session of mentor.sessions) {
        await createMentorSession(user.id, {
          startsAt: session.start,
          endsAt: session.end,
          meetingLink: null,
        });
      }

      console.log(`Создал ментора ${mentor.email}`);
    }

    for (const student of students) {
      const existingStudent = await pool.query(
        "SELECT id FROM users WHERE email = $1",
        [student.email],
      );

      if (existingStudent.rows.length > 0) {
        console.log(`Пропускаю студента ${student.email}, уже существует`);
        continue;
      }

      const user = await registerUser({
        name: student.name,
        email: student.email,
        password: student.password,
        role: "student",
        skills: student.skills,
      });

      await updateUserProfile(user.id, {
        skills: student.skills,
        bio: "Студент, ищу ментора для прокачки навыков и реальных задач.",
        professions: [],
        ratePerHour: null,
      });

      console.log(`Создал студента ${student.email}`);
    }

    for (const review of reviews) {
      const mentorResult = await pool.query(
        "SELECT id FROM users WHERE email = $1 AND role = $2",
        [review.mentorEmail, "mentor"],
      );
      const studentResult = await pool.query(
        "SELECT id FROM users WHERE email = $1 AND role = $2",
        [review.studentEmail, "student"],
      );

      if (mentorResult.rows.length === 0 || studentResult.rows.length === 0) {
        console.log(
          `Пропускаю отзыв ${review.mentorEmail} <- ${review.studentEmail}: нет нужного пользователя`,
        );
        continue;
      }

      await createOrUpdateMentorReview(
        mentorResult.rows[0].id,
        studentResult.rows[0].id,
        review.rating,
        review.comment,
      );
    }
  } catch (error) {
    console.error("Ошибка при сидировании:", error);
  } finally {
    await pool.end();
    console.log("Скрипт завершён.");
  }
}

seed();
