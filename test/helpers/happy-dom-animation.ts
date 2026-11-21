interface CancellableAnimation {
  readonly playState: string;
  readonly finished: Promise<unknown>;
  cancel(): void;
}

interface AnimationRealm {
  happyDOM?: unknown;
  Animation?: { prototype: CancellableAnimation };
}

const patchedPrototypes = new WeakSet<object>();

/**
 * Happy DOM 21.0.4 rejects Animation.finished on cancel without marking that
 * internal promise handled. Web Animations 4.4.14 explicitly requires both:
 * https://www.w3.org/TR/web-animations-1/#canceling-an-animation-section
 *
 * This test-only adapter supplies the missing [[PromiseIsHandled]] step. It
 * leaves the original promise rejected, so await/catch consumers still receive
 * AbortError. Native cancellation, events, timing and all other rejections keep
 * their existing behavior; no global unhandled-rejection listener is installed.
 */
export function installHappyDomAnimationCancellation(realm: AnimationRealm): void {
  if (!('happyDOM' in realm) || !realm.Animation) return;
  const prototype = realm.Animation.prototype;
  if (patchedPrototypes.has(prototype)) return;
  const cancel = prototype.cancel;

  Object.defineProperty(prototype, 'cancel', {
    configurable: true,
    writable: true,
    value(this: CancellableAnimation): void {
      if (this.playState !== 'idle') {
        // Attaching a handler marks this promise handled without replacing it
        // or changing the rejection observed through the original promise.
        void this.finished.catch(() => undefined);
      }
      return cancel.call(this);
    },
  });
  patchedPrototypes.add(prototype);
}
