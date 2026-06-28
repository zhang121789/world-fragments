const app = document.getElementById("app");
const scriptBasePath = (() => {
  const script = document.currentScript;
  if (!script) return "";
  const pathname = new URL(script.src, location.href).pathname;
  return pathname.replace(/\/[^/]*$/, "");
})();
const isStaticPagesMode = scriptBasePath.endsWith("/public") || location.hostname.endsWith("github.io");
const siteBasePath = scriptBasePath.endsWith("/public") ? scriptBasePath.slice(0, -7) : "";

function publicPath(value) {
  if (!value || /^(https?:|data:|blob:)/i.test(value)) return value;
  const clean = String(value).replace(/^\/+/, "");
  if (scriptBasePath.endsWith("/public")) return `${scriptBasePath}/${clean}`;
  return `/${clean}`;
}

function sitePath(value) {
  const clean = String(value || "").replace(/^\/+/, "");
  return siteBasePath ? `${siteBasePath}/${clean}` : `/${clean}`;
}

function adminHref() {
  return isStaticPagesMode ? sitePath("/admin/") : "/admin";
}

function normalizeStaticMediaUrl(value) {
  if (typeof value !== "string") return value;
  if (value.startsWith("/assets/") || value.startsWith("/uploads/")) return publicPath(value);
  return value;
}

function normalizeSiteMediaUrls(site) {
  if (!site || !isStaticPagesMode) return site;
  const visit = (value) => {
    if (Array.isArray(value)) return value.forEach(visit);
    if (!value || typeof value !== "object") return;
    Object.keys(value).forEach((key) => {
      if (typeof value[key] === "string") {
        value[key] = normalizeStaticMediaUrl(value[key]);
      } else {
        visit(value[key]);
      }
    });
  };
  visit(site);
  return site;
}

const state = {
  site: null,
  worldMapPaths: null,
  countryRegionMaps: {},
  currentDestinationId: null,
  currentPhotoIndex: 0,
  timer: null,
  captionSaveTimer: null,
  footprintPanelHideTimer: null,
  isEditingCaption: false,
  isSwitching: false,
  homeLoaderShown: false,
  homeEffectCleanup: null
};

const fallbackImage = publicPath("/assets/new-zealand-1.png");
const STATIC_ASSET_VERSION = "20260626";
const HOME_TRANSITION_DURATION = 1050;
const REDUCED_MOTION_TRANSITION_DURATION = 260;
const DEFAULT_CAPTION_HEIGHT = 116;
const MIN_CAPTION_HEIGHT = 96;
const MAX_CAPTION_HEIGHT_RATIO = 0.32;
const countryRegionMapAssets = {
  CN: publicPath("/assets/china-regions-paths.json"),
  NZ: publicPath("/assets/new-zealand-regions-paths.json")
};
const countryRegionNameFallbacks = {
  NZ: {
    "NZ-NTL": "Northland",
    "NZ-AUK": "Auckland",
    "NZ-WKO": "Waikato",
    "NZ-BOP": "Bay of Plenty",
    "NZ-GIS": "Gisborne",
    "NZ-HKB": "Hawke's Bay",
    "NZ-TKI": "Taranaki",
    "NZ-MWT": "Manawatu-Wanganui",
    "NZ-WGN": "Wellington",
    "NZ-TAS": "Tasman",
    "NZ-NSN": "Nelson",
    "NZ-MBH": "Marlborough",
    "NZ-WTC": "West Coast",
    "NZ-CAN": "Canterbury",
    "NZ-OTA": "Otago",
    "NZ-STL": "Southland"
  }
};
const homeGlowTiers = {
  chengdu: "glow-level-1",
  guiyang: "glow-level-2",
  harbin: "glow-level-1",
  qinhuangdao: "glow-level-2",
  sanya: "glow-level-3",
  taizhou: "glow-level-1",
  xinjiang: "glow-level-3",
  "new-zealand": "glow-level-2",
  yunnan: "glow-level-1"
};
const homeGlowOffsets = {
  chengdu: { x: -1.08, y: 0.34, rotate: -18 },
  guiyang: { x: 0.54, y: 1.08, rotate: 29 },
  harbin: { x: 1.16, y: -0.74, rotate: -44 },
  qinhuangdao: { x: -0.48, y: -1.08, rotate: 12 },
  sanya: { x: 1.34, y: 0.64, rotate: -31 },
  taizhou: { x: 0.72, y: -0.34, rotate: 46 },
  xinjiang: { x: -1.28, y: -1.12, rotate: 21 },
  "new-zealand": { x: -0.88, y: 0.28, rotate: -12 },
  yunnan: { x: -0.72, y: 0.96, rotate: 38 }
};
function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function multilineHtml(value) {
  return escapeHtml(value).replace(/\r?\n/g, "<br>");
}

function safeColor(value, fallback = "#5DADE2") {
  return /^#[0-9a-f]{6}$/i.test(String(value || "")) ? value : fallback;
}

function maxCaptionHeight() {
  return Math.max(MIN_CAPTION_HEIGHT, Math.round((window.innerHeight || 720) * MAX_CAPTION_HEIGHT_RATIO));
}

function normalizeCaptionHeight(value) {
  const height = Number(value);
  if (!Number.isFinite(height) || height <= 0) return DEFAULT_CAPTION_HEIGHT;
  return Math.round(clamp(height, MIN_CAPTION_HEIGHT, maxCaptionHeight()));
}

function applyCaptionHeight(node, photo) {
  if (!node) return;
  node.style.height = `${normalizeCaptionHeight(photo?.captionHeight)}px`;
}

function syncCaptionVisibility(node, saveNode, value, editing = false) {
  if (!node) return;
  const isEmpty = !String(value || "").trim();
  const hide = isEmpty && !editing;
  node.hidden = hide;
  node.classList.toggle("is-empty", hide);
  if (saveNode) saveNode.hidden = hide;
}

function prefersReducedMotion() {
  return Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
}

function normalizePhotoRotation(value) {
  const rotation = Number(value);
  if (!Number.isFinite(rotation)) return 0;
  return ((rotation % 360) + 360) % 360;
}

function coverPhotoFor(destination) {
  const photos = Array.isArray(destination.photos) ? destination.photos : [];
  return photos.find((photo) => photo.cover)
    || photos.find((photo) => photo.src === destination.cover)
    || photos[0]
    || { src: destination.cover || fallbackImage, rotation: 0 };
}

function fitDetailPhoto(image, rotation = 0) {
  const media = image?.closest(".detail-media");
  if (!image || !media || !image.naturalWidth || !image.naturalHeight) return;

  const mediaBox = media.getBoundingClientRect();
  const mediaWidth = Math.max(1, mediaBox.width);
  const mediaHeight = Math.max(1, mediaBox.height);
  const normalizedRotation = normalizePhotoRotation(rotation);
  const sideways = normalizedRotation === 90 || normalizedRotation === 270;
  const visibleNaturalWidth = sideways ? image.naturalHeight : image.naturalWidth;
  const visibleNaturalHeight = sideways ? image.naturalWidth : image.naturalHeight;
  const visibleRatio = visibleNaturalWidth / visibleNaturalHeight;
  const mediaRatio = mediaWidth / mediaHeight;

  let visibleWidth;
  let visibleHeight;
  if (mediaRatio > visibleRatio) {
    visibleHeight = mediaHeight;
    visibleWidth = visibleHeight * visibleRatio;
  } else {
    visibleWidth = mediaWidth;
    visibleHeight = visibleWidth / visibleRatio;
  }

  const elementWidth = sideways ? visibleHeight : visibleWidth;
  const elementHeight = sideways ? visibleWidth : visibleHeight;
  image.style.setProperty("--photo-fit-width", `${elementWidth}px`);
  image.style.setProperty("--photo-fit-height", `${elementHeight}px`);
}

function fitCurrentDetailPhoto() {
  const destination = destinationById(state.currentDestinationId);
  const image = app.querySelector("#heroPhoto");
  if (!destination || !image) return;
  const photos = photosFor(destination);
  const photo = photos[state.currentPhotoIndex] || photos[0] || {};
  fitDetailPhoto(image, photo.rotation || 0);
}

function formatTravelTimeValue(value, fallback = "") {
  const text = String(value || "").trim();
  if (!text || /旅行记忆|待补充|回忆/.test(text)) return fallback;

  const match = text.match(/(19\d{2}|20\d{2})\s*(?:年|-|\/|\.)\s*(1[0-2]|0?[1-9])/);
  if (match) return `${match[1]}.${String(Number(match[2])).padStart(2, "0")}`;

  const yearOnly = text.match(/(19\d{2}|20\d{2})/);
  if (yearOnly) return yearOnly[1];

  return text;
}

function formatMonthLabel(value) {
  return formatTravelTimeValue(value, "时间待补充");
}

function formatTravelTime(destination) {
  return formatTravelTimeValue(destination?.travelTime || "");
}

