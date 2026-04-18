export default function ApprovalsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pending Approvals</h1>
        <p className="text-muted-foreground">
          Review AI-generated content before it&apos;s used
        </p>
      </div>

      <div className="rounded-lg border bg-card p-12 text-center">
        <p className="text-muted-foreground">
          No pending approvals. AI-generated drafts and summaries will appear here for your review.
        </p>
      </div>
    </div>
  );
}
