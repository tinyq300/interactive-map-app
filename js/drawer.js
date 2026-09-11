/**
 * Модуль управления детальной информацией события (Секция под картой с ультра-плавным скроллом)
 */

function smoothScrollTo(targetY, duration = 750) {
  const startY = window.pageYOffset || document.documentElement.scrollTop;
  const difference = targetY - startY;
  if (Math.abs(difference) < 4) return;
  const startTime = performance.now();

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function step(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeProgress = easeInOutCubic(progress);
    window.scrollTo(0, startY + difference * easeProgress);

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }

  requestAnimationFrame(step);
}

class EventDrawer {
  constructor(sectionElement, canvasElement, options = {}) {
    this.section = sectionElement || document.getElementById("details-section");
    this.canvas = canvasElement || document.getElementById("section-event-canvas");
    this.visualizer = new window.EventVisualizer(this.canvas);
    this.currentEvent = null;
    this.isAdmin = false;
    this.onClose = options.onClose || (() => {});
    this.onEdit = options.onEdit || (() => {});
    this.onDelete = options.onDelete || (() => {});

    this.elements = {
      emptyState: document.getElementById("details-empty-state"),
      contentCard: document.getElementById("details-content-card"),
      categoryBadge: document.getElementById("section-category-badge"),
      dateBadge: document.getElementById("section-date-badge"),
      title: document.getElementById("section-title"),
      subtitle: document.getElementById("section-subtitle"),
      location: document.getElementById("section-location"),
      shortDesc: document.getElementById("section-short-desc"),
      fullDesc: document.getElementById("section-full-desc"),
      highlightsList: document.getElementById("section-highlights-list"),
      highlightsBox: document.getElementById("section-highlights-box"),
      coordsText: document.getElementById("section-coords-text"),
      copyCoordsBtn: document.getElementById("section-copy-coords-btn"),
      copyLinkBtn: document.getElementById("section-copy-link-btn"),
      scrollToMapBtn: document.getElementById("scroll-to-map-btn"),
      replayBtn: document.getElementById("section-anim-replay-btn"),
      speedSelect: document.getElementById("section-anim-speed-select"),
      animTitle: document.getElementById("section-anim-title"),
      adminActions: document.getElementById("admin-marker-actions"),
      editBtn: document.getElementById("section-edit-btn"),
      deleteBtn: document.getElementById("section-delete-btn")
    };

    this.initEvents();
  }

  initEvents() {
    if (this.elements.scrollToMapBtn) {
      this.elements.scrollToMapBtn.addEventListener("click", () => {
        smoothScrollTo(0, 650);
      });
    }

    if (this.elements.replayBtn) {
      this.elements.replayBtn.addEventListener("click", () => {
        if (this.currentEvent && this.currentEvent.animation) {
          this.visualizer.start(
            this.currentEvent.animation.type,
            this.currentEvent.categoryColor || "#3b82f6",
            parseFloat(this.elements.speedSelect?.value || 1)
          );
        }
      });
    }

    if (this.elements.speedSelect) {
      this.elements.speedSelect.addEventListener("change", (e) => {
        const speed = parseFloat(e.target.value);
        this.visualizer.setSpeed(speed);
      });
    }

    if (this.elements.copyCoordsBtn) {
      this.elements.copyCoordsBtn.addEventListener("click", () => {
        if (!this.currentEvent) return;
        const coordsStr = `${this.currentEvent.coords[0].toFixed(4)}, ${this.currentEvent.coords[1].toFixed(4)}`;
        navigator.clipboard.writeText(coordsStr).then(() => {
          this.showToast("Координаты скопированы в буфер!");
        });
      });
    }

    if (this.elements.copyLinkBtn) {
      this.elements.copyLinkBtn.addEventListener("click", () => {
        if (!this.currentEvent) return;
        const url = `${window.location.origin}${window.location.pathname}#event-${this.currentEvent.id}`;
        navigator.clipboard.writeText(url).then(() => {
          this.showToast("Прямая ссылка на событие скопирована!");
        });
      });
    }

    if (this.elements.editBtn) {
      this.elements.editBtn.addEventListener("click", () => {
        if (!this.currentEvent) return;
        this.onEdit(this.currentEvent);
      });
    }

    if (this.elements.deleteBtn) {
      this.elements.deleteBtn.addEventListener("click", () => {
        if (!this.currentEvent) return;
        this.onDelete(this.currentEvent);
      });
    }
  }

