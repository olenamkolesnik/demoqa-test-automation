import type { APIRequestContext, APIResponse } from '@playwright/test';
import { BaseApiClient } from './base-api.client';
import type { AddBooksPayload, ReplaceBookPayload } from '../types/book-store.schema';

export class BookStoreApiClient extends BaseApiClient {
  private readonly basePath = '/BookStore/v1';

  constructor(request: APIRequestContext) {
    super(request);
  }

  getBooks(): Promise<APIResponse> {
    const path = `${this.basePath}/Books`;
    return this.logged(this.request.get(path), `GET ${path}`);
  }

  getBook(isbn: string): Promise<APIResponse> {
    const path = `${this.basePath}/Book`;
    return this.logged(
      this.request.get(path, { params: { ISBN: isbn } }),
      `GET ${path}?ISBN=${isbn}`
    );
  }

  addBooks(payload: AddBooksPayload, token: string): Promise<APIResponse> {
    const path = `${this.basePath}/Books`;
    return this.logged(
      this.request.post(path, { data: payload, headers: this.authHeader(token) }),
      `POST ${path}`,
      { requestPayload: payload }
    );
  }

  deleteAllBooks({ userId, token }: { userId: string; token: string }): Promise<APIResponse> {
    const path = `${this.basePath}/Books`;
    return this.logged(
      this.request.delete(path, { params: { UserId: userId }, headers: this.authHeader(token) }),
      `DELETE ${path}`
    );
  }

  replaceBook({
    isbn,
    payload,
    token,
  }: {
    isbn: string;
    payload: ReplaceBookPayload;
    token: string;
  }): Promise<APIResponse> {
    const path = `${this.basePath}/Books/${isbn}`;
    return this.logged(
      this.request.put(path, { data: payload, headers: this.authHeader(token) }),
      `PUT ${path}`,
      { requestPayload: payload }
    );
  }
}
