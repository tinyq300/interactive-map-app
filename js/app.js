/**
 * Главный модуль приложения интерактивной карты (App Orchestration)
 * Интегрирует карту, визуализацию, систему аккаунтов (AuthService) и управление событиями.
 */

class App {
  constructor() {
    this.STORAGE_EVENTS_KEY = "geo_map_events";
    this.authService = new window.AuthService();
    this.events = this.loadEvents();
    this.searchQuery = "";
    this.eventToDelete = null;

    // DOM Элементы навигации и карты
    this.mapContainer = document.getElementById("map");
    this.drawerElement = document.getElementById("details-section");
    this.canvasElement = document.getElementById("section-event-canvas");
    this.searchInput = document.getElementById("search-input");
    this.searchResults = document.getElementById("search-results");
    this.searchClearBtn = document.getElementById("search-clear-btn");
    this.layerButtons = document.querySelectorAll(".map-layer-btn");
    this.mapToneToggleBtn = document.getElementById("map-tone-toggle-btn");
    this.mapToneIcon = document.getElementById("map-tone-icon");
    this.mapToneText = document.getElementById("map-tone-text");
    this.resetViewBtn = document.getElementById("reset-view-btn");
    this.adminResetEventsBtn = document.getElementById("admin-reset-events-btn");
    this.eventCountBadge = document.getElementById("total-events-count");

    // Блок авторизации в шапке
    this.authStatusContainer = document.getElementById("auth-status-container");

    // Модальное окно авторизации
    this.authModal = document.getElementById("auth-modal");
    this.closeAuthModalBtn = document.getElementById("close-auth-modal-btn");
    this.authNotice = document.getElementById("auth-login-notice");
    this.authTabLoginBtn = document.getElementById("tab-login-btn");
    this.authTabRegisterBtn = document.getElementById("tab-register-btn");
    this.authLoginForm = document.getElementById("auth-login-form");
    this.authRegisterForm = document.getElementById("auth-register-form");
    this.authLoginError = document.getElementById("auth-login-error");
    this.authRegMsg = document.getElementById("auth-reg-msg");
    this.authLoginSubmitBtn = document.getElementById("auth-login-submit-btn");
    this.authRegSubmitBtn = document.getElementById("auth-reg-submit-btn");

    // Модалка создания / редактирования точки
    this.addEventModal = document.getElementById("add-event-modal");
    this.openAddEventBtn = document.getElementById("open-add-event-btn");
    this.closeAddEventBtn = document.getElementById("close-add-modal-btn");
    this.generateJsonBtn = document.getElementById("generate-json-btn");
    this.addLivePreviewBtn = document.getElementById("add-live-preview-btn");
    this.jsonOutput = document.getElementById("json-output");
    this.modalEventFormTitle = document.getElementById("modal-event-form-title");
    this.modalEventFormDesc = document.getElementById("modal-event-form-desc");
    this.saveEventBtnText = document.getElementById("save-event-btn-text");
    this.editEventIdInput = document.getElementById("edit-event-id");

    // Модалка подтверждения удаления
    this.deleteModal = document.getElementById("delete-confirm-modal");
    this.closeDeleteModalBtn = document.getElementById("close-delete-modal-btn");
    this.cancelDeleteModalBtn = document.getElementById("cancel-delete-modal-btn");
    this.confirmDeleteModalBtn = document.getElementById("confirm-delete-modal-btn");
    this.deleteModalTitle = document.getElementById("delete-modal-event-title");

    // Модалка смены пароля
    this.changePassModal = document.getElementById("change-password-modal");
    this.closeCpModalBtn = document.getElementById("close-cp-modal-btn");
    this.cancelCpBtn = document.getElementById("cancel-cp-btn");
    this.cpSubmitBtn = document.getElementById("cp-submit-btn");
    this.cpMsg = document.getElementById("cp-msg");
    this.cpCurrentPass = document.getElementById("cp-current-password");
    this.cpNewPass = document.getElementById("cp-new-password");
    this.cpConfirmPass = document.getElementById("cp-confirm-password");

    // Модалка "Информация о карте" (кнопка "i")
    this.infoModal = document.getElementById("info-modal");
    this.openInfoModalBtn = document.getElementById("open-info-modal-btn");
    this.closeInfoModalBtn = document.getElementById("close-info-modal-btn");
    this.confirmInfoModalBtn = document.getElementById("confirm-info-modal-btn");

    this.init();
  }

