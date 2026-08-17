const nav = document.querySelector(".nav");
const menu = document.querySelector(".menu");
if (menu) menu.addEventListener("click", () => nav.classList.toggle("mobile-open"));

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add("visible");
  });
}, { threshold: 0.08 });
document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", () => nav.classList.remove("mobile-open"));
});

function rebuildTicker() {
  const track = document.querySelector(".ticker-track");
  if (!track) return;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const seed = track.querySelector(".ticker-seq");
  if (!seed) return;

  track.innerHTML = "";
  track.appendChild(seed.cloneNode(true));
  track.appendChild(seed.cloneNode(true));

  if (reduce) {
    track.style.animation = "none";
    return;
  }

  track.style.animation = "";
  const need = window.innerWidth * 2;
  let guard = 0;
  while (track.scrollWidth < need && guard < 12) {
    track.appendChild(seed.cloneNode(true));
    guard += 1;
  }
  if (track.children.length % 2 === 1) {
    track.appendChild(seed.cloneNode(true));
  }
  const half = Math.floor(track.children.length / 2);
  let halfWidth = 0;
  for (let i = 0; i < half; i += 1) halfWidth += track.children[i].offsetWidth;
  const duration = Math.max(20, halfWidth / 40);
  track.style.animationDuration = `${duration}s`;
}

function applyLang(lang) {
  const pack = window.UMKA_I18N[lang] || window.UMKA_I18N.ru;
  const lookup = window.lookupI18n;

  document.documentElement.lang = lang === "en" ? "en" : "ru";
  document.title = lookup(pack, "meta.title") || document.title;
  const desc = document.querySelector('meta[name="description"]');
  if (desc) desc.setAttribute("content", lookup(pack, "meta.description") || desc.content);

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const value = lookup(pack, el.dataset.i18n);
    if (value != null) el.textContent = value;
  });
  document.querySelectorAll("[data-i18n-html]").forEach((el) => {
    const value = lookup(pack, el.dataset.i18nHtml);
    if (value != null) el.innerHTML = value;
  });
  document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
    const value = lookup(pack, el.dataset.i18nAria);
    if (value != null) el.setAttribute("aria-label", value);
  });
  document.querySelectorAll("[data-i18n-alt]").forEach((el) => {
    const value = lookup(pack, el.dataset.i18nAlt);
    if (value != null) el.setAttribute("alt", value);
  });

  document.querySelectorAll("[data-set-lang]").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.setLang === lang);
  });

  rebuildTicker();
}

const savedLang = localStorage.getItem("umka-lang") === "en" ? "en" : "ru";
applyLang(savedLang);

document.querySelectorAll("[data-set-lang]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const lang = btn.dataset.setLang === "en" ? "en" : "ru";
    localStorage.setItem("umka-lang", lang);
    applyLang(lang);
  });
});

let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(rebuildTicker, 150);
});
