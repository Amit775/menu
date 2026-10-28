import { TestBed } from '@angular/core/testing';
import { type MyContributorApplication } from '@menu/shared/contracts';
import { ContributorApplicationApiClient } from '@menu/web/users/data-access';
import { I18n } from '@menu/web/shared/util-i18n';
import { ContributorApplication } from './contributor-application';

describe('ContributorApplication', () => {
  const pending = {
    id: '5f9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10',
    note: 'I eat out every week',
    status: 'pending' as const,
    createdAt: '2026-10-22T20:00:00.000Z',
    decidedAt: null,
  };
  const days = (count: number): string => new Date(Date.now() + count * 86_400_000).toISOString();

  async function render(api: Partial<ContributorApplicationApiClient>) {
    TestBed.configureTestingModule({
      providers: [{ provide: ContributorApplicationApiClient, useValue: api }],
    });
    TestBed.inject(I18n).setLanguage('en');
    const fixture = TestBed.createComponent(ContributorApplication);
    const element = fixture.nativeElement as HTMLElement;
    await vi.waitFor(async () => {
      await fixture.whenStable();
      expect(element.textContent.trim()).not.toBe('');
    });
    return { fixture, element };
  }

  const answering = (mine: MyContributorApplication) => vi.fn().mockResolvedValue(mine);

  it('files an application with the note and then shows it is pending', async () => {
    const apply = vi.fn().mockResolvedValue(pending);
    const { fixture, element } = await render({
      mine: answering({ application: null, canApplyFrom: days(0) }),
      apply,
    });
    const note = element.querySelector('textarea');
    if (note) {
      note.value = '  I eat out every week ';
      note.dispatchEvent(new Event('input'));
    }
    element.querySelector('form')?.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    expect(apply).toHaveBeenCalledWith('I eat out every week');
    expect(element.querySelector('[role="status"]')?.textContent).toContain('with the Admins');
    expect(element.querySelector('form')).toBeNull();
  });

  it('does not send an empty note', async () => {
    const apply = vi.fn();
    const { fixture, element } = await render({
      mine: answering({ application: null, canApplyFrom: days(0) }),
      apply,
    });
    element.querySelector('form')?.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    expect(apply).not.toHaveBeenCalled();
  });

  it('says when filing fails', async () => {
    const { fixture, element } = await render({
      mine: answering({ application: null, canApplyFrom: days(0) }),
      apply: vi.fn().mockRejectedValue(new Error('409')),
    });
    const note = element.querySelector('textarea');
    if (note) {
      note.value = 'Please';
      note.dispatchEvent(new Event('input'));
    }
    element.querySelector('form')?.dispatchEvent(new Event('submit'));
    await vi.waitFor(async () => {
      await fixture.whenStable();
      expect(element.querySelector('[role="alert"]')?.textContent).toContain('not sent');
    });
  });

  it('tells a rejected applicant when they may apply again', async () => {
    const { element } = await render({
      mine: answering({
        application: { ...pending, status: 'rejected', decidedAt: days(-9) },
        canApplyFrom: days(21),
      }),
    });
    expect(element.textContent).toContain('You can apply again in 3 weeks.');
    expect(element.querySelector('form')).toBeNull();
  });

  it('lets a rejected applicant apply again once the wait is over', async () => {
    const { element } = await render({
      mine: answering({
        application: { ...pending, status: 'rejected', decidedAt: days(-40) },
        canApplyFrom: days(0),
      }),
    });
    expect(element.querySelector('form')).not.toBeNull();
  });
});