  updatePermissions(isAdmin) {
    this.isAdmin = !!isAdmin;
    if (this.elements.adminActions) {
      this.elements.adminActions.classList.toggle("hidden", !this.isAdmin);
    }
  }

  open(event, scrollDown = true) {
    this.currentEvent = event;

    if (this.elements.emptyState) {
      this.elements.emptyState.classList.add("hidden");
    }
    if (this.elements.contentCard) {
      this.elements.contentCard.classList.remove("hidden");
    }

    if (this.elements.adminActions) {
      this.elements.adminActions.classList.toggle("hidden", !this.isAdmin);
    }

    if (this.elements.categoryBadge) {
      this.elements.categoryBadge.textContent = event.categoryLabel || "Событие";
      this.elements.categoryBadge.style.backgroundColor = `${event.categoryColor || "#10b981"}22`;
      this.elements.categoryBadge.style.color = event.categoryColor || "#10b981";
      this.elements.categoryBadge.style.borderColor = `${event.categoryColor || "#10b981"}55`;
    }

    if (this.elements.dateBadge) this.elements.dateBadge.textContent = event.date || "1941–1944 гг.";
    if (this.elements.title) this.elements.title.textContent = event.title;
    if (this.elements.subtitle) this.elements.subtitle.textContent = event.subtitle;
    if (this.elements.location) this.elements.location.textContent = event.locationName;
    if (this.elements.shortDesc) this.elements.shortDesc.textContent = event.shortDescription;
    if (this.elements.fullDesc) this.elements.fullDesc.textContent = event.fullDescription;

    if (this.elements.coordsText) {
      this.elements.coordsText.textContent = `${event.coords[0].toFixed(4)}°, ${event.coords[1].toFixed(4)}°`;
    }

    if (this.elements.highlightsList) {
      this.elements.highlightsList.innerHTML = "";
      if (event.highlights && event.highlights.length > 0) {
        event.highlights.forEach(fact => {
          const li = document.createElement("li");
          li.className = "flex items-start gap-2 text-xs text-slate-300 py-0.5";
          li.innerHTML = `
            <span class="text-emerald-400 font-bold mt-0.5">•</span>
            <span>${fact}</span>
          `;
          this.elements.highlightsList.appendChild(li);
        });
        this.elements.highlightsBox?.classList.remove("hidden");
      } else {
        this.elements.highlightsBox?.classList.add("hidden");
      }
    }

    if (this.elements.animTitle) {
      this.elements.animTitle.textContent = event.animation?.title || "Визуализация события";
    }

    const animSpeed = parseFloat(this.elements.speedSelect?.value || event.animation?.speed || 1);
    this.visualizer.start(
      event.animation?.type || "volcano",
      event.categoryColor || "#ef4444",
      animSpeed
    );

    // Ультра-плавное пролистывание вниз к информации о выбранной точке
    if (scrollDown && this.section) {
      setTimeout(() => {
        const targetY = this.section.offsetTop;
        smoothScrollTo(targetY, 750);
      }, 80);
    }
  }

  close() {
    if (this.elements.emptyState) {
      this.elements.emptyState.classList.remove("hidden");
    }
    if (this.elements.contentCard) {
      this.elements.contentCard.classList.add("hidden");
    }
    this.visualizer.stop();
    this.currentEvent = null;

    if (window.location.hash.startsWith("#event-")) {
      window.history.replaceState(null, null, " ");
    }

    this.onClose();
  }

  isOpen() {
    return this.currentEvent !== null;
  }

  showToast(message, isError = false) {
    const toast = document.createElement("div");
    const borderColor = isError ? "border-red-600/50" : "border-slate-700";
    toast.className = `fixed bottom-6 right-6 z-[99999] bg-slate-900 text-slate-200 px-3.5 py-2 rounded-lg border ${borderColor} shadow-xl text-xs flex items-center gap-2 transform transition-all duration-300 translate-y-3 opacity-0`;
    toast.innerHTML = `<span>${message}</span>`;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.remove("translate-y-3", "opacity-0");
    });

    setTimeout(() => {
      toast.classList.add("translate-y-3", "opacity-0");
      setTimeout(() => toast.remove(), 300);
    }, 2200);
  }
}

window.EventDrawer = EventDrawer;