const DEFAULT_MAP_CONFIG = {
  bounds: {
    north: 108,
    south: -65,
    west: -190,
    east: 190
  },
  calibration: {
    xOffset: 0,
    yOffset: 0,
    xScale: 1,
    yScale: 1
  }
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeLongitude(value) {
  let lng = Number(value);
  if (!Number.isFinite(lng)) return null;
  while (lng < -180) lng += 360;
  while (lng > 180) lng -= 360;
  return lng;
}

function mapConfig() {
  const configured = state.site?.map || {};
  const bounds = configured.bounds || {};
  const calibration = configured.calibration || {};
  return {
    bounds: {
      north: Number(bounds.north ?? DEFAULT_MAP_CONFIG.bounds.north),
      south: Number(bounds.south ?? DEFAULT_MAP_CONFIG.bounds.south),
      west: Number(bounds.west ?? DEFAULT_MAP_CONFIG.bounds.west),
      east: Number(bounds.east ?? DEFAULT_MAP_CONFIG.bounds.east)
    },
    calibration: {
      xOffset: Number(calibration.xOffset ?? DEFAULT_MAP_CONFIG.calibration.xOffset),
      yOffset: Number(calibration.yOffset ?? DEFAULT_MAP_CONFIG.calibration.yOffset),
      xScale: Number(calibration.xScale ?? DEFAULT_MAP_CONFIG.calibration.xScale),
      yScale: Number(calibration.yScale ?? DEFAULT_MAP_CONFIG.calibration.yScale)
    }
  };
}

function projectGeoToMap(geo) {
  if (!geo) return null;
  const lat = Number(geo.lat);
  const lng = normalizeLongitude(geo.lng);
  if (!Number.isFinite(lat) || lng === null) return null;

  const config = mapConfig();
  const { bounds, calibration } = config;
  const longitudeSpan = bounds.east - bounds.west || 360;
  const latitudeSpan = bounds.north - bounds.south || 180;

  const rawX = ((lng - bounds.west) / longitudeSpan) * 100;
  const rawY = ((bounds.north - lat) / latitudeSpan) * 100;
  const x = 50 + (rawX - 50) * calibration.xScale + calibration.xOffset;
  const y = 50 + (rawY - 50) * calibration.yScale + calibration.yOffset;

  return {
    x: clamp(x, 0.5, 99.5),
    y: clamp(y, 0.5, 99.5)
  };
}

function manualMapPosition(coords) {
  const x = Number(coords?.x);
  const y = Number(coords?.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return {
    x: clamp(x, 0.5, 99.5),
    y: clamp(y, 0.5, 99.5)
  };
}

function markerPosition(destination) {
  const manual = manualMapPosition(destination.coords);
  if (manual) return manual;
  const projected = projectGeoToMap(destination.geo);
  if (projected) return projected;
  return {
    x: clamp(Number(destination.coords?.x || 50), 0.5, 99.5),
    y: clamp(Number(destination.coords?.y || 50), 0.5, 99.5)
  };
}

function visibleDestinations() {
  return (state.site?.destinations || []).filter((item) => item.visible !== false);
}

function destinationById(id) {
  return (state.site?.destinations || []).find((item) => item.id === id) || visibleDestinations()[0];
}

function photoText(destination, photo) {
  const text = String(photo?.caption || "").trim();
  return text;
}

function route() {
  const match = location.hash.match(/^#destination\/([^/]+)$/);
  const footprintMatch = location.hash.match(/^#footprints(?:\/([^/]+))?$/);
  if (match) {
    showDestination(decodeURIComponent(match[1]), 0);
  } else if (footprintMatch) {
    showFootprints(footprintMatch[1] ? decodeURIComponent(footprintMatch[1]) : "");
  } else if (location.hash === "#map") {
    showMapPicker();
  } else {
    showHome();
  }
}

function setDocumentTitle(text) {
  document.title = text ? `${text}｜世界碎片` : "世界碎片";
}

async function loadSite() {
  const url = isStaticPagesMode ? sitePath("/data/site.json") : "/api/site";
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("读取网站数据失败。");
  state.site = await response.json();
  normalizeSiteMediaUrls(state.site);
}

function showHome() {
  clearTimer();
  state.currentDestinationId = null;
  setDocumentTitle("");
  document.body.style.removeProperty("--accent");

  const theme = state.site.theme || {};
  const siteTitle = theme.title || "世界碎片";
  const homeTitle = theme.tagline || "世界是完整的\n我们在路上，收集碎片";
  const homeSubtitle = theme.subtitle || "风景、人物、故事与偶然相遇\n都被收藏成独一无二的记忆碎片";
  const destinations = visibleDestinations();

  app.innerHTML = `
    <main class="home-view">
      <section id="map" class="world-stage" aria-label="世界地图">
        <header class="topbar">
          <button class="brand-button" data-home>
            <span>${escapeHtml(siteTitle)}</span>
            <span>World Fragments</span>
          </button>
          <nav class="topnav" aria-label="主导航">
            <a href="#map">碎片</a>
            <a href="#footprints">足迹</a>
            <a href="${adminHref()}">后台</a>
          </nav>
        </header>
        <div class="map-backdrop"></div>
        <div class="visited-glow-layer" aria-label="去过的地点">
          ${destinations.map((destination, index) => visitedGlowTemplate(destination, index)).join("")}
        </div>
        <div class="home-copy">
          <h1>${multilineHtml(homeTitle)}</h1>
          <p class="home-subtitle">${multilineHtml(homeSubtitle)}</p>
          ${destinations.length ? '<button class="fragment-entry" data-start-fragments>开始探索</button>' : ""}
        </div>
      </section>
    </main>
  `;

  app.querySelectorAll("[data-open-destination]").forEach((button) => {
    button.addEventListener("click", () => playHomeDestinationTransition(button.dataset.openDestination, button));
  });
  app.querySelector("[data-home]")?.addEventListener("click", () => {
    history.replaceState(null, "", location.pathname);
    showHome();
  });
  app.querySelector("[data-start-fragments]")?.addEventListener("click", () => {
    location.hash = "#map";
  });
}

function showMapPicker() {
  clearTimer();
  state.currentDestinationId = null;
  setDocumentTitle("碎片");
  document.body.style.removeProperty("--accent");

  const theme = state.site.theme || {};
  const siteTitle = theme.title || "世界碎片";
  const destinations = visibleDestinations();

  app.innerHTML = `
    <main class="home-view map-picker-view">
      <section id="map" class="world-stage map-picker-stage" aria-label="目的地碎片">
        <header class="topbar">
          <button class="brand-button" data-home>
            <span>${escapeHtml(siteTitle)}</span>
            <span>World Fragments</span>
          </button>
          <nav class="topnav" aria-label="主导航">
            <a href="#map">碎片</a>
            <a href="#footprints">足迹</a>
            <a href="${adminHref()}">后台</a>
          </nav>
        </header>
        <button class="fragment-back-home" data-home aria-label="返回地图">
          返回地图
        </button>
        <div class="fragment-picker-shell">
          <div class="map-picker-heading">
            <p>${escapeHtml(siteTitle)}</p>
            <span>选择一个地点，打开一段旅程记忆</span>
          </div>
          <button class="fragment-scroll-button fragment-scroll-prev" data-fragment-scroll="prev" aria-label="向左浏览碎片"></button>
          <button class="fragment-scroll-button fragment-scroll-next" data-fragment-scroll="next" aria-label="向右浏览碎片"></button>
          <div class="fragment-card-grid" data-fragment-grid aria-label="目的地卡牌">
            ${destinations.map((destination, index) => destinationExploreCardTemplate(destination, index)).join("")}
          </div>
        </div>
      </section>
    </main>
  `;

  app.querySelectorAll("[data-open-destination]").forEach((button) => {
    button.addEventListener("click", () => openDestination(button.dataset.openDestination));
  });
  app.querySelectorAll("[data-home]").forEach((button) => button.addEventListener("click", () => {
    history.replaceState(null, "", location.pathname);
    showHome();
  }));

  const fragmentGrid = app.querySelector("[data-fragment-grid]");
  let currentCardFrame = null;
  const updateCurrentFragmentCard = () => {
    if (!fragmentGrid) return;
    const cards = [...fragmentGrid.querySelectorAll("[data-fragment-card]")];
    if (!cards.length) return;
    const gridRect = fragmentGrid.getBoundingClientRect();
    const gridCenter = gridRect.left + gridRect.width / 2;
    let closestCard = cards[0];
    let closestDistance = Number.POSITIVE_INFINITY;
    cards.forEach((card) => {
      const cardRect = card.getBoundingClientRect();
      const cardCenter = cardRect.left + cardRect.width / 2;
      const distance = Math.abs(cardCenter - gridCenter);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestCard = card;
      }
    });
    cards.forEach((card) => card.classList.toggle("is-current", card === closestCard));
  };
  const scheduleCurrentCardUpdate = () => {
    if (currentCardFrame) cancelAnimationFrame(currentCardFrame);
    currentCardFrame = requestAnimationFrame(updateCurrentFragmentCard);
  };
  updateCurrentFragmentCard();
  fragmentGrid?.addEventListener("scroll", scheduleCurrentCardUpdate, { passive: true });
  window.addEventListener("resize", scheduleCurrentCardUpdate, { passive: true });

  app.querySelectorAll("[data-fragment-scroll]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!fragmentGrid) return;
      const direction = button.dataset.fragmentScroll === "next" ? 1 : -1;
      const scrollAmount = Math.max(fragmentGrid.clientWidth * 0.42, 260);
      fragmentGrid.scrollBy({
        left: direction * scrollAmount,
        behavior: "smooth"
      });
    });
  });
}

function footprintData() {
  return state.site?.footprints && typeof state.site.footprints === "object"
    ? state.site.footprints
    : {};
}

function footprintCountries() {
  const configured = Array.isArray(footprintData().countries) ? footprintData().countries : [];
  if (configured.length) {
    return configured.filter((country) => country?.hasFootprint !== false);
  }

  const destinations = state.site?.destinations || [];
  const groups = new Map();
  destinations.forEach((destination) => {
    const isChina = String(destination.country || "").includes("中国");
    const code = isChina ? "CN" : (destination.id === "new-zealand" ? "NZ" : "OTHER");
    if (!groups.has(code)) {
      groups.set(code, {
        countryCode: code,
        countryName: isChina ? "中国" : (destination.country || destination.name),
        englishName: code === "CN" ? "China" : (destination.englishName || destination.country || destination.name),
        themeColor: code === "CN" ? "#D8B36A" : safeColor(destination.color),
        hasFootprint: true,
        enabled: true,
        destinations: []
      });
    }
    groups.get(code).destinations.push(destination.id);
  });

  return [...groups.values()].filter((country) => country.countryCode !== "OTHER");
}

function footprintCountryByCode(code) {
  const countries = footprintCountries();
  return countries.find((country) => country.countryCode === code) || countries[0];
}

function footprintCountryColor(country) {
  return safeColor(country?.themeColor || country?.color || "#D8B36A", "#D8B36A");
}

function footprintCountryPosition(country, index = 0) {
  const manual = manualMapPosition(country?.position);
  if (manual) return manual;

  const firstDestination = (state.site?.destinations || []).find((destination) => {
    return countryDestinationIds(country).includes(destination.id);
  });
  if (firstDestination) return markerPosition(firstDestination);

  const fallback = [
    { x: 76.8, y: 45.6 },
    { x: 91.8, y: 78.8 },
    { x: 80.8, y: 41.6 },
    { x: 58.4, y: 40.2 }
  ];
  return fallback[index % fallback.length];
}

function countryDestinationIds(country) {
  const direct = Array.isArray(country?.destinations) ? country.destinations : [];
  const fromRegions = (Array.isArray(country?.regions) ? country.regions : []).flatMap((region) => {
    return Array.isArray(region.destinations)
      ? region.destinations.map((item) => typeof item === "string" ? item : item.id)
      : [];
  });
  return [...new Set([...direct, ...fromRegions].filter(Boolean))];
}

function splitFootprintCityNames(value) {
  return String(value || "")
    .split(/[、，,;；/／|｜\s]+/u)
    .map((name) => name.trim())
    .filter(Boolean);
}

function localizedCountryName(code, fallback = "") {
  const regionCode = String(code || "").toUpperCase();
  try {
    const display = new Intl.DisplayNames(["zh-CN"], { type: "region" }).of(regionCode);
    if (display && display !== regionCode) return display;
  } catch (error) {
    // Browser support fallback: use the map's built-in English label.
  }
  return fallback || regionCode;
}

function footprintRegionCityNames(regions, country = null) {
  const cityNames = new Set();
  const countryNames = new Set([country?.countryName, country?.englishName, country?.countryCode].filter(Boolean));
  regions.forEach((region) => {
    if (footprintRegionStatus(region) === "unvisited") return;
    splitFootprintCityNames(region.visitedCities).forEach((name) => cityNames.add(name));
    (Array.isArray(region.destinations) ? region.destinations : []).forEach((item) => {
      const id = typeof item === "string" ? item : item.id;
      const destination = destinationById(id);
      const name = typeof item === "object" && item?.name ? item.name : destination?.name;
      if (name && !countryNames.has(name)) cityNames.add(name);
    });
  });
  return [...cityNames];
}

function footprintWorldStats(countries) {
  const cityNames = new Set();
  const litCountries = countries.filter((country) => {
    const regions = footprintRegions(country);
    return regions.some((region) => footprintRegionStatus(region) !== "unvisited")
      || countryDestinationIds(country).length > 0;
  });

  litCountries.forEach((country) => {
    footprintRegionCityNames(footprintRegions(country), country).forEach((name) => cityNames.add(name));
  });

  return {
    countryCount: litCountries.length,
    cityCount: cityNames.size
  };
}

function footprintRegions(country) {
  if (Array.isArray(country?.regions) && country.regions.length) return country.regions;

  const destinations = state.site?.destinations || [];
  return destinations
    .filter((destination) => countryDestinationIds(country).includes(destination.id))
    .map((destination, index) => ({
      regionCode: `${country?.countryCode || "XX"}-${destination.id}`,
      regionName: destination.name,
      englishName: destination.englishName || "",
      status: "collected",
      position: fallbackRegionPosition(index, destinations.length),
      destinations: [{
        id: destination.id,
        name: destination.name,
        date: formatTravelTime(destination),
        title: `${photosFor(destination).length} 张碎片`
      }]
    }));
}

function fallbackRegionPosition(index, total = 1) {
  const columns = Math.min(4, Math.max(2, Math.ceil(Math.sqrt(total || 1))));
  const rows = Math.ceil((total || 1) / columns);
  const column = index % columns;
  const row = Math.floor(index / columns);
  return {
    x: 14 + column * (72 / Math.max(columns - 1, 1)),
    y: 18 + row * (62 / Math.max(rows - 1, 1)),
    w: 19,
    h: 14
  };
}

function showFootprints(countryCode = "") {
  if (countryCode) {
    showFootprintCountry(countryCode);
    return;
  }
  showFootprintWorld();
}

function showFootprintWorld() {
  clearTimer();
  state.currentDestinationId = null;
  setDocumentTitle("足迹");
  document.body.style.removeProperty("--accent");

  const countries = footprintCountries();
  const sampleCount = Math.max(countries.length, Number(footprintData().countryCount || countries.length));
  const stats = footprintWorldStats(countries);
  const footprintsTitle = footprintData().title || "足迹";
  const footprintsSubtitle = footprintData().description || "记录走过的国家与城市，点亮属于自己的世界地图。";

  app.innerHTML = `
    <main class="home-view footprints-view">
      <section class="footprints-dashboard footprints-world-dashboard" aria-label="足迹世界地图">
        <header class="footprints-dashboard-top">
          <button class="footprints-brand" type="button" data-home>
            <span class="footprints-brand-mark"></span>
            <span>My Footprints</span>
          </button>
          <nav class="footprints-nav" aria-label="主导航">
            <a href="#map">碎片</a>
            <a href="#footprints" aria-current="page">足迹</a>
            <a href="${adminHref()}">后台</a>
          </nav>
        </header>
        <div class="footprints-dashboard-body">
          <aside class="footprint-country-sidebar" aria-label="足迹国家列表">
            <div class="footprint-sidebar-title">
              <span>足迹国家</span>
              <strong>${sampleCount}</strong>
            </div>
            <label class="footprint-search">
              <span></span>
              <input type="search" placeholder="搜索国家" aria-label="搜索国家">
            </label>
            <div class="footprint-country-list">
              ${countries.map((country) => footprintCountryListItemTemplate(country)).join("")}
            </div>
          </aside>
          <div class="footprint-map-canvas footprint-world-canvas" aria-label="世界足迹总览">
            <div class="footprint-world-heading">
              <p>${escapeHtml(footprintsTitle)}</p>
              <span>${escapeHtml(footprintsSubtitle)}</span>
            </div>
            <div class="footprint-world-map" data-world-map>
              <div class="footprint-map-loading">正在展开足迹地图</div>
            </div>
            <div class="footprint-world-legend footprint-world-stats" aria-label="足迹统计">
              <span>共点亮 <strong>${stats.countryCount}</strong> 个国家 · <strong>${stats.cityCount}</strong> 座城市</span>
            </div>
            <button class="footprint-return-home" type="button" data-footprint-home aria-label="返回主页">‹</button>
          </div>
        </div>
      </section>
    </main>
  `;

  app.querySelector("[data-home]")?.addEventListener("click", () => {
    history.replaceState(null, "", location.pathname);
    showHome();
  });
  app.querySelector("[data-footprint-home]")?.addEventListener("click", () => {
    history.replaceState(null, "", location.pathname);
    showHome();
  });
  app.querySelectorAll("[data-open-footprint-country]").forEach((button) => {
    button.addEventListener("click", () => {
      location.hash = `#footprints/${encodeURIComponent(button.dataset.openFootprintCountry)}`;
    });
    button.addEventListener("mouseenter", () => setFootprintCountryHover(button.dataset.openFootprintCountry, true));
    button.addEventListener("mouseleave", () => setFootprintCountryHover(button.dataset.openFootprintCountry, false));
  });
  renderFootprintWorldMap(countries);
}

