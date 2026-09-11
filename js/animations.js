/**
 * Модуль тактических схем и реконструкций боевых операций (Canvas 60 FPS)
 * Тематика: Партизанское движение Беларуси (1942–1944 гг.)
 */

class EventVisualizer {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext("2d");
    this.animationFrameId = null;
    this.currentEffect = null;
    this.time = 0;
    this.speed = 1.0;
    this.isPlaying = false;
    this.color = "#dc2626";

    // Состояния эффектов
    this.particles = [];
    this.nodes = [];
    this.trainOffset = 0;
    this.radarAngle = 0;

    this.resize = this.resize.bind(this);
    window.addEventListener("resize", this.resize);
    this.resize();
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width > 0 ? rect.width : (this.canvas.parentElement?.clientWidth || 400);
    const height = rect.height > 0 ? rect.height : (this.canvas.parentElement?.clientHeight || 256);
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    if (this.ctx) {
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.scale(dpr, dpr);
    }
    this.width = width;
    this.height = height;
  }

  start(effectType = "assault", color = "#dc2626", speed = 1.0) {
    this.stop();
    this.resize();

    // Сопоставление старых и новых типов анимаций
    const typeMapping = {
      volcano: "assault",
      fireworks: "assault",
      cyber: "railway",
      radar: "recon",
      aurora: "forest_base",
      assault: "assault",
      railway: "railway",
      crossing: "crossing",
      forest_base: "forest_base",
      recon: "recon"
    };

    this.currentEffect = typeMapping[effectType] || "assault";
    this.color = color || "#dc2626";
    this.speed = speed || 1.0;
    this.isPlaying = true;
    this.time = 0;
    this.particles = [];
    this.nodes = [];
    this.trainOffset = 0;
    this.radarAngle = 0;

    switch (this.currentEffect) {
      case "assault":
        this.initAssault();
        break;
      case "railway":
        this.initRailway();
        break;
      case "crossing":
        this.initCrossing();
        break;
      case "forest_base":
        this.initForestBase();
        break;
      case "recon":
        this.initRecon();
        break;
      default:
        this.initAssault();
    }

    this.loop();
  }

  stop() {
    this.isPlaying = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.width || 400, this.height || 250);
    }
  }

  setSpeed(speed) {
    this.speed = speed;
  }

  drawTacticalGrid() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Сетка координат
    ctx.save();
    ctx.strokeStyle = "rgba(51, 65, 85, 0.25)";
    ctx.lineWidth = 0.5;

    const step = 32;
    for (let x = 0; x < w; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Угловые метки визира
    ctx.strokeStyle = "rgba(148, 163, 184, 0.4)";
    ctx.lineWidth = 1;
    const m = 8;
    const len = 10;
    ctx.beginPath(); ctx.moveTo(m, m + len); ctx.lineTo(m, m); ctx.lineTo(m + len, m); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w - m - len, m); ctx.lineTo(w - m, m); ctx.lineTo(w - m, m + len); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(m, h - m - len); ctx.lineTo(m, h - m); ctx.lineTo(m + len, h - m); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w - m - len, h - m); ctx.lineTo(w - m, h - m); ctx.lineTo(w - m, h - m - len); ctx.stroke();

    ctx.restore();
  }

  /* ------------------- 1. ШТУРМ И НАЛЕТ НА ГАРНИЗОН (ASSAULT) ------------------- */
  initAssault() {
    this.particles = [];
    this.time = 0;
  }

  renderAssault() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const cx = w * 0.5;
    const cy = h * 0.52;

    ctx.fillStyle = "rgba(10, 15, 26, 0.35)";
    ctx.fillRect(0, 0, w, h);
    this.drawTacticalGrid();

    this.time += 0.02 * this.speed;

    ctx.save();

    // 1. Опорный пункт врага (Гарнизон в центре)
    ctx.strokeStyle = "rgba(239, 68, 68, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(cx, cy, 38, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Внутренний блиндаж / укрепление
    ctx.fillStyle = "rgba(220, 38, 38, 0.15)";
    ctx.beginPath();
    ctx.arc(cx, cy, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Символ гарнизона
    ctx.fillStyle = "#f87171";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("ГАРНИЗОН", cx, cy - 2);

    // 2. Векторы партизанской атаки (Сходящиеся стрелы)
    const attackAngles = [Math.PI * 0.85, -Math.PI * 0.75, Math.PI * 0.15, -Math.PI * 0.15];
    const baseRadius = Math.min(w, h) * 0.42;

    attackAngles.forEach((angle, idx) => {
      const progress = ((this.time * 0.8 + idx * 0.25) % 1);
      const currentRadius = baseRadius - progress * (baseRadius - 38);

      const sx = cx + Math.cos(angle) * baseRadius;
      const sy = cy + Math.sin(angle) * baseRadius;
      const ex = cx + Math.cos(angle) * currentRadius;
      const ey = cy + Math.sin(angle) * currentRadius;

      ctx.strokeStyle = "rgba(248, 113, 113, 0.6)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      const headLen = 8;
      const headAngle = Math.atan2(ey - sy, ex - sx);
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex - headLen * Math.cos(headAngle - Math.PI / 6), ey - headLen * Math.sin(headAngle - Math.PI / 6));
      ctx.lineTo(ex - headLen * Math.cos(headAngle + Math.PI / 6), ey - headLen * Math.sin(headAngle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();

      ctx.font = "9px monospace";
      ctx.fillStyle = "rgba(226, 232, 240, 0.8)";
      ctx.fillText(`Отряд ${idx + 1}`, sx, sy - 6);
    });

    // 3. Вспышки и разрывы
    if (Math.random() < 0.25 * this.speed) {
      const offsetAngle = Math.random() * Math.PI * 2;
      const offsetDist = Math.random() * 32;
      this.particles.push({
        x: cx + Math.cos(offsetAngle) * offsetDist,
        y: cy + Math.sin(offsetAngle) * offsetDist,
        radius: Math.random() * 8 + 3,
        alpha: 1,
        decay: 0.04 * this.speed,
        color: Math.random() > 0.5 ? "#f97316" : "#facc15"
      });
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.alpha -= p.decay;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * (2 - p.alpha), 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Текстовая телеметрия
    ctx.globalAlpha = 1;
    ctx.font = "10px monospace";
    ctx.fillStyle = "rgba(148, 163, 184, 0.8)";
    ctx.textAlign = "left";
    ctx.fillText("[ШТУРМОВАЯ ОПЕРАЦИЯ]", 14, 20);
    ctx.fillText("[УДАРНЫЕ ГРУППЫ: 4 НАПРАВЛЕНИЯ]", 14, 34);

    ctx.restore();
  }

  /* ------------------- 2. РЕЛЬСОВАЯ ВОЙНА И ПОДРЫВ ЭШЕЛОНОВ (RAILWAY) ------------------- */
  initRailway() {
    this.trainOffset = -120;
    this.particles = [];
  }

  renderRailway() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const railY = h * 0.55;

    ctx.fillStyle = "rgba(10, 15, 26, 0.35)";
    ctx.fillRect(0, 0, w, h);
    this.drawTacticalGrid();

    this.time += 0.02 * this.speed;

    ctx.save();

    // Шпалы
    ctx.strokeStyle = "rgba(100, 116, 139, 0.45)";
    ctx.lineWidth = 3;
    for (let x = 10; x < w - 10; x += 14) {
      ctx.beginPath();
      ctx.moveTo(x, railY - 14);
      ctx.lineTo(x, railY + 14);
      ctx.stroke();
    }

    // Рельсы
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, railY - 8);
    ctx.lineTo(w, railY - 8);
    ctx.moveTo(0, railY + 8);
    ctx.lineTo(w, railY + 8);
    ctx.stroke();

    // Точка фугаса
    const blastX = w * 0.55;
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.arc(blastX, railY, 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "#f59e0b";
    ctx.font = "9px monospace";
    ctx.textAlign = "center";
    ctx.fillText("ФУГАС", blastX, railY - 24);

    // Движение эшелона
    this.trainOffset += 2.2 * this.speed;
    const trainX = this.trainOffset;

    if (trainX < blastX + 30) {
      ctx.fillStyle = "#334155";
      ctx.strokeStyle = "#64748b";
      ctx.lineWidth = 1;

      for (let v = 0; v < 3; v++) {
        const vx = trainX - v * 38;
        if (vx > -50 && vx < w + 50) {
          ctx.fillRect(vx - 32, railY - 10, 30, 20);
          ctx.strokeRect(vx - 32, railY - 10, 30, 20);
        }
      }

      if (trainX > -20 && trainX < w + 50) {
        ctx.fillStyle = "#475569";
        ctx.fillRect(trainX, railY - 12, 34, 24);
        ctx.strokeRect(trainX, railY - 12, 34, 24);
        ctx.fillStyle = "#94a3b8";
        ctx.fillRect(trainX + 22, railY - 16, 8, 8);
      }
    }

    if (trainX >= blastX - 10 && trainX <= blastX + 25) {
      for (let i = 0; i < 15; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = (Math.random() * 4 + 2) * this.speed;
        this.particles.push({
          x: blastX,
          y: railY,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          radius: Math.random() * 6 + 2,
          alpha: 1,
          decay: 0.035 * this.speed,
          color: Math.random() > 0.4 ? "#f59e0b" : "#ef4444"
        });
      }
    }

    if (this.trainOffset > w + 80) {
      this.trainOffset = -120;
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.font = "10px monospace";
    ctx.fillStyle = "rgba(148, 163, 184, 0.8)";
    ctx.textAlign = "left";
    ctx.fillText("[ДИВЕРСИЯ: РЕЛЬСОВАЯ ВОЙНА]", 14, 20);
    ctx.fillText("[СЕКТОР: ПОДРЫВ Ж/Д ПУТЕЙ И ЭШЕЛОНОВ]", 14, 34);

    ctx.restore();
  }

  /* ------------------- 3. ПЕРЕПРАВА И ПОДРЫВ МОСТА (CROSSING) ------------------- */
  initCrossing() {
    this.particles = [];
    this.time = 0;
  }

  renderCrossing() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.fillStyle = "rgba(10, 15, 26, 0.35)";
    ctx.fillRect(0, 0, w, h);
    this.drawTacticalGrid();

    this.time += 0.02 * this.speed;

    ctx.save();

    // Река
    const riverY = h * 0.52;
    ctx.fillStyle = "rgba(30, 58, 138, 0.25)";
    ctx.beginPath();
    ctx.moveTo(0, riverY - 30);
    ctx.bezierCurveTo(w * 0.3, riverY - 45, w * 0.7, riverY - 15, w, riverY - 35);
    ctx.lineTo(w, riverY + 35);
    ctx.bezierCurveTo(w * 0.7, riverY + 50, w * 0.3, riverY + 20, 0, riverY + 40);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(59, 130, 246, 0.3)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const shift = (this.time * 25 + i * 40) % w;
      ctx.beginPath();
      ctx.moveTo(shift, riverY - 10 + i * 8);
      ctx.lineTo(shift + 35, riverY - 10 + i * 8);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(147, 197, 253, 0.7)";
    ctx.font = "9px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("р. Щара / р. Неман", 14, riverY + 4);

    // Мост
    const bridgeX = w * 0.5;
    const bridgeW = 44;
    ctx.fillStyle = "#334155";
    ctx.strokeStyle = "#64748b";
    ctx.lineWidth = 2;
    ctx.fillRect(bridgeX - bridgeW / 2, riverY - 45, bridgeW, 90);
    ctx.strokeRect(bridgeX - bridgeW / 2, riverY - 45, bridgeW, 90);

    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(bridgeX - 16, riverY - 6);
    ctx.lineTo(bridgeX + 16, riverY + 6);
    ctx.stroke();

    // Удар партизан
    ctx.fillStyle = "#ef4444";
    ctx.strokeStyle = "rgba(239, 68, 68, 0.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bridgeX, riverY + 75);
    ctx.lineTo(bridgeX, riverY + 46);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bridgeX, riverY + 46);
    ctx.lineTo(bridgeX - 5, riverY + 54);
    ctx.lineTo(bridgeX + 5, riverY + 54);
    ctx.closePath();
    ctx.fill();

    ctx.font = "9px monospace";
    ctx.textAlign = "center";
    ctx.fillText("БРИГАДА + АРТИЛЛЕРИЯ", bridgeX, riverY + 88);

    if (Math.random() < 0.2 * this.speed) {
      this.particles.push({
        x: bridgeX + (Math.random() - 0.5) * 20,
        y: riverY + (Math.random() - 0.5) * 20,
        radius: Math.random() * 5 + 2,
        alpha: 1,
        decay: 0.04 * this.speed,
        color: Math.random() > 0.5 ? "#ef4444" : "#f59e0b"
      });
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.alpha -= p.decay;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.font = "10px monospace";
    ctx.fillStyle = "rgba(148, 163, 184, 0.8)";
    ctx.textAlign = "left";
    ctx.fillText("[ОПЕРАЦИЯ: БОЙ ЗА ПЕРЕПРАВУ]", 14, 20);
    ctx.fillText("[ПУТИ ОТСТУПЛЕНИЯ ВРАГА ПЕРЕРЕЗАНЫ]", 14, 34);

    ctx.restore();
  }

  /* ------------------- 4. ПАРТИЗАНСКИЙ КРАЙ И ШТАБНОЙ ЛАГЕРЬ (FOREST_BASE) ------------------- */
  initForestBase() {
    this.time = 0;
  }

  renderForestBase() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const cx = w * 0.5;
    const cy = h * 0.52;

    ctx.fillStyle = "rgba(10, 15, 26, 0.35)";
    ctx.fillRect(0, 0, w, h);
    this.drawTacticalGrid();

    this.time += 0.02 * this.speed;

    ctx.save();

    // Сектор пущи
    ctx.strokeStyle = "rgba(5, 150, 105, 0.35)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(cx, cy, 65, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "rgba(5, 150, 105, 0.6)";
    ctx.beginPath();
    ctx.arc(cx, cy, 40, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Штаб
    ctx.fillStyle = "rgba(6, 95, 70, 0.4)";
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = "#34d399";
    ctx.font = "9px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("ШТАБ", cx, cy - 2);

    // Заставы
    const postAngles = [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5];
    postAngles.forEach((ang, idx) => {
      const px = cx + Math.cos(ang + this.time * 0.3) * 65;
      const py = cy + Math.sin(ang + this.time * 0.3) * 65;

      ctx.fillStyle = "#10b981";
      ctx.beginPath();
      ctx.arc(px, py, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(148, 163, 184, 0.7)";
      ctx.font = "8px monospace";
      ctx.fillText(`Застава ${idx + 1}`, px, py - 6);
    });

    // Радиосвязь
    const radioRadius = ((this.time * 40) % 90);
    const radioAlpha = Math.max(0, 1 - radioRadius / 90);

    ctx.strokeStyle = `rgba(52, 211, 153, ${radioAlpha * 0.8})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, radioRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.font = "10px monospace";
    ctx.fillStyle = "rgba(148, 163, 184, 0.8)";
    ctx.textAlign = "left";
    ctx.fillText("[ПАРТИЗАНСКИЙ КРАЙ: ЛИПИЧАНСКАЯ ПУЩА]", 14, 20);
    ctx.fillText("[ДИСЛОКАЦИЯ: ШТАБ, ГОСПИТАЛЬ, ТИПОГРАФИЯ]", 14, 34);

    ctx.restore();
  }

  /* ------------------- 5. ПОДПОЛЬНАЯ СЕТЬ И РАЗВЕДКА (RECON) ------------------- */
  initRecon() {
    this.radarAngle = 0;
    this.nodes = [
      { x: 0.3, y: 0.35, label: "Агент «Сосна»" },
      { x: 0.7, y: 0.3, label: "Явка Столбцы" },
      { x: 0.65, y: 0.7, label: "Связная группа" },
      { x: 0.35, y: 0.68, label: "Подпольная ячейка" }
    ];
  }

  renderRecon() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const cx = w * 0.5;
    const cy = h * 0.52;

    ctx.fillStyle = "rgba(10, 15, 26, 0.35)";
    ctx.fillRect(0, 0, w, h);
    this.drawTacticalGrid();

    this.radarAngle += 0.025 * this.speed;

    ctx.save();

    // Сканирование
    ctx.strokeStyle = "rgba(71, 85, 105, 0.35)";
    ctx.lineWidth = 1;
    [30, 60, 90].forEach(r => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Связи
    ctx.strokeStyle = "rgba(124, 58, 237, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    this.nodes.forEach((node, idx) => {
      const nx = node.x * w;
      const ny = node.y * h;
      if (idx === 0) ctx.moveTo(nx, ny);
      else ctx.lineTo(nx, ny);
    });
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);

    // Узлы
    this.nodes.forEach(node => {
      const nx = node.x * w;
      const ny = node.y * h;

      ctx.fillStyle = "#8b5cf6";
      ctx.beginPath();
      ctx.arc(nx, ny, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#e2e8f0";
      ctx.font = "9px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(node.label, nx, ny - 7);
    });

    // Луч
    const rayLen = 95;
    const grad = ctx.createRadialGradient(cx, cy, 5, cx, cy, rayLen);
    grad.addColorStop(0, "rgba(139, 92, 246, 0.4)");
    grad.addColorStop(1, "rgba(139, 92, 246, 0)");

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, rayLen, this.radarAngle - 0.4, this.radarAngle);
    ctx.closePath();
    ctx.fill();

    ctx.font = "10px monospace";
    ctx.fillStyle = "rgba(148, 163, 184, 0.8)";
    ctx.textAlign = "left";
    ctx.fillText("[РАЗВЕДЫВАТЕЛЬНЫЙ СЕКТОР]", 14, 20);
    ctx.fillText("[АГЕНТУРНАЯ СЕТЬ И ПОДПОЛЬЕ]", 14, 34);

    ctx.restore();
  }

  loop() {
    if (!this.isPlaying) return;

    switch (this.currentEffect) {
      case "assault":
        this.renderAssault();
        break;
      case "railway":
        this.renderRailway();
        break;
      case "crossing":
        this.renderCrossing();
        break;
      case "forest_base":
        this.renderForestBase();
        break;
      case "recon":
        this.renderRecon();
        break;
      default:
        this.renderAssault();
    }

    this.animationFrameId = requestAnimationFrame(() => this.loop());
  }

  destroy() {
    this.stop();
    window.removeEventListener("resize", this.resize);
  }
}

window.EventVisualizer = EventVisualizer;
