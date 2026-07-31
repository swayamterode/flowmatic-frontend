"use client";

import Markdown, { type Components, type ExtraProps } from "react-markdown";
import remarkGfm from "remark-gfm";

type Tag = keyof React.JSX.IntrinsicElements;
type MdProps<T extends Tag> = React.JSX.IntrinsicElements[T] & ExtraProps;

/*
 * react-markdown hands every component the AST `node` alongside the DOM props.
 * Spreading that onto a real element would render it as an attribute, so it is
 * dropped by copy-and-delete — destructuring it into an unused binding is the
 * same thing with a lint warning attached.
 */
function withoutNode<T extends Tag>(props: MdProps<T>) {
  const rest: Partial<MdProps<T>> = { ...props };
  delete rest.node;
  return rest;
}

function md<T extends Tag>(tag: T, className: string) {
  const Element = tag as React.ElementType;
  return function MarkdownElement(props: MdProps<T>) {
    return <Element className={className} {...withoutNode(props)} />;
  };
}

/*
 * Element map for note bodies. Text color is inherited from the note's
 * --note-ink rather than set here, so one CSS variable drives every color and
 * theme combination.
 */
const COMPONENTS: Components = {
  h1: md("h1", "mt-4 mb-2 text-lg leading-tight font-semibold first:mt-0"),
  h2: md("h2", "mt-4 mb-2 text-base leading-tight font-semibold first:mt-0"),
  h3: md("h3", "mt-3 mb-1.5 text-sm leading-tight font-semibold first:mt-0"),
  p: md("p", "mb-2 last:mb-0"),
  ul: md("ul", "mb-2 ml-4 list-disc last:mb-0"),
  ol: md("ol", "mb-2 ml-4 list-decimal last:mb-0"),
  li: md("li", "mb-0.5"),
  strong: md("strong", "font-semibold"),
  em: md("em", "italic"),
  del: md("del", "opacity-70"),
  hr: md("hr", "my-3 border-current opacity-20"),
  blockquote: md("blockquote", "mb-2 border-l-2 border-current/30 pl-3 opacity-90 last:mb-0"),
  code: md("code", "rounded bg-black/8 px-1 py-0.5 font-mono text-[0.85em] dark:bg-white/12"),
  // nowheel: scrolling a wide code block or table must not zoom the canvas.
  pre: md(
    "pre",
    "nowheel mb-2 overflow-x-auto rounded-md bg-black/8 p-2 last:mb-0 dark:bg-white/12",
  ),
  th: md("th", "border border-current/20 px-2 py-1 font-semibold"),
  td: md("td", "border border-current/20 px-2 py-1"),
  table: (props) => (
    <div className="nowheel mb-2 overflow-x-auto last:mb-0">
      <table className="w-full border-collapse text-left" {...withoutNode<"table">(props)} />
    </div>
  ),
  /*
   * nodrag keeps a link click from being read as the start of a node drag.
   * react-markdown sanitizes URLs by default, so javascript: never reaches href.
   */
  a: (props) => (
    <a
      className="nodrag underline decoration-current/40 underline-offset-2 hover:decoration-current"
      target="_blank"
      rel="noopener noreferrer"
      {...withoutNode<"a">(props)}
    />
  ),
};

export function StickyNoteMarkdown({ content }: { content: string }) {
  return (
    <Markdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
      {content}
    </Markdown>
  );
}
