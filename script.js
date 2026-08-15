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
