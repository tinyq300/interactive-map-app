/**
 * Модуль управления картой Leaflet (Карта Барановичского региона и Беларуси)
 */

class InteractiveMap {
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.options = options;
    this.map = null;
    this.clusterGroup = null;
    this.markersMap = new Map();
    this.selectedEventId = null;
    this.onEventSelect = options.onEventSelect || (() => {});
    this.onMapClick = options.onMapClick || (() => {});

    // Координаты центра: Район боевых действий партизанских бригад (Дятлово - Слоним - Барановичи)
    this.defaultCenter = [53.3800, 25.6500];
    this.defaultZoom = 8.5;
    this.minZoomLevel = 8.5;

    // Строгие границы региона (Барановичская область, Гродненский восток, Дятлово, Слоним, Мир)
    this.regionBounds = L.latLngBounds(
      L.latLng(52.5, 23.8),
      L.latLng(54.2, 27.5)
    );

    // Топографическая и дорожная карта (OpenStreetMap) + Спутник высокой четкости (Esri)
    this.tileProviders = {
      physical: {
        name: "Физическая / Дорожная карта",
        url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        subdomains: ["a", "b", "c"],
        attribution: '&copy; OpenStreetMap contributors',
        maxNativeZoom: 19,
        maxZoom: 19,
        noWrap: false
      },
      satellite: {
        name: "Спутниковые снимки высокой четкости",
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar',
        maxNativeZoom: 18,
        maxZoom: 19,
        noWrap: false
      }
    };