  /**
   * Загрузка списка событий из localStorage или из встроенных данных
   */
  loadEvents() {
    try {
      const saved = localStorage.getItem(this.STORAGE_EVENTS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Не удалось прочитать сохраненные события:", e);
    }
    const geoData = window.GeoEventsData || { eventsData: [] };
    const defaultEvents = [...geoData.eventsData];
    this.saveEvents(defaultEvents);
    return defaultEvents;
  }

  /**
   * Сохранение списка событий в localStorage
   */
  saveEvents(eventsToSave = this.events) {
    try {
      localStorage.setItem(this.STORAGE_EVENTS_KEY, JSON.stringify(eventsToSave));
    } catch (e) {
      console.error("Ошибка сохранения событий в localStorage:", e);
    }
  }

  /**
   * Сброс всех меток к исходным начальным данным
   */
  resetEventsToDefault() {
    if (!this.authService.isAdmin()) {
      this.openAuthModal(true);
      return;
    }

    const confirmReset = window.confirm("Сбросить все метки к исходным заводским данным? Все добавленные и отредактированные точки будут возвращены в начальное состояние.");
    if (!confirmReset) return;

    const geoData = window.GeoEventsData || { eventsData: [] };
    this.events = JSON.parse(JSON.stringify(geoData.eventsData));
    this.saveEvents(this.events);
    this.updateMapMarkers();
    this.drawer.close();
    this.drawer.showToast("Все метки успешно сброшены к начальным данным!");
  }

  init() {
    // 1. Инициализация карты Leaflet
    this.map = new window.InteractiveMap("map", {
      onEventSelect: (event) => {
        this.drawer.open(event, true);
      },
      onMapClick: (latlng) => {
        // Заполнять координаты только если открыта форма или пользователь админ
        if (this.authService.isAdmin()) {
          const latInput = document.getElementById("new-event-lat");
          const lngInput = document.getElementById("new-event-lng");
          if (latInput && lngInput) {
            latInput.value = latlng.lat.toFixed(4);
            lngInput.value = latlng.lng.toFixed(4);
          }
        }
      }
    });

    // 2. Инициализация секции детальной информации о событии
    this.drawer = new window.EventDrawer(this.drawerElement, this.canvasElement, {
      onClose: () => {
        this.map.clearSelection();
      },
      onEdit: (event) => {
        if (!this.authService.isAdmin()) {
          this.openAuthModal(true);
          return;
        }
        this.openEditEventModal(event);
      },
      onDelete: (event) => {
        if (!this.authService.isAdmin()) {
          this.openAuthModal(true);
          return;
        }
        this.openDeleteEventModal(event);
      }
    });

    // Устанавливаем начальные права в карточке
    this.drawer.updatePermissions(this.authService.isAdmin());

    // 3. Отрисовка маркеров
    this.updateMapMarkers();

    // 4. Поиск, слои, авторизация и модальные окна
    this.initSearch();
    this.initLayerControls();
    this.initAuthUI();
    this.initEventFormModal();
    this.initDeleteModal();
    this.initChangePasswordModal();
    this.initInfoModal();

    if (this.resetViewBtn) {
      this.resetViewBtn.addEventListener("click", () => {
        this.drawer.close();
        this.map.resetView();
      });
    }

    if (this.adminResetEventsBtn) {
      this.adminResetEventsBtn.addEventListener("click", () => {
        this.resetEventsToDefault();
      });
    }

    // 5. Подписка на изменение статуса авторизации
    this.authService.onAuthStateChanged((user) => {
      this.renderAuthBar(user);
      const isAdmin = this.authService.isAdmin();
      this.drawer.updatePermissions(isAdmin);

      if (this.adminResetEventsBtn) {
        this.adminResetEventsBtn.classList.toggle("hidden", !isAdmin);
      }
    });

    // 6. Прямой переход по хэшу URL (#event-...)
    this.checkUrlDeepLink();
    window.addEventListener("hashchange", () => this.checkUrlDeepLink());
  }

  getFilteredEvents() {
    return this.events.filter(e => {
      const q = this.searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        e.title.toLowerCase().includes(q) ||
        (e.subtitle && e.subtitle.toLowerCase().includes(q)) ||
        (e.locationName && e.locationName.toLowerCase().includes(q)) ||
        (e.categoryLabel && e.categoryLabel.toLowerCase().includes(q)) ||
        (e.shortDescription && e.shortDescription.toLowerCase().includes(q))
      );
    });
  }

