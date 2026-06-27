const adminApp = document.getElementById("adminApp");
const toast = document.getElementById("toast");

let siteData = null;
let selectedId = "";
let selectedSection = "home";
let selectedFootprintCountryCode = "";
let dirty = false;
let draggedDestinationIndex = null;

const footprintRegionCatalogs = {
  CN: [
    ["CN-BJ", "北京", "Beijing"],
    ["CN-TJ", "天津", "Tianjin"],
    ["CN-HE", "河北", "Hebei"],
    ["CN-SX", "山西", "Shanxi"],
    ["CN-NM", "内蒙古", "Inner Mongolia"],
    ["CN-LN", "辽宁", "Liaoning"],
    ["CN-JL", "吉林", "Jilin"],
    ["CN-HLJ", "黑龙江", "Heilongjiang"],
    ["CN-SH", "上海", "Shanghai"],
    ["CN-JS", "江苏", "Jiangsu"],
    ["CN-ZJ", "浙江", "Zhejiang"],
    ["CN-AH", "安徽", "Anhui"],
    ["CN-FJ", "福建", "Fujian"],
    ["CN-JX", "江西", "Jiangxi"],
    ["CN-SD", "山东", "Shandong"],
    ["CN-HA", "河南", "Henan"],
    ["CN-HB", "湖北", "Hubei"],
    ["CN-HN", "湖南", "Hunan"],
    ["CN-GD", "广东", "Guangdong"],
    ["CN-GX", "广西", "Guangxi"],
    ["CN-HI", "海南", "Hainan"],
    ["CN-CQ", "重庆", "Chongqing"],
    ["CN-SC", "四川", "Sichuan"],
    ["CN-GZ", "贵州", "Guizhou"],
    ["CN-YN", "云南", "Yunnan"],
    ["CN-XZ", "西藏", "Tibet"],
    ["CN-SN", "陕西", "Shaanxi"],
    ["CN-GS", "甘肃", "Gansu"],
    ["CN-QH", "青海", "Qinghai"],
    ["CN-NX", "宁夏", "Ningxia"],
    ["CN-XJ", "新疆", "Xinjiang"],
    ["CN-TW", "台湾", "Taiwan"]
  ],
  NZ: [
    ["NZ-NTL", "北地", "Northland"],
    ["NZ-AUK", "奥克兰", "Auckland"],
    ["NZ-WKO", "怀卡托", "Waikato"],
    ["NZ-BOP", "丰盛湾", "Bay of Plenty"],
    ["NZ-GIS", "吉斯伯恩", "Gisborne"],
    ["NZ-HKB", "霍克斯湾", "Hawke's Bay"],
    ["NZ-TKI", "塔拉纳基", "Taranaki"],
    ["NZ-MWT", "马纳瓦图-旺阿努伊", "Manawatu-Wanganui"],
    ["NZ-WGN", "惠灵顿", "Wellington"],
    ["NZ-TAS", "塔斯曼", "Tasman"],
    ["NZ-NSN", "尼尔森", "Nelson"],
    ["NZ-MBH", "马尔堡", "Marlborough"],
    ["NZ-WTC", "西海岸", "West Coast"],
    ["NZ-CAN", "坎特伯雷", "Canterbury"],
    ["NZ-OTA", "奥塔哥", "Otago"],
    ["NZ-STL", "南地", "Southland"]
  ]
};

