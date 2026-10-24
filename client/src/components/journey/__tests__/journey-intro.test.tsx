import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { JourneyFirstVisitIntro } from '../journey-experience';
import { OnboardingTour } from '@/components/onboarding-tour';
import { i18next } from '@/i18n';

const route = vi.hoisted(() => ({ path: '/journey' }));
vi.mock('wouter', () => ({ useLocation: () => [route.path, vi.fn()] }));
vi.mock('react-joyride', () => ({
  STATUS: { FINISHED: 'finished', SKIPPED: 'skipped' },
  Joyride: ({ run }: { run: boolean }) => run ? <div role="dialog" aria-label="Legacy tour" /> : null,
}));

const introKey = 'aquavo_journey_intro_seen_v3';
const help = () => screen.getByRole('button', { name: i18next.t('tools:journey-experience.help') });
const finish = () => screen.getByRole('button', { name: i18next.t('tools:journey-experience.s3') });

beforeEach(() => {
  localStorage.clear();
  route.path = '/journey';
});

describe('journey introduction ownership', () => {
  it('shows only one introduction on a fresh visit, even with the global tour mounted', async () => {
    render(<><OnboardingTour /><JourneyFirstVisitIntro /></>);
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(screen.queryByRole('dialog', { name: 'Legacy tour' })).not.toBeInTheDocument();
    fireEvent.click(finish());
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(localStorage.getItem(introKey)).toBe('1');
    await waitFor(() => expect(help()).toHaveFocus());
    fireEvent.click(help());
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(help()).toHaveFocus());
  });

  it('keeps replay available to returning users and restores focus after close', async () => {
    localStorage.setItem(introKey, '1');
    const view = render(<JourneyFirstVisitIntro />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(help());
    fireEvent.click(screen.getByRole('button', { name: i18next.t('common:dialog.s1') }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(help()).toHaveFocus());
    view.unmount();
    render(<JourneyFirstVisitIntro />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(help()).toBeInTheDocument();
  });

  it('never revives stale global steps when navigating to journey and back again', () => {
    route.path = '/calculators';
    const view = render(<OnboardingTour />);
    expect(screen.getByRole('dialog', { name: 'Legacy tour' })).toBeInTheDocument();
    route.path = '/journey';
    view.rerender(<OnboardingTour />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    route.path = '/calculators';
    view.rerender(<OnboardingTour />);
    expect(screen.getByRole('dialog', { name: 'Legacy tour' })).toBeInTheDocument();
    route.path = '/journey';
    view.rerender(<OnboardingTour />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('offers working opt-in help when storage reads and writes are blocked', async () => {
    const get = vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    const set = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    try {
      render(<JourneyFirstVisitIntro />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      fireEvent.click(help());
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      fireEvent.click(finish());
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      await waitFor(() => expect(help()).toHaveFocus());
    } finally {
      get.mockRestore();
      set.mockRestore();
    }
  });
});
