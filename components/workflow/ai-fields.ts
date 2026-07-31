/*
 * The AI node's config, and the rules for what makes it valid.
 *
 * Split out from the node component so the card, the editor panel and the graph
 * serializer all agree on one definition — the serializer in particular must not
 * have to import a React component just to read a type.
 *
 * The shape is the backend's, not ours: an AI node's `data` holds `prompt` and
 * `output`, and nothing else. Downstream nodes read the declared fields as
 * `{{<nodeId>.<name>}}`, which is why a name is a dotted-path segment rather than
 * free text.
 */

export const AI_OUTPUT_TYPES = ["string", "number", "boolean", "array", "object"] as const;

export type AiOutputType = (typeof AI_OUTPUT_TYPES)[number];

export type AiOutputField = {
  name: string;
  type: AiOutputType;
};

/*
 * A `type` rather than an interface: React Flow's node data has to satisfy
 * Record<string, unknown>, and only type aliases get an implicit index signature.
 */
export type AiData = {
  prompt: string;
  output: AiOutputField[];
};

/** What a new AI node starts life with. */
export const AI_DEFAULT_OUTPUT: AiOutputField = { name: "result", type: "string" };

/**
 * A default name for a field being added, past whatever is already there:
 * `result`, then `result2`, `result3`.
 *
 * Without this, adding a second field would seed a name that collides with the
 * first and greet the user with a duplicate error they did not cause.
 */
export function nextOutputName(output: AiOutputField[]): string {
  const taken = new Set(output.map((field) => field.name));
  if (!taken.has(AI_DEFAULT_OUTPUT.name)) return AI_DEFAULT_OUTPUT.name;

  let suffix = 2;
  while (taken.has(`${AI_DEFAULT_OUTPUT.name}${suffix}`)) suffix += 1;
  return `${AI_DEFAULT_OUTPUT.name}${suffix}`;
}

/*
 * Anchored, so it rejects a name with a trailing space rather than matching the
 * valid head of it. A field is addressed as `{{ai.name}}`, so anything a dotted
 * path can't carry — spaces, dots, dashes, a leading digit — can never be
 * referenced and is worth flagging while it is still being typed.
 */
const VALID_OUTPUT_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * Why this output name won't work, or null when it's fine.
 *
 * `others` is every *other* row's name, so a row never reports itself as its own
 * duplicate. Both duplicates are flagged rather than just the later one: there is
 * no reason to treat the row that happens to sit lower as the wrong one.
 */
export function outputNameProblem(name: string, others: string[]): string | null {
  if (!name.trim()) return "Name this field so it can be referenced.";
  if (!VALID_OUTPUT_NAME.test(name))
    return "Letters, digits and underscore only, not starting with a digit.";
  if (others.includes(name)) return "Another field already uses this name.";
  return null;
}

/** True when every row is nameable and referenceable. Drives the card's hint. */
export function hasOutputProblem(output: AiOutputField[]): boolean {
  return output.some((field, index) =>
    outputNameProblem(
      field.name,
      output.filter((_, other) => other !== index).map((other) => other.name),
    ),
  );
}

function isOutputType(value: unknown): value is AiOutputType {
  return AI_OUTPUT_TYPES.includes(value as AiOutputType);
}

/**
 * The output list from a stored graph.
 *
 * Lenient about `type` on purpose: an unrecognized one is coerced to `string`
 * rather than dropping the row, because the row's `name` is what downstream
 * `{{ai.name}}` templates hang off — discarding it would break a reference the
 * user can't see from here. A row with no usable name has nothing to preserve, so
 * that one goes.
 */
export function asAiOutput(value: unknown): AiOutputField[] {
  if (!Array.isArray(value)) return [];

  const output: AiOutputField[] = [];
  for (const entry of value) {
    const field = entry as Partial<AiOutputField> | null;
    if (!field || typeof field.name !== "string" || !field.name) continue;
    output.push({ name: field.name, type: isOutputType(field.type) ? field.type : "string" });
  }
  return output;
}