  updateMapMarkers() {
    const filtered = this.getFilteredEvents();
    this.map.renderMarkers(filtered);
    if (this.eventCountBadge) {
      this.eventCountBadge.textContent = `${filtered.length} локаций`;
    }
  }

  /* ------------------- ПОИСК ------------------- */
  initSearch() {
    if (!this.searchInput) return;

    this.searchInput.addEventListener("input", (e) => {
      this.searchQuery = e.target.value;
      if (this.searchClearBtn) {
        this.searchClearBtn.classList.toggle("hidden", !this.searchQuery);
      }
      this.renderSearchResults();
      this.updateMapMarkers();
    });

    if (this.searchClearBtn) {
      this.searchClearBtn.addEventListener("click", () => {
        this.searchInput.value = "";
        this.searchQuery = "";
        this.searchClearBtn.classList.add("hidden");
        this.searchResults.classList.add("hidden");
        this.updateMapMarkers();
      });
    }

    document.addEventListener("click", (e) => {
      if (!e.target.closest(".search-wrapper")) {
        this.searchResults?.classList.add("hidden");
      }
    });

    this.searchInput.addEventListener("focus", () => {
      if (this.searchQuery) {
        this.renderSearchResults();
      }
    });
  }

  renderSearchResults() {
    if (!this.searchResults) return;

    const filtered = this.getFilteredEvents();
    if (!this.searchQuery || filtered.length === 0) {
      if (this.searchQuery && filtered.length === 0) {
        this.searchResults.innerHTML = `
          <div class="p-4 text-center text-sm text-slate-400">
            Ничего не найдено по запросу «${this.searchQuery}»
          </div>
        `;
        this.searchResults.classList.remove("hidden");
      } else {
        this.searchResults.classList.add("hidden");
      }
      return;
    }

    this.searchResults.innerHTML = "";
    filtered.slice(0, 5).forEach(event => {
      const item = document.createElement("div");
      item.className = "search-result-item";
      item.innerHTML = `
        <div class="result-icon" style="background:${event.categoryColor}22; color:${event.categoryColor}">
          ${this.map.getIconSymbol(event.icon)}
        </div>
        <div class="result-info">
          <div class="result-title">${event.title}</div>
          <div class="result-meta">${event.categoryLabel} • ${event.locationName}</div>
        </div>
      `;

      item.addEventListener("click", () => {
        this.searchResults.classList.add("hidden");
        this.map.selectEvent(event);
      });

      this.searchResults.appendChild(item);
    });

    this.searchResults.classList.remove("hidden");
  }

