import type { APIRequestContext, APIResponse } from '@playwright/test';
import { BaseApiClient } from './base-api.client';
import type { AddBooksPayload } from '../types/book-store.schema';

export class BookStoreApiClient extends BaseApiClient {
  private readonly basePath = '/BookStore/v1';

  constructor(request: APIRequestContext) {
    super(request);
  }

  getBooks(): Promise<APIResponse> {
    const path = `${this.basePath}/Books`;
    return this.logged(this.request.get(path), `GET ${path}`);
  }

  addBooks(payload: AddBooksPayload, token: string): Promise<APIResponse> {
    const path = `${this.basePath}/Books`;
    return this.logged(
      this.request.post(path, { data: payload, headers: this.authHeader(token) }),
      `POST ${path}`,
      { requestPayload: payload }
    );
  }
}
