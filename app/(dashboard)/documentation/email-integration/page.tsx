import Image from "next/image";

import { Callout, Code, CodeBlock, FieldRow, Section } from "@/components/docs/doc-ui";

export default function EmailIntegrationDocPage() {
  return (
    <article className="flex flex-col gap-8">
      <div className="space-y-1.5">
        <h1 className="font-heading text-xl font-medium tracking-tight">
          Sending email from a workflow
        </h1>
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          The reliable way to email a filtered list of people, each with their own written message:
          an <span className="font-medium text-foreground">AI</span> node picks who qualifies and
          writes to them directly, and an <span className="font-medium text-foreground">Email</span>{" "}
          node sends one message per person it picked.
        </p>
      </div>

      <Section title="The shape">
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          Three nodes, chained in order:
        </p>
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <Code>Data source</Code>
          <span className="text-muted-foreground">→</span>
          <Code>AI</Code>
          <span className="text-muted-foreground">→</span>
          <Code>Email</Code>
        </div>
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          The data source supplies raw rows. The AI node reads them, decides who qualifies, and
          writes the message. The Email node never makes either of those decisions — it only
          resolves templates and sends, once per element of whatever list you point{" "}
          <Code>forEach</Code> at.
        </p>
      </Section>

      <Section title="1. Configure the AI node">
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          Ask for two output fields, not one:
        </p>
        <dl className="flex flex-col">
          <FieldRow name="customers" value={<><Code>array</Code> — the filtered rows, each with at least a name and email.</>} />
          <FieldRow name="messageBody" value={<><Code>string</Code> — the actual text the customer will read.</>} />
        </dl>

        <p className="text-[13px] leading-relaxed text-muted-foreground">Prompt example:</p>
        <CodeBlock>
          {
            "From the rows in {{datasource-1.rows}}, pick only those with a rating above 4. Return them as 'customers' with their name and email. Also write 'messageBody': a friendly message written directly to the customer (not a description) letting them know they've earned 20% off with code SAVE30."
          }
        </CodeBlock>

        <Callout>
          <p className="font-medium">Write to the customer, not about them.</p>
          <p>
            A prompt phrased as an instruction to the workflow (
            <span className="italic">&ldquo;send them a discount code&rdquo;</span>) gets answered
            the same way — the model narrates the plan instead of drafting the email:
          </p>
          <p className="text-destructive/90">
            ✕ &ldquo;To customers who gave more than 4-star ratings, a 20% discount code SAVE30 will
            be sent.&rdquo;
          </p>
          <p>
            Ask it to address the customer directly instead, and it writes the message itself:
          </p>
          <p>✓ &ldquo;Hi Alice, thanks for the great review! Enjoy 20% off with code SAVE30.&rdquo;</p>
        </Callout>
      </Section>

      <Section title="2. Configure the Email node">
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          This is the exact panel to match, field for field:
        </p>

        <div className="overflow-hidden rounded-lg border">
          <Image
            src="/email-node-config.png"
            alt="Email node editor: One per item, For each {{ai.customers}}, Send automatically, To {{item.email}}, Subject Thanks {{item.name}}, Body Hi {{item.name}}, {{ai.messageBody}}"
            width={460}
            height={662}
            className="w-full max-w-sm"
          />
        </div>

        <dl className="flex flex-col">
          <FieldRow
            name="Send"
            value={
              <>
                <span className="font-medium">One per item</span> — required whenever the
                recipient comes from a list. <span className="font-medium">A single email</span>{" "}
                only fits a fixed, one-off recipient with no <Code>forEach</Code> at all.
              </>
            }
          />
          <FieldRow
            name="For each"
            value={
              <>
                <Code>{"{{ai.customers}}"}</Code> — the AI node&rsquo;s own filtered array, never
                the data source&rsquo;s raw rows. Whatever this resolves to becomes{" "}
                <Code>{"{{item}}"}</Code> for every field below.
              </>
            }
          />
          <FieldRow
            name="Delivery"
            value={
              <>
                <span className="font-medium">Send automatically</span> sends as soon as the node
                runs. <span className="font-medium">Hold for review</span> resolves every message
                and stops — nothing goes out until you open the run panel and click{" "}
                <span className="font-medium">Send</span>. Use Hold for review the first time you
                run a new prompt; there is no way to get the resolved text back once
                &ldquo;Send automatically&rdquo; has fired.
              </>
            }
          />
          <FieldRow name="To" value={<Code>{"{{item.email}}"}</Code>} />
          <FieldRow name="Subject" value={<Code>{"Thanks {{item.name}}"}</Code>} />
          <FieldRow name="Body" value={<Code>{"Hi {{item.name}}, {{ai.messageBody}}"}</Code>} />
        </dl>
      </Section>

      <Section title="3. Review before you send">
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          With Delivery set to Hold for review, running the workflow leaves the Email node
          &ldquo;awaiting review&rdquo; in the run panel: every recipient, subject and body it
          resolved, listed individually, with nothing marked sent. Read through the list — this is
          the only point where a bad prompt is cheap to catch. Once it looks right, click{" "}
          <span className="font-medium text-foreground">Send</span>.
        </p>
      </Section>

      <Section title="Mistakes that actually happen">
        <Callout tone="warn">
          <p className="font-medium">The whole list ends up in “To”, not “For each”.</p>
          <p>
            If <Code>To</Code> holds <Code>{"{{datasource-1.rows}}"}</Code> (or any array) and{" "}
            <Code>forEach</Code> is empty, the node is in single-email mode and tries to mail the
            entire array as one address. It fails at send time with{" "}
            <Code>Could not parse mail</Code>. Fix: switch <span className="font-medium">Send</span>{" "}
            to <span className="font-medium">One per item</span>, move the list reference into{" "}
            <span className="font-medium">For each</span>, and put{" "}
            <Code>{"{{item.email}}"}</Code> back in <span className="font-medium">To</span>.
          </p>
        </Callout>

        <Callout tone="warn">
          <p className="font-medium">
            “For each” points at the raw data source instead of the AI&rsquo;s filtered list.
          </p>
          <p>
            <Code>{"{{datasource-1.rows}}"}</Code> is every row in the file. Only{" "}
            <Code>{"{{ai.customers}}"}</Code> (or whatever array your AI node actually outputs) has
            been filtered. Pointing <Code>forEach</Code> at the data source emails everyone,
            including the people the prompt was supposed to exclude.
          </p>
        </Callout>
      </Section>
    </article>
  );
}