const footprintCityCatalogs = {
  "CN-BJ": ["北京"],
  "CN-TJ": ["天津"],
  "CN-HE": ["石家庄", "唐山", "秦皇岛", "邯郸", "邢台", "保定", "张家口", "承德", "沧州", "廊坊", "衡水"],
  "CN-SX": ["太原", "大同", "阳泉", "长治", "晋城", "朔州", "晋中", "运城", "忻州", "临汾", "吕梁"],
  "CN-NM": ["呼和浩特", "包头", "乌海", "赤峰", "通辽", "鄂尔多斯", "呼伦贝尔", "巴彦淖尔", "乌兰察布", "兴安盟", "锡林郭勒盟", "阿拉善盟"],
  "CN-LN": ["沈阳", "大连", "鞍山", "抚顺", "本溪", "丹东", "锦州", "营口", "阜新", "辽阳", "盘锦", "铁岭", "朝阳", "葫芦岛"],
  "CN-JL": ["长春", "吉林", "四平", "辽源", "通化", "白山", "松原", "白城", "延边朝鲜族自治州"],
  "CN-HLJ": ["哈尔滨", "齐齐哈尔", "鸡西", "鹤岗", "双鸭山", "大庆", "伊春", "佳木斯", "七台河", "牡丹江", "黑河", "绥化", "大兴安岭地区"],
  "CN-SH": ["上海"],
  "CN-JS": ["南京", "无锡", "徐州", "常州", "苏州", "南通", "连云港", "淮安", "盐城", "扬州", "镇江", "泰州", "宿迁"],
  "CN-ZJ": ["杭州", "宁波", "温州", "嘉兴", "湖州", "绍兴", "金华", "衢州", "舟山", "台州", "丽水"],
  "CN-AH": ["合肥", "芜湖", "蚌埠", "淮南", "马鞍山", "淮北", "铜陵", "安庆", "黄山", "滁州", "阜阳", "宿州", "六安", "亳州", "池州", "宣城"],
  "CN-FJ": ["福州", "厦门", "莆田", "三明", "泉州", "漳州", "南平", "龙岩", "宁德"],
  "CN-JX": ["南昌", "景德镇", "萍乡", "九江", "新余", "鹰潭", "赣州", "吉安", "宜春", "抚州", "上饶"],
  "CN-SD": ["济南", "青岛", "淄博", "枣庄", "东营", "烟台", "潍坊", "济宁", "泰安", "威海", "日照", "临沂", "德州", "聊城", "滨州", "菏泽"],
  "CN-HA": ["郑州", "开封", "洛阳", "平顶山", "安阳", "鹤壁", "新乡", "焦作", "濮阳", "许昌", "漯河", "三门峡", "南阳", "商丘", "信阳", "周口", "驻马店"],
  "CN-HB": ["武汉", "黄石", "十堰", "宜昌", "襄阳", "鄂州", "荆门", "孝感", "荆州", "黄冈", "咸宁", "随州", "恩施土家族苗族自治州"],
  "CN-HN": ["长沙", "株洲", "湘潭", "衡阳", "邵阳", "岳阳", "常德", "张家界", "益阳", "郴州", "永州", "怀化", "娄底", "湘西土家族苗族自治州"],
  "CN-GD": ["广州", "韶关", "深圳", "珠海", "汕头", "佛山", "江门", "湛江", "茂名", "肇庆", "惠州", "梅州", "汕尾", "河源", "阳江", "清远", "东莞", "中山", "潮州", "揭阳", "云浮"],
  "CN-GX": ["南宁", "柳州", "桂林", "梧州", "北海", "防城港", "钦州", "贵港", "玉林", "百色", "贺州", "河池", "来宾", "崇左"],
  "CN-HI": ["海口", "三亚", "三沙", "儋州"],
  "CN-CQ": ["重庆"],
  "CN-SC": ["成都", "自贡", "攀枝花", "泸州", "德阳", "绵阳", "广元", "遂宁", "内江", "乐山", "南充", "眉山", "宜宾", "广安", "达州", "雅安", "巴中", "资阳", "阿坝藏族羌族自治州", "甘孜藏族自治州", "凉山彝族自治州"],
  "CN-GZ": ["贵阳", "六盘水", "遵义", "安顺", "毕节", "铜仁", "黔西南布依族苗族自治州", "黔东南苗族侗族自治州", "黔南布依族苗族自治州"],
  "CN-YN": ["昆明", "曲靖", "玉溪", "保山", "昭通", "丽江", "普洱", "临沧", "楚雄彝族自治州", "红河哈尼族彝族自治州", "文山壮族苗族自治州", "西双版纳傣族自治州", "大理白族自治州", "德宏傣族景颇族自治州", "怒江傈僳族自治州", "迪庆藏族自治州"],
  "CN-XZ": ["拉萨", "日喀则", "昌都", "林芝", "山南", "那曲", "阿里地区"],
  "CN-SN": ["西安", "铜川", "宝鸡", "咸阳", "渭南", "延安", "汉中", "榆林", "安康", "商洛"],
  "CN-GS": ["兰州", "嘉峪关", "金昌", "白银", "天水", "武威", "张掖", "平凉", "酒泉", "庆阳", "定西", "陇南", "临夏回族自治州", "甘南藏族自治州"],
  "CN-QH": ["西宁", "海东", "海北藏族自治州", "黄南藏族自治州", "海南藏族自治州", "果洛藏族自治州", "玉树藏族自治州", "海西蒙古族藏族自治州"],
  "CN-NX": ["银川", "石嘴山", "吴忠", "固原", "中卫"],
  "CN-XJ": ["乌鲁木齐", "克拉玛依", "吐鲁番", "哈密", "昌吉回族自治州", "博尔塔拉蒙古自治州", "巴音郭楞蒙古自治州", "阿克苏地区", "克孜勒苏柯尔克孜自治州", "喀什地区", "和田地区", "伊犁哈萨克自治州", "塔城地区", "阿勒泰地区"],
  "CN-TW": ["台北", "新北", "桃园", "台中", "台南", "高雄", "基隆", "新竹", "嘉义", "苗栗", "彰化", "南投", "云林", "屏东", "宜兰", "花莲", "台东", "澎湖", "金门", "连江"],
  "NZ-NTL": ["北地", "Far North District", "Whangārei District", "Kaipara District"],
  "NZ-AUK": ["奥克兰", "Auckland Council"],
  "NZ-WKO": ["怀卡托", "Hamilton City", "Thames-Coromandel District", "Hauraki District", "Waikato District", "Matamata-Piako District", "Waipā District", "Ōtorohanga District", "South Waikato District", "Waitomo District", "Taupō District"],
  "NZ-BOP": ["丰盛湾", "Tauranga City", "Western Bay of Plenty District", "Rotorua Lakes District", "Whakatāne District", "Kawerau District", "Ōpōtiki District"],
  "NZ-GIS": ["吉斯伯恩", "Gisborne District"],
  "NZ-HKB": ["霍克斯湾", "Napier City", "Hastings District", "Wairoa District", "Central Hawke's Bay District"],
  "NZ-TKI": ["塔拉纳基", "New Plymouth District", "Stratford District", "South Taranaki District"],
  "NZ-MWT": ["马纳瓦图-旺阿努伊", "Whanganui District", "Palmerston North City", "Ruapehu District", "Rangitīkei District", "Manawatū District", "Tararua District", "Horowhenua District"],
  "NZ-WGN": ["惠灵顿", "Wellington City", "Lower Hutt City", "Upper Hutt City", "Porirua City", "Kāpiti Coast District", "Masterton District", "Carterton District", "South Wairarapa District"],
  "NZ-TAS": ["塔斯曼", "Tasman District"],
  "NZ-NSN": ["尼尔森", "Nelson City"],
  "NZ-MBH": ["马尔堡", "Marlborough District"],
  "NZ-WTC": ["西海岸", "Westland District", "Grey District", "Buller District"],
  "NZ-CAN": ["坎特伯雷", "基督城", "Christchurch City", "Kaikōura District", "Hurunui District", "Waimakariri District", "Selwyn District", "Ashburton District", "Timaru District", "Mackenzie District", "Waimate District"],
  "NZ-OTA": ["奥塔哥", "皇后镇", "Queenstown-Lakes District", "Dunedin City", "Central Otago District", "Clutha District", "Waitaki District"],
  "NZ-STL": ["南地", "因弗卡吉尔", "Invercargill City", "Southland District", "Gore District"]
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeColor(value, fallback = "#5DADE2") {
  return /^#[0-9a-f]{6}$/i.test(String(value || "")) ? value : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeRotation(value) {
  const rotation = Number(value);
  if (!Number.isFinite(rotation)) return 0;
  return ((rotation % 360) + 360) % 360;
}

function formatTravelTimeValue(value) {
  const text = String(value || "").trim();
  if (!text || /旅行记忆|待补充|回忆/.test(text)) return "";

  const match = text.match(/(19\d{2}|20\d{2})\s*(?:年|-|\/|\.)\s*(1[0-2]|0?[1-9])/);
  if (match) return `${match[1]}.${String(Number(match[2])).padStart(2, "0")}`;

  const yearOnly = text.match(/(19\d{2}|20\d{2})/);
  if (yearOnly) return yearOnly[1];

  return text;
}

function normalizeLongitude(value) {
  let lng = Number(value);
  if (!Number.isFinite(lng)) return 0;
  while (lng < -180) lng += 360;
  while (lng > 180) lng -= 360;
  return lng;
}

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function slugify(value) {
  const slug = String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || uid("destination");
}

function getPath(object, path) {
  return path.split(".").reduce((current, key) => current?.[key], object);
}

function setPath(object, path, value) {
  const parts = path.split(".");
  let current = object;
  while (parts.length > 1) {
    const part = parts.shift();
    if (!current[part] || typeof current[part] !== "object") current[part] = {};
    current = current[part];
  }
  current[parts[0]] = value;
}

function activeDestination() {
  return siteData?.destinations?.find((item) => item.id === selectedId) || siteData?.destinations?.[0];
}

function ensureFootprints() {
  if (!siteData.footprints || typeof siteData.footprints !== "object") {
    siteData.footprints = { version: "1.0", title: "足迹", description: "", countries: [] };
  }
  if (!Array.isArray(siteData.footprints.countries)) siteData.footprints.countries = [];
  return siteData.footprints;
}

function footprintCountries() {
  return ensureFootprints().countries;
}

function activeFootprintCountry() {
  const countries = footprintCountries();
  return countries.find((country) => country.countryCode === selectedFootprintCountryCode) || countries[0];
}

function markDirty() {
  dirty = true;
  const save = adminApp.querySelector("[data-save]");
  if (save) save.textContent = "保存修改";
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.setTimeout(() => toast.classList.remove("is-visible"), 2400);
}

async function loadSite() {
  const response = await fetch("/api/site", { cache: "no-store" });
  if (response.status === 401) {
    location.href = "/admin-login.html";
    throw new Error("请先登录后台。");
  }
  if (!response.ok) throw new Error("读取数据失败。");
  siteData = await response.json();
  ensureFootprints();
  selectedId = siteData.destinations?.[0]?.id || "";
  selectedFootprintCountryCode = footprintCountries()[0]?.countryCode || "";
}

async function logoutAdmin() {
  await fetch("/api/auth/logout", { method: "POST" });
  location.href = "/admin-login.html";
}

async function changeAdminPassword() {
  const current = adminApp.querySelector("[data-password-current]");
  const next = adminApp.querySelector("[data-password-next]");
  const repeat = adminApp.querySelector("[data-password-repeat]");
  const currentPassword = current?.value || "";
  const nextPassword = next?.value || "";
  if (nextPassword !== (repeat?.value || "")) {
    showToast("两次输入的新密码不一致。");
    return;
  }
  const response = await fetch("/api/auth/password", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ currentPassword, nextPassword })
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.message || "修改密码失败。");
  showToast("密码已修改，请重新登录。");
  window.setTimeout(() => {
    location.href = "/admin-login.html";
  }, 900);
}

