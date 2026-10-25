// Keep <details> open until its closing animation ends. This also lets a new
// click reverse the motion from the current size rather than queueing it.
export function createStatisticsAccordion({ details, summary, content, body, onChange }) {
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const duration = 300,
    easing = 'cubic-bezier(0.4, 0, 0.2, 1)';
  let expanded = details.open,
    expectedOpen = details.open,
    animation = null,
    targetHeight = 0,
    deadline = 0,
    destroyed = false;
  const writeOpen = (value) => {
    expectedOpen = value;
    details.open = value;
  };
  const reflect = () => {
    details.setAttribute('data-expanded', String(expanded));
    summary.setAttribute('aria-expanded', String(expanded));
    content.inert = !expanded;
    content.setAttribute('aria-hidden', String(!expanded));
    if (!expanded && content.contains(content.getRootNode().activeElement))
      summary.focus({ preventScroll: true });
  };
  const cancel = () => {
    const previous = animation;
    animation = null;
    if (previous) {
      previous.onfinish = null;
      previous.cancel();
    }
  };
  const settle = () => {
    writeOpen(expanded);
    cancel();
    for (const property of ['height', 'opacity', 'overflow'])
      content.style.removeProperty(property);
    reflect();
  };
  const animateTo = (height, opacity, milliseconds, from) => {
    cancel();
    targetHeight = height;
    if (motion.matches || milliseconds <= 0 || typeof content.animate !== 'function') {
      settle();
      return;
    }
    content.style.overflow = 'hidden';
    const current = content.animate(
      [
        { height: `${from.height}px`, opacity: from.opacity },
        { height: `${height}px`, opacity },
      ],
      { duration: milliseconds, easing, fill: 'both' },
    );
    animation = current;
    current.onfinish = () => {
      if (!destroyed && animation === current) settle();
    };
  };
  const setExpanded = (value, immediate = false) => {
    if (destroyed) return;
    if (value === expanded) {
      if (immediate) settle();
      return;
    }
    const from = details.open
      ? {
          height: content.getBoundingClientRect().height,
          opacity: Number.parseFloat(getComputedStyle(content).opacity) || 0,
        }
      : { height: 0, opacity: 0 };
    expanded = value;
    if (expanded) writeOpen(true);
    reflect();
    onChange(expanded);
    deadline = performance.now() + duration;
    if (immediate || motion.matches) {
      settle();
      return;
    }
    animateTo(expanded ? body.getBoundingClientRect().height : 0, expanded ? 1 : 0, duration, from);
  };
  const clicked = (event) => {
    if (event.defaultPrevented || event.button !== 0) return;
    event.preventDefault();
    setExpanded(!expanded);
  };
  const toggled = () => {
    if (details.open !== expectedOpen) setExpanded(details.open, true);
  };
  const motionChanged = () => {
    if (motion.matches && animation) settle();
  };
  const observer = new ResizeObserver(() => {
    if (destroyed || !expanded || !animation) return;
    const height = body.getBoundingClientRect().height;
    if (Math.abs(height - targetHeight) < 0.5) return;
    const from = {
      height: content.getBoundingClientRect().height,
      opacity: Number.parseFloat(getComputedStyle(content).opacity) || 0,
    };
    animateTo(height, 1, Math.max(0, deadline - performance.now()), from);
  });
  summary.addEventListener('click', clicked);
  details.addEventListener('toggle', toggled);
  motion.addEventListener('change', motionChanged);
  observer.observe(body);
  reflect();
  return {
    destroy() {
      if (destroyed) return;
      destroyed = true;
      cancel();
      observer.disconnect();
      summary.removeEventListener('click', clicked);
      details.removeEventListener('toggle', toggled);
      motion.removeEventListener('change', motionChanged);
    },
  };
}
