import type { APIRequestContext, APIResponse } from '@playwright/test';
import { BaseApiClient } from './base-api.client';
import type { AuthorizedUserRequest } from './authorized-request';
import type { AddBooksPayload, ReplaceBookPayload } from '../types/book-store.schema';

export class BookStoreApiClient extends BaseApiClient {
  private readonly basePath = '/BookStore/v1';

  // Re-declared solely to widen BaseApiClient's protected constructor to
  // public: fixtures must be able to `new` this client. Not a redundant
  // forwarder — removing it makes the class uninstantiable outside its own
  // declaration (TS2674).
  constructor(request: APIRequestContext) {
    super(request);
  }

  getBooks(): Promise<APIResponse> {
    const path = `${this.basePath}/Books`;
    return this.logged(this.request.get(path), `GET ${path}`);
  }

  getBook(isbn: string): Promise<APIResponse> {
    const path = `${this.basePath}/Book`;
    return this.logged(this.request.get(path, { params: { ISBN: isbn } }), `GET ${path}`);
  }

  addBooks({ payload, token }: { payload: AddBooksPayload; token: string }): Promise<APIResponse> {
    const path = `${this.basePath}/Books`;
    return this.logged(
      this.request.post(path, { data: payload, headers: this.authHeader(token) }),
      `POST ${path}`,
      { requestPayload: payload }
    );
  }

  deleteAllBooks({ userId, token }: AuthorizedUserRequest): Promise<APIResponse> {
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