function render() {
  const destination = activeDestination();
  const isHomeSelected = selectedSection === "home";
  const isFootprintsSelected = selectedSection === "footprints";
  adminApp.innerHTML = `
    <header class="admin-top">
      <div>
        <p class="eyebrow">Local Admin</p>
        <h1>${escapeHtml(siteData.theme?.title || "世界碎片")}后台</h1>
      </div>
      <div class="admin-actions">
        <a class="text-button" href="/" target="_blank" rel="noreferrer">打开前台</a>
        ${isFootprintsSelected ? `<a class="text-button" href="/#footprints" target="_blank" rel="noreferrer">预览足迹</a>` : ""}
        ${!isHomeSelected && !isFootprintsSelected && destination ? `<a class="text-button" href="/#destination/${encodeURIComponent(destination.id)}" target="_blank" rel="noreferrer">预览地点</a>` : ""}
        <button class="text-button" type="button" data-logout>退出登录</button>
        <button class="primary-action small" data-save>${dirty ? "保存修改" : "已保存"}</button>
      </div>
    </header>

    <div class="admin-layout">
      <aside class="admin-sidebar">
        <button class="admin-nav-item ${isHomeSelected ? "is-active" : ""}" data-select-home>
          <span class="list-color home-color"></span>
          <span>
            <strong>首页设置</strong>
            <small>首页文案与播放</small>
          </span>
        </button>
        <button class="admin-nav-item ${isFootprintsSelected ? "is-active" : ""}" data-select-footprints>
          <span class="list-color footprints-color"></span>
          <span>
            <strong>足迹设置</strong>
            <small>国家与来访城市</small>
          </span>
        </button>
        <button class="add-button" data-add-destination>新增目的地</button>
        <div class="destination-list" aria-label="目的地排序列表">
          ${(siteData.destinations || []).map((item, index) => `
            <article class="destination-list-row ${selectedSection === "destination" && item.id === destination?.id ? "is-active" : ""}" draggable="true" data-destination-index="${index}" data-destination-id="${escapeHtml(item.id)}">
              <button class="destination-list-item ${selectedSection === "destination" && item.id === destination?.id ? "is-active" : ""}" data-select-destination="${escapeHtml(item.id)}" draggable="false">
                <span class="list-color" style="background:${safeColor(item.color)}"></span>
                <span>
                  <strong>${escapeHtml(item.name || "未命名地点")}</strong>
                  <small>${escapeHtml(formatTravelTimeValue(item.travelTime) || item.country || "")}</small>
                </span>
              </button>
              <span class="destination-drag-handle" title="拖动排序" aria-hidden="true"></span>
            </article>
          `).join("")}
        </div>
      </aside>

      <main class="admin-main">
        ${isHomeSelected ? siteSettingsTemplate() : (isFootprintsSelected ? footprintsEditorTemplate() : (destination ? destinationEditorTemplate(destination) : emptyTemplate()))}
      </main>
    </div>
  `;
  hydratePhotoPreviewOrientations();
}

function siteSettingsTemplate() {
  return `
    <section class="admin-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Home</p>
          <h2>首页设置</h2>
        </div>
      </div>
      <div class="form-grid">
        ${inputTemplate("网站名称", "theme.title", siteData.theme?.title || "", "site")}
        ${inputTemplate("播放时长毫秒", "playback.duration", siteData.playback?.duration || 5200, "site", "number")}
        <label class="field">
          <span>转场效果</span>
          <select data-site-field="playback.transition">
            ${["fade", "slow", "still"].map((value) => `<option value="${value}" ${siteData.playback?.transition === value ? "selected" : ""}>${transitionLabel(value)}</option>`).join("")}
          </select>
        </label>
      </div>
      <label class="field full">
        <span>首页主标题</span>
        <textarea rows="2" data-site-field="theme.tagline">${escapeHtml(siteData.theme?.tagline || "")}</textarea>
      </label>
      <label class="field full">
        <span>首页副标题</span>
        <textarea rows="3" data-site-field="theme.subtitle">${escapeHtml(siteData.theme?.subtitle || "")}</textarea>
      </label>
    </section>
    <section class="admin-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Security</p>
          <h2>后台密码</h2>
        </div>
      </div>
      <p class="footprint-admin-hint">修改后会退出登录，需要用新密码重新进入后台。</p>
      <div class="form-grid">
        <label class="field">
          <span>当前密码</span>
          <input type="password" data-password-current autocomplete="current-password">
        </label>
        <label class="field">
          <span>新密码</span>
          <input type="password" data-password-next autocomplete="new-password">
        </label>
        <label class="field">
          <span>确认新密码</span>
          <input type="password" data-password-repeat autocomplete="new-password">
        </label>
      </div>
      <button class="text-button password-change-button" type="button" data-change-password>修改密码</button>
    </section>
  `;
}

function transitionLabel(value) {
  if (value === "slow") return "慢速显影";
  if (value === "still") return "静态切换";
  return "淡入淡出";
}

function footprintsEditorTemplate() {
  const countries = footprintCountries();
  const country = activeFootprintCountry();

  return `
    <section class="admin-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Footprints</p>
          <h2>足迹国家设置</h2>
        </div>
        <button class="text-button" data-add-footprint-country>新增足迹国家</button>
      </div>
      <p class="footprint-admin-hint">这里先选国家，再维护它下面的区域。区域只分“来访区”和“碎片区”：勾选来访区会点亮到访记录；勾选碎片区会变成黄色，并选择可跳转的目的地标签。</p>
      <div class="footprint-admin-country-list">
        ${countries.map((item) => `
          <button class="footprint-admin-country-button ${item === country ? "is-active" : ""}" type="button" data-select-footprint-country="${escapeHtml(item.countryCode || "")}" style="--country-color:${safeColor(item.themeColor || item.color || "#D8B36A", "#D8B36A")}">
            <span></span>
            <strong>${escapeHtml(item.countryName || item.countryCode || "未命名国家")}</strong>
            <small>${escapeHtml(item.englishName || item.countryCode || "")}</small>
          </button>
        `).join("") || `<p class="empty-state">还没有足迹国家，可以先新增一个。</p>`}
      </div>
    </section>

    ${country ? footprintCountryEditorTemplate(country) : ""}
  `;
}

function footprintCountryEditorTemplate(country) {
  const regions = Array.isArray(country.regions) ? country.regions : [];
  const litCount = regions.filter((region) => footprintRegionStatus(region) !== "unvisited").length;
  const cityCount = footprintRegionCityNames(regions).length;
  return `
    <section class="admin-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Country</p>
          <h2>${escapeHtml(country.countryName || country.countryCode || "足迹国家")}</h2>
        </div>
        <button class="danger-button" data-delete-footprint-country>删除国家</button>
      </div>
      <details class="footprint-country-basic">
        <summary>国家基础信息</summary>
        <div class="form-grid compact">
          ${footprintCountryInputTemplate("国家代码", "countryCode", country.countryCode || "")}
          ${footprintCountryInputTemplate("国家名称", "countryName", country.countryName || "")}
          ${footprintCountryInputTemplate("英文名", "englishName", country.englishName || "")}
          <label class="field">
            <span>主题色</span>
            <input type="color" data-footprint-country-field="themeColor" value="${safeColor(country.themeColor || "#D8B36A", "#D8B36A")}">
          </label>
        </div>
      </details>
      <div class="footprint-admin-summary">
        <span>已点亮 <strong>${litCount}</strong> 个区域</span>
        <span>记录 <strong>${cityCount}</strong> 座城市</span>
      </div>
    </section>

    <section class="admin-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Cities</p>
          <h2>来访城市与点亮区域</h2>
        </div>
        <div class="footprint-admin-actions">
          <button class="text-button" data-add-footprint-region="visited">新增区域</button>
        </div>
      </div>
      <div class="footprint-region-admin-list">
        ${regions.map((region, index) => footprintRegionAdminTemplate(country, region, index)).join("") || `<p class="empty-state">还没有区域，先点“新增来访城市”。</p>`}
      </div>
    </section>
  `;
}

function footprintCountryInputTemplate(label, field, value, type = "text") {
  return `
    <label class="field">
      <span>${escapeHtml(label)}</span>
      <input type="${type}" data-footprint-country-field="${escapeHtml(field)}" value="${escapeHtml(value)}">
    </label>
  `;
}