    this.currentTileLayer = null;
    this.currentStyleKey = "physical";
    this.physicalTone = "dark"; // 'dark' (графитовый, 0% белого) или 'warm' (мягкий песочный)
    this.init();
  }

  calcMinZoom() {
    return this.minZoomLevel || 8.5;
  }

  init() {
    const minZ = this.calcMinZoom();

    // Инициализация карты с ограниченным отдалением и глубоким приближением
    this.map = L.map(this.containerId, {
      center: this.defaultCenter,
      zoom: this.defaultZoom,
      minZoom: minZ,
      maxZoom: 19,
      zoomSnap: 0.5,
      zoomDelta: 0.5,
      wheelPxPerZoomLevel: 65,
      zoomControl: false,
      attributionControl: false,
      worldCopyJump: false,
      maxBounds: this.regionBounds,
      maxBoundsViscosity: 0.9
    });

    // Зум в правый нижний угол
    L.control.zoom({ position: "bottomright" }).addTo(this.map);

    // Установка подробной карты по умолчанию
    this.setTileLayer("physical");

    // Инициализация группы кластеризации маркеров
    if (typeof L.markerClusterGroup === "function") {
      this.clusterGroup = L.markerClusterGroup({
        maxClusterRadius: 45,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        spiderfyOnMaxZoom: true,
        iconCreateFunction: (cluster) => {
          const count = cluster.getChildCount();
          return L.divIcon({
            html: `
              <div class="custom-cluster-marker">
                <div class="cluster-pulse"></div>
                <div class="cluster-inner">
                  <span>${count}</span>
                </div>
              </div>
            `,
            className: "custom-cluster-icon",
            iconSize: [40, 40],
            iconAnchor: [20, 20]
          });
        }
      });
      this.map.addLayer(this.clusterGroup);
    } else {
      this.clusterGroup = L.layerGroup().addTo(this.map);
    }

    // Клик по карте
    this.map.on("click", (e) => {
      this.onMapClick(e.latlng);
    });

    const updateMapDimensions = () => {
      if (!this.map) return;
      const newMinZoom = this.calcMinZoom();
      this.map.setMinZoom(newMinZoom);
      if (this.map.getZoom() < newMinZoom) {
        this.map.setZoom(newMinZoom);
      }
      this.map.invalidateSize();
    };

    // Пересчет размеров и минимального зума
    setTimeout(updateMapDimensions, 100);
    setTimeout(updateMapDimensions, 300);
    setTimeout(updateMapDimensions, 800);

    window.addEventListener("resize", updateMapDimensions);
  }

  setTileLayer(styleKey = "physical") {
    this.currentStyleKey = styleKey;
    const config = this.tileProviders[styleKey] || this.tileProviders.physical;
    if (this.currentTileLayer) {
      this.map.removeLayer(this.currentTileLayer);
    }

    const maxLayerZoom = config.maxZoom || 19;
    const minZoom = this.calcMinZoom();

    // Устанавливаем лимит приближения карты
    this.map.setMaxZoom(maxLayerZoom);
    this.map.setMinZoom(minZoom);
    if (this.map.getZoom() > maxLayerZoom) {
      this.map.setZoom(maxLayerZoom);
    }
    if (this.map.getZoom() < minZoom) {
      this.map.setZoom(minZoom);
    }

    const isPhysical = styleKey === "physical";
    const tileClassName = isPhysical 
      ? `physical-layer-tiles ${this.physicalTone === "warm" ? "warm-mode" : "dark-mode"}` 
      : "satellite-layer-tiles";

    this.currentTileLayer = L.tileLayer(config.url, {
      className: tileClassName,
      subdomains: config.subdomains || ["a", "b", "c", "d"],
      maxNativeZoom: config.maxNativeZoom || 19,
      maxZoom: maxLayerZoom,
      minZoom: minZoom,
      noWrap: false
    }).addTo(this.map);
  }

  setPhysicalTone(tone = "dark") {
    this.physicalTone = tone;
    if (this.currentTileLayer && this.currentStyleKey === "physical") {
      const container = this.currentTileLayer.getContainer();
      if (container) {
        container.className = `leaflet-layer physical-layer-tiles ${tone === "warm" ? "warm-mode" : "dark-mode"}`;
      }
    }
  }

  togglePhysicalTone() {
    const nextTone = this.physicalTone === "dark" ? "warm" : "dark";
    this.setPhysicalTone(nextTone);
    return nextTone;
  }

  renderMarkers(events) {
    this.clusterGroup.clearLayers();
    this.markersMap.clear();

    events.forEach((event) => {
      const icon = this.createCustomIcon(event, event.id === this.selectedEventId);
      const marker = L.marker(event.coords, {
        icon: icon,
        title: event.title,
        riseOnHover: true
      });

      marker.bindTooltip(`
        <div class="custom-tooltip">
          <div class="tooltip-category" style="color:${event.categoryColor}">${event.categoryLabel}</div>
          <div class="tooltip-title">${event.title}</div>
          <div class="tooltip-location">${event.locationName}</div>
          <div style="font-size:11px; color:#cbd5e1; margin-top:4px; max-width:260px; white-space:normal; line-height:1.35; border-top:1px solid rgba(255,255,255,0.1); padding-top:4px;">
            ${event.shortDescription}
          </div>
        </div>
      `, {
        direction: "top",
        offset: [0, -18],
        opacity: 0.98,
        className: "leaflet-custom-tooltip"
      });

      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        this.selectEvent(event);
      });

      this.clusterGroup.addLayer(marker);
      this.markersMap.set(event.id, { marker, event });
    });
  }

  createCustomIcon(event, isSelected = false) {
    const color = event.categoryColor || "#dc2626";
    const selectedClass = isSelected ? "is-selected" : "";
    const symbol = this.getIconSymbol(event.icon);

    const html = `
      <div class="map-marker-container ${selectedClass}" style="--marker-color: ${color}">
        <div class="marker-pin">
          <span class="marker-icon-inner">${symbol}</span>
        </div>
      </div>
    `;

    return L.divIcon({
      className: "custom-div-icon",
      html: html,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });
  }

  getIconSymbol(iconType) {
    switch (iconType) {
      case "flame": return "★";
      case "atom": return "◆";
      case "tree": return "▲";
      case "waves": return "═";
      case "sparkles": return "✦";
      case "compass": return "◈";
      default: return "●";
    }
  }

  selectEvent(event, fly = true) {
    this.selectedEventId = event.id;

    this.markersMap.forEach(({ marker, event: itemEvent }) => {
      const isSelected = itemEvent.id === event.id;
      marker.setIcon(this.createCustomIcon(itemEvent, isSelected));
    });

    if (fly) {
      const currentZoom = this.map.getZoom();
      const targetZoom = Math.min(Math.max(currentZoom, 13.5), 17);

      this.map.flyTo([event.coords[0], event.coords[1]], targetZoom, {
        duration: 0.8,
        easeLinearity: 0.25
      });
    }

    this.onEventSelect(event);
  }

  clearSelection() {
    this.selectedEventId = null;
    this.markersMap.forEach(({ marker, event }) => {
      marker.setIcon(this.createCustomIcon(event, false));
    });
  }

  resetView() {
    this.clearSelection();
    this.map.flyTo(this.defaultCenter, this.defaultZoom, { duration: 1.2 });
  }
}

window.InteractiveMap = InteractiveMap;