function footprintCountryListItemTemplate(country) {
  const color = footprintCountryColor(country);
  return `
    <button class="footprint-country-list-item" type="button" style="--footprint-accent:${color}" data-open-footprint-country="${escapeHtml(country.countryCode)}">
      <span></span>
      <strong>${escapeHtml(country.countryName || country.countryCode)}</strong>
      <small>${escapeHtml(country.englishName || "")}</small>
    </button>
  `;
}

async function loadWorldMapPaths() {
  if (state.worldMapPaths) return state.worldMapPaths;
  const response = await fetch(`${publicPath("/assets/world-countries-paths.json")}?v=${STATIC_ASSET_VERSION}`, { cache: "force-cache" });
  if (!response.ok) throw new Error("world map failed");
  state.worldMapPaths = await response.json();
  return state.worldMapPaths;
}

async function renderFootprintWorldMap(countries) {
  const container = app.querySelector("[data-world-map]");
  if (!container) return;
  const countryMap = new Map(countries.map((country) => [country.countryCode, country]));

  try {
    const map = await loadWorldMapPaths();
    if (!app.contains(container)) return;
    const countriesSvg = (map.countries || []).map((shape) => {
      const country = countryMap.get(shape.code);
      if (!country) {
        const [x, y] = shape.centroid || [0, 0];
        const englishLabel = shape.name || shape.code || "";
        const label = localizedCountryName(shape.code, englishLabel);
        return `
          <g class="footprint-country-entry is-unvisited-entry" tabindex="0" aria-label="${escapeHtml(label)}">
            <path class="footprint-country-path is-unvisited" d="${shape.d}"></path>
            <g class="footprint-country-svg-label is-unvisited-label" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})">
              <text class="footprint-country-svg-name" text-anchor="middle" y="-5">${escapeHtml(label)}</text>
              <text class="footprint-country-svg-code" text-anchor="middle" y="11">${escapeHtml(englishLabel)}</text>
            </g>
          </g>
        `;
      }
      const color = "#D8B36A";
      const enabled = country.enabled !== false;
      const attrs = enabled
        ? `tabindex="0" role="button" data-open-footprint-country="${escapeHtml(country.countryCode)}" aria-label="打开${escapeHtml(country.countryName || country.countryCode)}足迹"`
        : `aria-hidden="true"`;
      const [x, y] = shape.centroid || [0, 0];
      return `
        <g class="footprint-country-entry" style="--footprint-accent:${color}" ${attrs}>
          <path class="footprint-country-path is-footprinted is-collected" d="${shape.d}"></path>
          <g class="footprint-country-svg-label" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})">
            <text class="footprint-country-svg-name" text-anchor="middle" y="-5">${escapeHtml(country.countryName || country.countryCode)}</text>
            <text class="footprint-country-svg-code" text-anchor="middle" y="12">${escapeHtml(country.englishName || country.countryCode)}</text>
          </g>
        </g>
      `;
    }).join("");

    container.innerHTML = `
      <svg class="footprint-world-svg" viewBox="0 0 ${Number(map.width || 1000)} ${Number(map.height || 520)}" role="img" aria-label="世界足迹国家轮廓地图">
        <rect class="footprint-map-ocean" width="100%" height="100%"></rect>
        <g class="footprint-country-paths">
          ${countriesSvg}
        </g>
      </svg>
    `;

    container.querySelectorAll("[data-open-footprint-country]").forEach((node) => {
      node.addEventListener("click", () => {
        location.hash = `#footprints/${encodeURIComponent(node.dataset.openFootprintCountry)}`;
      });
      node.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        location.hash = `#footprints/${encodeURIComponent(node.dataset.openFootprintCountry)}`;
      });
      node.addEventListener("mouseenter", () => setFootprintCountryHover(node.dataset.openFootprintCountry, true));
      node.addEventListener("mouseleave", () => setFootprintCountryHover(node.dataset.openFootprintCountry, false));
    });
  } catch (error) {
    container.innerHTML = `<p class="footprint-map-error">地图轮廓加载失败，请刷新页面。</p>`;
  }
}

function footprintCountryButtonTemplate(country, index = 0) {
  const color = footprintCountryColor(country);
  const { x, y } = footprintCountryPosition(country, index);
  const shape = footprintCountryShape(country, index);
  const disabled = country.enabled === false ? " disabled" : "";
  return `
    <button class="footprint-country-point footprint-country-shape is-${escapeHtml(country.countryCode || "country").toLowerCase()}" type="button" style="--x:${x.toFixed(3)}%; --y:${y.toFixed(3)}%; --cw:${shape.w}%; --ch:${shape.h}%; --footprint-accent:${color}" data-open-footprint-country="${escapeHtml(country.countryCode)}"${disabled}>
      <span class="footprint-country-aura"></span>
      <span class="footprint-country-name">
        <strong>${escapeHtml(country.countryName || country.countryCode)}</strong>
        <small>${escapeHtml(country.englishName || "")}</small>
      </span>
    </button>
  `;
}

function footprintCountryShape(country, index = 0) {
  const shapes = {
    CN: { w: 18, h: 10 },
    NZ: { w: 4.6, h: 6.2 },
    JP: { w: 4.2, h: 7 },
    AU: { w: 10, h: 7 },
    US: { w: 14, h: 7 }
  };
  return shapes[country?.countryCode] || { w: index % 2 ? 8 : 10, h: index % 2 ? 5 : 6 };
}

function setFootprintCountryHover(code, active) {
  const safeCode = window.CSS?.escape ? CSS.escape(code) : String(code).replace(/"/g, "\\\"");
  app.querySelectorAll(`[data-open-footprint-country="${safeCode}"]`).forEach((node) => {
    const currentClass = typeof node.getAttribute === "function"
      ? node.getAttribute("class")
      : (typeof node.className === "string" ? node.className : node.className?.baseVal);
    const classes = String(currentClass || "").split(/\s+/).filter(Boolean);
    const nextClasses = active
      ? [...new Set([...classes, "is-linked"])]
      : classes.filter((className) => className !== "is-linked");
    const nextClass = nextClasses.join(" ");
    if (typeof node.setAttribute === "function") {
      node.setAttribute("class", nextClass);
    } else if (typeof node.className === "string") {
      node.className = nextClass;
    } else if (node.className && "baseVal" in node.className) {
      node.className.baseVal = nextClass;
    }
  });
}

function showFootprintCountry(countryCode) {
  clearTimer();
  state.currentDestinationId = null;
  const country = footprintCountryByCode(countryCode);
  if (!country) {
    showFootprintWorld();
    return;
  }

  const regions = footprintRegions(country);
  const color = footprintCountryColor(country);
  const collectedCount = regions.filter((region) => footprintRegionStatus(region) === "collected").length;
  const visitedCount = regions.filter((region) => footprintRegionStatus(region) === "visited").length;
  const litCount = collectedCount + visitedCount;
  const cityCount = footprintRegionCityNames(regions, country).length;
  document.body.style.setProperty("--accent", color);
  setDocumentTitle(`${country.countryName || country.countryCode}足迹`);

  app.innerHTML = `
    <main class="home-view footprints-view">
      <section class="footprints-dashboard footprints-country-dashboard" style="--footprint-accent:${color}" data-country-code="${escapeHtml(country.countryCode || "")}" aria-label="${escapeHtml(country.countryName || "")}足迹地图">
        <header class="footprints-dashboard-top">
          <button class="footprints-back-inline" type="button" data-back-footprints aria-label="返回足迹">‹</button>
          <button class="footprints-country-label" type="button" data-back-footprints>
            <span>${escapeHtml(country.countryName || country.countryCode)}</span>
            <small>${escapeHtml(country.englishName || country.countryCode)}</small>
          </button>
        </header>
        <div class="footprints-dashboard-body">
          <div class="footprint-map-canvas footprint-region-canvas">
            <div class="footprint-country-silhouette" aria-hidden="true"></div>
            <div class="footprint-region-map" data-country-region-map aria-label="国家内部行政区">
              <div class="footprint-map-loading">正在展开国家内部地图</div>
            </div>
            <div class="footprint-region-summary" aria-label="足迹统计">
              <span class="summary-total">共点亮 <strong>${litCount}</strong> 个区域 · <strong>${cityCount}</strong> 座城市</span>
              <span class="summary-legend"><i class="is-visited"></i>来访区</span>
              <span class="summary-legend"><i class="is-collected"></i>碎片区</span>
            </div>
          </div>
          <aside class="footprint-region-panel" data-footprint-region-panel aria-hidden="true">
            ${footprintRegionPanelEmptyTemplate(country)}
          </aside>
        </div>
      </section>
    </main>
  `;

  app.querySelector("[data-home]")?.addEventListener("click", () => {
    history.replaceState(null, "", location.pathname);
    showHome();
  });
  app.querySelector("[data-back-footprints]")?.addEventListener("click", () => {
    location.hash = "#footprints";
  });
  renderFootprintRegionMap(country, regions);
}

function countryRegionMapAsset(countryCode) {
  return countryRegionMapAssets[String(countryCode || "").toUpperCase()] || "";
}

function isReadableRegionName(value) {
  const text = String(value || "").trim();
  return Boolean(text) && /[^\s?\-–—]+/.test(text);
}

function countryRegionDisplayName(countryCode, shape, region) {
  if (isReadableRegionName(region?.regionName)) return region.regionName;
  if (isReadableRegionName(shape?.name)) return shape.name;
  const code = String(countryCode || "").toUpperCase();
  return countryRegionNameFallbacks[code]?.[shape?.code] || shape?.code || "";
}

function countryRegionEnglishName(countryCode, shape, region) {
  if (isReadableRegionName(region?.englishName)) return region.englishName;
  const code = String(countryCode || "").toUpperCase();
  return countryRegionNameFallbacks[code]?.[shape?.code] || "";
}

async function loadCountryRegionMap(countryCode) {
  const code = String(countryCode || "").toUpperCase();
  const asset = countryRegionMapAsset(code);
  if (!asset) return null;
  if (state.countryRegionMaps[code]) return state.countryRegionMaps[code];
  const response = await fetch(`${asset}?v=${STATIC_ASSET_VERSION}`, { cache: "force-cache" });
  if (!response.ok) throw new Error("country region map failed");
  state.countryRegionMaps[code] = await response.json();
  return state.countryRegionMaps[code];
}

function bindFootprintRegionInteractions(country, regions) {
  app.querySelectorAll("[data-region-preview-code]").forEach((node) => {
    if (node.dataset.previewBound === "true") return;
    node.dataset.previewBound = "true";
    const code = node.dataset.regionPreviewCode;
    node.addEventListener("mouseenter", () => setFootprintRegionPreview(code, true));
    node.addEventListener("mouseleave", () => setFootprintRegionPreview(code, false));
    node.addEventListener("focus", () => setFootprintRegionPreview(code, true));
    node.addEventListener("blur", () => setFootprintRegionPreview(code, false));
  });

  app.querySelectorAll("[data-footprint-region], [data-footprint-region-hit]").forEach((node) => {
    if (node.dataset.regionOpenBound === "true") return;
    node.dataset.regionOpenBound = "true";
    const openRegion = () => {
      const regionCode = node.dataset.footprintRegion || node.dataset.footprintRegionHit;
      const region = regions.find((item) => item.regionCode === regionCode);
      const fallbackRegion = {
        regionCode,
        regionName: node.dataset.regionName || region?.regionName || regionCode,
        englishName: node.dataset.regionEnglish || region?.englishName || "",
        status: "unvisited",
        visitedCities: "",
        visitTime: "",
        destinations: []
      };
      if (!region || footprintRegionStatus(region) === "unvisited") {
        showFootprintRegionPanel(country, regionCode, fallbackRegion);
        return;
      }
      showFootprintRegionPanel(country, region.regionCode);
    };
    node.addEventListener("click", openRegion);
    node.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openRegion();
    });
  });
}

