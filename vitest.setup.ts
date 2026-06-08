import '@testing-library/jest-dom/vitest';
import { expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest expect with jest-dom matchers
expect.extend(matchers);

const jsonResponse = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

const defaultFetchHandler = async (input: RequestInfo | URL) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

  if (url.includes('/api/user')) {
    return jsonResponse(null, { status: 401 });
  }

  if (url.includes('/api/blog/categories') || url.includes('/api/blog/posts') || url.includes('/api/gallery')) {
    return jsonResponse([]);
  }

  if (url.includes('/api/analytics/track-visit')) {
    return jsonResponse({ viewId: 'test-view' });
  }

  return jsonResponse({});
};

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(defaultFetchHandler));
  Object.defineProperty(navigator, 'sendBeacon', {
    configurable: true,
    value: vi.fn(() => true),
  });
  Object.defineProperty(window, 'scrollTo', {
    configurable: true,
    writable: true,
    value: vi.fn(),
  });
});

Object.defineProperty(window, 'requestIdleCallback', {
  configurable: true,
  writable: true,
  value: (callback: IdleRequestCallback) =>
    window.setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 50 }), 0),
});

Object.defineProperty(window, 'cancelIdleCallback', {
  configurable: true,
  writable: true,
  value: (id: number) => window.clearTimeout(id),
});

class ImmediateIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin = '0px';
  readonly thresholds: ReadonlyArray<number> = [0];

  constructor(private readonly callback: IntersectionObserverCallback) {}

  observe(target: Element) {
    this.callback(
      [{
        isIntersecting: true,
        target,
        intersectionRatio: 1,
        time: Date.now(),
        boundingClientRect: target.getBoundingClientRect(),
        intersectionRect: target.getBoundingClientRect(),
        rootBounds: null,
      }],
      this,
    );
  }

  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

Object.defineProperty(window, 'IntersectionObserver', {
  configurable: true,
  value: ImmediateIntersectionObserver,
});

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
