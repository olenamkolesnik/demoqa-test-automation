// Barrel for the page objects: a UI spec usually drives two or three pages in
// one journey, so it imports them as a group rather than one path at a time.
// Deliberately limited to src/ui/pages/ — the API layers are picked from
// selectively (one schema, one factory helper), where a barrel would hide
// which module a name actually comes from.
export { LoginPage } from './login.page';
export type { LoginCredentials } from './login.page';
export { ProfilePage } from './profile.page';
export { RegisterPage } from './register.page';