function setFootprintRegionPreview(code, active) {
  const safeCode = window.CSS?.escape ? CSS.escape(code) : String(code).replace(/"/g, "\\\"");
  app.querySelectorAll(`[data-region-preview-code="${safeCode}"], [data-region-label-code="${safeCode}"]`).forEach((node) => {
    const currentClass = typeof node.getAttribute === "function"
      ? node.getAttribute("class")
      : (typeof node.className === "string" ? node.className : node.className?.baseVal);
    const classes = String(currentClass || "").split(/\s+/).filter(Boolean);
    const nextClasses = active
      ? [...new Set([...classes, "is-previewed"])]
      : classes.filter((className) => className !== "is-previewed");
    if (typeof node.setAttribute === "function") node.setAttribute("class", nextClasses.join(" "));
  });
}

async function renderFootprintRegionMap(country, regions) {
  const container = app.querySelector("[data-country-region-map]");
  if (!container) return;
  const canvas = container.closest(".footprint-region-canvas");

  const renderFallback = () => {
    canvas?.classList.remove("has-real-region-map");
    container.innerHTML = regions.map((region, index) => footprintRegionTemplate(region, index, regions.length)).join("");
    bindFootprintRegionInteractions(country, regions);
  };

  if (!countryRegionMapAsset(country.countryCode)) {
    renderFallback();
    return;
  }

  try {
    const map = await loadCountryRegionMap(country.countryCode);
    if (!map || !app.contains(container)) return;
    const regionMap = new Map(regions.map((region) => [region.regionCode, region]));
    const accent = footprintCountryColor(country);
    const mapWidth = Number(map.width || 820);
    const mapHeight = Number(map.height || 650);
    const hitRadius = mapHeight > mapWidth * 1.08 ? 42 : 38;
    const regionEntries = (map.regions || []).map((shape) => {
      const region = regionMap.get(shape.code);
      const status = region ? footprintRegionStatus(region) : "unvisited";
      const enabled = Boolean(region && status !== "unvisited");
      const labelText = countryRegionDisplayName(country.countryCode, shape, region);
      const englishText = countryRegionEnglishName(country.countryCode, shape, region);
      const labelAttrs = `data-region-name="${escapeHtml(labelText)}" data-region-english="${escapeHtml(englishText)}"`;
      const classes = [
        "footprint-region-shape",
        `is-${status}`,
        region ? "is-known" : "is-background"
      ].join(" ");
      const attrs = enabled
        ? `tabindex="0" role="button" data-footprint-region="${escapeHtml(region.regionCode)}" ${labelAttrs} aria-label="打开${escapeHtml(labelText)}足迹"`
        : `tabindex="0" role="button" data-footprint-region-hit="${escapeHtml(shape.code)}" ${labelAttrs} aria-label="${escapeHtml(labelText)}"`;
      const [x, y] = shape.centroid || [0, 0];
      const label = labelText && !/^[?\s]+$/.test(labelText)
        ? `
        <g class="footprint-region-svg-label is-${status}${region ? " is-known" : " is-background"}" data-region-label-code="${escapeHtml(shape.code)}" transform="translate(${Number(x).toFixed(1)} ${Number(y).toFixed(1)})">
          <text text-anchor="middle">${escapeHtml(labelText)}</text>
        </g>
      ` : "";
      const hitCode = region?.regionCode || shape.code;
      const hitPath = hitCode
        ? `<path class="footprint-region-shape-hit" d="${shape.d}" data-footprint-region-hit="${escapeHtml(hitCode)}" data-region-preview-code="${escapeHtml(shape.code)}" ${labelAttrs} aria-hidden="true"></path>`
        : "";
      const hitTarget = hitCode
        ? `<circle class="footprint-region-hit-target is-enabled ${enabled ? "" : "is-preview-only"}" cx="${Number(x).toFixed(1)}" cy="${Number(y).toFixed(1)}" r="${hitRadius}" data-footprint-region-hit="${escapeHtml(hitCode)}" data-region-preview-code="${escapeHtml(shape.code)}" ${labelAttrs} aria-hidden="true"></circle>`
        : "";
      const entryClass = [
        "footprint-region-entry",
        `is-${status}`,
        region ? "is-known" : "is-background"
      ].join(" ");
      return `
        <g class="${entryClass}" data-region-preview-code="${escapeHtml(shape.code)}" style="--region-accent:${accent}">
          <path class="${classes}" d="${shape.d}" ${attrs}></path>
          ${hitPath}
          ${label}
          ${hitTarget}
        </g>
      `;
    }).join("");
    const svgClass = [
      "footprint-country-region-svg",
      mapHeight > mapWidth * 1.08 ? "is-portrait-map" : "is-landscape-map"
    ].filter(Boolean).join(" ");

    canvas?.classList.add("has-real-region-map");
    container.innerHTML = `
      <svg class="${svgClass}" viewBox="0 0 ${mapWidth} ${mapHeight}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${escapeHtml(country.countryName || "")}内部足迹地图">
        <g class="footprint-region-entries">
          ${regionEntries}
        </g>
      </svg>
    `;
    bindFootprintRegionInteractions(country, regions);
  } catch (error) {
    renderFallback();
  }
}

function footprintProgressText(regions) {
  const visited = regions.filter((region) => footprintRegionStatus(region) === "visited").length;
  const collected = regions.filter((region) => footprintRegionStatus(region) === "collected").length;
  return `已点亮 ${collected} 个区域 · 已到访 ${visited} 个区域`;
}

function footprintRegionStatus(region) {
  return ["visited", "collected", "unvisited"].includes(region?.status) ? region.status : "unvisited";
}

function footprintRegionTemplate(region, index = 0, total = 1) {
  const position = region.position || fallbackRegionPosition(index, total);
  const status = footprintRegionStatus(region);
  const disabled = status === "unvisited" ? " disabled" : "";
  const label = status === "collected" ? "已点亮" : (status === "visited" ? "已到访" : "");
  const style = `--rx:${Number(position.x || 50)}%; --ry:${Number(position.y || 50)}%; --rw:${Number(position.w || 18)}%; --rh:${Number(position.h || 14)}%;`;
  return `
    <button class="footprint-region is-${status}" type="button" style="${style}" data-footprint-region="${escapeHtml(region.regionCode || "")}"${disabled}>
      <span class="footprint-region-name">${escapeHtml(region.regionName || "")}</span>
      ${label ? `<span class="footprint-region-status">${label}</span>` : ""}
    </button>
  `;
}

function footprintRegionPanelEmptyTemplate(country) {
  return `
    <p class="eyebrow">Region</p>
    <h2>选择一个区域</h2>
    <p class="footprint-panel-note">已到访显示轻量记录；已点亮可以选择目的地进入碎片详情。</p>
    <span class="footprint-panel-country">${escapeHtml(country.countryName || "")}</span>
  `;
}

function showFootprintRegionPanelLegacy(country, regionCode) {
  const regions = footprintRegions(country);
  const region = regions.find((item) => item.regionCode === regionCode);
  const panel = app.querySelector("[data-footprint-region-panel]");
  if (!region || !panel) return;
  panel.classList.add("is-open");
  panel.setAttribute("aria-hidden", "false");

  app.querySelectorAll("[data-footprint-region]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.footprintRegion === regionCode);
  });

  const status = footprintRegionStatus(region);
  if (status === "visited") {
    panel.innerHTML = `
      <p class="eyebrow">Visited</p>
      <h2>${escapeHtml(region.regionName || "")}</h2>
      <p class="footprint-region-english">${escapeHtml(region.englishName || "")}</p>
      <div class="footprint-panel-block">
        <span>已到访</span>
        ${region.visitedCities ? `<strong>${escapeHtml(region.visitedCities)}</strong>` : ""}
      </div>
      ${region.visitTime ? `
        <div class="footprint-panel-block">
          <span>到访时间</span>
          <strong>${escapeHtml(formatTravelTimeValue(region.visitTime, region.visitTime))}</strong>
        </div>
      ` : ""}
    `;
    return;
  }

  const entries = regionDestinationEntries(region, country);
  panel.innerHTML = `
    <p class="eyebrow">Collected</p>
    <h2>${escapeHtml(region.regionName || "")}</h2>
    <p class="footprint-region-english">${escapeHtml(region.englishName || "")}</p>
    <div class="footprint-panel-block">
      <span>已点亮目的地</span>
    </div>
    <div class="footprint-destination-options">
      ${entries.map((entry, index) => footprintDestinationOptionTemplate(entry, index)).join("") || `<p class="footprint-panel-note">这个区域还没有绑定目的地。</p>`}
    </div>
  `;
  panel.querySelectorAll("[data-open-destination]").forEach((button) => {
    button.addEventListener("click", () => openDestination(button.dataset.openDestination));
  });
}

function hideFootprintRegionPanel() {
  if (state.footprintPanelHideTimer) {
    clearTimeout(state.footprintPanelHideTimer);
    state.footprintPanelHideTimer = null;
  }
  const panel = app.querySelector("[data-footprint-region-panel]");
  if (!panel) return;
  panel.classList.remove("is-open");
  panel.setAttribute("aria-hidden", "true");
  app.querySelectorAll("[data-footprint-region], [data-footprint-region-hit]").forEach((button) => {
    button.classList.remove("is-active");
  });
}

function clearFootprintRegionPanelHide() {
  if (!state.footprintPanelHideTimer) return;
  clearTimeout(state.footprintPanelHideTimer);
  state.footprintPanelHideTimer = null;
}

function scheduleFootprintRegionPanelHide(delay = 4200) {
  clearFootprintRegionPanelHide();
  state.footprintPanelHideTimer = setTimeout(hideFootprintRegionPanel, delay);
}

function showFootprintRegionPanel(country, regionCode, fallbackRegion = null) {
  const regions = footprintRegions(country);
  const region = regions.find((item) => item.regionCode === regionCode) || fallbackRegion;
  const panel = app.querySelector("[data-footprint-region-panel]");
  if (!region || !panel) return;

  app.querySelectorAll("[data-footprint-region], [data-footprint-region-hit]").forEach((button) => {
    const buttonCode = button.dataset.footprintRegion || button.dataset.footprintRegionHit;
    button.classList.toggle("is-active", buttonCode === regionCode);
  });

  const status = footprintRegionStatus(region);
  if (status === "unvisited") {
    panel.innerHTML = `
      <p class="eyebrow">Unlit</p>
      <h2>${escapeHtml(region.regionName || "")}</h2>
      ${region.englishName ? `<p class="footprint-region-english">${escapeHtml(region.englishName)}</p>` : ""}
      <p class="footprint-panel-note">这个区域还没有点亮，可以在后台足迹设置里加入来访城市或绑定碎片目的地。</p>
    `;
    panel.classList.add("is-open");
    panel.setAttribute("aria-hidden", "false");
    panel.addEventListener("mouseenter", clearFootprintRegionPanelHide, { once: true });
    panel.addEventListener("mouseleave", () => scheduleFootprintRegionPanelHide(220), { once: true });
    scheduleFootprintRegionPanelHide();
    return;
  }

  const entries = regionDestinationEntries(region, country);
  const cities = splitFootprintCityNames(region.visitedCities);
  const hasCities = cities.length > 0;
  const visitTime = region.visitTime ? formatTravelTimeValue(region.visitTime, region.visitTime) : "";
  const cityLine = hasCities ? cities.join("、") : "";

  panel.innerHTML = `
    <p class="eyebrow">Footprint</p>
    <h2>${escapeHtml(region.regionName || "")}</h2>
    <p class="footprint-region-english">${escapeHtml(region.englishName || "")}</p>
    ${hasCities ? `
      <div class="footprint-panel-block">
        <span>途径城市</span>
        <strong>${escapeHtml(cityLine)}</strong>
      </div>
    ` : ""}
    ${visitTime ? `
      <div class="footprint-panel-block">
        <span>旅行时间</span>
        <strong>${escapeHtml(visitTime)}</strong>
      </div>
    ` : ""}
    ${entries.length ? `
      <div class="footprint-panel-block">
        <span>可跳转目的地</span>
      </div>
      <div class="footprint-destination-options">
        ${entries.map((entry, index) => footprintDestinationOptionTemplate(entry, index)).join("")}
      </div>
    ` : (!hasCities && !visitTime ? `<p class="footprint-panel-note">这个区域还没有记录城市或目的地。</p>` : "")}
  `;

  panel.classList.add("is-open");
  panel.setAttribute("aria-hidden", "false");
  panel.querySelectorAll("[data-open-destination]").forEach((button) => {
    button.addEventListener("click", () => openDestination(button.dataset.openDestination));
  });
  panel.addEventListener("mouseenter", clearFootprintRegionPanelHide, { once: true });
  panel.addEventListener("mouseleave", () => scheduleFootprintRegionPanelHide(220), { once: true });
  scheduleFootprintRegionPanelHide();
}

function destinationMatchesFootprintCountry(destination, country) {
  const countryCode = String(country?.countryCode || "").toUpperCase();
  const countryText = `${destination?.country || ""} ${destination?.name || ""} ${destination?.englishName || ""}`;
  if (countryCode === "CN") return countryText.includes("中国");
  if (countryCode === "NZ") return countryText.includes("新西兰") || /new zealand/i.test(countryText);
  return countryDestinationIds(country).includes(destination?.id);
}

