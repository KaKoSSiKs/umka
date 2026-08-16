const nav = document.querySelector('.nav');
const menu = document.querySelector('.menu');
if (menu) menu.addEventListener('click', () => nav.classList.toggle('mobile-open'));

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, {threshold: 0.08});
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', () => nav.classList.remove('mobile-open'));
});

/* Seamless marquee: keep track at least 2× viewport wide */
(function initTicker() {
  const track = document.querySelector('.ticker-track');
  if (!track) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) {
    track.style.animation = 'none';
    return;
  }

  const seed = track.querySelector('.ticker-seq');
  if (!seed) return;

  const fill = () => {
    const need = window.innerWidth * 2;
    while (track.children.length < 2) {
      track.appendChild(seed.cloneNode(true));
    }
    let guard = 0;
    while (track.scrollWidth < need && guard < 12) {
      track.appendChild(seed.cloneNode(true));
      guard += 1;
    }
    // Even count so -50% lands on a clean half
    if (track.children.length % 2 === 1) {
      track.appendChild(seed.cloneNode(true));
    }
    const half = Math.floor(track.children.length / 2);
    let halfWidth = 0;
    for (let i = 0; i < half; i += 1) halfWidth += track.children[i].offsetWidth;
    const duration = Math.max(20, halfWidth / 40);
    track.style.animationDuration = `${duration}s`;
  };

  fill();
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const first = track.querySelector('.ticker-seq');
      track.innerHTML = '';
      track.appendChild(first.cloneNode(true));
      track.appendChild(first.cloneNode(true));
      fill();
    }, 150);
  });
})();
