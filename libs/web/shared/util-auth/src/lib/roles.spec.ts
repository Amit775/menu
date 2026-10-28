import { TestBed } from '@angular/core/testing';
import { convertToParamMap, provideRouter, Router, type UrlTree } from '@angular/router';
import { AUTH_BACKEND } from './auth-backend';
import {
  adminGuard,
  itemEditorGuard,
  managerGuard,
  NO_ROLES,
  Roles,
  venueManagerGuard,
} from './roles';
import { FakeAuthBackend } from './testing';

describe('Roles', () => {
  const user = { uid: 'u1', displayName: null, phoneNumber: null };

  function setup(backend = new FakeAuthBackend(user)) {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AUTH_BACKEND, useValue: backend }],
    });
    return TestBed.inject(Roles);
  }

  function guard(fn: typeof managerGuard, url = '/manage', id = ''): Promise<unknown> {
    const route = { paramMap: convertToParamMap({ id }) };
    return TestBed.runInInjectionContext(() =>
      fn(route as never, { url } as never),
    ) as Promise<unknown>;
  }

  it('knows nothing until the account says', () => {
    const roles = setup();
    expect(roles.known()).toBe(false);
    expect(roles.canManage()).toBe(false);
  });

  it('makes an Owner a manager of their venues only', () => {
    const roles = setup();
    roles.set({ isAdmin: false, isContributor: false, ownedVenueIds: ['v1'] });
    expect(roles.canManage()).toBe(true);
    expect(roles.isAdmin()).toBe(false);
    expect(roles.canEditVenue('v1')).toBe(true);
    expect(roles.canEditVenue('v2')).toBe(false);
  });

  it('lets an Admin manage every venue', () => {
    const roles = setup();
    roles.set({ isAdmin: true, isContributor: false, ownedVenueIds: [] });
    expect(roles.canManage()).toBe(true);
    expect(roles.canEditVenue('v2')).toBe(true);
  });

  it('lets a Contributor edit items at every venue without managing any', () => {
    const roles = setup();
    roles.set({ isAdmin: false, isContributor: true, ownedVenueIds: [] });
    expect(roles.canContribute()).toBe(true);
    expect(roles.canManage()).toBe(false);
    expect(roles.canEditVenue('v1')).toBe(false);
    expect(roles.canEditItems('v1')).toBe(true);
  });

  it('lets an Owner edit their own venue’s items only, and an Admin every one', () => {
    const roles = setup();
    roles.set({ isAdmin: false, isContributor: false, ownedVenueIds: ['v1'] });
    expect(roles.canContribute()).toBe(false);
    expect(roles.canEditItems('v1')).toBe(true);
    expect(roles.canEditItems('v2')).toBe(false);
    roles.set({ isAdmin: true, isContributor: false, ownedVenueIds: [] });
    expect(roles.canContribute()).toBe(true);
  });

  it('lets a Contributor into the item form and keeps a user out', async () => {
    const roles = setup();
    roles.set({ isAdmin: false, isContributor: true, ownedVenueIds: [] });
    await expect(guard(itemEditorGuard, '/manage/venues/v1/items/new', 'v1')).resolves.toBe(true);
    roles.set(NO_ROLES);
    const result = (await guard(itemEditorGuard, '/manage/venues/v1/items/new', 'v1')) as UrlTree;
    expect(TestBed.inject(Router).serializeUrl(result)).toBe('/venues/v1');
  });

  it('lets a manager into the manage pages once the roles are known', async () => {
    const roles = setup();
    const result = guard(managerGuard);
    roles.set({ isAdmin: false, isContributor: false, ownedVenueIds: ['v1'] });
    await expect(result).resolves.toBe(true);
  });

  it('sends someone without a venue back to the profile', async () => {
    const roles = setup();
    roles.set(NO_ROLES);
    const result = (await guard(managerGuard)) as UrlTree;
    expect(TestBed.inject(Router).serializeUrl(result)).toBe('/profile');
  });

  it('keeps Owners out of Admin pages', async () => {
    const roles = setup();
    roles.set({ isAdmin: false, isContributor: false, ownedVenueIds: ['v1'] });
    const result = (await guard(adminGuard, '/manage/tags')) as UrlTree;
    expect(TestBed.inject(Router).serializeUrl(result)).toBe('/manage');
    roles.set({ isAdmin: true, isContributor: false, ownedVenueIds: [] });
    await expect(guard(adminGuard, '/manage/tags')).resolves.toBe(true);
  });

  it('lets an Owner manage only their own venue', async () => {
    const roles = setup();
    roles.set({ isAdmin: false, isContributor: false, ownedVenueIds: ['v1'] });
    await expect(guard(venueManagerGuard, '/manage/venues/v1', 'v1')).resolves.toBe(true);
    const result = (await guard(venueManagerGuard, '/manage/venues/v2', 'v2')) as UrlTree;
    expect(TestBed.inject(Router).serializeUrl(result)).toBe('/manage');
    roles.set({ isAdmin: true, isContributor: false, ownedVenueIds: [] });
    await expect(guard(venueManagerGuard, '/manage/venues/v2', 'v2')).resolves.toBe(true);
  });

  it('sends a visitor to sign in first, with the way back', async () => {
    setup(new FakeAuthBackend());
    const result = (await guard(managerGuard, '/manage/tags')) as UrlTree;
    expect(TestBed.inject(Router).serializeUrl(result)).toBe('/sign-in?returnUrl=%2Fmanage%2Ftags');
  });

  it('forgets the roles on sign-out', () => {
    const roles = setup();
    roles.set({ isAdmin: true, isContributor: false, ownedVenueIds: [] });
    roles.set(null);
    expect(roles.known()).toBe(false);
    expect(roles.isAdmin()).toBe(false);
  });
});
