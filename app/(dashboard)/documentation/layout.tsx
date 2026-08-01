import { DocsSidebar } from "@/components/docs/docs-sidebar";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-4xl gap-6 p-4 md:p-6">
      <DocsSidebar />
      <div className="min-w-0 flex-1 border-l pt-0.5 pb-12 pl-6">{children}</div>
    </div>
  );
}
