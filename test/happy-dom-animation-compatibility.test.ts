// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { installHappyDomAnimationCancellation } from './helpers/happy-dom-animation';

const require = createRequire(import.meta.url);
const tsxLoader = pathToFileURL(require.resolve('tsx')).href;
const adapterUrl = pathToFileURL(resolve('test/helpers/happy-dom-animation.ts')).href;

function runAnimationFixture(body: string, patched = true) {
  return spawnSync(process.execPath, [
    '--unhandled-rejections=strict', '--import', tsxLoader, '--input-type=module', '--eval',
    `import assert from 'node:assert/strict';
     import { Window } from 'happy-dom';
     import { installHappyDomAnimationCancellation } from ${JSON.stringify(adapterUrl)};
     const window = new Window();
     ${patched ? 'installHappyDomAnimationCancellation(window);' : ''}
     const makeAnimation = () => window.document.createElement('div').animate(
       { opacity: [0, 1] }, { duration: 1000 }
     );
     ${body}
     await new Promise(resolve => setTimeout(resolve, 10));
     await window.happyDOM.close();
     console.log('fixture-complete');`,
  ], { cwd: process.cwd(), encoding: 'utf8', timeout: 15_000 });
}

function expectCleanExit(result: ReturnType<typeof runAnimationFixture>) {
  expect(result.error).toBeUndefined();
  expect(result.status, result.stderr).toBe(0);
  expect(result.stdout).toContain('fixture-complete');
}

describe('Happy DOM animation cancellation conformance', () => {
  it('reproduces the missing PromiseIsHandled step in the installed upstream implementation', () => {
    const result = runAnimationFixture('makeAnimation().cancel();', false);
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('DOMException [AbortError]: The animation was canceled.');
  });

  it('cancels unobserved animations without reporting an unhandled rejection', () => {
    expectCleanExit(runAnimationFixture(`
      const animation = makeAnimation();
      let cancelEvents = 0;
      animation.addEventListener('cancel', () => cancelEvents++);
      animation.cancel();
      assert.equal(animation.playState, 'idle');
      assert.equal(animation.currentTime, null);
      assert.equal(cancelEvents, 1);
      animation.play();
      animation.pause();
      animation.cancel();
      assert.equal(cancelEvents, 2);
    `));
  });

  it('keeps the captured finished promise rejected for consumers and later playback usable', () => {
    expectCleanExit(runAnimationFixture(`
      const animation = makeAnimation();
      const cancelled = animation.finished;
      animation.cancel();
      await assert.rejects(cancelled, { name: 'AbortError' });
      animation.play();
      const completed = animation.finished;
      assert.notEqual(completed, cancelled);
      animation.finish();
      assert.equal(await completed, animation);
    `));
  });

  it('leaves idle cancellation and non-Happy-DOM implementations unchanged', () => {
    expectCleanExit(runAnimationFixture(`
      const animation = new window.Animation();
      const pending = animation.finished;
      animation.cancel();
      assert.equal(animation.playState, 'idle');
      assert.equal(animation.finished, pending);
    `));
    const cancel = () => undefined;
    const realm = { Animation: { prototype: { playState: 'idle', finished: Promise.resolve(), cancel } } };
    installHappyDomAnimationCancellation(realm);
    expect(realm.Animation.prototype.cancel).toBe(cancel);
  });

  it('does not hide an unhandled rejection in a consumer-derived promise', () => {
    const result = runAnimationFixture(`
      const animation = makeAnimation();
      void animation.finished.then(() => undefined);
      animation.cancel();
    `);
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('DOMException [AbortError]: The animation was canceled.');
  });

  it('does not hide unrelated unhandled promise failures', () => {
    const result = runAnimationFixture(`
      makeAnimation().cancel();
      void Promise.reject(new Error('unrelated-rejection-sentinel'));
    `);
    expect(result.error).toBeUndefined();
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('unrelated-rejection-sentinel');
  });
});