  /* ------------------- СЛОИ КАРТЫ ------------------- */
  initLayerControls() {
    this.layerButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        this.layerButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const style = btn.dataset.layer;
        this.map.setTileLayer(style);

        if (this.mapToneToggleBtn) {
          if (style === "physical") {
            this.mapToneToggleBtn.classList.remove("hidden");
          } else {
            this.mapToneToggleBtn.classList.add("hidden");
          }
        }
      });
    });

    if (this.mapToneToggleBtn) {
      this.mapToneToggleBtn.addEventListener("click", () => {
        const currentTone = this.map.togglePhysicalTone();
        if (currentTone === "warm") {
          this.mapToneText.textContent = "Песочный рельеф";
          this.mapToneToggleBtn.title = "Палитра: Тёплый песок. Нажмите для переключения";
        } else {
          this.mapToneText.textContent = "Тёмный рельеф";
          this.mapToneToggleBtn.title = "Палитра: Тёмный графит. Нажмите для переключения";
        }
      });
    }
  }

  /* ------------------- ИНТЕРФЕЙС АВТОРИЗАЦИИ ------------------- */
  initAuthUI() {
    this.renderAuthBar(this.authService.getCurrentUser());

    // Переключение вкладок Вход / Регистрация
    if (this.authTabLoginBtn && this.authTabRegisterBtn) {
      this.authTabLoginBtn.addEventListener("click", () => {
        this.switchAuthTab("login");
      });
      this.authTabRegisterBtn.addEventListener("click", () => {
        this.switchAuthTab("register");
      });
    }

    // Закрытие модального окна авторизации
    if (this.closeAuthModalBtn) {
      this.closeAuthModalBtn.addEventListener("click", () => {
        this.closeAuthModal();
      });
    }

    if (this.authModal) {
      this.authModal.addEventListener("click", (e) => {
        if (e.target === this.authModal) {
          this.closeAuthModal();
        }
      });
    }

    // Отправка формы логина
    if (this.authLoginSubmitBtn) {
      this.authLoginSubmitBtn.addEventListener("click", () => {
        this.handleLogin();
      });
    }

    // Поддержка Enter в полях формы логина
    const loginUserField = document.getElementById("auth-login-username");
    const loginPassField = document.getElementById("auth-login-password");
    [loginUserField, loginPassField].forEach(field => {
      if (field) {
        field.addEventListener("keydown", (e) => {
          if (e.key === "Enter") this.handleLogin();
        });
      }
    });

    // Отправка формы регистрации
    if (this.authRegSubmitBtn) {
      this.authRegSubmitBtn.addEventListener("click", () => {
        this.handleRegister();
      });
    }
  }

  switchAuthTab(tab = "login") {
    if (tab === "login") {
      this.authTabLoginBtn.classList.add("active", "border-emerald-500", "text-white");
      this.authTabLoginBtn.classList.remove("border-transparent", "text-slate-400");
      this.authTabRegisterBtn.classList.remove("active", "border-emerald-500", "text-white");
      this.authTabRegisterBtn.classList.add("border-transparent", "text-slate-400");
      this.authLoginForm.classList.remove("hidden");
      this.authRegisterForm.classList.add("hidden");
    } else {
      this.authTabRegisterBtn.classList.add("active", "border-emerald-500", "text-white");
      this.authTabRegisterBtn.classList.remove("border-transparent", "text-slate-400");
      this.authTabLoginBtn.classList.remove("active", "border-emerald-500", "text-white");
      this.authTabLoginBtn.classList.add("border-transparent", "text-slate-400");
      this.authLoginForm.classList.add("hidden");
      this.authRegisterForm.classList.remove("hidden");
    }
    if (this.authLoginError) this.authLoginError.classList.add("hidden");
    if (this.authRegMsg) this.authRegMsg.classList.add("hidden");
  }

  renderAuthBar(user) {
    if (!this.authStatusContainer) return;

    if (!user) {
      // Гостевой режим (без аккаунта)
      this.authStatusContainer.innerHTML = `
        <button id="auth-trigger-btn" class="auth-login-trigger-btn" title="Войти для добавления и редактирования меток">
          <svg class="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/>
          </svg>
          <span>Войти</span>
        </button>
      `;

      const triggerBtn = document.getElementById("auth-trigger-btn");
      if (triggerBtn) {
        triggerBtn.addEventListener("click", () => {
          this.openAuthModal(false);
        });
      }
    } else {
      // Авторизованный пользователь / Администратор
      const isAdmin = user.role === "admin";
      this.authStatusContainer.innerHTML = `
        <div class="auth-user-chip ${isAdmin ? 'is-admin' : ''}" title="${isAdmin ? 'Полный доступ к редактированию меток' : 'Только просмотр'}">
          <span class="auth-role-pill ${user.role}">${isAdmin ? 'Администратор' : 'Пользователь'}</span>
          <span class="font-medium text-slate-200">${user.displayName || user.username}</span>
        </div>
        <button id="auth-change-pass-btn" class="auth-action-link-btn" title="Сменить пароль учетной записи">
          <span>🔑</span>
          <span>Пароль</span>
        </button>
        <button id="auth-logout-btn" class="auth-logout-btn" title="Выйти из учетной записи">
          Выйти
        </button>
      `;

      const changePassBtn = document.getElementById("auth-change-pass-btn");
      if (changePassBtn) {
        changePassBtn.addEventListener("click", () => {
          this.openChangePasswordModal();
        });
      }

      const logoutBtn = document.getElementById("auth-logout-btn");
      if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
          this.authService.logout();
          this.drawer.showToast("Вы вышли из учетной записи. Включен режим только просмотра.");
        });
      }
    }
  }

  openAuthModal(showNotice = false) {
    if (!this.authModal) return;
    if (this.authNotice) {
      this.authNotice.classList.toggle("hidden", !showNotice);
    }
    if (this.authLoginError) this.authLoginError.classList.add("hidden");
    if (this.authRegMsg) this.authRegMsg.classList.add("hidden");

    this.switchAuthTab("login");
    this.authModal.classList.remove("hidden");

    const usernameInput = document.getElementById("auth-login-username");
    if (usernameInput) {
      setTimeout(() => usernameInput.focus(), 100);
    }
  }

  closeAuthModal() {
    if (!this.authModal) return;
    this.authModal.classList.add("hidden");
  }

  handleLogin() {
    const userField = document.getElementById("auth-login-username");
    const passField = document.getElementById("auth-login-password");
    const username = userField?.value.trim() || "";
    const password = passField?.value || "";

    const result = this.authService.login(username, password);
    if (!result.success) {
      if (this.authLoginError) {
        this.authLoginError.textContent = result.message;
        this.authLoginError.classList.remove("hidden");
      }
      return;
    }

    this.closeAuthModal();
    if (userField) userField.value = "";
    if (passField) passField.value = "";

    const roleName = result.user.role === "admin" ? "Администратора" : "Пользователя";
    this.drawer.showToast(`Успешный вход в аккаунт ${roleName} (${result.user.displayName})!`);
  }

  handleRegister() {
    const userField = document.getElementById("auth-reg-username");
    const nameField = document.getElementById("auth-reg-name");
    const passField = document.getElementById("auth-reg-password");
    const roleField = document.getElementById("auth-reg-role");

    const username = userField?.value.trim() || "";
    const displayName = nameField?.value.trim() || username;
    const password = passField?.value || "";
    const role = roleField?.value || "user";

    const result = this.authService.register(username, password, displayName, role);
    if (!result.success) {
      if (this.authRegMsg) {
        this.authRegMsg.className = "text-xs p-2 rounded text-rose-400 bg-rose-950/30 border border-rose-800/40";
        this.authRegMsg.textContent = result.message;
        this.authRegMsg.classList.remove("hidden");
      }
      return;
    }

    this.closeAuthModal();
    if (userField) userField.value = "";
    if (nameField) nameField.value = "";
    if (passField) passField.value = "";

    this.drawer.showToast(`Аккаунт «${displayName}» успешно создан и активирован!`);
  }

  /* ------------------- СОЗДАНИЕ И РЕДАКТИРОВАНИЕ ТОЧКИ ------------------- */
  initEventFormModal() {
    if (!this.openAddEventBtn || !this.addEventModal) return;

    this.openAddEventBtn.addEventListener("click", () => {
      if (!this.authService.isAdmin()) {
        this.openAuthModal(true);
        return;
      }
      this.openCreateEventModal();
    });

    if (this.closeAddEventBtn) {
      this.closeAddEventBtn.addEventListener("click", () => {
        this.addEventModal.classList.add("hidden");
      });
    }

    this.addEventModal.addEventListener("click", (e) => {
      if (e.target === this.addEventModal) {
        this.addEventModal.classList.add("hidden");
      }
    });

    if (this.generateJsonBtn) {
      this.generateJsonBtn.addEventListener("click", () => {
        const formData = this.collectFormData();
        if (!formData) return;

        const jsonStr = JSON.stringify(formData, null, 2);
        if (this.jsonOutput) {
          this.jsonOutput.value = jsonStr;
          this.jsonOutput.classList.remove("hidden");
        }
        navigator.clipboard.writeText(jsonStr).then(() => {
          this.drawer.showToast("JSON код объекта скопирован в буфер!");
        });
      });
    }

    if (this.addLivePreviewBtn) {
      this.addLivePreviewBtn.addEventListener("click", () => {
        if (!this.authService.isAdmin()) {
          this.openAuthModal(true);
          return;
        }
        this.saveEventFormData();
      });
    }
  }

  openCreateEventModal() {
    if (this.editEventIdInput) this.editEventIdInput.value = "";
    if (this.modalEventFormTitle) this.modalEventFormTitle.textContent = "Добавить точку на карту";
    if (this.modalEventFormDesc) this.modalEventFormDesc.textContent = "Укажите параметры объекта для сохранения на карте.";
    if (this.saveEventBtnText) this.saveEventBtnText.textContent = "Нанести на карту";

    // Сброс полей формы
    document.getElementById("new-event-title").value = "";
    document.getElementById("new-event-subtitle").value = "";
    document.getElementById("new-event-category").value = "combat";
    document.getElementById("new-event-anim-type").value = "volcano";
    document.getElementById("new-event-lat").value = "";
    document.getElementById("new-event-lng").value = "";
    document.getElementById("new-event-location").value = "";
    document.getElementById("new-event-date").value = "";
    document.getElementById("new-event-short-desc").value = "";
    document.getElementById("new-event-full-desc").value = "";
    if (this.jsonOutput) this.jsonOutput.classList.add("hidden");

    this.addEventModal.classList.remove("hidden");
  }

  openEditEventModal(event) {
    if (!event) return;

    if (this.editEventIdInput) this.editEventIdInput.value = event.id;
    if (this.modalEventFormTitle) this.modalEventFormTitle.textContent = "Редактировать точку";
    if (this.modalEventFormDesc) this.modalEventFormDesc.textContent = "Измените необходимые сведения о событии или локации.";
    if (this.saveEventBtnText) this.saveEventBtnText.textContent = "Сохранить изменения";

    document.getElementById("new-event-title").value = event.title || "";
    document.getElementById("new-event-subtitle").value = event.subtitle || "";
    document.getElementById("new-event-category").value = event.category || "combat";
    document.getElementById("new-event-anim-type").value = event.animation?.type || "volcano";
    document.getElementById("new-event-lat").value = event.coords ? event.coords[0] : "";
    document.getElementById("new-event-lng").value = event.coords ? event.coords[1] : "";
    document.getElementById("new-event-location").value = event.locationName || "";
    document.getElementById("new-event-date").value = event.date || "";
    document.getElementById("new-event-short-desc").value = event.shortDescription || "";
    document.getElementById("new-event-full-desc").value = event.fullDescription || "";
    if (this.jsonOutput) this.jsonOutput.classList.add("hidden");

    this.addEventModal.classList.remove("hidden");
  }

  saveEventFormData() {
    const editId = this.editEventIdInput?.value.trim() || "";
    const eventData = this.collectFormData(editId || null);
    if (!eventData) return;

    if (editId) {
      // Режим обновления существующей точки
      const index = this.events.findIndex(e => e.id === editId);
      if (index !== -1) {
        this.events[index] = eventData;
        this.saveEvents();
        this.updateMapMarkers();
        this.addEventModal.classList.add("hidden");
        this.drawer.open(eventData, false);
        this.drawer.showToast(`Изменения для «${eventData.title}» успешно сохранены!`);
      }
    } else {
      // Режим создания новой точки
      this.events.push(eventData);
      this.saveEvents();
      this.updateMapMarkers();
      this.addEventModal.classList.add("hidden");
      this.map.selectEvent(eventData);
      this.drawer.showToast(`Объект «${eventData.title}» успешно нанесен на карту!`);
    }
  }

  collectFormData(existingId = null) {
    const title = document.getElementById("new-event-title")?.value.trim() || "Географическая точка";
    const subtitle = document.getElementById("new-event-subtitle")?.value.trim() || "Исторические сведения";
    const category = document.getElementById("new-event-category")?.value || "combat";
    const lat = parseFloat(document.getElementById("new-event-lat")?.value || 53.1327);
    const lng = parseFloat(document.getElementById("new-event-lng")?.value || 26.0139);
    const location = document.getElementById("new-event-location")?.value.trim() || "Барановичский регион";
    const date = document.getElementById("new-event-date")?.value.trim() || "1943–1944 гг.";
    const shortDesc = document.getElementById("new-event-short-desc")?.value.trim() || "";
    const fullDesc = document.getElementById("new-event-full-desc")?.value.trim() || shortDesc;
    const animType = document.getElementById("new-event-anim-type")?.value || "volcano";

    const categoryLabels = {
      combat: { label: "Боевые операции", color: "#ef4444", icon: "flame" },
      sabotage: { label: "Рельсовая война", color: "#d97706", icon: "atom" },
      defense: { label: "Оборона и переправы", color: "#2563eb", icon: "waves" },
      base: { label: "Партизанские базы", color: "#059669", icon: "tree" }
    };

    const catMeta = categoryLabels[category] || categoryLabels.combat;

    return {
      id: existingId || ("event-" + Date.now().toString(36)),
      title: title,
      subtitle: subtitle,
      category: category,
      categoryLabel: catMeta.label,
      categoryColor: catMeta.color,
      icon: catMeta.icon,
      coords: [lat, lng],
      locationName: location,
      date: date,
      shortDescription: shortDesc,
      fullDescription: fullDesc,
      highlights: [
        `Локация: ${location}`,
        `Период: ${date}`
      ],
      animation: {
        type: animType,
        speed: 1,
        title: `Тактическая схема: ${title}`,
        badge: catMeta.label
      }
    };
  }

  /* ------------------- УДАЛЕНИЕ ТОЧКИ ------------------- */
  initDeleteModal() {
    if (!this.deleteModal) return;

    if (this.closeDeleteModalBtn) {
      this.closeDeleteModalBtn.addEventListener("click", () => {
        this.closeDeleteModal();
      });
    }

    if (this.cancelDeleteModalBtn) {
      this.cancelDeleteModalBtn.addEventListener("click", () => {
        this.closeDeleteModal();
      });
    }

    this.deleteModal.addEventListener("click", (e) => {
      if (e.target === this.deleteModal) {
        this.closeDeleteModal();
      }
    });

    if (this.confirmDeleteModalBtn) {
      this.confirmDeleteModalBtn.addEventListener("click", () => {
        this.confirmDeleteEvent();
      });
    }
  }

  openDeleteEventModal(event) {
    if (!event) return;
    this.eventToDelete = event;
    if (this.deleteModalTitle) {
      this.deleteModalTitle.textContent = `${event.title} (${event.locationName})`;
    }
    this.deleteModal.classList.remove("hidden");
  }

  closeDeleteModal() {
    if (this.deleteModal) {
      this.deleteModal.classList.add("hidden");
    }
    this.eventToDelete = null;
  }

  confirmDeleteEvent() {
    if (!this.eventToDelete) return;
    const deletedTitle = this.eventToDelete.title;
    const deleteId = this.eventToDelete.id;

    this.events = this.events.filter(e => e.id !== deleteId);
    this.saveEvents();
    this.updateMapMarkers();
    this.drawer.close();
    this.closeDeleteModal();
    this.drawer.showToast(`Метка «${deletedTitle}» успешно удалена!`);
  }

  /* ------------------- СМЕНА ПАРОЛЯ ------------------- */
  initChangePasswordModal() {
    if (!this.changePassModal) return;

    if (this.closeCpModalBtn) {
      this.closeCpModalBtn.addEventListener("click", () => {
        this.closeChangePasswordModal();
      });
    }

    if (this.cancelCpBtn) {
      this.cancelCpBtn.addEventListener("click", () => {
        this.closeChangePasswordModal();
      });
    }

    this.changePassModal.addEventListener("click", (e) => {
      if (e.target === this.changePassModal) {
        this.closeChangePasswordModal();
      }
    });

    if (this.cpSubmitBtn) {
      this.cpSubmitBtn.addEventListener("click", () => {
        this.handleChangePassword();
      });
    }

    // Поддержка нажатия клавиши Enter
    [this.cpCurrentPass, this.cpNewPass, this.cpConfirmPass].forEach(input => {
      if (input) {
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") this.handleChangePassword();
        });
      }
    });
  }

  openChangePasswordModal() {
    if (!this.changePassModal) return;
    if (this.cpCurrentPass) this.cpCurrentPass.value = "";
    if (this.cpNewPass) this.cpNewPass.value = "";
    if (this.cpConfirmPass) this.cpConfirmPass.value = "";
    if (this.cpMsg) this.cpMsg.classList.add("hidden");

    this.changePassModal.classList.remove("hidden");
    if (this.cpCurrentPass) {
      setTimeout(() => this.cpCurrentPass.focus(), 100);
    }
  }

  closeChangePasswordModal() {
    if (!this.changePassModal) return;
    this.changePassModal.classList.add("hidden");
  }

  handleChangePassword() {
    const curPass = this.cpCurrentPass?.value || "";
    const newPass = this.cpNewPass?.value || "";
    const confPass = this.cpConfirmPass?.value || "";

    if (!curPass) {
      this.showCpMessage("Введите текущий пароль", true);
      return;
    }
    if (!newPass) {
      this.showCpMessage("Введите новый пароль", true);
      return;
    }
    if (newPass.length < 4) {
      this.showCpMessage("Новый пароль должен содержать не менее 4 символов", true);
      return;
    }
    if (newPass !== confPass) {
      this.showCpMessage("Новый пароль и подтверждение не совпадают", true);
      return;
    }

    const result = this.authService.changePassword(curPass, newPass);
    if (!result.success) {
      this.showCpMessage(result.message, true);
      return;
    }

    this.closeChangePasswordModal();
    this.drawer.showToast("Пароль успешно изменен!");
  }

  showCpMessage(msg, isError = true) {
    if (!this.cpMsg) return;
    this.cpMsg.textContent = msg;
    this.cpMsg.className = isError
      ? "text-xs p-2 rounded text-rose-400 bg-rose-950/30 border border-rose-800/40"
      : "text-xs p-2 rounded text-emerald-400 bg-emerald-950/30 border border-emerald-800/40";
    this.cpMsg.classList.remove("hidden");
  }

  /* ------------------- СВЯЗЬ ПО ХЭШУ ------------------- */
  checkUrlDeepLink() {
    const hash = window.location.hash;
    if (hash && hash.startsWith("#event-")) {
      const eventId = hash.replace("#event-", "");
      const found = this.events.find(e => e.id === eventId);
      if (found) {
        setTimeout(() => {
          this.map.selectEvent(found);
        }, 300);
      }
    }
  }

  /* ------------------- СПРАВОЧНОЕ ОКНО ("i") ------------------- */
  initInfoModal() {
    if (!this.infoModal || !this.openInfoModalBtn) return;

    this.openInfoModalBtn.addEventListener("click", () => {
      this.infoModal.classList.remove("hidden");
    });

    if (this.closeInfoModalBtn) {
      this.closeInfoModalBtn.addEventListener("click", () => {
        this.infoModal.classList.add("hidden");
      });
    }

    if (this.confirmInfoModalBtn) {
      this.confirmInfoModalBtn.addEventListener("click", () => {
        this.infoModal.classList.add("hidden");
      });
    }

    this.infoModal.addEventListener("click", (e) => {
      if (e.target === this.infoModal) {
        this.infoModal.classList.add("hidden");
      }
    });
  }
}

// Запуск приложения после загрузки DOM
window.addEventListener("DOMContentLoaded", () => {
  window.app = new App();
});
