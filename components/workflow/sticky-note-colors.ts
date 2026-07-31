/*
 * Single source of truth for note colors. The actual values live in globals.css
 * under [data-note-color="…"] as --note-bg / --note-border / --note-ink triples,
 * with a .dark override for each, so a note only ever carries its key and both
 * themes come for free. Keep these keys in sync with that block.
 */
export const NOTE_COLORS = [
  { key: "orange", label: "Orange" },
  { key: "yellow", label: "Yellow" },
  { key: "rose", label: "Rose" },
  { key: "violet", label: "Violet" },
  { key: "blue", label: "Blue" },
  { key: "green", label: "Green" },
  { key: "slate", label: "Slate" },
] as const;

export type NoteColor = (typeof NOTE_COLORS)[number]["key"];

export const DEFAULT_NOTE_COLOR: NoteColor = "orange";
