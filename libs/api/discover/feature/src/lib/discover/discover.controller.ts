import { Controller, Get, Param, Query } from '@nestjs/common';
import { ZodValidationPipe } from '@menu/api/shared/util';
import {
  Authenticated,
  CurrentPrincipal,
  OptionalPrincipal,
  type Principal,
} from '@menu/api/shared/util-auth';
import {
  type DiscoverItem,
  discoverPath,
  discoverSavedPath,
  type Feed,
  type FeedQuery,
  FeedQuerySchema,
  IdSchema,
  type ItemPage,
  type MapPin,
  type MapQuery,
  MapQuerySchema,
  type Near,
  NearQuery,
  type SearchQuery,
  SearchQuerySchema,
  type SearchResults,
  type VenueInsights,
  type VenuePage,
} from '@menu/shared/contracts';
import { DiscoverService } from './discover.service';

@Controller(discoverPath)
export class DiscoverController {
  constructor(private readonly service: DiscoverService) {}

  @Get('feed')
  feed(
    @OptionalPrincipal() principal: Principal | null,
    @Query(new ZodValidationPipe(FeedQuerySchema)) query: FeedQuery,
  ): Promise<Feed> {
    return this.service.feed(principal, query);
  }

  @Get(discoverSavedPath)
  @Authenticated()
  saved(
    @CurrentPrincipal() principal: Principal,
    @Query(new ZodValidationPipe(NearQuery)) near: Near,
  ): Promise<DiscoverItem[]> {
    return this.service.saved(principal, near);
  }

  @Get('map')
  map(
    @OptionalPrincipal() principal: Principal | null,
    @Query(new ZodValidationPipe(MapQuerySchema)) query: MapQuery,
  ): Promise<MapPin[]> {
    return this.service.map(principal, query);
  }

  @Get('search')
  search(
    @OptionalPrincipal() principal: Principal | null,
    @Query(new ZodValidationPipe(SearchQuerySchema)) query: SearchQuery,
  ): Promise<SearchResults> {
    return this.service.search(principal, query.q);
  }

  @Get('venues/:id')
  venue(
    @OptionalPrincipal() principal: Principal | null,
    @Param('id', new ZodValidationPipe(IdSchema)) id: string,
    @Query(new ZodValidationPipe(NearQuery)) near: Near,
  ): Promise<VenuePage> {
    return this.service.venuePage(principal, id, near);
  }

  @Get('venues/:id/insights')
  @Authenticated()
  insights(
    @CurrentPrincipal() principal: Principal,
    @Param('id', new ZodValidationPipe(IdSchema)) id: string,
  ): Promise<VenueInsights> {
    return this.service.insights(principal, id);
  }

  @Get('items/:id')
  item(
    @OptionalPrincipal() principal: Principal | null,
    @Param('id', new ZodValidationPipe(IdSchema)) id: string,
    @Query(new ZodValidationPipe(NearQuery)) near: Near,
  ): Promise<ItemPage> {
    return this.service.itemPage(principal, id, near);
  }
}
