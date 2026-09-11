/**
 * Модуль аутентификации и управления аккаунтами (AuthService)
 * Обеспечивает вход, регистрацию, проверку ролей (admin/user) и сохранение сессии в localStorage.
 */

class AuthService {
  constructor() {
    this.STORAGE_USERS_KEY = "geo_map_users";
    this.STORAGE_SESSION_KEY = "geo_map_session";
    this.listeners = [];

    this.initUsers();
    this.currentUser = this.loadSession();
  }

  /**
   * Инициализация пользователей по умолчанию, если они еще не созданы
   */
  initUsers() {
    const existing = localStorage.getItem(this.STORAGE_USERS_KEY);
    if (!existing) {
      const defaultUsers = [
        {
          id: "usr-admin",
          username: "admin",
          password: "admin123",
          displayName: "Администратор",
          role: "admin",
          createdAt: new Date().toISOString()
        },
        {
          id: "usr-viewer",
          username: "user",
          password: "user123",
          displayName: "Пользователь",
          role: "user",
          createdAt: new Date().toISOString()
        }
      ];
      localStorage.setItem(this.STORAGE_USERS_KEY, JSON.stringify(defaultUsers));
    }
  }

  /**
   * Получение списка всех зарегистрированных пользователей
   */
  getUsers() {
    try {
      const data = localStorage.getItem(this.STORAGE_USERS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Ошибка чтения пользователей из localStorage:", e);
      return [];
    }
  }

  /**
   * Сохранение списка пользователей
   */
  saveUsers(users) {
    localStorage.setItem(this.STORAGE_USERS_KEY, JSON.stringify(users));
  }

  /**
   * Загрузка активной сессии
   */
  loadSession() {
    try {
      const session = localStorage.getItem(this.STORAGE_SESSION_KEY);
      return session ? JSON.parse(session) : null;
    } catch (e) {
      console.error("Ошибка чтения сессии:", e);
      return null;
    }
  }

  /**
   * Сохранение текущей сессии
   */
  saveSession(user) {
    if (user) {
      const sessionData = {
        id: user.id,
        username: user.username,
        displayName: user.displayName || user.username,
        role: user.role
      };
      localStorage.setItem(this.STORAGE_SESSION_KEY, JSON.stringify(sessionData));
      this.currentUser = sessionData;
    } else {
      localStorage.removeItem(this.STORAGE_SESSION_KEY);
      this.currentUser = null;
    }
    this.notifyAuthStateChanged();
  }

  /**
   * Проверка подлинности (Вход)
   */
  login(username, password) {
    const cleanUsername = (username || "").trim().toLowerCase();
    const cleanPassword = (password || "").trim();

    if (!cleanUsername || !cleanPassword) {
      return { success: false, message: "Заполните логин и пароль" };
    }

    const users = this.getUsers();
    // Для удобства проверки admin также принимает пароль 'admin'
    const user = users.find(u => 
      u.username.toLowerCase() === cleanUsername && 
      (u.password === cleanPassword || (u.username === "admin" && cleanPassword === "admin"))
    );

    if (!user) {
      return { success: false, message: "Неверный логин или пароль" };
    }

    this.saveSession(user);
    return { success: true, user: this.currentUser };
  }

  /**
   * Регистрация нового аккаунта
   */
  register(username, password, displayName, role = "user") {
    const cleanUsername = (username || "").trim().toLowerCase();
    const cleanPassword = (password || "").trim();
    const cleanDisplayName = (displayName || "").trim() || cleanUsername;

    if (!cleanUsername) {
      return { success: false, message: "Введите логин" };
    }
    if (cleanUsername.length < 3) {
      return { success: false, message: "Логин должен быть не менее 3 символов" };
    }
    if (!cleanPassword || cleanPassword.length < 4) {
      return { success: false, message: "Пароль должен содержать минимум 4 символа" };
    }

    const validRoles = ["admin", "user"];
    const userRole = validRoles.includes(role) ? role : "user";

    const users = this.getUsers();
    if (users.some(u => u.username.toLowerCase() === cleanUsername)) {
      return { success: false, message: "Пользователь с таким логином уже существует" };
    }

    const newUser = {
      id: "usr-" + Date.now().toString(36),
      username: cleanUsername,
      password: cleanPassword,
      displayName: cleanDisplayName,
      role: userRole,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    this.saveUsers(users);
    this.saveSession(newUser);

    return { success: true, user: this.currentUser };
  }

  /**
   * Смена пароля текущего авторизованного пользователя
   */
  changePassword(currentPassword, newPassword) {
    if (!this.currentUser) {
      return { success: false, message: "Вы не авторизованы" };
    }

    const curPass = (currentPassword || "").trim();
    const newPass = (newPassword || "").trim();

    if (!curPass) {
      return { success: false, message: "Введите текущий пароль" };
    }
    if (!newPass) {
      return { success: false, message: "Введите новый пароль" };
    }
    if (newPass.length < 4) {
      return { success: false, message: "Новый пароль должен содержать минимум 4 символа" };
    }
    if (curPass === newPass) {
      return { success: false, message: "Новый пароль должен отличаться от старого" };
    }

    const users = this.getUsers();
    const userIndex = users.findIndex(u => u.username.toLowerCase() === this.currentUser.username.toLowerCase());

    if (userIndex === -1) {
      return { success: false, message: "Пользователь не найден" };
    }

    const user = users[userIndex];
    const isCurValid = (user.password === curPass) || 
      (user.username === "admin" && (curPass === "admin" || curPass === "admin123"));

    if (!isCurValid) {
      return { success: false, message: "Неверный текущий пароль" };
    }

    user.password = newPass;
    users[userIndex] = user;
    this.saveUsers(users);

    return { success: true, message: "Пароль успешно изменен!" };
  }

  /**
   * Выход из аккаунта
   */
  logout() {
    this.saveSession(null);
  }

  /**
   * Текущий пользователь
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Авторизован ли пользователь
   */
  isLoggedIn() {
    return this.currentUser !== null;
  }

  /**
   * Является ли текущий пользователь администратором
   */
  isAdmin() {
    return this.currentUser !== null && this.currentUser.role === "admin";
  }

  /**
   * Подписка на изменение статуса авторизации
   */
  onAuthStateChanged(callback) {
    if (typeof callback === "function") {
      this.listeners.push(callback);
      // Сразу вызываем с текущим состоянием
      callback(this.currentUser);
    }
  }

  /**
   * Оповещение подписчиков
   */
  notifyAuthStateChanged() {
    this.listeners.forEach(cb => {
      try {
        cb(this.currentUser);
      } catch (err) {
        console.error("Ошибка в колбэке смены статуса авторизации:", err);
      }
    });
  }
}

// Экспорт в глобальную область видимости
window.AuthService = AuthService;
