import { TestBed } from '@angular/core/testing';
import { DeviceLocation, POSITION_SOURCE, type PositionSource } from './device-location';

describe('DeviceLocation', () => {
  function setup(source: PositionSource | null): DeviceLocation {
    TestBed.configureTestingModule({ providers: [{ provide: POSITION_SOURCE, useValue: source }] });
    return TestBed.inject(DeviceLocation);
  }

  it('gives the position the user allowed, and asks only once', async () => {
    const getCurrentPosition = vi.fn<PositionSource['getCurrentPosition']>((success) => {
      success({ coords: { latitude: 32.08, longitude: 34.78 } });
    });
    const location = setup({ getCurrentPosition });
    await expect(location.locate()).resolves.toEqual({ lat: 32.08, lng: 34.78 });
    await location.locate();
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(location.position()).toEqual({ lat: 32.08, lng: 34.78 });
  });

  it('gives null when the user refuses', async () => {
    const location = setup({
      getCurrentPosition: (_success, error) => {
        error();
      },
    });
    await expect(location.locate()).resolves.toBeNull();
  });

  it('gives null without geolocation', async () => {
    await expect(setup(null).locate()).resolves.toBeNull();
  });
});