function regionDestinationEntries(region, country = null) {
  const items = Array.isArray(region.destinations) ? region.destinations : [];
  const directEntries = items.map((item) => {
    const id = typeof item === "string" ? item : item.id;
    const destination = destinationById(id);
    if (!destination) return null;
    return {
      id: destination.id,
      name: item.name || destination.name,
      date: item.date || formatTravelTime(destination),
      title: item.title || `${photosFor(destination).length} 张碎片`
    };
  }).filter(Boolean);
  if (directEntries.length) return directEntries;

  const visitTime = String(region.visitTime || "").trim();
  if (!visitTime) return [];

  return (state.site?.destinations || [])
    .filter((destination) => {
      const destinationTime = String(destination.travelTime || destination.date || "").trim();
      return destinationTime === visitTime && destinationMatchesFootprintCountry(destination, country);
    })
    .map((destination) => ({
      id: destination.id,
      name: destination.name,
      date: formatTravelTime(destination),
      title: `${photosFor(destination).length} 张碎片`
    }));
}

function footprintDestinationOptionTemplate(entry, index = 0) {
  const destination = destinationById(entry.id);
  const coverPhoto = destination ? coverPhotoFor(destination) : {};
  const cover = coverPhoto.src || destination?.cover || fallbackImage;
  return `
    <button class="footprint-destination-option" type="button" data-open-destination="${escapeHtml(entry.id)}">
      <img src="${escapeHtml(cover)}" alt="${escapeHtml(entry.name)}" style="--photo-rotation:${normalizePhotoRotation(coverPhoto.rotation)}deg">
      <span>${String(index + 1).padStart(2, "0")}</span>
      <strong>${escapeHtml(entry.name)}</strong>
      <small>${escapeHtml([entry.date, entry.title].filter(Boolean).join(" · "))}</small>
    </button>
  `;
}

function visitedGlowTemplate(destination, index = 0) {
  const { x, y, rotate } = homeGlowPosition(destination, index);
  const delay = `${(index % 9) * -0.42}s`;
  const edgeClass = x > 90 ? " is-east-edge" : "";
  const tierClass = ` ${homeGlowTiers[destination.id] || "glow-level-1"}`;
  return `
    <button class="visited-glow is-destination${edgeClass}${tierClass}" type="button" style="--x:${x.toFixed(3)}; --y:${y.toFixed(3)}; --star-rotate:${rotate}deg; --pulse-delay:${delay}" data-open-destination="${escapeHtml(destination.id)}" aria-label="打开${escapeHtml(destination.name)}">
      <span class="visited-label">${escapeHtml(destination.name)}</span>
    </button>
  `;
}

function homeGlowPosition(destination, index = 0) {
  const position = markerPosition(destination);
  const offset = homeGlowOffsets[destination.id] || {};
  return {
    x: clamp(position.x + Number(offset.x || 0), 2, 98),
    y: clamp(position.y + Number(offset.y || 0), 5, 95),
    rotate: Number(offset.rotate || ((index * 37) % 72) - 36)
  };
}

function transitionFragmentTemplate(destination, origin) {
  const photos = photosFor(destination);
  const viewport = {
    width: Math.max(window.innerWidth || 1280, 320),
    height: Math.max(window.innerHeight || 720, 320)
  };
  const center = {
    x: viewport.width / 2,
    y: viewport.height / 2
  };
  const originOffset = {
    x: Number(origin?.left || center.x) - center.x,
    y: Number(origin?.top || center.y) - center.y
  };
  const layout = [
    { sx: -116, sy: -72, ax: -248, ay: -206, dx: -150, dy: -76, r: -7, delay: 60 },
    { sx: 18, sy: -108, ax: -108, ay: -246, dx: -18, dy: -92, r: 5, delay: 105 },
    { sx: 126, sy: -66, ax: 132, ay: -220, dx: 118, dy: -72, r: 8, delay: 150 },
    { sx: 176, sy: 38, ax: 268, ay: -100, dx: 154, dy: 16, r: -5, delay: 195 },
    { sx: 74, sy: 126, ax: 218, ay: 110, dx: 72, dy: 84, r: 6, delay: 240 },
    { sx: -58, sy: 132, ax: 54, ay: 220, dx: -68, dy: 78, r: -4, delay: 285 },
    { sx: -172, sy: 62, ax: -180, ay: 166, dx: -142, dy: 28, r: 4, delay: 330 },
    { sx: -212, sy: -34, ax: -308, ay: 22, dx: -24, dy: 14, r: -8, delay: 375 },
    { sx: 18, sy: 20, ax: -22, ay: -178, dx: 22, dy: -16, r: 3, delay: 420 },
    { sx: 222, sy: -128, ax: 312, ay: -196, dx: 128, dy: 74, r: 7, delay: 465 },
    { sx: -246, sy: -138, ax: -360, ay: -180, dx: -82, dy: -126, r: -6, delay: 510 },
    { sx: 210, sy: 126, ax: 330, ay: 152, dx: 12, dy: 112, r: 5, delay: 555 }
  ];

  const fragments = layout.map((item, index) => {
    const photo = photos[index % photos.length] || {};
    const spawnX = Math.round(originOffset.x + item.sx);
    const spawnY = Math.round(originOffset.y + item.sy);
    return `
      <span class="memory-fragment" style="--spawn-x:${spawnX}px; --spawn-y:${spawnY}px; --arc-x:${item.ax}px; --arc-y:${item.ay}px; --dock-x:${item.dx}px; --dock-y:${item.dy}px; --fragment-rotate:${item.r}deg; --fragment-delay:${item.delay}ms;">
        <img src="${escapeHtml(photo.src || destination.cover || fallbackImage)}" alt="">
      </span>
    `;
  }).join("");

  const trails = layout.map((item, index) => {
    const startX = center.x + originOffset.x + item.sx * 0.42;
    const startY = center.y + originOffset.y + item.sy * 0.42;
    const controlX = center.x + item.ax;
    const controlY = center.y + item.ay;
    const endX = center.x + item.dx;
    const endY = center.y + item.dy;
    return `<path class="convergence-trail" d="M ${startX.toFixed(1)} ${startY.toFixed(1)} Q ${controlX.toFixed(1)} ${controlY.toFixed(1)} ${endX.toFixed(1)} ${endY.toFixed(1)}" style="--trail-delay:${Math.max(item.delay - 40, 0)}ms"></path>`;
  }).join("");

  return `
    <svg class="fragment-trajectory-field" viewBox="0 0 ${viewport.width} ${viewport.height}" preserveAspectRatio="none" aria-hidden="true">
      ${trails}
    </svg>
    <span class="convergence-frame" aria-hidden="true"></span>
    <div class="memory-fragment-field" aria-hidden="true">
      ${fragments}
    </div>
  `;
}

function transitionOverlayTemplate(destination, origin, duration = HOME_TRANSITION_DURATION) {
  const color = safeColor(destination.color, "#C8A96A");
  const originLeft = Number(origin?.left || (window.innerWidth || 1280) / 2);
  const originTop = Number(origin?.top || (window.innerHeight || 720) / 2);
  return `
    <div class="destination-transition" style="--transition-accent:${color}; --origin-left:${originLeft}px; --origin-top:${originTop}px; --transition-duration:${duration}ms;">
      <span class="transition-origin-core" aria-hidden="true"></span>
      <span class="transition-expanding-halo" aria-hidden="true"></span>
      <span class="transition-fade-wash" aria-hidden="true"></span>
    </div>
  `;
}

function playHomeDestinationTransition(id, trigger) {
  if (!id || state.isSwitching) return;
  const destination = destinationById(id);
  if (!destination) return;

  const stage = trigger?.closest(".world-stage");
  if (!stage) {
    openDestination(id);
    return;
  }

  state.isSwitching = true;
  document.body.style.setProperty("--accent", safeColor(destination.color));
  stage.classList.add("is-fragment-launching");
  trigger.classList.add("is-selected");
  trigger.setAttribute("aria-pressed", "true");
  const triggerRect = trigger.getBoundingClientRect();
  const origin = {
    left: triggerRect.left + triggerRect.width / 2,
    top: triggerRect.top + triggerRect.height / 2
  };
  const stageRect = stage.getBoundingClientRect();
  const focusX = clamp(((origin.left - stageRect.left) / Math.max(stageRect.width, 1)) * 100, 0, 100);
  const focusY = clamp(((origin.top - stageRect.top) / Math.max(stageRect.height, 1)) * 100, 0, 100);
  const duration = prefersReducedMotion() ? REDUCED_MOTION_TRANSITION_DURATION : HOME_TRANSITION_DURATION;

  stage.style.setProperty("--transition-focus-x", `${focusX.toFixed(2)}%`);
  stage.style.setProperty("--transition-focus-y", `${focusY.toFixed(2)}%`);
  stage.style.setProperty("--transition-accent", safeColor(destination.color));
  stage.style.setProperty("--transition-duration", `${duration}ms`);
  stage.querySelector(".destination-transition")?.remove();
  stage.insertAdjacentHTML("beforeend", transitionOverlayTemplate(destination, origin, duration));

  window.setTimeout(() => {
    location.hash = `#destination/${encodeURIComponent(id)}`;
    state.isSwitching = false;
  }, duration);
}

function travelRouteTemplate(destinations) {
  const points = destinations
    .map((destination) => ({
      ...markerPosition(destination),
      color: safeColor(destination.color, "#C8A96A")
    }))
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));

  if (points.length < 2) return "";

  const segments = points.slice(1)
    .map((point, index) => routeSegmentTemplate(points[index], point, index))
    .join("");

  return `
    <svg class="travel-route-layer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      ${segments}
    </svg>
  `;
}

function routeSegmentTemplate(from, to, index) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.hypot(dx, dy) || 1;
  const curve = clamp(distance * 0.24, 2.8, 12) * (index % 2 === 0 ? 1 : -1);
  const controlX = (from.x + to.x) / 2 - (dy / distance) * curve;
  const controlY = (from.y + to.y) / 2 + (dx / distance) * curve;
  const delay = `${(index % 8) * -0.62}s`;

  return `
    <path class="travel-route-segment" d="M ${from.x.toFixed(3)} ${from.y.toFixed(3)} Q ${controlX.toFixed(3)} ${controlY.toFixed(3)} ${to.x.toFixed(3)} ${to.y.toFixed(3)}" style="--route-color:${to.color}; --route-delay:${delay}"></path>
  `;
}

function markerTemplate(destination, index = 0) {
  const color = safeColor(destination.color);
  const { x, y } = markerPosition(destination);
  const labelOffset = destination.labelOffset || {};
  const labelX = Number.isFinite(Number(labelOffset.x)) ? Number(labelOffset.x) : 0;
  const labelY = Number.isFinite(Number(labelOffset.y)) ? Number(labelOffset.y) : 0;
  const delay = `${(index % 9) * -0.36}s`;
  const edgeClass = x > 84 ? " is-east-edge" : x < 16 ? " is-west-edge" : "";
  return `
    <button class="map-marker${edgeClass}" style="--x:${x.toFixed(3)}; --y:${y.toFixed(3)}; --marker:${color}; --label-x:${labelX}px; --label-y:${labelY}px; --pulse-delay:${delay}" data-open-destination="${escapeHtml(destination.id)}" aria-label="打开${escapeHtml(destination.name)}">
      <span class="marker-dot"></span>
      <span class="marker-label">${escapeHtml(destination.name)}</span>
    </button>
  `;
}

function destinationCardTemplate(destination) {
  const coverPhoto = coverPhotoFor(destination);
  const cover = destination.cover || coverPhoto.src || fallbackImage;
  const color = safeColor(destination.color);
  const travelTime = formatTravelTime(destination);
  return `
    <button class="destination-card" data-open-destination="${escapeHtml(destination.id)}" style="--card-accent:${color}">
      <img src="${escapeHtml(cover)}" alt="${escapeHtml(destination.name)}" style="--photo-rotation:${normalizePhotoRotation(coverPhoto.rotation)}deg">
      <span class="destination-card-body">
        <span class="card-title">${escapeHtml(destination.name)}</span>
        <span class="card-meta">${escapeHtml(destination.englishName || destination.country || "")}${travelTime ? ` · ${escapeHtml(travelTime)}` : ""}</span>
      </span>
    </button>
  `;
}

function destinationExploreCardTemplate(destination, index = 0) {
  const coverPhoto = coverPhotoFor(destination);
  const cover = coverPhoto.src || destination.cover || fallbackImage;
  const color = safeColor(destination.color);
  return `
    <button class="fragment-card" data-fragment-card data-open-destination="${escapeHtml(destination.id)}" style="--card-accent:${color}; --card-index:${index}">
      <img src="${escapeHtml(cover)}" alt="${escapeHtml(destination.name)}" style="--photo-rotation:${normalizePhotoRotation(coverPhoto.rotation)}deg">
      <span class="fragment-card-shade"></span>
      <span class="fragment-card-copy">
        <span class="fragment-card-title">${escapeHtml(destination.name)}</span>
        <span class="fragment-card-meta">${escapeHtml(destination.englishName || destination.country || "")}</span>
        <span class="fragment-card-date">${escapeHtml(formatMonthLabel(destination.travelTime))}</span>
      </span>
    </button>
  `;
}

