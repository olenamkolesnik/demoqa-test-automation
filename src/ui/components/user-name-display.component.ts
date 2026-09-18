import type { Locator, Page } from '@playwright/test';

// First component extracted in this project — see the "Deciding page vs.
// component" rule in the generate-ui-infrastructure skill: extract on the
// 2nd occurrence, not the 3rd. This widget appeared identically on /profile
// and /books (both cases verified live 2026-09-18).
//
// The username renders as a bare <label id="userName-value"> with no
// accessible name of its own — it sits beside a separate "User Name :"
// caption rather than being associated with one, so no getByRole/getByLabel
// query reaches it. The id is the only stable handle, and it is the same on
// both pages. A component must not know which page it is on (coding
// standards' "UI test architecture" table), which holds trivially here since
// the locator itself never varies by page.
export class UserNameDisplayComponent {
  private readonly userNameValue: Locator;

  constructor(page: Page) {
    this.userNameValue = page.locator('#userName-value');
  }

  value(): Locator {
    return this.userNameValue;
  }
}
