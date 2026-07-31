"use client";

import { useCallback, useRef } from "react";
import { Braces } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { UpstreamGroup } from "@/components/workflow/upstream-fields";

/*
 * Putting a `{{node.field}}` token into a config field.
 *
 * Shared because the backend's TemplateResolver throws on a reference it can't
 * resolve — a typo'd token fails the node at run time rather than rendering blank
 * — so every field that accepts a template deserves the same picker. The email node
 * alone has four.
 */

export type TokenFieldElement = HTMLInputElement | HTMLTextAreaElement;

/**
 * Caret-aware insertion for one field.
 *
 * Takes the field's ref rather than creating one, so the caller owns it and can pass
 * it straight to both the input and the menu's `finalFocus` — reading it back off a
 * returned object would be touching a ref during render.
 *
 * The caret position is remembered on insert and re-applied when the field is
 * focused, rather than on a timer: the menu returns focus through `finalFocus`, so
 * that focus event is the exact moment the caret is ours to place again.
 */
export function useTokenField<T extends TokenFieldElement>(
  ref: React.RefObject<T | null>,
  value: string,
  onChange: (next: string) => void,
) {
  const pendingCaret = useRef<number | null>(null);

  const insert = useCallback(
    (token: string) => {
      const element = ref.current;
      // No element means the field was never focused; appending is the only
      // sensible place left.
      const start = element?.selectionStart ?? value.length;
      const end = element?.selectionEnd ?? start;

      onChange(value.slice(0, start) + token + value.slice(end));
      pendingCaret.current = start + token.length;
    },
    [onChange, ref, value],
  );

  const onFocus = useCallback((event: React.FocusEvent<T>) => {
    const caret = pendingCaret.current;
    if (caret === null) return;
    pendingCaret.current = null;
    event.currentTarget.setSelectionRange(caret, caret);
  }, []);

  return { insert, onFocus };
}

type InsertMenuProps = {
  groups: UpstreamGroup[];
  onInsert: (token: string) => void;
  /** The field to hand focus back to, so the caret survives the round trip. */
  finalFocus: React.RefObject<TokenFieldElement | null>;
  /** Names the field in the trigger's accessible label. */
  fieldLabel: string;
};

export function InsertMenu({ groups, onInsert, finalFocus, fieldLabel }: InsertMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={`Insert a reference into ${fieldLabel}`}
            className="h-7 gap-1.5 px-2 text-[11px] text-muted-foreground hover:text-foreground"
            size="sm"
            variant="ghost"
          />
        }
      >
        <Braces className="size-3.5" />
        Insert
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72" finalFocus={finalFocus}>
        {groups.length === 0 ? (
          <p className="px-2 py-2.5 text-[12px] leading-snug text-muted-foreground">
            Nothing upstream yet. Connect a node into this one and its fields show up here.
          </p>
        ) : (
          groups.map((group) => (
            <DropdownMenuGroup key={group.key}>
              <DropdownMenuLabel>
                {group.title}
                {group.subtitle && (
                  <span className="ml-1 font-mono opacity-70">{group.subtitle}</span>
                )}
              </DropdownMenuLabel>
              {group.refs.map((ref) => (
                <DropdownMenuItem
                  key={ref.token}
                  className="font-mono text-[12px]"
                  onClick={() => onInsert(ref.token)}
                >
                  {ref.token}
                </DropdownMenuItem>
              ))}
              {group.note && (
                <p className="px-1.5 pt-0.5 pb-1.5 text-[11px] leading-snug text-muted-foreground">
                  {group.note}
                </p>
              )}
            </DropdownMenuGroup>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