function footprintRegionAdminTemplate(country, region, index) {
  const status = footprintRegionStatus(region);
  const destinationEntries = Array.isArray(region.destinations) ? region.destinations : [];
  const availableDestinations = destinationOptionsForFootprintCountry(country);
  const isVisited = status === "visited";
  const isCollected = status === "collected";
  const regionOptions = footprintRegionOptions(country, region);
  const cityOptions = footprintCityOptionsForRegion(country, region);
  const selectedCities = cityOptions.filter((city) => city.selected);
  return `
    <article class="footprint-region-admin-item is-simple">
      <div class="footprint-simple-region-line">
        <label class="field footprint-simple-name footprint-region-select-field">
          <span>区域</span>
          <select data-footprint-region-select="${index}">
            ${regionOptions.map((option) => `<option value="${escapeHtml(option.code)}" ${option.code === region.regionCode ? "selected" : ""}>${escapeHtml(option.name)}${option.englishName ? ` · ${escapeHtml(option.englishName)}` : ""}</option>`).join("")}
          </select>
        </label>
        <label class="check-field footprint-mode-check">
          <input type="checkbox" data-footprint-region-toggle="visited" data-footprint-region-index="${index}" ${isVisited ? "checked" : ""}>
          <span>来访区</span>
        </label>
        <label class="check-field footprint-mode-check">
          <input type="checkbox" data-footprint-region-toggle="collected" data-footprint-region-index="${index}" ${isCollected ? "checked" : ""}>
          <span>碎片区</span>
        </label>
        <div class="item-actions">
          <button class="icon-button danger" title="删除区域" data-delete-footprint-region="${index}">×</button>
        </div>
      </div>
      <div class="footprint-tag-picker">
        <div class="footprint-tag-heading footprint-city-heading">
          <span class="footprint-tag-title">来访城市</span>
          <label class="footprint-city-select-field">
            <span>选择城市</span>
            <span class="footprint-city-add-line">
              <select data-add-footprint-city="${index}">
                <option value="">请选择当前区域行政区</option>
                ${cityOptions.map((city) => `<option value="${escapeHtml(city.name)}" ${city.selected ? "disabled" : ""}>${escapeHtml(city.name)}${city.selected ? "（已选）" : ""}</option>`).join("")}
              </select>
              <button type="button" class="footprint-city-add-button" data-confirm-footprint-city="${index}">添加</button>
            </span>
          </label>
        </div>
        <div class="selected-city-list">
          ${selectedCities.map((city) => `
            <span class="selected-city-chip">
              ${escapeHtml(city.name)}
              <button type="button" title="取消选择${escapeHtml(city.name)}" data-toggle-footprint-city="${index}" data-city-name="${escapeHtml(city.name)}">×</button>
            </span>
          `).join("") || `<span class="empty-chip">还没有选择来访城市</span>`}
        </div>
      </div>
      ${isCollected ? `<div class="footprint-destination-admin">
        <div class="footprint-tag-heading">
          <span class="footprint-tag-title">目的地标签（可多选）</span>
          <label class="footprint-city-search-field">
            <span>搜索目的地</span>
            <input type="search" data-footprint-destination-search="${index}" placeholder="搜索目的地">
          </label>
        </div>
        <div class="footprint-tag-list">
          ${availableDestinations.map((destination) => {
            const selected = destinationEntries.some((entry) => (typeof entry === "string" ? entry : entry.id) === destination.id);
            const time = formatTravelTimeValue(destination.travelTime);
            return `<button class="footprint-tag-button destination-tag ${selected ? "is-selected" : ""}" type="button" data-toggle-footprint-destination="${index}" data-destination-id="${escapeHtml(destination.id)}">
              <strong>${escapeHtml(destination.name)}</strong>${time ? `<small>${escapeHtml(time)}</small>` : ""}
            </button>`;
          }).join("") || `<span class="empty-chip">当前国家还没有可选目的地</span>`}
          <span class="empty-chip footprint-destination-empty-search" hidden>没有找到目的地标签</span>
        </div>
        <div class="destination-chip-list">
          ${destinationEntries.map((entry) => footprintDestinationChipTemplate(entry, index)).join("") || `<span class="empty-chip">未绑定目的地</span>`}
        </div>
      </div>` : ""}
    </article>
  `;
}

function footprintRegionInputTemplate(label, field, value, index, type = "text") {
  return `
    <label class="field">
      <span>${escapeHtml(label)}</span>
      <input type="${type}" data-footprint-region-field="${escapeHtml(field)}" data-footprint-region-index="${index}" value="${escapeHtml(value)}">
    </label>
  `;
}

