/**
 * Native Mobile App Splash Screen & Home Screen Standalone Controller
 */

let hasDismissed = false;
const MIN_SPLASH_DISPLAY_MS = 750;
const appStartTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

/**
 * Checks whether the application is currently running in standalone PWA mode
 * (launched from the mobile home screen).
 */
export function isStandaloneApp(): boolean {
  if (typeof window === 'undefined') return false;
  const isIosStandalone = (window.navigator as any).standalone === true;
  const isMatchMediaStandalone = window.matchMedia('(display-mode: standalone)').matches;
  return isIosStandalone || isMatchMediaStandalone;
}

/**
 * Dismisses the pre-rendered HTML splash screen with a smooth native transition.
 * Guarantees a minimum display duration so launch never flickers on fast connections.
 */
export function hideInitialSplashScreen(onDismissed?: () => void): void {
  if (typeof document === 'undefined' || hasDismissed) return;
  hasDismissed = true;

  const splashEl = document.getElementById('app-splash-screen');
  if (!splashEl) {
    if (onDismissed) onDismissed();
    return;
  }

  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const elapsed = now - appStartTime;
  const remainingTime = Math.max(0, MIN_SPLASH_DISPLAY_MS - elapsed);

  setTimeout(() => {
    splashEl.classList.add('splash-hidden');

    // Remove from DOM once fade-out completes
    setTimeout(() => {
      splashEl.remove();
      if (onDismissed) onDismissed();
    }, 500);
  }, remainingTime);
}

/**
 * Programmatically preview the splash screen (e.g. for testing native feel).
 */
export function previewSplashScreen(durationMs = 2000): void {
  if (typeof document === 'undefined') return;

  let existing = document.getElementById('app-splash-screen');
  if (!existing) {
    existing = document.createElement('div');
    existing.id = 'app-splash-screen';
    existing.innerHTML = `
      <div class="splash-content">
        <div class="splash-emblem">🔱</div>
        <div class="splash-tag">Om Saravana Bhavaya Namaha</div>
        <h1 class="splash-title">ONAMPILLY KAVADI SANGAM</h1>
        <p class="splash-subtitle">Thaipooyam Maholsavam 2027</p>
        <div class="splash-progress-track">
          <div class="splash-progress-bar"></div>
        </div>
        <span class="splash-status">Home Screen App Launch</span>
      </div>
    `;
    document.body.appendChild(existing);
  }

  existing.classList.remove('splash-hidden');

  setTimeout(() => {
    existing?.classList.add('splash-hidden');
    setTimeout(() => {
      existing?.remove();
    }, 500);
  }, durationMs);
}
