import type { APIRequestContext, APIResponse } from '@playwright/test';
import { BaseApiClient } from './base-api.client';
import type { LoginPayload } from '../types/account.schema';

export class AccountApiClient extends BaseApiClient {
  private readonly basePath = '/Account/v1';

  constructor(request: APIRequestContext) {
    super(request);
  }

  createUser(payload: LoginPayload): Promise<APIResponse> {
    return this.logged(
      this.request.post(`${this.basePath}/User`, { data: payload }),
      `POST ${this.basePath}/User`
    );
  }

  generateToken(payload: LoginPayload): Promise<APIResponse> {
    return this.logged(
      this.request.post(`${this.basePath}/GenerateToken`, { data: payload }),
      `POST ${this.basePath}/GenerateToken`
    );
  }

  checkAuthorized(payload: LoginPayload): Promise<APIResponse> {
    return this.logged(
      this.request.post(`${this.basePath}/Authorized`, { data: payload }),
      `POST ${this.basePath}/Authorized`
    );
  }

  getUser(userId: string, token: string): Promise<APIResponse> {
    return this.logged(
      this.request.get(`${this.basePath}/User/${userId}`, { headers: this.authHeader(token) }),
      `GET ${this.basePath}/User/${userId}`
    );
  }

  deleteUser(userId: string, token: string): Promise<APIResponse> {
    return this.logged(
      this.request.delete(`${this.basePath}/User/${userId}`, { headers: this.authHeader(token) }),
      `DELETE ${this.basePath}/User/${userId}`
    );
  }
}
