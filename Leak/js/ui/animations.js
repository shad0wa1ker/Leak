/**
 * ============================================================================
 * UI ANIMATIONS & PROGRESSIVE OBSERVER
 * IntersectionObserver triggers, progressive counters, and motion safety
 * ============================================================================
 */

/**
 * Setup IntersectionObserver to trigger section callbacks on scroll
 * @param {Map<string, Function>} sectionCallbacks
 */
export function setupScrollObserver(sectionCallbacks) {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -15% 0px',
    threshold: 0.15
  };

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const sectionId = entry.target.id;
        entry.target.classList.add('is-revealed');

        if (sectionCallbacks.has(sectionId)) {
          const callback = sectionCallbacks.get(sectionId);
          callback();
          // Remove callback once triggered to avoid duplicate executions
          sectionCallbacks.delete(sectionId);
        }
      }
    });
  }, observerOptions);

  document.querySelectorAll('.investigation-section').forEach(sec => {
    sec.classList.add('reveal-on-scroll');
    if (prefersReducedMotion) {
      sec.classList.add('is-revealed');
    }
    observer.observe(sec);
  });

  return observer;
}

/**
 * Animated number counter
 * @param {HTMLElement} element
 * @param {number} target
 * @param {number} duration
 */
export function animateCounter(element, target, duration = 600) {
  if (!element) return;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    element.textContent = target;
    return;
  }

  const start = 0;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Easing out cubic
    const ease = 1 - Math.pow(1 - progress, 3);
    const currentVal = Math.round(start + (target - start) * ease);

    element.textContent = currentVal;

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      element.textContent = target;
    }
  }

  requestAnimationFrame(update);
}
