import { type DiscoverItem } from '@menu/shared/contracts';
import { orderFeed } from './feed-order';

describe('orderFeed', () => {
  function item(
    id: string,
    score: number | null,
    distanceMeters: number,
    writtenByMe = false,
  ): DiscoverItem {
    return {
      id,
      name: { he: id, en: null },
      venue: { id: 'v', name: { he: 'v', en: null } },
      sectionId: 's',
      tagIds: [],
      distanceMeters,
      score,
      ratingCount: score === null ? 0 : 3,
      wouldOrderAgainPercent: null,
      latestPrice: null,
      photoUrl: null,
      writtenByMe,
    };
  }

  const ranked = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6'].map((id, index) =>
    item(id, 5 - index * 0.1, 100),
  );
  const unranked = [item('u-far', null, 900), item('u-near', null, 50)];

  it('puts one unranked item on every fifth card in reels mode', () => {
    const ids = orderFeed([...unranked, ...ranked], { mode: 'reels', sort: 'score' }).map(
      (i) => i.id,
    );
    expect(ids).toEqual(['r1', 'r2', 'r3', 'r4', 'u-near', 'r5', 'r6', 'u-far']);
  });

  it('lists unranked items after the ranked ones in list mode', () => {
    const ids = orderFeed([...unranked, ...ranked], { mode: 'list', sort: 'score' }).map(
      (i) => i.id,
    );
    expect(ids.slice(-2)).toEqual(['u-near', 'u-far']);
  });

  it('shows the caller’s own items first when nothing is ranked yet', () => {
    const mine = item('mine', null, 2000, true);
    const ids = orderFeed([...unranked, mine], { mode: 'reels', sort: 'score' }).map((i) => i.id);
    expect(ids).toEqual(['mine', 'u-near', 'u-far']);
  });

  it('sorts by distance on request', () => {
    const ids = orderFeed([...unranked, ...ranked.slice(0, 1)], {
      mode: 'list',
      sort: 'distance',
    }).map((i) => i.id);
    expect(ids).toEqual(['u-near', 'r1', 'u-far']);
  });
});
