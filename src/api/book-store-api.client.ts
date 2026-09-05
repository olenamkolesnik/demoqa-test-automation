import type { APIRequestContext, APIResponse } from '@playwright/test';
import { BaseApiClient } from './base-api.client';

export class BookStoreApiClient extends BaseApiClient {
  private readonly basePath = '/BookStore/v1';

  constructor(request: APIRequestContext) {
    super(request);
  }

  getBooks(): Promise<APIResponse> {
    const path = `${this.basePath}/Books`;
    return this.logged(this.request.get(path), `GET ${path}`);
  }
}
