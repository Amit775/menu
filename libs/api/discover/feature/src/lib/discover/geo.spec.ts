import { distanceMeters } from './geo';

describe('distanceMeters', () => {
  it('measures Dizengoff Square to Rabin Square at about 1.1 km', () => {
    const meters = distanceMeters({ lat: 32.0779, lng: 34.7741 }, { lat: 32.0809, lng: 34.7806 });
    expect(meters).toBeGreaterThan(600);
    expect(meters).toBeLessThan(800);
  });

  it('is zero for the same point', () => {
    expect(distanceMeters({ lat: 32, lng: 34 }, { lat: 32, lng: 34 })).toBe(0);
  });
});
