// The registration form's field set.
//
// This directory holds form field shapes and nothing else — no behaviour, no
// dependencies, no zod schemas. It is deliberately a leaf: it imports from no
// other layer, so both the API chain (`src/data/` building test data) and the
// UI chain (`src/ui/pages/` driving the form) can depend on it without either
// depending on the other. The admission rule is literally "the fields a form
// has"; anything with behaviour or an outward dependency belongs elsewhere.
//
// Distinct from `src/types/` on purpose. That layer holds zod schemas for API
// contracts, validated against live responses. A form's field set is not an
// API contract, and this form proves it: First Name and Last Name are
// collected by the form but never transmitted — the request body is
// `{userName, password}` only (docs/ui-spec/register-form.requirements.md,
// Element reference). Modelling the two as one shape would encode a
// relationship that does not hold.
export interface RegisterDetails {
  firstName: string;
  lastName: string;
  userName: string;
  password: string;
}
