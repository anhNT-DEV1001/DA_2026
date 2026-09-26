import { PaginanteRequest } from '../requests/index.js';

export interface PageMetadata {
  pageRequest: PaginanteRequest;
  itemCount: number;
}

export class PageMetadataResponse {
  readonly page: number;
  readonly limit: number;
  readonly itemCount: number;
  readonly pageCount: number;
  readonly hasPreviousPage: boolean;
  readonly hasNextPage: boolean;

  constructor({ pageRequest, itemCount }: PageMetadata) {
    this.page = pageRequest.page ?? 1;
    this.limit = pageRequest.limit ?? 15;
    this.itemCount = itemCount;
    this.pageCount = Math.ceil(this.itemCount / this.limit);
    this.hasPreviousPage = this.page > 1;
    this.hasNextPage = this.page < this.pageCount;
  }
}

export class PageResponse<T> {
  items: T[];
  meta: PageMetadataResponse;

  constructor(items: T[], meta: PageMetadataResponse) {
    this.items = items;
    this.meta = meta;
  }
}
