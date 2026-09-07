import type { APIRequestContext, APIResponse } from '@playwright/test';
import { BaseApiClient } from './base-api.client';
import type { AuthorizedUserRequest } from './authorized-request';
import type { LoginPayload } from '../types/account.schema';

export class AccountApiClient extends BaseApiClient {
  private readonly basePath = '/Account/v1';

  // Re-declared solely to widen BaseApiClient's protected constructor to
  // public: fixtures must be able to `new` this client. Not a redundant
  // forwarder — removing it makes the class uninstantiable outside its own
  // declaration (TS2674).
  constructor(request: APIRequestContext) {
    super(request);
  }

  createUser(payload: LoginPayload): Promise<APIResponse> {
    return this.logged(
      this.request.post(`${this.basePath}/User`, { data: payload }),
      `POST ${this.basePath}/User`,
      { requestPayload: payload }
    );
  }

  generateToken(payload: LoginPayload): Promise<APIResponse> {
    return this.logged(
      this.request.post(`${this.basePath}/GenerateToken`, { data: payload }),
      `POST ${this.basePath}/GenerateToken`,
      { requestPayload: payload }
    );
  }

  checkAuthorized(payload: LoginPayload): Promise<APIResponse> {
    return this.logged(
      this.request.post(`${this.basePath}/Authorized`, { data: payload }),
      `POST ${this.basePath}/Authorized`,
      { requestPayload: payload }
    );
  }

  getUser({ userId, token }: AuthorizedUserRequest): Promise<APIResponse> {
    const path = `${this.basePath}/User/${encodeURIComponent(userId)}`;
    return this.logged(this.request.get(path, { headers: this.authHeader(token) }), `GET ${path}`);
  }

  deleteUser({ userId, token }: AuthorizedUserRequest): Promise<APIResponse> {
    const path = `${this.basePath}/User/${encodeURIComponent(userId)}`;
    return this.logged(
      this.request.delete(path, { headers: this.authHeader(token) }),
      `DELETE ${path}`
    );
  }
}