function destinationPickerTemplate(destination) {
  const color = safeColor(destination.color);
  return `
    <button class="destination-picker-button" style="--picker-accent:${color}" data-open-destination="${escapeHtml(destination.id)}">
      ${escapeHtml(destination.name)}
    </button>
  `;
}

function openDestination(id) {
  if (!id) return;
  const destination = destinationById(id);
  if (destination) document.body.style.setProperty("--accent", safeColor(destination.color));
  state.isSwitching = true;
  app.classList.add("is-flaring");
  window.setTimeout(() => {
    location.hash = `#destination/${encodeURIComponent(id)}`;
    app.classList.remove("is-flaring");
    state.isSwitching = false;
  }, 280);
}

function showDestination(id, requestedIndex = 0) {
  const destination = destinationById(id);
  if (!destination) {
    showHome();
    return;
  }

  const photos = photosFor(destination);
  state.currentDestinationId = destination.id;
  state.currentPhotoIndex = Math.max(0, Math.min(requestedIndex, photos.length - 1));
  document.body.style.setProperty("--accent", safeColor(destination.color));
  setDocumentTitle(destination.name);

  app.innerHTML = `
    <main class="detail-view" data-destination-id="${escapeHtml(destination.id)}" data-transition="${escapeHtml(state.site.playback?.transition || "fade")}">
      <div class="detail-shell">
        <aside class="journey-info" aria-live="polite">
          <button class="quiet-link" data-home>← 返回碎片</button>
          <div class="detail-heading">
            <h1 id="detailTitle"></h1>
            <span class="accent-line"></span>
            <p id="detailEnglish" class="detail-english"></p>
            <p id="detailTravelTime" class="detail-travel-time" hidden></p>
          </div>
          ${detailTimelineTemplate(destination)}
          <textarea id="detailCaption" class="detail-caption caption-editor" rows="6" aria-label="照片文字" placeholder="写下这一刻..." readonly></textarea>
          <p id="captionSaveState" class="caption-save-state" aria-live="polite"></p>
        </aside>

        <section class="detail-media" aria-label="目的地照片">
          <img id="heroPhoto" class="detail-photo" src="" alt="">
          <div class="photo-scrim"></div>
          ${photos.length > 1 ? `
            <button class="photo-float-button photo-float-prev" data-photo-step="-1" aria-label="上一张照片">
              <span aria-hidden="true">‹</span>
            </button>
            <button class="photo-float-button photo-float-next" data-photo-step="1" aria-label="下一张照片">
              <span aria-hidden="true">›</span>
            </button>
          ` : ""}
          <div class="thumb-dock" aria-label="照片缩略图导航">
            ${photos.length > 1 ? `
              <button class="thumb-nav-button thumb-nav-prev" data-thumb-step="-1" aria-label="上一组缩略图">
                <span aria-hidden="true">&lsaquo;</span>
              </button>
            ` : ""}
            <div class="thumb-rail" aria-label="照片缩略图">
              ${photos.map((photo, index) => `
                <button class="thumb-button" data-photo-index="${index}" aria-label="查看照片">
                  <img src="${escapeHtml(photo.src || fallbackImage)}" alt="${escapeHtml(photo.caption || destination.name)}" style="--photo-rotation:${normalizePhotoRotation(photo.rotation)}deg">
                </button>
              `).join("")}
            </div>
            ${photos.length > 1 ? `
              <button class="thumb-nav-button thumb-nav-next" data-thumb-step="1" aria-label="下一组缩略图">
                <span aria-hidden="true">&rsaquo;</span>
              </button>
            ` : ""}
          </div>
        </section>
      </div>
    </main>
  `;

  app.querySelector("[data-home]")?.addEventListener("click", goHome);
  app.querySelectorAll("[data-home]").forEach((button) => button.addEventListener("click", goHome));
  app.querySelector("[data-prev-destination]")?.addEventListener("click", () => switchDestination(-1));
  app.querySelector("[data-next-destination]")?.addEventListener("click", () => switchDestination(1));
  app.querySelectorAll("[data-photo-index]").forEach((button) => {
    button.addEventListener("click", (event) => {
      if (state.isEditingCaption) {
        event.preventDefault();
        return;
      }
      setPhoto(Number(button.dataset.photoIndex), true);
    });
  });
  app.querySelectorAll("[data-photo-step]").forEach((button) => {
    button.addEventListener("click", (event) => {
      if (state.isEditingCaption) {
        event.preventDefault();
        return;
      }
      setPhoto(state.currentPhotoIndex + Number(button.dataset.photoStep || 0), true);
    });
  });
  app.querySelectorAll("[data-thumb-step]").forEach((button) => {
    button.addEventListener("click", () => {
      scrollThumbRail(Number(button.dataset.thumbStep || 0));
    });
  });
  app.querySelector(".thumb-rail")?.addEventListener("scroll", () => {
    window.requestAnimationFrame(updateThumbNavState);
  });
  const captionEditor = app.querySelector("#detailCaption");
  const exitCaptionEdit = ({ save = true, resume = true } = {}) => {
    if (!captionEditor?.classList.contains("is-editing")) return;
    updateCurrentPhotoCaptionHeight(captionEditor.getBoundingClientRect().height);
    captionEditor.readOnly = true;
    captionEditor.classList.remove("is-editing");
    syncCaptionVisibility(captionEditor, app.querySelector("#captionSaveState"), captionEditor.value, false);
    state.isEditingCaption = false;
    if (save) saveSiteNow();
    if (resume) startTimer();
  };
  const enterCaptionEdit = () => {
    if (!captionEditor) return;
    captionEditor.readOnly = false;
    captionEditor.classList.add("is-editing");
    state.isEditingCaption = true;
    clearTimer();
    captionEditor.focus();
  };
  captionEditor?.addEventListener("click", () => {
    if (captionEditor.readOnly) captionEditor.blur();
  });
  captionEditor?.addEventListener("dblclick", enterCaptionEdit);
  captionEditor?.addEventListener("focus", () => {
    if (captionEditor.readOnly) return;
    state.isEditingCaption = true;
    clearTimer();
  });
  captionEditor?.addEventListener("input", () => {
    if (captionEditor.readOnly) return;
    updateCurrentPhotoCaption(captionEditor.value);
  });
  let captionResizeFrame = null;
  const captionResizeObserver = new ResizeObserver((entries) => {
    if (!captionEditor?.classList.contains("is-editing")) return;
    if (captionResizeFrame) window.cancelAnimationFrame(captionResizeFrame);
    captionResizeFrame = window.requestAnimationFrame(() => {
      const entry = entries[entries.length - 1];
      const measuredHeight = captionEditor.getBoundingClientRect().height || entry?.contentRect?.height;
      updateCurrentPhotoCaptionHeight(measuredHeight);
      captionResizeFrame = null;
    });
  });
  if (captionEditor) captionResizeObserver.observe(captionEditor);
  captionEditor?.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.stopPropagation();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      exitCaptionEdit();
      captionEditor.blur();
    }
  });
  captionEditor?.addEventListener("blur", () => {
    exitCaptionEdit();
  });
  app.querySelector(".detail-view")?.addEventListener("pointerdown", (event) => {
    if (!captionEditor || captionEditor.readOnly || event.target === captionEditor) return;
    if (event.target.closest("[data-photo-index], [data-photo-step]")) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    captionEditor.blur();
  }, true);

  setPhoto(state.currentPhotoIndex, false);
  window.requestAnimationFrame(updateThumbNavState);
  startTimer();
}

function detailTimelineTemplate(destination) {
  const stages = Array.isArray(destination.stages) && destination.stages.length
    ? destination.stages
    : [{ id: "waypoint", name: "途径点" }];

  return `
    <div class="detail-timeline" aria-label="途径点">
      <p class="timeline-title">旅程路线</p>
      ${stages.map((stage, index) => {
        return `
          <article class="timeline-item" data-stage-id="${escapeHtml(stage.id || "")}">
            <span class="timeline-dot"></span>
            <h2>
              <span class="timeline-name">${escapeHtml(stage.name || `途径点 ${String(index + 1).padStart(2, "0")}`)}</span>
            </h2>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function photosFor(destination) {
  const photos = Array.isArray(destination.photos) && destination.photos.length
    ? destination.photos
    : [{ id: "cover", src: destination.cover || fallbackImage, caption: "" }];
  return photos.map((photo) => ({ ...photo, src: photo.src || destination.cover || fallbackImage }));
}

function editablePhotoRecord() {
  const destination = destinationById(state.currentDestinationId);
  if (!destination) return null;
  destination.photos = Array.isArray(destination.photos) ? destination.photos : [];
  if (!destination.photos.length) {
    destination.photos.push({
      id: `photo-${Date.now()}`,
      src: destination.cover || fallbackImage,
      caption: "",
      cover: true
    });
  }
  const index = clamp(state.currentPhotoIndex, 0, destination.photos.length - 1);
  return { destination, photo: destination.photos[index] };
}

function setCaptionSaveState(text, tone = "") {
  const node = app.querySelector("#captionSaveState");
  if (!node) return;
  node.textContent = text;
  node.dataset.tone = tone;
}

function updateCurrentPhotoCaption(value) {
  const record = editablePhotoRecord();
  if (!record) return;
  record.photo.caption = value;
  setCaptionSaveState("正在保存...");
  scheduleSiteSave();
}

function updateCurrentPhotoCaptionHeight(value) {
  const record = editablePhotoRecord();
  if (!record) return;
  const nextHeight = normalizeCaptionHeight(value);
  if (record.photo.captionHeight === nextHeight) return;
  record.photo.captionHeight = nextHeight;
  setCaptionSaveState("正在保存文本框大小...");
  scheduleSiteSave();
}

function updateThumbNavState() {
  const rail = app.querySelector(".thumb-rail");
  const dock = app.querySelector(".thumb-dock");
  if (!rail || !dock) return;

  const maxScroll = Math.max(0, rail.scrollWidth - rail.clientWidth);
  const canScroll = maxScroll > 2;
  dock.classList.toggle("has-overflow", canScroll);

  const prev = dock.querySelector("[data-thumb-step='-1']");
  const next = dock.querySelector("[data-thumb-step='1']");
  if (prev) prev.disabled = !canScroll || rail.scrollLeft <= 2;
  if (next) next.disabled = !canScroll || rail.scrollLeft >= maxScroll - 2;
}

function scrollThumbRail(direction) {
  const rail = app.querySelector(".thumb-rail");
  if (!rail || !direction) return;

  const distance = Math.max(rail.clientWidth * 0.72, 160);
  rail.scrollBy({ left: direction * distance, behavior: "smooth" });
  window.setTimeout(updateThumbNavState, 260);
}

function centerActiveThumbnail(index, behavior = "smooth") {
  const rail = app.querySelector(".thumb-rail");
  if (!rail) return;

  const active = rail.querySelector(`.thumb-button[data-photo-index="${index}"]`);
  if (!active) return;

  const maxScroll = Math.max(0, rail.scrollWidth - rail.clientWidth);
  const target = active.offsetLeft - (rail.clientWidth - active.offsetWidth) / 2;
  rail.scrollTo({ left: clamp(target, 0, maxScroll), behavior });
  window.setTimeout(updateThumbNavState, behavior === "auto" ? 0 : 260);
}

function scheduleSiteSave() {
  if (state.captionSaveTimer) window.clearTimeout(state.captionSaveTimer);
  state.captionSaveTimer = window.setTimeout(saveSiteNow, 700);
}

async function saveSiteNow() {
  if (state.captionSaveTimer) {
    window.clearTimeout(state.captionSaveTimer);
    state.captionSaveTimer = null;
  }
  if (!state.site) return;
  setCaptionSaveState("正在保存...");
  try {
    const response = await fetch("/api/site", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(state.site)
    });
    if (!response.ok) throw new Error("save failed");
    setCaptionSaveState("已保存");
    window.setTimeout(() => {
      const node = app.querySelector("#captionSaveState");
      if (node?.textContent === "已保存") setCaptionSaveState("");
    }, 1600);
  } catch (error) {
    setCaptionSaveState("保存失败", "error");
  }
}