function footprintRegionOptions(country, currentRegion = null) {
  const code = String(country?.countryCode || "").toUpperCase();
  const catalog = (footprintRegionCatalogs[code] || []).map(([regionCode, regionName, englishName]) => ({
    code: regionCode,
    name: regionName,
    englishName
  }));
  const fromData = (Array.isArray(country?.regions) ? country.regions : [])
    .map((region) => ({
      code: region.regionCode,
      name: region.regionName,
      englishName: region.englishName || ""
    }))
    .filter((option) => option.code && option.name);
  const fallback = currentRegion?.regionCode && currentRegion?.regionName
    ? [{ code: currentRegion.regionCode, name: currentRegion.regionName, englishName: currentRegion.englishName || "" }]
    : [];
  const merged = [...catalog, ...fromData, ...fallback];
  const seen = new Set();
  return merged.filter((option) => {
    const key = String(option.code || "").toUpperCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function applyFootprintRegionOption(country, regionIndex, regionCode) {
  const region = country?.regions?.[Number(regionIndex)];
  if (!region) return false;
  const option = footprintRegionOptions(country, region).find((item) => item.code === regionCode);
  if (!option) return false;
  const previousName = region.regionName;
  const selectedCities = splitFootprintCityNames(region.visitedCities);
  const previousCode = region.regionCode;
  region.countryCode = String(country.countryCode || "").toUpperCase();
  region.regionCode = option.code;
  region.regionName = option.name;
  region.englishName = option.englishName || "";
  if (previousCode !== option.code) {
    const catalog = new Set(cityCatalogForRegion(option.code));
    region.visitedCities = catalog.size
      ? selectedCities.filter((name) => catalog.has(name)).join("、")
      : "";
  } else if (!selectedCities.length || (selectedCities.length === 1 && selectedCities[0] === previousName)) {
    region.visitedCities = "";
  }
  return true;
}

function destinationStageNames(destination) {
  const stages = Array.isArray(destination?.stages) ? destination.stages : [];
  return stages
    .map((stage) => String(stage?.name || "").trim())
    .filter(Boolean);
}

function regionSelectedDestinationIds(region) {
  return (Array.isArray(region?.destinations) ? region.destinations : [])
    .map((entry) => typeof entry === "string" ? entry : entry.id)
    .filter(Boolean);
}

function addCityNameToRegion(region, cityName) {
  const name = String(cityName || "").trim();
  if (!region || !name) return false;
  const cities = splitFootprintCityNames(normalizeVisitedCitiesForRegion(region));
  if (cities.includes(name)) return false;
  region.visitedCities = [...cities, name].join("、");
  return true;
}

function addSelectedFootprintCity(index, cityName) {
  const country = activeFootprintCountry();
  const region = country?.regions?.[Number(index)];
  if (!addCityNameToRegion(region, cityName)) return false;
  if (footprintRegionStatus(region) === "unvisited") region.status = "visited";
  markDirty();
  render();
  return true;
}

function toggleCityNameOnRegion(region, cityName) {
  const name = String(cityName || "").trim();
  if (!region || !name) return false;
  const cities = splitFootprintCityNames(normalizeVisitedCitiesForRegion(region));
  const next = cities.includes(name)
    ? cities.filter((city) => city !== name)
    : [...cities, name];
  region.visitedCities = next.join("、");
  return true;
}

function mergeDestinationWaypointsIntoRegion(region, destinationId) {
  const destination = siteData.destinations?.find((item) => item.id === destinationId);
  if (!region || !destination) return;
  const names = destinationStageNames(destination);
  (names.length ? names : [destination.name]).forEach((name) => addCityNameToRegion(region, name));
  if (!region.visitTime) region.visitTime = formatTravelTimeValue(destination.travelTime);
}

function cityCatalogForRegion(regionCode) {
  return footprintCityCatalogs[String(regionCode || "").toUpperCase()] || [];
}

function footprintCityOptionsForRegion(country, region) {
  const selected = new Set(splitFootprintCityNames(normalizeVisitedCitiesForRegion(region)));
  const catalog = cityCatalogForRegion(region.regionCode);
  const names = new Set();
  if (region.regionName) names.add(region.regionName);
  catalog.forEach((name) => names.add(name));

  return [...names]
    .filter(Boolean)
    .map((name) => ({ name, selected: selected.has(name) }));
}

function destinationMatchesFootprintRegion(destination, region) {
  const text = `${destination?.country || ""} ${destination?.name || ""} ${destination?.englishName || ""}`.toLowerCase();
  const terms = [region?.regionName, region?.englishName]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean);
  return terms.some((term) => text.includes(term));
}

function filterFootprintCityTags(input) {
  const query = String(input.value || "").trim().toLowerCase();
  const item = input.closest(".footprint-region-admin-item");
  if (!item) return;
  let visibleCount = 0;
  item.querySelectorAll("[data-toggle-footprint-city]").forEach((button) => {
    const text = String(button.textContent || "").trim().toLowerCase();
    const visible = !query || text.includes(query);
    button.hidden = !visible;
    if (visible) visibleCount += 1;
  });
  const empty = item.querySelector(".footprint-city-empty-search");
  if (empty) empty.hidden = visibleCount > 0;
}

function filterFootprintDestinationTags(input) {
  const query = String(input.value || "").trim().toLowerCase();
  const item = input.closest(".footprint-region-admin-item");
  if (!item) return;
  let visibleCount = 0;
  item.querySelectorAll("[data-toggle-footprint-destination]").forEach((button) => {
    const text = String(button.textContent || "").trim().toLowerCase();
    const visible = !query || text.includes(query);
    button.hidden = !visible;
    if (visible) visibleCount += 1;
  });
  const empty = item.querySelector(".footprint-destination-empty-search");
  if (empty) empty.hidden = visibleCount > 0;
}

function footprintDestinationChipTemplate(entry, regionIndex) {
  const id = typeof entry === "string" ? entry : entry.id;
  const destination = siteData.destinations?.find((item) => item.id === id);
  const label = destination?.name || (typeof entry === "object" ? entry.name : id) || "未知目的地";
  return `
    <span class="destination-chip">
      ${escapeHtml(label)}
      <button type="button" title="取消关联" data-remove-footprint-region-destination="${regionIndex}" data-destination-id="${escapeHtml(id)}">×</button>
    </span>
  `;
}

function footprintStatusLabel(status) {
  if (status === "collected") return "有碎片区域";
  if (status === "visited") return "来访城市";
  return "未点亮";
}

function footprintRegionStatus(region) {
  return ["visited", "collected", "unvisited"].includes(region?.status) ? region.status : "unvisited";
}

function splitFootprintCityNames(value) {
  return String(value || "")
    .split(/[、，,;；/／|｜]+/u)
    .map((name) => name.trim())
    .filter(Boolean);
}

function normalizeVisitedCitiesForRegion(region) {
  const selected = splitFootprintCityNames(region?.visitedCities);
  const catalog = cityCatalogForRegion(region?.regionCode);
  if (!catalog.length) return selected.join("、");
  const allowed = new Set(catalog);
  if (region?.regionName) allowed.add(region.regionName);
  return selected.filter((name) => allowed.has(name)).join("、");
}

function footprintRegionCityNames(regions) {
  const cityNames = new Set();
  regions.forEach((region) => {
    if (footprintRegionStatus(region) === "unvisited") return;
    splitFootprintCityNames(region.visitedCities).forEach((name) => cityNames.add(name));
    (Array.isArray(region.destinations) ? region.destinations : []).forEach((entry) => {
      const id = typeof entry === "string" ? entry : entry.id;
      const destination = siteData.destinations?.find((item) => item.id === id);
      const name = typeof entry === "object" && entry?.name ? entry.name : destination?.name;
      if (name) cityNames.add(name);
    });
  });
  return [...cityNames];
}

function destinationOptionsForFootprintCountry(country) {
  const destinations = siteData.destinations || [];
  const filtered = destinations.filter((destination) => destinationBelongsToFootprintCountry(destination, country));
  return filtered.length ? filtered : destinations;
}

function destinationBelongsToFootprintCountry(destination, country) {
  const countryCode = String(country?.countryCode || "").toUpperCase();
  const text = `${destination?.country || ""} ${destination?.name || ""} ${destination?.englishName || ""}`;
  if (countryCode === "CN") return text.includes("中国");
  if (countryCode === "NZ") return text.includes("新西兰") || /new zealand/i.test(text);
  const countryText = `${country?.countryName || ""} ${country?.englishName || ""}`.trim();
  return Boolean(countryText && text.toLowerCase().includes(countryText.toLowerCase()))
    || (Array.isArray(country?.destinations) && country.destinations.includes(destination.id));
}

function inputTemplate(label, field, value, scope, type = "text") {
  const attr = scope === "site" ? "data-site-field" : "data-destination-field";
  return `
    <label class="field">
      <span>${escapeHtml(label)}</span>
      <input type="${type}" ${attr}="${escapeHtml(field)}" value="${escapeHtml(value)}">
    </label>
  `;
}

function destinationEditorTemplate(destination) {
  return `
    <section class="admin-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Destination</p>
          <h2>地点管理</h2>
        </div>
        <button class="danger-button" data-delete-destination>删除地点</button>
      </div>
      <div class="form-grid">
        ${inputTemplate("地点名称", "name", destination.name || "", "destination")}
        ${inputTemplate("英文名", "englishName", destination.englishName || "", "destination")}
        ${inputTemplate("旅行时间（如 2010.01）", "travelTime", formatTravelTimeValue(destination.travelTime), "destination")}
        ${inputTemplate("国家 / 地区", "country", destination.country || "", "destination")}
        ${inputTemplate("纬度 lat", "geo.lat", destination.geo?.lat ?? 0, "destination", "number")}
        ${inputTemplate("经度 lng", "geo.lng", destination.geo?.lng ?? 0, "destination", "number")}
        <label class="field">
          <span>地点强调色</span>
          <input type="color" data-destination-field="color" value="${safeColor(destination.color)}">
        </label>
        <label class="check-field">
          <input type="checkbox" data-destination-field="visible" ${destination.visible !== false ? "checked" : ""}>
          <span>在首页地图点亮显示</span>
        </label>
      </div>
    </section>

    <section class="admin-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Waypoints</p>
          <h2>途径点</h2>
        </div>
        <button class="text-button" data-add-stage>新增途径点</button>
      </div>
      <div class="stage-list">
        ${(destination.stages || []).map((stage, index) => stageTemplate(stage, index)).join("") || `<p class="empty-state">还没有途径点，先新增一个。</p>`}
      </div>
    </section>

    <section class="admin-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Photos</p>
          <h2>照片管理</h2>
        </div>
        <label class="upload-button">
          上传照片
          <input type="file" accept="image/*" multiple data-upload>
        </label>
      </div>
      <div class="photo-tools">
        <button class="text-button" data-add-photo>新增占位照片</button>
        <span>上传后会保存到本地 uploads 文件夹。</span>
      </div>
      <div class="photo-list">
        ${(destination.photos || []).map((photo, index) => photoTemplate(destination, photo, index)).join("") || `<p class="empty-state">还没有照片，可以上传图片或新增占位照片。</p>`}
      </div>
    </section>
  `;
}

function stageTemplate(stage, index) {
  return `
    <article class="stage-item">
      <label class="field stage-name-field">
        <span>途径点名称</span>
        <input data-stage-field="name" data-stage-index="${index}" value="${escapeHtml(stage.name || "")}">
      </label>
      <div class="item-actions">
        <button class="icon-button" title="上移" data-move-stage="${index}" data-direction="-1">↑</button>
        <button class="icon-button" title="下移" data-move-stage="${index}" data-direction="1">↓</button>
        <button class="icon-button danger" title="删除" data-delete-stage="${index}">×</button>
      </div>
    </article>
  `;
}

function photoTemplate(destination, photo, index) {
  const isCover = photo.cover || destination.cover === photo.src;
  const rotation = normalizeRotation(photo.rotation);
  const photoCount = Math.max(1, destination.photos?.length || 1);
  return `
    <article class="photo-item ${isCover ? "is-cover" : ""}" data-photo-sort-index="${index}" data-photo-rotation="${rotation}" style="--photo-rotation:${rotation}deg">
      <div class="photo-preview" data-photo-preview>
        <img src="${escapeHtml(photo.src || "/assets/new-zealand-1.png")}" alt="">
      </div>
      <div class="photo-fields">
        <div class="photo-row-head">
          <strong>${isCover ? "地点封面" : `照片 ${String(index + 1).padStart(2, "0")}`}</strong>
          <div class="item-actions">
            <label class="photo-order-field">
              <span>顺序</span>
              <input type="number" min="1" max="${photoCount}" step="1" value="${index + 1}" data-photo-order="${index}" aria-label="照片顺序">
            </label>
            <button class="icon-button" title="向左旋转" data-rotate-photo="${index}" data-direction="-90">↺</button>
            <button class="icon-button" title="向右旋转" data-rotate-photo="${index}" data-direction="90">↻</button>
            <button class="icon-button" title="设为封面" data-set-cover="${index}">◎</button>
            <button class="icon-button danger" title="删除" data-delete-photo="${index}">×</button>
          </div>
        </div>
        <div class="form-grid compact">
          <label class="field">
            <span>图片地址</span>
            <input data-photo-field="src" data-photo-index="${index}" value="${escapeHtml(photo.src || "")}">
          </label>
        </div>
      </div>
    </article>
  `;
}

function hydratePhotoPreviewOrientations() {
  adminApp.querySelectorAll("[data-photo-preview]").forEach((preview) => {
    const image = preview.querySelector("img");
    const row = preview.closest("[data-photo-sort-index]");
    if (!image) return;

    const applyOrientation = () => {
      const width = image.naturalWidth || 0;
      const height = image.naturalHeight || 0;
      const rotation = normalizeRotation(row?.dataset.photoRotation || 0);
      const rotatedSideways = rotation === 90 || rotation === 270;
      const isPortrait = width && height
        ? (rotatedSideways ? width > height : height > width)
        : false;
      preview.classList.toggle("is-portrait", isPortrait);
      preview.classList.toggle("is-landscape", !isPortrait);
    };

    if (image.complete) applyOrientation();
    else image.addEventListener("load", applyOrientation, { once: true });
  });
}

function emptyTemplate() {
  return `
    <section class="admin-panel">
      <h2>还没有地点</h2>
      <p class="empty-state">点击左侧“新增目的地”开始。</p>
    </section>
  `;
}

function readValue(input) {
  if (input.type === "checkbox") return input.checked;
  if (input.type === "number") return Number(input.value);
  return input.value;
}

function handleFieldChange(target) {
  const destination = activeDestination();
  if (target.dataset.siteField) {
    setPath(siteData, target.dataset.siteField, readValue(target));
    markDirty();
    return;
  }
  if (target.dataset.destinationField && destination) {
    setPath(destination, target.dataset.destinationField, readValue(target));
    if (target.dataset.destinationField === "name" && !destination.id) destination.id = slugify(target.value);
    markDirty();
    return;
  }
  if (target.dataset.footprintCountryField) {
    const country = activeFootprintCountry();
    if (country) {
      const field = target.dataset.footprintCountryField;
      const value = field === "countryCode"
        ? String(readValue(target)).trim().toUpperCase()
        : readValue(target);
      setPath(country, field, value);
      if (field === "countryCode") {
        country.countryCode = value;
        selectedFootprintCountryCode = value;
      }
      markDirty();
    }
    return;
  }
  if (target.dataset.footprintRegionField) {
    const country = activeFootprintCountry();
    const region = country?.regions?.[Number(target.dataset.footprintRegionIndex)];
    if (region) {
      const field = target.dataset.footprintRegionField;
      const value = field === "regionCode"
        ? String(readValue(target)).trim().toUpperCase()
        : readValue(target);
      setPath(region, field, value);
      if (field === "regionCode") region.regionCode = value;
      markDirty();
    }
    return;
  }
  if (target.dataset.footprintRegionToggle) {
    const country = activeFootprintCountry();
    const region = country?.regions?.[Number(target.dataset.footprintRegionIndex)];
    if (region) {
      const nextStatus = target.dataset.footprintRegionToggle;
      region.status = target.checked ? nextStatus : "unvisited";
      if (region.status !== "collected") region.destinations = [];
      markDirty();
      render();
    }
    return;
  }
  if (target.dataset.stageField && destination) {
    const stage = destination.stages?.[Number(target.dataset.stageIndex)];
    if (stage) {
      stage[target.dataset.stageField] = readValue(target);
      markDirty();
    }
    return;
  }
  if (target.dataset.photoField && destination) {
    const photo = destination.photos?.[Number(target.dataset.photoIndex)];
    if (photo) {
      photo[target.dataset.photoField] = readValue(target);
      markDirty();
    }
  }
}

function moveItem(list, index, direction) {
  const next = index + direction;
  if (!list || next < 0 || next >= list.length) return false;
  const [item] = list.splice(index, 1);
  list.splice(next, 0, item);
  return true;
}

function moveItemTo(list, fromIndex, toIndex) {
  if (!list || fromIndex === toIndex || fromIndex < 0 || fromIndex >= list.length) return false;
  const nextIndex = clamp(toIndex, 0, list.length - 1);
  const [item] = list.splice(fromIndex, 1);
  list.splice(nextIndex, 0, item);
  return true;
}

function clearDestinationDragState() {
  adminApp.querySelectorAll(".destination-list-row").forEach((row) => {
    row.classList.remove("is-dragging", "is-drop-target");
  });
}

function addDestination() {
  const id = uid("destination");
  const destination = {
    id,
    name: "新的目的地",
    englishName: "New Place",
    country: "",
    travelTime: "",
    color: "#5DADE2",
    visible: true,
    geo: { lat: 0, lng: 0 },
    cover: "/assets/new-zealand-1.png",
    stages: [{ id: uid("stage"), name: "途径点 01" }],
    photos: [{ id: uid("photo"), src: "/assets/new-zealand-1.png", caption: "为这张照片写一句话。", cover: true, rotation: 0 }]
  };
  siteData.destinations.push(destination);
  selectedId = id;
  selectedSection = "destination";
  markDirty();
  render();
}

function addStage(destination) {
  destination.stages = destination.stages || [];
  destination.stages.push({ id: uid("stage"), name: `途径点 ${String(destination.stages.length + 1).padStart(2, "0")}` });
  markDirty();
  render();
}

function addPhoto(destination) {
  destination.photos = destination.photos || [];
  destination.photos.push({
    id: uid("photo"),
    src: destination.cover || "/assets/new-zealand-1.png",
    caption: "",
    cover: destination.photos.length === 0,
    rotation: 0
  });
  syncCover(destination);
  markDirty();
  render();
}

function addFootprintCountry() {
  const countries = footprintCountries();
  const countryCode = uniqueFootprintCountryCode("XX");
  const country = {
    countryCode,
    countryName: "新足迹国家",
    englishName: "New Country",
    hasFootprint: true,
    enabled: true,
    themeColor: "#D8B36A",
    position: { x: 50, y: 50 },
    destinations: [],
    regions: []
  };
  countries.push(country);
  selectedFootprintCountryCode = countryCode;
  selectedSection = "footprints";
  markDirty();
  render();
}

function uniqueFootprintCountryCode(baseCode) {
  const countries = footprintCountries();
  const base = String(baseCode || "XX").toUpperCase();
  if (!countries.some((country) => country.countryCode === base)) return base;
  let index = 2;
  while (countries.some((country) => country.countryCode === `${base}${index}`)) index += 1;
  return `${base}${index}`;
}

function addFootprintRegion(country, status = "visited") {
  if (!country) return;
  country.regions = Array.isArray(country.regions) ? country.regions : [];
  const next = country.regions.length + 1;
  const countryCode = String(country.countryCode || "XX").toUpperCase();
  const used = new Set(country.regions.map((region) => region.regionCode));
  const option = footprintRegionOptions(country).find((item) => !used.has(item.code)) || {
    code: uniqueFootprintRegionCode(country, `${countryCode}-NEW${next}`),
    name: status === "collected" ? "新碎片区域" : "新来访区域",
    englishName: ""
  };
  const region = {
    countryCode,
    regionCode: option.code,
    regionName: option.name,
    englishName: option.englishName || "",
    status,
    position: { x: 50, y: 50, w: 18, h: 12 },
    visitedCities: "",
    visitTime: ""
  };
  if (status === "collected") region.destinations = [];
  country.regions.push(region);
  markDirty();
  render();
}

function uniqueFootprintRegionCode(country, baseCode) {
  const regions = Array.isArray(country?.regions) ? country.regions : [];
  const base = String(baseCode || `${country?.countryCode || "XX"}-NEW`).toUpperCase();
  if (!regions.some((region) => region.regionCode === base)) return base;
  let index = 2;
  while (regions.some((region) => region.regionCode === `${base}${index}`)) index += 1;
  return `${base}${index}`;
}

function destinationEntryFromId(destinationId) {
  const destination = siteData.destinations?.find((item) => item.id === destinationId);
  if (!destination) return null;
  return {
    id: destination.id,
    name: destination.name || destination.id,
    date: formatTravelTimeValue(destination.travelTime),
    title: `${Array.isArray(destination.photos) ? destination.photos.length : 0} 张碎片`
  };
}

function addDestinationToFootprintRegion(country, regionIndex, destinationId) {
  const region = country?.regions?.[Number(regionIndex)];
  const entry = destinationEntryFromId(destinationId);
  if (!region || !entry) return false;
  region.destinations = Array.isArray(region.destinations) ? region.destinations : [];
  const exists = region.destinations.some((item) => (typeof item === "string" ? item : item.id) === entry.id);
  if (exists) return false;
  region.destinations.push(entry);
  region.status = "collected";
  return true;
}

function removeDestinationFromFootprintRegion(country, regionIndex, destinationId) {
  const region = country?.regions?.[Number(regionIndex)];
  if (!region || !Array.isArray(region.destinations)) return false;
  const before = region.destinations.length;
  region.destinations = region.destinations.filter((item) => (typeof item === "string" ? item : item.id) !== destinationId);
  const removed = before !== region.destinations.length;
  if (removed && footprintRegionStatus(region) === "collected" && !region.destinations.length) {
    region.status = splitFootprintCityNames(region.visitedCities).length ? "visited" : "unvisited";
  }
  return removed;
}

function toggleDestinationOnFootprintRegion(country, regionIndex, destinationId) {
  const region = country?.regions?.[Number(regionIndex)];
  if (!region || !destinationId) return false;
  const exists = regionSelectedDestinationIds(region).includes(destinationId);
  return exists
    ? removeDestinationFromFootprintRegion(country, regionIndex, destinationId)
    : addDestinationToFootprintRegion(country, regionIndex, destinationId);
}

function normalizeFootprints() {
  const footprints = ensureFootprints();
  footprints.countries = footprints.countries.map((country) => {
    const countryCode = String(country.countryCode || "").trim().toUpperCase() || "XX";
    const regions = Array.isArray(country.regions) ? country.regions : [];
    const normalizedRegions = regions.map((region) => {
      const status = footprintRegionStatus(region);
      const destinations = status === "collected" && Array.isArray(region.destinations)
        ? region.destinations.map((entry) => {
            const id = typeof entry === "string" ? entry : entry.id;
            const next = destinationEntryFromId(id);
            return next || null;
          }).filter(Boolean)
        : [];
      const { destinations: _oldDestinations, ...regionRest } = region;
      return {
        ...regionRest,
        countryCode,
        regionCode: String(region.regionCode || `${countryCode}-NEW`).trim().toUpperCase(),
        regionName: String(region.regionName || "").trim() || "未命名区域",
        englishName: String(region.englishName || "").trim(),
        status,
        position: {
          x: clamp(Number(region.position?.x ?? 50), 0, 100),
          y: clamp(Number(region.position?.y ?? 50), 0, 100),
          w: clamp(Number(region.position?.w ?? 18), 1, 100),
          h: clamp(Number(region.position?.h ?? 12), 1, 100)
        },
        visitedCities: normalizeVisitedCitiesForRegion(region),
        visitTime: formatTravelTimeValue(region.visitTime),
        ...(destinations.length ? { destinations } : {})
      };
    });
    const countryDestinations = [
      ...(Array.isArray(country.destinations) ? country.destinations : []),
      ...normalizedRegions.flatMap((region) => footprintRegionStatus(region) === "collected" && Array.isArray(region.destinations)
        ? region.destinations.map((entry) => entry.id)
        : [])
    ].filter(Boolean);
    return {
      ...country,
      countryCode,
      countryName: String(country.countryName || "").trim() || countryCode,
      englishName: String(country.englishName || "").trim(),
      hasFootprint: country.hasFootprint !== false,
      enabled: country.enabled !== false,
      themeColor: safeColor(country.themeColor || country.color || "#D8B36A", "#D8B36A"),
      position: {
        x: clamp(Number(country.position?.x ?? 50), 0, 100),
        y: clamp(Number(country.position?.y ?? 50), 0, 100)
      },
      destinations: [...new Set(countryDestinations)],
      regions: normalizedRegions
    };
  });
}

function rotatePhoto(destination, index, direction) {
  const photo = destination.photos?.[index];
  if (!photo) return false;
  photo.rotation = normalizeRotation(Number(photo.rotation || 0) + direction);
  return true;
}

function reorderPhotoByNumber(destination, fromIndex, orderValue) {
  const photos = destination?.photos || [];
  if (!photos.length) return false;

  const toIndex = clamp(Math.round(Number(orderValue || 1)) - 1, 0, photos.length - 1);
  if (toIndex === fromIndex) return false;

  const moved = moveItemTo(photos, fromIndex, toIndex);
  if (moved) syncCover(destination);
  return moved;
}

function applyPhotoOrderChange(input) {
  const destination = activeDestination();
  if (!destination || !input) return;

  const moved = reorderPhotoByNumber(destination, Number(input.dataset.photoOrder), input.value);
  if (moved) {
    markDirty();
    render();
    showToast("照片顺序已按数字调整，记得保存。");
    return;
  }

  const photos = destination.photos || [];
  input.value = String(clamp(Math.round(Number(input.value || 1)), 1, Math.max(1, photos.length)));
}

function syncCover(destination) {
  const photos = destination.photos || [];
  let cover = photos.find((photo) => photo.cover);
  if (!cover && destination.cover) cover = photos.find((photo) => photo.src === destination.cover);
  if (!cover && photos[0]) {
    photos[0].cover = true;
    cover = photos[0];
  }
  photos.forEach((photo) => {
    photo.cover = photo === cover;
  });
  destination.cover = cover?.src || destination.cover || "";
}

async function saveSite() {
  siteData.destinations.forEach((destination) => {
    destination.geo = {
      lat: clamp(Number(destination.geo?.lat || 0), -90, 90),
      lng: normalizeLongitude(destination.geo?.lng || 0)
    };
    destination.color = safeColor(destination.color);
    destination.travelTime = formatTravelTimeValue(destination.travelTime);
    destination.photos = Array.isArray(destination.photos) ? destination.photos : [];
    destination.photos.forEach((photo) => {
      photo.rotation = normalizeRotation(photo.rotation);
    });
    syncCover(destination);
  });
  normalizeFootprints();

  const response = await fetch("/api/site", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(siteData)
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.message || "保存失败。");
  dirty = false;
  render();
  showToast("已经保存到本地数据文件。");
}

async function uploadFiles(input) {
  const destination = activeDestination();
  if (!destination || !input.files?.length) return;
  const form = new FormData();
  Array.from(input.files).forEach((file) => form.append("file", file));
  showToast("正在上传图片...");
  const response = await fetch("/api/upload", { method: "POST", body: form });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.message || "上传失败。");

  destination.photos = destination.photos || [];
  result.files.forEach((file) => {
    destination.photos.push({
      id: uid("photo"),
      src: file.url,
      caption: "",
      cover: destination.photos.length === 0,
      rotation: 0
    });
  });
  syncCover(destination);
  markDirty();
  render();
  showToast(`已上传 ${result.files.length} 张图片，记得保存。`);
}

adminApp.addEventListener("input", (event) => {
  if (event.target.matches("[data-photo-order]")) return;
  if (event.target.matches("[data-footprint-region-toggle]")) return;
  if (event.target.matches("[data-footprint-city-search]")) {
    filterFootprintCityTags(event.target);
    return;
  }
  if (event.target.matches("[data-footprint-destination-search]")) {
    filterFootprintDestinationTags(event.target);
    return;
  }
  if (event.target.matches("input, textarea, select")) handleFieldChange(event.target);
});

adminApp.addEventListener("change", async (event) => {
  try {
    if (event.target.matches("[data-upload]")) {
      await uploadFiles(event.target);
      return;
    }
    if (event.target.matches("[data-footprint-region-toggle]")) {
      handleFieldChange(event.target);
      return;
    }
    if (event.target.matches("[data-footprint-region-select]")) {
      const country = activeFootprintCountry();
      if (applyFootprintRegionOption(country, event.target.dataset.footprintRegionSelect, event.target.value)) {
        markDirty();
        render();
      }
      return;
    }
    if (event.target.matches("[data-add-footprint-city]")) {
      return;
    }
    if (event.target.matches("[data-footprint-region-add-destination]")) {
      const country = activeFootprintCountry();
      const added = addDestinationToFootprintRegion(country, event.target.dataset.footprintRegionAddDestination, event.target.value);
      if (added) {
        markDirty();
        render();
        showToast("已关联目的地，记得保存。");
      }
      return;
    }
    if (event.target.matches("[data-photo-order]")) {
      applyPhotoOrderChange(event.target);
      return;
    }
    if (event.target.matches("input, textarea, select")) handleFieldChange(event.target);
  } catch (error) {
    showToast(error.message);
  }
});

adminApp.addEventListener("focusout", (event) => {
  if (event.target.matches("[data-photo-order]")) applyPhotoOrderChange(event.target);
});

adminApp.addEventListener("keydown", (event) => {
  if (!event.target.matches("[data-photo-order]") || event.key !== "Enter") return;
  event.preventDefault();
  event.target.blur();
});

adminApp.addEventListener("dragstart", (event) => {
  const row = event.target.closest("[data-destination-index]");
  if (!row) return;
  draggedDestinationIndex = Number(row.dataset.destinationIndex);
  row.classList.add("is-dragging");
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(draggedDestinationIndex));
  }
});

