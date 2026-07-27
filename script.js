// ============ 스크롤 리빌 ============
const revealTargets = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
revealTargets.forEach((el) => revealObserver.observe(el));

// ============ 숫자 카운트업 ============
function animateCount(el) {
  const target = parseInt(el.dataset.count, 10);
  const suffix = el.dataset.suffix || '';
  const duration = 1400;
  const start = performance.now();
  function tick(now) {
    const p = Math.min((now - start) / duration, 1);
    const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
    const val = Math.floor(eased * target);
    el.textContent = val.toLocaleString('ko-KR') + (p === 1 ? suffix : '');
    if (p < 1) requestAnimationFrame(tick);
    else el.innerHTML = target.toLocaleString('ko-KR') + '<span class="unit">' + suffix + '</span>';
  }
  requestAnimationFrame(tick);
}

const countTargets = document.querySelectorAll('[data-count]');
const countObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      animateCount(entry.target);
      countObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.5 });
countTargets.forEach((el) => countObserver.observe(el));

// ============ 플로팅 CTA ============
// 기본 노출, 히어로가 보이는 첫 화면과 최종 CTA 섹션에서는 숨김(중복 방지)
const floatCta = document.getElementById('floatCta');
const heroSection = document.querySelector('.hero');
const ctaSection = document.getElementById('cta');

if (floatCta) {
  let heroVisible = true;
  let ctaVisible = false;
  const sync = () => floatCta.classList.toggle('is-visible', !heroVisible && !ctaVisible);

  if (heroSection) {
    new IntersectionObserver((entries) => {
      entries.forEach((e) => { heroVisible = e.isIntersecting; sync(); });
    }, { threshold: 0.35 }).observe(heroSection);
  } else {
    heroVisible = false;
  }

  if (ctaSection) {
    new IntersectionObserver((entries) => {
      entries.forEach((e) => { ctaVisible = e.isIntersecting; sync(); });
    }, { threshold: 0.25 }).observe(ctaSection);
  }
  sync();
}