function setPhoto(index, restart = true) {
  const destination = destinationById(state.currentDestinationId);
  if (!destination) return;
  const photos = photosFor(destination);
  const nextIndex = (index + photos.length) % photos.length;
  const photo = photos[nextIndex];
  const image = app.querySelector("#heroPhoto");
  const detailView = app.querySelector(".detail-view");
  const previousIndex = state.currentPhotoIndex;
  const captionNode = app.querySelector("#detailCaption");

  if (captionNode?.classList.contains("is-editing") && nextIndex !== previousIndex) {
    return;
  }

  state.currentPhotoIndex = nextIndex;

  if (image) {
    image.classList.remove("is-visible");
    window.setTimeout(() => {
      image.src = photo.src || fallbackImage;
      image.alt = photo.caption || destination.name;
      const rotation = normalizePhotoRotation(photo.rotation);
      image.style.setProperty("--photo-rotation", `${rotation}deg`);
      image.onload = () => {
        fitDetailPhoto(image, rotation);
        image.classList.add("is-visible");
      };
      if (image.complete) {
        fitDetailPhoto(image, rotation);
        image.classList.add("is-visible");
      }
    }, 140);
  }

  const titleNode = app.querySelector("#detailTitle");
  const englishNode = app.querySelector("#detailEnglish");
  const travelTimeNode = app.querySelector("#detailTravelTime");

  if (titleNode) titleNode.textContent = destination.name || "";
  if (englishNode) englishNode.textContent = destination.englishName || destination.country || "";
  if (travelTimeNode) {
    const travelTime = formatTravelTime(destination);
    travelTimeNode.textContent = travelTime;
    travelTimeNode.hidden = !travelTime;
  }
  if (captionNode && !captionNode.classList.contains("is-editing")) {
    const captionText = photoText(destination, photo);
    applyCaptionHeight(captionNode, photo);
    if ("value" in captionNode) captionNode.value = captionText;
    else captionNode.textContent = captionText;
    syncCaptionVisibility(captionNode, app.querySelector("#captionSaveState"), captionText, false);
  }
  detailView?.style.setProperty("--active-image", `url("${photo.src || fallbackImage}")`);

  app.querySelectorAll(".timeline-item").forEach((item) => {
    item.classList.remove("is-active");
  });

  app.querySelectorAll(".thumb-button").forEach((button) => {
    button.classList.toggle("is-active", Number(button.dataset.photoIndex) === nextIndex);
  });
  centerActiveThumbnail(nextIndex, restart ? "smooth" : "auto");

  if (restart) startTimer();
}

function clearTimer() {
  if (state.timer) window.clearInterval(state.timer);
  state.timer = null;
}

function startTimer() {
  clearTimer();
  if (state.isEditingCaption) return;
  const duration = Math.max(1800, Number(state.site?.playback?.duration || 5200));
  state.timer = window.setInterval(() => setPhoto(state.currentPhotoIndex + 1, false), duration);
}

function switchDestination(offset) {
  const items = visibleDestinations();
  const current = items.findIndex((item) => item.id === state.currentDestinationId);
  if (current === -1 || !items.length) return;
  const next = items[(current + offset + items.length) % items.length];
  openDestination(next.id);
}

function goHome() {
  location.hash = "#map";
  showMapPicker();
}

function homeCoverStats(destinations) {
  const countries = footprintCountries();
  const footprintStats = footprintWorldStats(countries);
  const fallbackCountries = new Set();
  destinations.forEach((destination) => {
    const country = String(destination.country || "").trim();
    if (country.includes("中国") || /China/i.test(country)) {
      fallbackCountries.add("中国");
    } else if (country.includes("新西兰") || /New Zealand/i.test(country)) {
      fallbackCountries.add("新西兰");
    } else if (country) {
      fallbackCountries.add(country.split(/[·|｜-]/)[0].trim() || country);
    }
  });

  return {
    countryCount: footprintStats.countryCount || fallbackCountries.size || destinations.length,
    cityCount: footprintStats.cityCount || destinations.length,
    fragmentCount: destinations.reduce((total, destination) => total + photosFor(destination).length, 0)
  };
}

function homeCoverMarkerTemplate(destination, index = 0) {
  const geo = destination.geo || {};
  const lat = Number(geo.lat);
  const lng = normalizeLongitude(geo.lng);
  if (!Number.isFinite(lat) || lng === null) return "";

  const color = safeColor(destination.color, "#E6F4FF");
  const delay = `${(index % 8) * -0.38}s`;
  return `
    <button class="cover-glow" type="button" data-open-destination="${escapeHtml(destination.id)}" data-lat="${lat}" data-lng="${lng}" style="--marker:${color}; --pulse-delay:${delay}" aria-label="打开${escapeHtml(destination.name)}">
      <span class="cover-glow-core"></span>
      <span class="cover-glow-label">${escapeHtml(destination.name)}</span>
    </button>
  `;
}

function showHome() {
  if (typeof state.homeEffectCleanup === "function") {
    state.homeEffectCleanup();
    state.homeEffectCleanup = null;
  }
  if (typeof state.homeGlobeCleanup === "function") {
    state.homeGlobeCleanup();
  }
  clearTimer();
  state.currentDestinationId = null;
  setDocumentTitle("");
  document.body.style.removeProperty("--accent");

  const theme = state.site.theme || {};
  const siteTitle = theme.title || "世界碎片";
  const homeTitle = theme.tagline || "世界是完整的\n我们在路上，收集碎片";
  const homeSubtitle = theme.subtitle || "风景、人物、故事与偶然相遇\n都被收藏成独一无二的记忆碎片";
  const destinations = visibleDestinations();

  app.innerHTML = `
    <main class="home-view home-cover-view">
      <section id="map" class="world-stage cover-stage cinematic-home-stage" aria-label="世界碎片首页封面">
        <div class="map-backdrop"></div>
        <div class="visited-glow-layer" aria-label="去过的地点">
          ${destinations.map((destination, index) => visitedGlowTemplate(destination, index)).join("")}
        </div>
        <header class="topbar cover-topbar cinematic-home-topbar">
          <button class="brand-button cover-brand cinematic-home-brand" type="button" data-home aria-label="返回首页">
            <span class="cinematic-home-brand-en">WORLD FRAGMENTS</span>
          </button>
          <nav class="topnav cover-nav cinematic-home-nav" aria-label="主导航">
            <a href="#map">碎片</a>
            <a href="#footprints">足迹</a>
            <a href="${adminHref()}">后台</a>
          </nav>
        </header>
        <div class="home-copy cinematic-home-copy">
          <h1 class="name-reveal">${multilineHtml(homeTitle)}</h1>
          <p class="home-subtitle blur-in">${multilineHtml(homeSubtitle)}</p>
          ${destinations.length ? '<button class="fragment-entry blur-in" type="button" data-start-fragments>开始探索</button>' : ""}
        </div>
      </section>
    </main>
  `;

  app.querySelectorAll("[data-open-destination]").forEach((button) => {
    button.addEventListener("click", () => playHomeDestinationTransition(button.dataset.openDestination, button));
  });
  app.querySelectorAll("[data-home]").forEach((button) => {
    button.addEventListener("click", () => {
      history.replaceState(null, "", location.pathname);
      showHome();
    });
  });
  app.querySelectorAll("[data-start-fragments]").forEach((button) => {
    button.addEventListener("click", () => {
      location.hash = "#map";
    });
  });
}

function initHomePortfolioEffects() {
  const cleanups = [];
  const loader = app.querySelector("[data-home-loader]");
  if (loader) {
    const countNode = loader.querySelector("[data-loader-count]");
    const progressNode = loader.querySelector("[data-loader-progress]");
    const wordNode = loader.querySelector("[data-loader-word]");
    const words = ["Travel", "Collect", "Remember"];
    const startedAt = performance.now();
    let frame = 0;
    const animateLoader = (now) => {
      if (!loader.isConnected) return;
      const elapsed = now - startedAt;
      const progress = clamp(elapsed / 2700, 0, 1);
      const count = Math.round(progress * 100);
      if (countNode) countNode.textContent = String(count).padStart(3, "0");
      if (progressNode) progressNode.style.transform = `scaleX(${progress})`;
      if (wordNode) wordNode.textContent = words[Math.min(words.length - 1, Math.floor(progress * words.length))];
      if (progress < 1) {
        frame = requestAnimationFrame(animateLoader);
      } else {
        state.homeLoaderShown = true;
        window.setTimeout(() => {
          loader.classList.add("is-complete");
          window.setTimeout(() => loader.remove(), 420);
        }, 400);
      }
    };
    frame = requestAnimationFrame(animateLoader);
    cleanups.push(() => {
      if (frame) cancelAnimationFrame(frame);
      loader.remove();
    });
  }

  const roleNode = app.querySelector("[data-role-word]");
  if (roleNode) {
    const roles = ["Memory", "Journey", "Fragment", "Footprint"];
    let index = 0;
    const roleTimer = window.setInterval(() => {
      if (!roleNode.isConnected) {
        window.clearInterval(roleTimer);
        return;
      }
      index = (index + 1) % roles.length;
      roleNode.classList.remove("is-changing");
      void roleNode.offsetWidth;
      roleNode.textContent = roles[index];
      roleNode.classList.add("is-changing");
    }, 2000);
    cleanups.push(() => window.clearInterval(roleTimer));
  }

  initCoverVideo();
  state.homeEffectCleanup = () => cleanups.forEach((cleanup) => cleanup());
}

function initCoverVideo() {
  const video = app.querySelector("[data-cover-video]");
  if (!video) return;
  const source = "https://stream.mux.com/Aa02T7oM1wH5Mk5EEVDYhbZ1ChcdhRsS2m1NYyx4Ua1g.m3u8";
  const attachNative = () => {
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = source;
      video.play?.().catch(() => {});
    }
  };
  if (window.Hls?.isSupported?.()) {
    const hls = new window.Hls({ enableWorker: true });
    hls.loadSource(source);
    hls.attachMedia(video);
    hls.on(window.Hls.Events.MANIFEST_PARSED, () => video.play?.().catch(() => {}));
    return;
  }
  if (window.Hls) {
    attachNative();
    return;
  }
  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js";
  script.async = true;
  script.onload = () => {
    if (window.Hls?.isSupported?.()) {
      const hls = new window.Hls({ enableWorker: true });
      hls.loadSource(source);
      hls.attachMedia(video);
      hls.on(window.Hls.Events.MANIFEST_PARSED, () => video.play?.().catch(() => {}));
    } else {
      attachNative();
    }
  };
  script.onerror = attachNative;
  document.head.appendChild(script);
}

function makeHomeNightLights() {
  const clusters = [
    { lat: 34, lng: 112, spreadLat: 17, spreadLng: 31, count: 360, power: 0.8 },
    { lat: 31, lng: 121, spreadLat: 8, spreadLng: 10, count: 150, power: 0.95 },
    { lat: 23, lng: 114, spreadLat: 7, spreadLng: 11, count: 150, power: 0.88 },
    { lat: 37, lng: 127, spreadLat: 5, spreadLng: 5, count: 72, power: 0.82 },
    { lat: 36, lng: 138, spreadLat: 8, spreadLng: 8, count: 120, power: 0.78 },
    { lat: 15, lng: 101, spreadLat: 12, spreadLng: 16, count: 110, power: 0.58 },
    { lat: 22, lng: 78, spreadLat: 13, spreadLng: 18, count: 130, power: 0.58 },
    { lat: 42, lng: 87, spreadLat: 10, spreadLng: 18, count: 70, power: 0.42 },
    { lat: -36, lng: 174, spreadLat: 7, spreadLng: 7, count: 42, power: 0.58 }
  ];
  const corridors = [
    { from: [39.9, 116.4], to: [31.2, 121.5], count: 130, power: 0.82 },
    { from: [31.2, 121.5], to: [23.1, 113.3], count: 120, power: 0.78 },
    { from: [30.6, 104.1], to: [29.6, 106.5], count: 70, power: 0.72 },
    { from: [35.7, 139.7], to: [34.7, 135.5], count: 64, power: 0.7 },
    { from: [37.6, 126.9], to: [35.2, 129.1], count: 54, power: 0.68 },
    { from: [28.6, 77.2], to: [19.1, 72.9], count: 70, power: 0.48 },
    { from: [21.0, 105.8], to: [13.7, 100.5], count: 68, power: 0.5 }
  ];
  let seed = 1147;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const lights = [];
  clusters.forEach((cluster) => {
    for (let index = 0; index < cluster.count; index += 1) {
      const angle = random() * Math.PI * 2;
      const distance = Math.pow(random(), 0.62);
      lights.push({
        lat: cluster.lat + Math.sin(angle) * cluster.spreadLat * distance,
        lng: cluster.lng + Math.cos(angle) * cluster.spreadLng * distance,
        size: 0.45 + random() * 1.35,
        alpha: cluster.power * (0.36 + random() * 0.64)
      });
    }
  });
  corridors.forEach((corridor) => {
    for (let index = 0; index < corridor.count; index += 1) {
      const t = corridor.count <= 1 ? 0 : index / (corridor.count - 1);
      const wiggle = (random() - 0.5) * 2.2;
      lights.push({
        lat: corridor.from[0] + (corridor.to[0] - corridor.from[0]) * t + (random() - 0.5) * 1.5,
        lng: corridor.from[1] + (corridor.to[1] - corridor.from[1]) * t + wiggle,
        size: 0.34 + random() * 1.08,
        alpha: corridor.power * (0.36 + random() * 0.64)
      });
    }
  });
  return lights;
}

