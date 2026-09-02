import type { APIRequestContext, APIResponse } from '@playwright/test';
import { BaseApiClient } from './base-api.client';
import type { LoginPayload } from '../types/account.schema';

interface AuthorizedUserRequest {
  userId: string;
  token: string;
}

export class AccountApiClient extends BaseApiClient {
  private readonly basePath = '/Account/v1';

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
