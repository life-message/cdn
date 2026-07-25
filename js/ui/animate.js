const animationClasses = new WeakMap();

export function clearAnimationClasses(el) {
  const classes = animationClasses.get(el);

  if (classes?.length) {
    el.classList.remove(...classes);
    el.classList.remove("animate");
  }

  animationClasses.delete(el);
}

export async function playClassAnimation(el, anims, phase, options = {}) {
  const {
    keep = false,
    isCurrent = () => true,
  } = options;

  clearAnimationClasses(el);

  const classes = (anims || [])
    .filter(Boolean)
    .map((name) => `${name}-${phase}`);

  if (!classes.length) {
    return true;
  }

  animationClasses.set(el, classes);

  void el.offsetWidth;

  const before = new Set(el.getAnimations?.() || []);

  el.classList.add(...classes);
  el.classList.add("animate");
  void el.offsetWidth;

  await new Promise((resolve) => requestAnimationFrame(resolve));

  if (!isCurrent()) {
    return false;
  }

  const active = (el.getAnimations?.() || []).filter((animation) => {
    const timing = animation.effect?.getComputedTiming?.();

    return (
      !before.has(animation) &&
      timing &&
      Number.isFinite(timing.endTime)
    );
  });

  if (active.length) {
    await Promise.allSettled(
      active.map((animation) => animation.finished)
    );
  }

  if (!isCurrent()) {
    return false;
  }

  if (!keep) {
    const current = animationClasses.get(el);

    if (current === classes) {
      el.classList.remove(...classes);
      el.classList.remove("animate");
      animationClasses.delete(el);
    }
  }

  return true;
}
