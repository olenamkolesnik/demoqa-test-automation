// The credential pair every authorized endpoint needs. Named and shared rather
// than re-declared inline per method so a caller reads one consistent shape
// across both clients (docs/coding-standards.md: avoid ambiguous positional
// arguments; prefer a named options object once a call takes more than a
// couple of parameters).
export interface AuthorizedUserRequest {
  userId: string;
  token: string;
}
