import { TestBed } from '@angular/core/testing';
import { ItemPageStore } from '@menu/web/discover/data-access';
import { I18n } from '@menu/web/shared/util-i18n';
import { ItemReportForm } from './item-report-form';

describe('ItemReportForm', () => {
  async function render(report = vi.fn().mockResolvedValue(undefined)) {
    TestBed.configureTestingModule({});
    TestBed.overrideComponent(ItemReportForm, {
      set: { providers: [{ provide: ItemPageStore, useValue: { report } }] },
    });
    TestBed.inject(I18n).setLanguage('he');
    const fixture = TestBed.createComponent(ItemReportForm);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const click = async (selector: string) => {
      element.querySelector<HTMLButtonElement>(selector)?.click();
      await fixture.whenStable();
    };
    return { element, click, report, fixture };
  }

  it('reports that the item is no longer served, then thanks the diner', async () => {
    const { element, click, report } = await render();
    await click('button.report-start');
    await click('button.report-gone');
    expect(report).toHaveBeenCalledWith({ kind: 'gone' });
    expect(element.querySelector('[role="status"]')?.textContent).toContain('תודה');
    expect(element.querySelector('button')).toBeNull();
  });

  it('reports a new price, with the price when the diner gives one', async () => {
    const { element, click, report, fixture } = await render();
    await click('button.report-start');
    await click('button.report-price');
    const input = element.querySelector<HTMLInputElement>('input');
    if (!input) {
      throw new Error('no price field');
    }
    input.value = '74';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    await click('button.report-send');
    expect(report).toHaveBeenCalledWith({ kind: 'price', price: { value: 74, currency: 'ILS' } });
  });

  it('sends a price change with no price when the field is left empty', async () => {
    const { click, report } = await render();
    await click('button.report-start');
    await click('button.report-price');
    await click('button.report-send');
    expect(report).toHaveBeenCalledWith({ kind: 'price', price: null });
  });

  it('keeps the question open when the report fails', async () => {
    const { element, click } = await render(vi.fn().mockRejectedValue(new Error('offline')));
    await click('button.report-start');
    await click('button.report-gone');
    expect(element.querySelector('[role="alert"]')).not.toBeNull();
    expect(element.querySelector('button.report-gone')).not.toBeNull();
  });

  it('can be closed without reporting', async () => {
    const { element, click, report } = await render();
    await click('button.report-start');
    await click('button.report-cancel');
    expect(element.querySelector('button.report-start')).not.toBeNull();
    expect(report).not.toHaveBeenCalled();
  });
});
