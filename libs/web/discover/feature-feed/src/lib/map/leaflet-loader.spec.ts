import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { LEAFLET_STYLESHEET, LeafletLoader } from './leaflet-loader';

describe('LeafletLoader', () => {
  it('adds the stylesheet once and loads Leaflet', async () => {
    const loader = TestBed.inject(LeafletLoader);
    const L = await loader.load();
    await loader.load();
    const head = TestBed.inject(DOCUMENT).head;
    expect(head.querySelectorAll(`link[href="${LEAFLET_STYLESHEET}"]`)).toHaveLength(1);
    expect(typeof L.map).toBe('function');
  });
});
