"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import {
  PlusIcon,
  RotateCwIcon,
  SearchIcon,
  Trash2,
  TriangleAlertIcon,
  WorkflowIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RouteError, deleteRoute, getRoute } from "@/lib/api/route-client";
import type { WorkflowSummary } from "@/types/workflow.types";

/** A timestamp the backend stringified from an Instant, so it may not parse. */
function parseTime(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function relativeTime(value: string) {
  const parsed = parseTime(value);
  return parsed ? formatDistanceToNow(parsed, { addSuffix: true }) : "—";
}

/**
 * Creation is a fact, not news: a calendar date beside a relative "last saved"
 * keeps the two columns from reading as the same grey phrase twice.
 */
function calendarDate(value: string) {
  const parsed = parseTime(value);
  return parsed ? format(parsed, "d MMM yyyy") : "—";
}

/** The exact stamp, on hover, so the rounded-off version is never the only answer. */
function exactTime(value: string) {
  const parsed = parseTime(value);
  return parsed ? format(parsed, "PPpp") : undefined;
}

/** Shared by the loading rows and the real ones, so nothing shifts when data lands. */
const COLUMN = {
  name: "max-w-72 truncate py-3 pr-4 pl-6",
  saved: "px-4 py-3",
  created: "hidden px-4 py-3 md:table-cell",
  action: "w-14 py-3 pr-6 pl-4 text-right",
};

function WorkflowTable({ children }: { children: ReactNode }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className={`${COLUMN.name} text-xs text-muted-foreground`}>Name</TableHead>
          <TableHead className={`${COLUMN.saved} text-xs text-muted-foreground`}>
            Last saved
          </TableHead>
          <TableHead className={`${COLUMN.created} text-xs text-muted-foreground`}>
            Created
          </TableHead>
          <TableHead className={COLUMN.action}>
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>{children}</TableBody>
    </Table>
  );
}