function makeHomeSurfacePatches() {
  return [
    { lat: 35, lng: 102, radiusX: 0.34, radiusY: 0.18, rotate: -0.16, alpha: 0.38 },
    { lat: 27, lng: 118, radiusX: 0.22, radiusY: 0.12, rotate: 0.24, alpha: 0.34 },
    { lat: 42, lng: 122, radiusX: 0.18, radiusY: 0.1, rotate: -0.28, alpha: 0.28 },
    { lat: 36, lng: 138, radiusX: 0.12, radiusY: 0.06, rotate: 0.54, alpha: 0.32 },
    { lat: 17, lng: 102, radiusX: 0.18, radiusY: 0.12, rotate: -0.1, alpha: 0.24 },
    { lat: 23, lng: 78, radiusX: 0.2, radiusY: 0.13, rotate: -0.32, alpha: 0.24 },
    { lat: 45, lng: 82, radiusX: 0.28, radiusY: 0.12, rotate: 0.08, alpha: 0.2 },
    { lat: -38, lng: 175, radiusX: 0.09, radiusY: 0.05, rotate: 0.65, alpha: 0.18 }
  ];
}

function parseWorldPathToCoordinates(pathData, width = 1000, height = 500) {
  const tokens = String(pathData || "").match(/[MLZ]|-?\d+(?:\.\d+)?/g) || [];
  const segments = [];
  let segment = [];
  let command = "";
  let index = 0;

  const pushPoint = (x, y) => {
    const lon = (Number(x) / width) * 360 - 180;
    const lat = 90 - (Number(y) / height) * 180;
    if (Number.isFinite(lat) && Number.isFinite(lon)) segment.push({ lat, lng: lon });
  };

  while (index < tokens.length) {
    const token = tokens[index++];
    if (token === "M" || token === "L") {
      command = token;
      if (command === "M" && segment.length) {
        segments.push(segment);
        segment = [];
      }
      pushPoint(tokens[index++], tokens[index++]);
    } else if (token === "Z") {
      if (segment.length) segments.push(segment);
      segment = [];
      command = "";
    } else if (command === "M" || command === "L") {
      pushPoint(token, tokens[index++]);
    }
  }

  if (segment.length) segments.push(segment);
  return segments.filter((item) => item.length > 1);
}

function projectHomeGlobePoint(lat, lng, rotation, metrics) {
  const toRad = Math.PI / 180;
  const phi = Number(lat) * toRad;
  const lambda = (normalizeLongitude(lng - rotation.lon) || 0) * toRad;
  const phi0 = Number(rotation.lat) * toRad;
  const sinPhi = Math.sin(phi);
  const cosPhi = Math.cos(phi);
  const sinPhi0 = Math.sin(phi0);
  const cosPhi0 = Math.cos(phi0);
  const cosLambda = Math.cos(lambda);
  const visible = sinPhi0 * sinPhi + cosPhi0 * cosPhi * cosLambda;

  return {
    x: metrics.cx + metrics.radius * cosPhi * Math.sin(lambda),
    y: metrics.cy - metrics.radius * (cosPhi0 * sinPhi - sinPhi0 * cosPhi * cosLambda),
    visible
  };
}

async function initHomeCoverGlobe(destinations) {
  if (state.homeGlobeCleanup) state.homeGlobeCleanup();

  const shell = app.querySelector("[data-globe-shell]");
  const canvas = app.querySelector("[data-home-globe]");
  const markerLayer = app.querySelector("[data-globe-markers]");
  if (!shell || !canvas || !markerLayer) return;

  const context = canvas.getContext("2d");
  const markers = [...markerLayer.querySelectorAll("[data-open-destination]")];
  const reducedMotion = prefersReducedMotion();
  const rotation = { lon: 124, lat: 12 };
  const nightLights = makeHomeNightLights();
  const surfacePatches = makeHomeSurfacePatches();
  let worldSegments = [];
  let dragging = false;
  let previousPointer = null;
  let frame = 0;
  let destroyed = false;

  const cleanup = () => {
    destroyed = true;
    if (frame) cancelAnimationFrame(frame);
    shell.removeEventListener("pointerdown", onPointerDown);
    shell.removeEventListener("pointermove", onPointerMove);
    shell.removeEventListener("pointerup", onPointerUp);
    shell.removeEventListener("pointercancel", onPointerUp);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerUp);
    shell.removeEventListener("mousedown", onMouseDown);
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
    window.removeEventListener("resize", render);
    if (state.homeGlobeCleanup === cleanup) state.homeGlobeCleanup = null;
  };

  state.homeGlobeCleanup = cleanup;

  try {
    const response = await fetch(publicPath("/assets/world-countries-paths.json"), { cache: "force-cache" });
    if (response.ok) {
      const world = await response.json();
      worldSegments = (world.countries || [])
        .flatMap((country) => parseWorldPathToCoordinates(country.d, world.width, world.height));
    }
  } catch (error) {
    worldSegments = [];
  }

  function metrics() {
    const rect = shell.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    const radius = Math.min(width * 0.59, height * 1.22);
    return {
      width,
      height,
      cx: width / 2,
      cy: height * 1.24,
      radius
    };
  }

  function drawBase(m) {
    context.clearRect(0, 0, m.width, m.height);
    context.save();
    context.beginPath();
    context.arc(m.cx, m.cy, m.radius, 0, Math.PI * 2);
    context.clip();
  }

  function drawLand(m) {
    context.save();
    surfacePatches.forEach((patch) => {
      const projected = projectHomeGlobePoint(patch.lat, patch.lng, rotation, m);
      if (projected.visible <= -0.05) return;
      const visibility = Math.max(0.18, Math.min(1, projected.visible));
      const width = m.radius * patch.radiusX * (0.58 + visibility * 0.42);
      const height = m.radius * patch.radiusY * (0.5 + visibility * 0.45);
      context.save();
      context.translate(projected.x, projected.y);
      context.rotate(patch.rotate);
      const land = context.createRadialGradient(0, 0, 0, 0, 0, width);
      land.addColorStop(0, `rgba(62, 86, 88, ${patch.alpha * visibility})`);
      land.addColorStop(0.52, `rgba(30, 51, 58, ${patch.alpha * 0.66 * visibility})`);
      land.addColorStop(1, "rgba(0, 0, 0, 0)");
      context.fillStyle = land;
      context.beginPath();
      context.ellipse(0, 0, width, height, 0, 0, Math.PI * 2);
      context.fill();
      context.restore();
    });

    context.globalCompositeOperation = "screen";
    const horizonWash = context.createLinearGradient(0, m.cy - m.radius, 0, m.cy - m.radius * 0.68);
    horizonWash.addColorStop(0, "rgba(156, 215, 255, 0.18)");
    horizonWash.addColorStop(0.42, "rgba(78, 132, 174, 0.08)");
    horizonWash.addColorStop(1, "rgba(0, 0, 0, 0)");
    context.fillStyle = horizonWash;
    context.fillRect(m.cx - m.radius, m.cy - m.radius, m.radius * 2, m.radius * 0.36);
    context.restore();
  }

  function drawLights(m) {
    context.save();
    context.globalCompositeOperation = "lighter";
    nightLights.forEach((light) => {
      const projected = projectHomeGlobePoint(light.lat, light.lng, rotation, m);
      if (projected.visible <= -0.02) return;
      const visibility = Math.max(0, Math.min(1, projected.visible * 1.55));
      const size = light.size * (0.86 + visibility * 1.12);
      context.beginPath();
      context.fillStyle = `rgba(250, 246, 226, ${light.alpha * visibility})`;
      context.shadowBlur = 4 + size * 4;
      context.shadowColor = "rgba(184, 218, 255, 0.62)";
      context.arc(projected.x, projected.y, size, 0, Math.PI * 2);
      context.fill();
      if (light.size > 1.12 && visibility > 0.45) {
        context.beginPath();
        context.fillStyle = `rgba(178, 220, 255, ${0.16 * visibility})`;
        context.arc(projected.x, projected.y, size * 3.2, 0, Math.PI * 2);
        context.fill();
      }
    });
    context.restore();
  }

  function drawRim(m) {
    context.restore();
    context.save();
    const outerRadius = Math.max(1, m.radius);
    const innerRadius = Math.max(1, m.radius - 10);
    const glowRadius = Math.max(1, m.radius + 6);
    context.beginPath();
    context.arc(m.cx, m.cy, outerRadius, Math.PI * 1.035, Math.PI * 1.965);
    context.lineWidth = Math.max(2.2, m.radius / 64);
    context.strokeStyle = "rgba(168, 222, 255, 0.92)";
    context.shadowBlur = 24;
    context.shadowColor = "rgba(118, 196, 255, 0.9)";
    context.stroke();

    context.beginPath();
    context.arc(m.cx, m.cy, innerRadius, Math.PI * 1.05, Math.PI * 1.95);
    context.lineWidth = Math.max(0.9, m.radius / 240);
    context.strokeStyle = "rgba(236, 249, 255, 0.62)";
    context.shadowBlur = 10;
    context.stroke();

    context.beginPath();
    context.arc(m.cx, m.cy, glowRadius, Math.PI * 1.06, Math.PI * 1.94);
    context.lineWidth = Math.max(0.9, m.radius / 180);
    context.strokeStyle = "rgba(78, 156, 232, 0.24)";
    context.shadowBlur = 32;
    context.stroke();
    context.restore();
  }

  function updateMarkers(m) {
    markers.forEach((marker) => {
      const lat = Number(marker.dataset.lat);
      const lng = Number(marker.dataset.lng);
      const projected = projectHomeGlobePoint(lat, lng, rotation, m);
      const visible = projected.visible > -0.08
        && projected.y > -8
        && projected.y < m.height + 24
        && projected.x > -16
        && projected.x < m.width + 16;
      marker.style.left = `${projected.x}px`;
      marker.style.top = `${projected.y}px`;
      marker.style.opacity = visible ? String(Math.min(1, Math.max(0.48, 0.58 + projected.visible * 0.62))) : "0";
      marker.style.pointerEvents = visible ? "auto" : "none";
      marker.classList.toggle("is-back", !visible);
    });
  }

  function render() {
    if (destroyed || !canvas.isConnected) {
      cleanup();
      return;
    }
    if (!dragging && !reducedMotion) rotation.lon = normalizeLongitude(rotation.lon + 0.003) || rotation.lon;
    const m = metrics();
    drawBase(m);
    drawLand(m);
    drawLights(m);
    drawRim(m);
    updateMarkers(m);
    frame = requestAnimationFrame(render);
  }

  function onPointerDown(event) {
    dragging = true;
    previousPointer = { x: event.clientX, y: event.clientY };
    shell.classList.add("is-dragging");
    shell.setPointerCapture?.(event.pointerId);
  }

  function onPointerMove(event) {
    if (!dragging || !previousPointer) return;
    const dx = event.clientX - previousPointer.x;
    const dy = event.clientY - previousPointer.y;
    rotation.lon = normalizeLongitude(rotation.lon - dx * 0.24) || rotation.lon;
    rotation.lat = clamp(rotation.lat + dy * 0.13, -34, 48);
    previousPointer = { x: event.clientX, y: event.clientY };
  }

  function onPointerUp(event) {
    dragging = false;
    previousPointer = null;
    shell.classList.remove("is-dragging");
    shell.releasePointerCapture?.(event.pointerId);
  }

  function onMouseDown(event) {
    dragging = true;
    previousPointer = { x: event.clientX, y: event.clientY };
    shell.classList.add("is-dragging");
    event.preventDefault();
  }

  function onMouseMove(event) {
    onPointerMove(event);
  }

  function onMouseUp() {
    dragging = false;
    previousPointer = null;
    shell.classList.remove("is-dragging");
  }

  shell.addEventListener("pointerdown", onPointerDown);
  shell.addEventListener("pointermove", onPointerMove);
  shell.addEventListener("pointerup", onPointerUp);
  shell.addEventListener("pointercancel", onPointerUp);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);
  shell.addEventListener("mousedown", onMouseDown);
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", onMouseUp);
  window.addEventListener("resize", render, { passive: true });
  render();
}

window.addEventListener("hashchange", route);
window.addEventListener("resize", fitCurrentDetailPhoto);
window.addEventListener("keydown", (event) => {
  if (!state.currentDestinationId) return;
  const target = event.target;
  const isTypingTarget = target instanceof HTMLInputElement
    || target instanceof HTMLTextAreaElement
    || target?.isContentEditable;
  if (state.isEditingCaption || isTypingTarget) {
    if (event.key === "Escape") return;
    return;
  }
  if (event.key === "ArrowRight") setPhoto(state.currentPhotoIndex + 1);
  if (event.key === "ArrowLeft") setPhoto(state.currentPhotoIndex - 1);
  if (event.key === "Escape") goHome();
});

loadSite()
  .then(route)
  .catch((error) => {
    app.innerHTML = `
      <main class="error-view">
        <h1>网站数据没有读到</h1>
        <p>${escapeHtml(error.message)}</p>
        <a href="${adminHref()}">打开后台检查</a>
      </main>
    `;
  });
