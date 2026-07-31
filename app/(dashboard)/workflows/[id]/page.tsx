import { WorkflowEditorPage } from "@/components/workflow/workflow-editor";

// Keyed on the id so opening a different workflow mounts a fresh editor rather
// than handing the current one a new prop to unwind.
const page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  return <WorkflowEditorPage key={id} workflowId={id} />;
};

export default page;
