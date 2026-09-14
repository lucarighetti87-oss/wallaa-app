export function installIOSViewportFix() {
  const root = document.documentElement;
  const vv = window.visualViewport;

  const updateViewportVars = () => {
    const height = vv?.height || window.innerHeight;
    const width = vv?.width || window.innerWidth;
    const offsetTop = vv?.offsetTop || 0;
    const offsetLeft = vv?.offsetLeft || 0;
    root.style.setProperty('--visual-viewport-height', `${height}px`);
    root.style.setProperty('--visual-viewport-width', `${width}px`);
    root.style.setProperty('--visual-viewport-offset-top', `${offsetTop}px`);
    root.style.setProperty('--visual-viewport-offset-left', `${offsetLeft}px`);
  };

  const isEditable = (node) => node instanceof HTMLElement && node.matches('input, textarea, select, [contenteditable="true"]');

  const revealFocusedControl = (target) => {
    window.setTimeout(() => {
      updateViewportVars();
      try {
        target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
      } catch {
        target.scrollIntoView();
      }
    }, 120);
  };

  const onFocusIn = (event) => {
    if (!isEditable(event.target)) return;
    root.classList.add('ios-keyboard-open');
    updateViewportVars();
    revealFocusedControl(event.target);
  };

  const onFocusOut = () => {
    window.setTimeout(() => {
      if (isEditable(document.activeElement)) return;
      root.classList.remove('ios-keyboard-open');
      updateViewportVars();
      if (vv && Math.abs(vv.offsetTop) > 0) {
        window.scrollTo({ left: window.scrollX, top: window.scrollY, behavior: 'instant' });
      }
    }, 220);
  };

  updateViewportVars();
  window.addEventListener('resize', updateViewportVars, { passive: true });
  vv?.addEventListener('resize', updateViewportVars, { passive: true });
  vv?.addEventListener('scroll', updateViewportVars, { passive: true });
  document.addEventListener('focusin', onFocusIn);
  document.addEventListener('focusout', onFocusOut);

  return () => {
    window.removeEventListener('resize', updateViewportVars);
    vv?.removeEventListener('resize', updateViewportVars);
    vv?.removeEventListener('scroll', updateViewportVars);
    document.removeEventListener('focusin', onFocusIn);
    document.removeEventListener('focusout', onFocusOut);
  };
}