adminApp.addEventListener("dragover", (event) => {
  const row = event.target.closest("[data-destination-index]");
  if (draggedDestinationIndex === null || !row) return;
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
  adminApp.querySelectorAll(".destination-list-row.is-drop-target").forEach((item) => {
    if (item !== row) item.classList.remove("is-drop-target");
  });
  if (Number(row.dataset.destinationIndex) !== draggedDestinationIndex) {
    row.classList.add("is-drop-target");
  }
});

adminApp.addEventListener("drop", (event) => {
  const row = event.target.closest("[data-destination-index]");
  if (draggedDestinationIndex === null || !row) return;
  event.preventDefault();
  const targetIndex = Number(row.dataset.destinationIndex);
  const fromIndex = draggedDestinationIndex;
  draggedDestinationIndex = null;
  clearDestinationDragState();
  if (moveItemTo(siteData.destinations, fromIndex, targetIndex)) {
    markDirty();
    render();
    showToast("顺序已调整，记得保存。");
  }
});

adminApp.addEventListener("dragend", () => {
  draggedDestinationIndex = null;
  clearDestinationDragState();
});

adminApp.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const destination = activeDestination();

  try {
    if (button.dataset.save !== undefined) {
      await saveSite();
      return;
    }
    if (button.dataset.logout !== undefined) {
      await logoutAdmin();
      return;
    }
    if (button.dataset.changePassword !== undefined) {
      await changeAdminPassword();
      return;
    }
    if (button.dataset.addDestination !== undefined) {
      addDestination();
      return;
    }
    if (button.dataset.selectHome !== undefined) {
      selectedSection = "home";
      render();
      return;
    }
    if (button.dataset.selectFootprints !== undefined) {
      selectedSection = "footprints";
      selectedFootprintCountryCode = activeFootprintCountry()?.countryCode || "";
      render();
      return;
    }
    if (button.dataset.addFootprintCountry !== undefined) {
      addFootprintCountry();
      return;
    }
    if (button.dataset.selectFootprintCountry !== undefined) {
      selectedFootprintCountryCode = button.dataset.selectFootprintCountry;
      selectedSection = "footprints";
      render();
      return;
    }
    if (button.dataset.deleteFootprintCountry !== undefined) {
      const country = activeFootprintCountry();
      if (country && confirm(`确定删除“${country.countryName || country.countryCode}”的足迹设置吗？`)) {
        siteData.footprints.countries = footprintCountries().filter((item) => item !== country);
        selectedFootprintCountryCode = footprintCountries()[0]?.countryCode || "";
        markDirty();
        render();
      }
      return;
    }
    if (button.dataset.addFootprintRegion !== undefined) {
      addFootprintRegion(activeFootprintCountry(), button.dataset.addFootprintRegion);
      return;
    }
    if (button.dataset.deleteFootprintRegion !== undefined) {
      const country = activeFootprintCountry();
      const index = Number(button.dataset.deleteFootprintRegion);
      if (country?.regions?.[index]) {
        country.regions.splice(index, 1);
        markDirty();
        render();
      }
      return;
    }
    if (button.dataset.confirmFootprintCity !== undefined) {
      const index = button.dataset.confirmFootprintCity;
      const select = adminApp.querySelector(`[data-add-footprint-city="${CSS.escape(index)}"]`);
      if (addSelectedFootprintCity(index, select?.value)) {
        showToast("来访城市已添加，记得保存。");
      } else if (select) {
        select.value = "";
      }
      return;
    }
    if (button.dataset.removeFootprintRegionDestination !== undefined) {
      const removed = removeDestinationFromFootprintRegion(
        activeFootprintCountry(),
        button.dataset.removeFootprintRegionDestination,
        button.dataset.destinationId
      );
      if (removed) {
        markDirty();
        render();
      }
      return;
    }
    if (button.dataset.toggleFootprintDestination !== undefined) {
      const changed = toggleDestinationOnFootprintRegion(
        activeFootprintCountry(),
        button.dataset.toggleFootprintDestination,
        button.dataset.destinationId
      );
      if (changed) {
        markDirty();
        render();
        showToast("目的地标签已更新。");
      }
      return;
    }
    if (button.dataset.toggleFootprintCity !== undefined) {
      const country = activeFootprintCountry();
      const region = country?.regions?.[Number(button.dataset.toggleFootprintCity)];
      if (toggleCityNameOnRegion(region, button.dataset.cityName)) {
        if (footprintRegionStatus(region) === "unvisited" && splitFootprintCityNames(region.visitedCities).length) {
          region.status = "visited";
        }
        markDirty();
        render();
      }
      return;
    }
    if (button.dataset.selectDestination) {
      selectedId = button.dataset.selectDestination;
      selectedSection = "destination";
      render();
      return;
    }
    if (button.dataset.deleteDestination !== undefined && destination) {
      if (confirm(`确定删除“${destination.name}”吗？`)) {
        siteData.destinations = siteData.destinations.filter((item) => item.id !== destination.id);
        selectedId = siteData.destinations[0]?.id || "";
        selectedSection = selectedId ? "destination" : "home";
        markDirty();
        render();
      }
      return;
    }
    if (button.dataset.addStage !== undefined && destination) {
      addStage(destination);
      return;
    }
    if (button.dataset.deleteStage !== undefined && destination) {
      const index = Number(button.dataset.deleteStage);
      destination.stages.splice(index, 1);
      markDirty();
      render();
      return;
    }
    if (button.dataset.moveStage !== undefined && destination) {
      moveItem(destination.stages, Number(button.dataset.moveStage), Number(button.dataset.direction));
      markDirty();
      render();
      return;
    }
    if (button.dataset.addPhoto !== undefined && destination) {
      addPhoto(destination);
      return;
    }
    if (button.dataset.deletePhoto !== undefined && destination) {
      destination.photos.splice(Number(button.dataset.deletePhoto), 1);
      syncCover(destination);
      markDirty();
      render();
      return;
    }
    if (button.dataset.rotatePhoto !== undefined && destination) {
      rotatePhoto(destination, Number(button.dataset.rotatePhoto), Number(button.dataset.direction || 90));
      markDirty();
      render();
      return;
    }
    if (button.dataset.setCover !== undefined && destination) {
      const index = Number(button.dataset.setCover);
      destination.photos.forEach((photo, photoIndex) => {
        photo.cover = photoIndex === index;
      });
      destination.cover = destination.photos[index]?.src || destination.cover;
      markDirty();
      render();
    }
  } catch (error) {
    showToast(error.message);
  }
});

loadSite()
  .then(render)
  .catch((error) => {
    adminApp.innerHTML = `
      <main class="error-view">
        <h1>后台没有打开成功</h1>
        <p>${escapeHtml(error.message)}</p>
      </main>
    `;
  });