export function WorkflowList() {
  const [workflows, setWorkflows] = useState<WorkflowSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState<WorkflowSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  /** Bumped by "Try again" to re-run the fetch below. */
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;

    getRoute<WorkflowSummary[]>("/api/workflows")
      .then((data) => live && setWorkflows(data))
      .catch((cause: unknown) => {
        if (!live) return;
        setWorkflows([]);
        setError(cause instanceof RouteError ? cause.message : "Could not load your workflows.");
      });

    return () => {
      live = false;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setWorkflows(null);
    setError(null);
    setAttempt((current) => current + 1);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) return;

    setDeleting(true);
    try {
      await deleteRoute(`/api/workflows/${pendingDelete.id}`);
      setWorkflows((current) =>
        (current ?? []).filter((workflow) => workflow.id !== pendingDelete.id),
      );
      setPendingDelete(null);
    } catch (cause) {
      toast.error(cause instanceof RouteError ? cause.message : "Could not delete that workflow.");
    } finally {
      setDeleting(false);
    }
  }, [pendingDelete]);

  const search = query.trim();
  const total = workflows?.length ?? 0;

  const rows = useMemo(() => {
    const byLastSaved = [...(workflows ?? [])].sort(
      (a, b) => (parseTime(b.updatedAt)?.getTime() ?? 0) - (parseTime(a.updatedAt)?.getTime() ?? 0),
    );
    const needle = query.trim().toLowerCase();
    return needle
      ? byLastSaved.filter((workflow) => workflow.name.toLowerCase().includes(needle))
      : byLastSaved;
  }, [workflows, query]);

  return (
    <div className="mx-auto w-full max-w-full p-4 md:p-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-heading text-xl font-medium tracking-tight">Workflows</h1>
          <p className="text-sm text-muted-foreground">
            Everything you’ve built, most recently saved first.
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/create-workflow" />}>
          <PlusIcon data-icon="inline-start" />
          New workflow
        </Button>
      </div>

      <Card className="gap-0 py-0 shadow-none">
        {/* Nothing to search means nothing to show here — an empty state reads better on its own. */}
        {workflows === null || (!error && total > 0) ? (
          <CardHeader className="flex flex-row items-center justify-between gap-3 border-b pt-(--card-spacing)">
            <InputGroup className="max-w-xs">
              <InputGroupAddon>
                <SearchIcon />
              </InputGroupAddon>
              <InputGroupInput
                aria-label="Search workflows"
                disabled={workflows === null}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name"
                value={query}
              />
              {search ? (
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    aria-label="Clear search"
                    onClick={() => setQuery("")}
                    size="icon-xs"
                  >
                    <XIcon />
                  </InputGroupButton>
                </InputGroupAddon>
              ) : null}
            </InputGroup>
            {workflows !== null ? (
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                {search
                  ? `${rows.length} of ${total}`
                  : `${total} ${total === 1 ? "workflow" : "workflows"}`}
              </span>
            ) : null}
          </CardHeader>
        ) : null}

        <CardContent className="p-0">
          {workflows === null ? (
            <WorkflowTable>
              {["w-52", "w-36", "w-60", "w-44"].map((width) => (
                <TableRow className="h-14 hover:bg-transparent" key={width}>
                  <TableCell className={COLUMN.name}>
                    <Skeleton className={`h-4 ${width}`} />
                  </TableCell>
                  <TableCell className={COLUMN.saved}>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell className={COLUMN.created}>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell className={COLUMN.action}>
                    <Skeleton className="ml-auto size-7 rounded-md" />
                  </TableCell>
                </TableRow>
              ))}
            </WorkflowTable>
          ) : error ? (
            <Empty className="py-14" role="alert">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <TriangleAlertIcon />
                </EmptyMedia>
                <EmptyTitle>Workflows didn’t load</EmptyTitle>
                <EmptyDescription>{error}</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button onClick={retry} size="sm" variant="outline">
                  <RotateCwIcon data-icon="inline-start" />
                  Try again
                </Button>
              </EmptyContent>
            </Empty>
          ) : total === 0 ? (
            <Empty className="py-14">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <WorkflowIcon />
                </EmptyMedia>
                <EmptyTitle>No workflows yet</EmptyTitle>
                <EmptyDescription>
                  Build one on the canvas and save it — it will show up here.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button nativeButton={false} render={<Link href="/create-workflow" />} size="sm">
                  <PlusIcon data-icon="inline-start" />
                  Create workflow
                </Button>
              </EmptyContent>
            </Empty>
          ) : rows.length === 0 ? (
            <Empty className="py-14">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <SearchIcon />
                </EmptyMedia>
                <EmptyTitle>No workflow named “{search}”</EmptyTitle>
                <EmptyDescription>
                  Try a different name, or clear the search to see all {total}.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button onClick={() => setQuery("")} size="sm" variant="outline">
                  Clear search
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <WorkflowTable>
              {rows.map((workflow) => (
                <TableRow className="group/row h-14" key={workflow.id}>
                  {/* The terracotta rail is this page's one flash of brand: it marks the row under the
                      pointer or the keyboard focus, which is what a wide row needs to stay scannable. */}
                  <TableCell
                    className={`${COLUMN.name} relative font-medium before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-transparent before:transition-colors group-hover/row:before:bg-brand has-[a:focus-visible]:before:bg-brand`}
                  >
                    <Link
                      className="rounded-sm underline-offset-4 hover:underline focus-visible:underline"
                      href={`/workflows/${workflow.id}`}
                    >
                      {workflow.name}
                    </Link>
                  </TableCell>
                  <TableCell
                    className={`${COLUMN.saved} text-muted-foreground`}
                    title={exactTime(workflow.updatedAt)}
                  >
                    {relativeTime(workflow.updatedAt)}
                  </TableCell>
                  <TableCell
                    className={`${COLUMN.created} text-muted-foreground tabular-nums`}
                    title={exactTime(workflow.createdAt)}
                  >
                    {calendarDate(workflow.createdAt)}
                  </TableCell>
                  <TableCell className={COLUMN.action}>
                    <Button
                      aria-label={`Delete ${workflow.name}`}
                      className="cursor-pointer text-muted-foreground opacity-70 transition group-hover/row:opacity-100 hover:text-destructive focus-visible:opacity-100"
                      onClick={() => setPendingDelete(workflow)}
                      size="icon-sm"
                      variant="ghost"
                    >
                      <Trash2 />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </WorkflowTable>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && !deleting && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{pendingDelete?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              The workflow and its run history go with it. This can’t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={() => void confirmDelete()}
              variant="destructive"
            >
              {deleting ? (
                <>
                  <Spinner data-icon="inline-start" />
                  Deleting…
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
