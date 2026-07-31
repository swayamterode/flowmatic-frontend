/*
 * The email node's config, and the rules for what makes it valid.
 *
 * The shape is the backend's: EmailOutputNodeExecutor reads `to`, `subject`, `body`
 * and an optional `forEach`, and nothing else. All four are templates over the
 * namespaced context.
 *
 * Split out from the node component so the card, the editor panel and the graph
 * serializer all agree on one definition.
 */

export type EmailData = {
  /**
   * A reference to a list to iterate, or "" to send a single email.
   *
   * Empty means single: `forEach` is omitted from the wire when blank, because an
   * empty string is *not* null to the executor — it would reach the resolver, fail
   * the `instanceof List` check, and kill the node with "forEach did not resolve to
   * a list".
   */
  forEach: string;
  to: string;
  subject: string;
  body: string;
  /**
   * "manual" holds every resolved message in the run panel for review instead of
   * sending it — see `sendMode` on `EmailOutputNodeExecutor`. "auto" (the default,
   * and today's only behavior) sends as soon as the node runs.
   */
  sendMode: "auto" | "manual";
};

export const EMAIL_DEFAULT_DATA: EmailData = {
  forEach: "",
  to: "",
  subject: "",
  body: "",
  sendMode: "auto",
};

/** What the server uses when `subject` is blank, per EmailOutputNodeExecutor. */
export const EMAIL_DEFAULT_SUBJECT = "A message from Flowmatic";

/** True when this node sends one email per element rather than a single email. */
export function isPerItem(data: EmailData): boolean {
  return data.forEach.trim().length > 0;
}

/*
 * TemplateResolver has two modes, and only one of them can produce a list: a string
 * that is *exactly* one placeholder returns the raw referenced object, while a
 * placeholder embedded in other text returns the stringified result. So a `forEach`
 * of "rows: {{ds.rows}}" resolves to text and the node dies at run time. This is
 * the resolver's own WHOLE pattern, anchored the same way.
 */
const WHOLE_TOKEN = /^\{\{\s*[^}]+?\s*\}\}$/;

/**
 * Why this `forEach` won't work, or null when it's fine.
 *
 * Blank is fine — that is single-email mode, not an error.
 */
export function forEachProblem(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!WHOLE_TOKEN.test(trimmed)) {
    return "Must be exactly one reference, like {{ds.rows}}. Anything around it resolves to text instead of a list.";
  }
  return null;
}

/** The fields the executor refuses to run without. */
export function requiredFieldProblem(field: "to" | "body", value: string): string | null {
  if (value.trim()) return null;
  return field === "to"
    ? "A recipient is required — the node fails without it."
    : "A body is required — the node fails without it.";
}

/** True when the node would fail as configured. Drives the card's hint. */
export function emailProblem(data: EmailData): string | null {
  return (
    requiredFieldProblem("to", data.to) ??
    requiredFieldProblem("body", data.body) ??
    forEachProblem(data.forEach)
  );
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/**
 * Email config from a stored graph.
 *
 * Every field degrades to "" rather than making the node unreadable: a card that
 * says what is missing beats dropping a node over one hand-edited field.
 */
export function asEmailData(data: Record<string, unknown>): EmailData {
  return {
    forEach: asString(data.forEach),
    to: asString(data.to),
    subject: asString(data.subject),
    body: asString(data.body),
    sendMode: data.sendMode === "manual" ? "manual" : "auto",
  };
}

/**
 * What goes on the wire.
 *
 * Blank fields are omitted rather than sent empty, and that is deliberate for each:
 * an empty `forEach` would fail the list check, while an absent `to` or `body` gets
 * the executor's clear "Email node requires config 'to'" instead of an empty
 * recipient reaching the mail transport.
 */
export function toEmailConfig(data: EmailData): Record<string, unknown> {
  const forEach = data.forEach.trim();
  const to = data.to.trim();
  const body = data.body;

  return {
    ...(forEach ? { forEach } : {}),
    ...(to ? { to } : {}),
    // Blank is safe here — the executor substitutes its own default subject.
    subject: data.subject,
    ...(body.trim() ? { body } : {}),
    // Omitted rather than written as "auto" — the executor already treats a missing
    // sendMode as automatic, so this keeps every already-saved workflow unchanged.
    ...(data.sendMode === "manual" ? { sendMode: "manual" } : {}),
  };
}
