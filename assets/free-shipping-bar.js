/**
 * Smooth free-shipping bar while keeping native <progress>.
 * Browsers don't interpolate <progress> when markup is replaced; we
 * tween progress.value with rAF after cart updates (same idea as
 * before, but the element stays semantic).
 */
(function () {
  var STORAGE_KEY = '__axFreeShipProgressPrev';
  var animId = 0;
  var DURATION_MS = 650;

  function getBar() {
    return document.querySelector('.cart-drawer__free-shipping progress.free-shipping-progress');
  }

  function readTarget(bar) {
    if (!bar) return null;
    var raw = bar.getAttribute('value');
    if (raw == null || raw === '') raw = String(bar.value);
    var n = parseFloat(raw);
    if (isNaN(n)) return null;
    return Math.min(100, Math.max(0, n));
  }

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /** Approximates cubic-bezier(0.22, 1, 0.36, 1) */
  function easeOut(t) {
    return 1 - Math.pow(1 - t, 2.15);
  }

  function runTween(bar, from, to) {
    var id = ++animId;
    var start = performance.now();
    bar.value = from;

    function frame(now) {
      if (id !== animId) return;
      var elapsed = now - start;
      var t = Math.min(1, elapsed / DURATION_MS);
      bar.value = from + (to - from) * easeOut(t);
      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        bar.value = to;
        window[STORAGE_KEY] = to;
      }
    }

    requestAnimationFrame(frame);
  }

  function afterCartUpdate() {
    var bar = getBar();
    if (!bar) return;

    var target = readTarget(bar);
    if (target == null) return;

    var prev = window[STORAGE_KEY];
    var shouldTween =
      typeof prev === 'number' &&
      !isNaN(prev) &&
      Math.abs(prev - target) > 0.01 &&
      !prefersReducedMotion();

    if (shouldTween) {
      runTween(bar, prev, target);
    } else {
      animId++;
      bar.value = target;
      window[STORAGE_KEY] = target;
    }
  }

  function schedule() {
    setTimeout(afterCartUpdate, 0);
  }

  function init() {
    var bar = getBar();
    var t = readTarget(bar);
    if (t != null) window[STORAGE_KEY] = t;

    if (typeof subscribe !== 'undefined' && typeof PUB_SUB_EVENTS !== 'undefined') {
      subscribe(PUB_SUB_EVENTS.cartUpdate, schedule);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
