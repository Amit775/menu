import { MODULE_METADATA } from '@nestjs/common/constants';
import { Test } from '@nestjs/testing';
import { AUTH_REQUIREMENT, type Principal } from '@menu/api/shared/util-auth';
import { ItemController } from '../item/item.controller';
import { ItemModule } from '../item/item.module';
import { ItemReportController, VenueItemReportController } from './item-report.controller';
import { ItemReportService } from './item-report.service';

function requirementOf(controller: { prototype: object }, method: string): unknown {
  const handler = Object.getOwnPropertyDescriptor(controller.prototype, method)?.value as object;
  return Reflect.getMetadata(AUTH_REQUIREMENT, handler);
}

describe('Item report controllers', () => {
  const principal: Principal = {
    accountId: 'd1',
    isAdmin: false,
    isContributor: false,
    language: 'he',
    ownedVenueIds: [],
  };

  async function setup(service: Partial<Record<keyof ItemReportService, unknown>>) {
    const moduleRef = await Test.createTestingModule({
      controllers: [ItemReportController, VenueItemReportController],
      providers: [{ provide: ItemReportService, useValue: service }],
    }).compile();
    return {
      items: moduleRef.get(ItemReportController),
      venues: moduleRef.get(VenueItemReportController),
    };
  }

  it('files a report for the caller', async () => {
    const report = vi.fn().mockResolvedValue(undefined);
    await (await setup({ report })).items.report(principal, 'i1', { kind: 'gone' });
    expect(report).toHaveBeenCalledWith(principal, 'i1', { kind: 'gone' });
  });

  it('confirms an item and lists a venue’s reports through the service', async () => {
    const confirm = vi.fn().mockResolvedValue(undefined);
    const listForVenue = vi.fn().mockResolvedValue([]);
    const { items, venues } = await setup({ confirm, listForVenue });
    await items.confirm(principal, 'i1');
    await venues.list(principal, 'v1');
    expect(confirm).toHaveBeenCalledWith(principal, 'i1');
    expect(listForVenue).toHaveBeenCalledWith(principal, 'v1');
  });

  it('is for signed-in callers only', () => {
    expect(requirementOf(ItemReportController, 'report')).toBe('signed-in');
    expect(requirementOf(ItemReportController, 'confirm')).toBe('signed-in');
    expect(requirementOf(VenueItemReportController, 'list')).toBe('signed-in');
  });

  it('is routed before the item decisions, so `reports` is not read as one', () => {
    const controllers = Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, ItemModule) as unknown[];
    expect(controllers.indexOf(ItemReportController)).toBeLessThan(
      controllers.indexOf(ItemController),
    );
  });
});
