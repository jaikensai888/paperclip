# Milestone Review Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement milestone review functionality allowing users to define review checkpoints when planning goals, with agent chat and approval workflows.

**Architecture:** Extends issues table with milestone fields, adds `review_milestone` approval type, leverages existing WebSocket infrastructure for agent chat, and adds UI components for milestone management and approval handling.

**Tech Stack:** Drizzle ORM, Express, React, TanStack Query, WebSocket (ws), shadcn/ui

---

## File Structure

### Database Layer
- `packages/db/src/schema/issues.ts` - Add milestone fields (isMilestone, reviewerAgentId, reviewerUserId, reviewApprovalId, completionReport, reviewSummary)
- `packages/db/drizzle/` - Migration files

### Shared Layer
- `packages/shared/src/constants.ts` - Add "review_milestone" to APPROVAL_TYPES
- `packages/shared/src/validators/issue.ts` - Add milestone field validation
- `packages/shared/src/types/issue.ts` - Update Issue interface

### Server Layer
- `server/src/services/issues.ts` - Add milestone completion logic
- `server/src/services/approvals.ts` - Add review_milestone handling
- `server/src/routes/issues.ts` - Add /issues/:id/complete-milestone endpoint

### UI Layer
- `ui/src/pages/GoalDetail.tsx` - Add Milestones tab
- `ui/src/components/MilestoneList.tsx` - **New** Milestone list component
- `ui/src/components/NewMilestoneDialog.tsx` - **New** Create milestone dialog
- `ui/src/components/CompletionReportDialog.tsx` - **New** Completion report dialog
- `ui/src/components/AgentChatDrawer.tsx` - **New** Agent chat drawer
- `ui/src/components/ApprovalPayload.tsx` - Add review_milestone renderer
- `ui/src/api/issues.ts` - Add milestone API methods

---

## Chunk 1: Database Schema and Constants

### Task 1.1: Add APPROVAL_TYPES constant

**Files:**
- Modify: `packages/shared/src/constants.ts:181`

- [ ] **Step 1: Update APPROVAL_TYPES array**

```typescript
export const APPROVAL_TYPES = ["hire_agent", "approve_ceo_strategy", "review_milestone"] as const;
```

- [ ] **Step 2: Verify change is correct**

Run: `grep "APPROVAL_TYPES" packages/shared/src/constants.ts`
Expected: Shows the updated array with "review_milestone"

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/constants.ts
git commit -m "$(cat <<'EOF'
feat(shared): add review_milestone approval type

Add "review_milestone" to APPROVAL_TYPES for milestone review workflow.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 1.2: Extend Issues Table Schema

**Files:**
- Modify: `packages/db/src/schema/issues.ts:1-67`

- [ ] **Step 1: Add milestone fields to issues table**

Find the field list (after line 42, before `startedAt`):

```typescript
// Add after assigneeAdapterOverrides field (around line 42):
    isMilestone: integer("is_milestone").notNull().default(0),
    reviewerAgentId: uuid("reviewer_agent_id").references(() => agents.id),
    reviewerUserId: text("reviewer_user_id"),
    reviewApprovalId: uuid("review_approval_id").references(() => approvals.id),
    completionReport: text("completion_report"),
    reviewSummary: text("review_summary"),
```

Note: Also need to import `approvals` table for the foreign key reference.

- [ ] **Step 2: Add imports for approvals**

Add at the top of imports section:

```typescript
import { approvals } from "./approvals.js";
```

- [ ] **Step 3: Add index for milestone queries**

In the indexes section (after line 66), add:

```typescript
    goalMilestoneIdx: index("issues_company_goal_milestone_idx").on(
      table.companyId,
      table.goalId,
      table.isMilestone,
    ),
```

- [ ] **Step 4: Generate migration**

Run: `cd packages/db && pnpm drizzle-kit generate`
Expected: Creates new migration file with ALTER TABLE statements

- [ ] **Step 5: Run migration**

Run: `cd packages/db && pnpm drizzle-kit migrate`
Expected: Migration applies successfully

- [ ] **Step 6: Commit**

```bash
git add packages/db/src/schema/issues.ts packages/db/drizzle/
git commit -m "$(cat <<'EOF'
feat(db): add milestone fields to issues table

Add isMilestone, reviewerAgentId, reviewerUserId, reviewApprovalId,
completionReport, and reviewSummary fields for milestone review workflow.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 1.3: Update Issue Type Definition

**Files:**
- Modify: `packages/shared/src/types/issue.ts:96-138`

- [ ] **Step 1: Add milestone fields to Issue interface**

Add after `executionWorkspaceSettings` field (around line 120):

```typescript
  isMilestone: boolean;
  reviewerAgentId: string | null;
  reviewerUserId: string | null;
  reviewApprovalId: string | null;
  completionReport: string | null;
  reviewSummary: string | null;
```

- [ ] **Step 2: Commit**

```bash
git add packages/shared/src/types/issue.ts
git commit -m "$(cat <<'EOF'
feat(shared): add milestone fields to Issue type

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 1.4: Update Issue Validators

**Files:**
- Modify: `packages/shared/src/validators/issue.ts:30-45`

- [ ] **Step 1: Add milestone fields to createIssueSchema**

Add after `labelIds` field:

```typescript
  isMilestone: z.coerce.boolean().optional().default(false),
  reviewerAgentId: z.string().uuid().optional().nullable(),
  reviewerUserId: z.string().optional().nullable(),
```

- [ ] **Step 2: Commit**

```bash
git add packages/shared/src/validators/issue.ts
git commit -m "$(cat <<'EOF'
feat(shared): add milestone field validation

Add validation for isMilestone, reviewerAgentId, and reviewerUserId
in issue creation schema.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 1.5: Add Complete Milestone Validator

**Files:**
- Modify: `packages/shared/src/validators/issue.ts:111`

- [ ] **Step 1: Add completeMilestoneSchema at end of file**

```typescript
export const completeMilestoneSchema = z.object({
  completionReport: z.string().min(1, "Completion report is required"),
});

export type CompleteMilestone = z.infer<typeof completeMilestoneSchema>;
```

- [ ] **Step 2: Commit**

```bash
git add packages/shared/src/validators/issue.ts
git commit -m "$(cat <<'EOF'
feat(shared): add completeMilestone validator

Add validation schema for milestone completion report submission.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Chunk 2: Server Services and Routes

### Task 2.1: Add Milestone Completion Service

**Files:**
- Modify: `server/src/services/issues.ts`

- [ ] **Step 1: Add completeMilestone function to issueService**

Find the return object of `issueService` function and add:

```typescript
    completeMilestone: async (
      issueId: string,
      completionReport: string,
      actor: { agentId?: string; userId?: string },
    ) => {
      const issue = await db
        .select()
        .from(issues)
        .where(eq(issues.id, issueId))
        .then((rows) => rows[0] ?? null);

      if (!issue) throw notFound("Issue not found");
      if (!issue.isMilestone) throw unprocessable("Issue is not a milestone");
      if (issue.status !== "done") throw unprocessable("Milestone must be completed first");

      const now = new Date();
      const updated = await db
        .update(issues)
        .set({
          completionReport,
          updatedAt: now,
        })
        .where(eq(issues.id, issueId))
        .returning()
        .then((rows) => rows[0]);

      return updated;
    },
```

- [ ] **Step 2: Commit**

```bash
git add server/src/services/issues.ts
git commit -m "$(cat <<'EOF'
feat(server): add milestone completion service

Add completeMilestone function to handle milestone completion reports.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2.2: Add Review Milestone Approval Handler

**Files:**
- Modify: `server/src/services/approvals.ts:98-170`

- [ ] **Step 1: Import issues table at top of file**

```typescript
import { approvalComments, approvals, issues } from "@paperclipai/db";
```

- [ ] **Step 2: Add review_milestone handling in approve function**

After the `hire_agent` block (around line 148), add:

```typescript
      // Handle review_milestone approval - keep task as done
      // (no additional action needed, task already done)
```

- [ ] **Step 3: Add review_milestone handling in reject function**

After the `hire_agent` block (around line 166), add:

```typescript
      // Handle review_milestone rejection - revert task to in_progress
      if (applied && updated.type === "review_milestone") {
        const payload = updated.payload as Record<string, unknown>;
        const milestoneId = typeof payload.milestoneId === "string" ? payload.milestoneId : null;
        if (milestoneId) {
          await db
            .update(issues)
            .set({
              status: "in_progress",
              completedAt: null,
              reviewApprovalId: null,
              updatedAt: new Date(),
            })
            .where(eq(issues.id, milestoneId));
        }
      }
```

Also add `issues` to imports and `eq` to drizzle-orm imports.

- [ ] **Step 4: Commit**

```bash
git add server/src/services/approvals.ts
git commit -m "$(cat <<'EOF'
feat(server): handle review_milestone approval outcomes

On approval: milestone task remains done.
On rejection: milestone task reverts to in_progress status.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2.3: Add Complete Milestone Route

**Files:**
- Modify: `server/src/routes/issues.ts`

- [ ] **Step 1: Import completeMilestoneSchema**

Add to the imports from `@paperclipai/shared`:

```typescript
  completeMilestoneSchema,
```

- [ ] **Step 2: Import approvalService**

Add to the service imports:

```typescript
  approvalService,
```

- [ ] **Step 3: Add complete-milestone route**

Find a good location (after the release route, around line 180) and add:

```typescript
  router.post("/issues/:id/complete-milestone", validate(completeMilestoneSchema), async (req, res) => {
    const id = req.params.id as string;
    const issue = await svc.getById(id);
    if (!issue) {
      res.status(404).json({ error: "Issue not found" });
      return;
    }
    assertCompanyAccess(req, issue.companyId);

    const actor = getActorInfo(req);
    const updated = await svc.completeMilestone(id, req.body.completionReport, {
      agentId: actor.agentId,
      userId: actor.actorType === "user" ? actor.actorId : undefined,
    });

    // Create approval for milestone review
    const approvalsSvc = approvalService(db);
    const approval = await approvalsSvc.create(issue.companyId, {
      type: "review_milestone",
      payload: {
        milestoneId: issue.id,
        milestoneTitle: issue.title,
        goalId: issue.goalId,
        goalTitle: issue.goal?.title ?? null,
        completedByAgentId: issue.assigneeAgentId,
        completionReport: req.body.completionReport,
        reviewSummary: null,
      },
      status: "pending",
      requestedByAgentId: actor.agentId ?? null,
      requestedByUserId: actor.actorType === "user" ? actor.actorId : null,
      decisionNote: null,
      decidedByUserId: null,
      decidedAt: null,
      updatedAt: new Date(),
    });

    // Update issue with approval reference
    await svc.update(id, { reviewApprovalId: approval.id });

    await logActivity(db, {
      companyId: issue.companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      action: "milestone.completed",
      entityType: "issue",
      entityId: issue.id,
      details: { approvalId: approval.id, completionReport: req.body.completionReport },
    });

    res.json({ ...updated, approval });
  });
```

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/issues.ts
git commit -m "$(cat <<'EOF'
feat(server): add complete-milestone endpoint

POST /issues/:id/complete-milestone accepts completion report,
creates review_milestone approval, and links approval to issue.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2.4: Add Milestone List Filter

**Files:**
- Modify: `server/src/services/issues.ts:59-69`

- [ ] **Step 1: Add isMilestone to IssueFilters interface**

Add to the interface:

```typescript
  isMilestone?: boolean;
```

- [ ] **Step 2: Add milestone filter to list function**

Find the list function and add condition:

```typescript
    if (filters?.isMilestone !== undefined) {
      conditions.push(eq(issues.isMilestone, filters.isMilestone ? 1 : 0));
    }
```

- [ ] **Step 3: Commit**

```bash
git add server/src/services/issues.ts
git commit -m "$(cat <<'EOF'
feat(server): add isMilestone filter to issue list

Allow filtering issues by milestone status.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2.5: Add Milestone Filter to Route

**Files:**
- Modify: `server/src/routes/issues.ts` (issues list endpoint)

- [ ] **Step 1: Add isMilestone query param handling**

Find the GET `/companies/:companyId/issues` route and add:

```typescript
    const isMilestone = req.query.isMilestone as string | undefined;
    // ... in filters object:
      isMilestone: isMilestone === "true" ? true : isMilestone === "false" ? false : undefined,
```

- [ ] **Step 2: Commit**

```bash
git add server/src/routes/issues.ts
git commit -m "$(cat <<'EOF'
feat(server): support isMilestone query param in issue list

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Chunk 3: UI Components

### Task 3.1: Add Milestone API Methods

**Files:**
- Modify: `ui/src/api/issues.ts`

- [ ] **Step 1: Add completeMilestone and listMilestones methods**

Add to the `issuesApi` object:

```typescript
  listMilestones: (companyId: string, goalId: string) =>
    api.get<Issue[]>(`/companies/${companyId}/issues?goalId=${goalId}&isMilestone=true`),
  completeMilestone: (issueId: string, completionReport: string) =>
    api.post<Issue & { approval: Approval }>(`/issues/${issueId}/complete-milestone`, {
      completionReport,
    }),
```

- [ ] **Step 2: Commit**

```bash
git add ui/src/api/issues.ts
git commit -m "$(cat <<'EOF'
feat(ui): add milestone API methods

Add listMilestones and completeMilestone API methods.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3.2: Create MilestoneList Component

**Files:**
- Create: `ui/src/components/MilestoneList.tsx`

- [ ] **Step 1: Create MilestoneList component**

```typescript
import { useQuery } from "@tanstack/react-query";
import { issuesApi } from "../api/issues";
import { queryKeys } from "../lib/queryKeys";
import { EntityRow } from "./EntityRow";
import { StatusBadge } from "./StatusBadge";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, XCircle, AlertCircle } from "lucide-react";
import type { Issue } from "@paperclipai/shared";

interface MilestoneListProps {
  companyId: string;
  goalId: string;
  onEdit?: (milestone: Issue) => void;
}

function getMilestoneReviewStatus(milestone: Issue): "pending" | "approved" | "rejected" | "none" {
  if (!milestone.reviewApprovalId) {
    if (milestone.status === "done") return "none";
    return "none";
  }
  // We'd need to fetch approval status, but for now infer from task status
  if (milestone.status === "done" && milestone.completionReport) return "pending";
  if (milestone.status === "done") return "approved";
  if (milestone.status === "in_progress" && milestone.completionReport) return "rejected";
  return "none";
}

function ReviewStatusBadge({ status }: { status: ReturnType<typeof getMilestoneReviewStatus> }) {
  switch (status) {
    case "pending":
      return (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
          <Clock className="h-3 w-3 mr-1" />
          Pending Review
        </Badge>
      );
    case "approved":
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Approved
        </Badge>
      );
    case "rejected":
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          <XCircle className="h-3 w-3 mr-1" />
          Rejected
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
          <AlertCircle className="h-3 w-3 mr-1" />
          Not Completed
        </Badge>
      );
  }
}

export function MilestoneList({ companyId, goalId, onEdit }: MilestoneListProps) {
  const { data: milestones, isLoading } = useQuery({
    queryKey: queryKeys.issues.milestones(companyId, goalId),
    queryFn: () => issuesApi.listMilestones(companyId, goalId),
    enabled: !!companyId && !!goalId,
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading milestones...</p>;
  }

  if (!milestones || milestones.length === 0) {
    return <p className="text-sm text-muted-foreground">No milestones defined.</p>;
  }

  return (
    <div className="border border-border">
      {milestones.map((milestone) => {
        const reviewStatus = getMilestoneReviewStatus(milestone);
        return (
          <EntityRow
            key={milestone.id}
            title={milestone.title}
            subtitle={milestone.description ?? undefined}
            to={`/issues/${milestone.id}`}
            trailing={
              <div className="flex items-center gap-2">
                <StatusBadge status={milestone.status} />
                <ReviewStatusBadge status={reviewStatus} />
              </div>
            }
          />
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add ui/src/components/MilestoneList.tsx
git commit -m "$(cat <<'EOF'
feat(ui): create MilestoneList component

Display milestones with review status badges.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3.3: Add milestones query key

**Files:**
- Modify: `ui/src/lib/queryKeys.ts`

- [ ] **Step 1: Add milestones method to issues query keys**

Find the issues section and add:

```typescript
    milestones: (companyId: string, goalId: string) => [...issuesKeys.all, companyId, "milestones", goalId] as const,
```

- [ ] **Step 2: Commit**

```bash
git add ui/src/lib/queryKeys.ts
git commit -m "$(cat <<'EOF'
feat(ui): add milestones query key

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3.4: Create NewMilestoneDialog Component

**Files:**
- Create: `ui/src/components/NewMilestoneDialog.tsx`

- [ ] **Step 1: Create NewMilestoneDialog component**

```typescript
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { issuesApi } from "../api/issues";
import { agentsApi } from "../api/agents";
import { queryKeys } from "../lib/queryKeys";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface NewMilestoneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  goalId: string;
}

export function NewMilestoneDialog({ open, onOpenChange, companyId, goalId }: NewMilestoneDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeAgentId, setAssigneeAgentId] = useState("");
  const [reviewerType, setReviewerType] = useState<"agent" | "user">("user");
  const [reviewerAgentId, setReviewerAgentId] = useState("");
  const [reviewerUserId, setReviewerUserId] = useState("");

  const queryClient = useQueryClient();

  const { data: agents } = useQuery({
    queryKey: queryKeys.agents.list(companyId),
    queryFn: () => agentsApi.list(companyId),
    enabled: !!companyId && open,
  });

  const createMilestone = useMutation({
    mutationFn: () =>
      issuesApi.create(companyId, {
        title,
        description: description || null,
        goalId,
        isMilestone: true,
        assigneeAgentId: assigneeAgentId || null,
        reviewerAgentId: reviewerType === "agent" ? reviewerAgentId : null,
        reviewerUserId: reviewerType === "user" ? reviewerUserId : null,
        status: "backlog",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.milestones(companyId, goalId) });
      onOpenChange(false);
      resetForm();
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setAssigneeAgentId("");
    setReviewerType("user");
    setReviewerAgentId("");
    setReviewerUserId("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !assigneeAgentId) return;
    createMilestone.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Milestone</DialogTitle>
            <DialogDescription>
              Define a review checkpoint for this goal.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Milestone title"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this milestone..."
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="assignee">Responsible Agent *</Label>
              <Select value={assigneeAgentId} onValueChange={setAssigneeAgentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents?.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Reviewer Type</Label>
              <Select value={reviewerType} onValueChange={(v) => setReviewerType(v as "agent" | "user")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {reviewerType === "agent" ? (
              <div className="grid gap-2">
                <Label htmlFor="reviewerAgent">Reviewer Agent</Label>
                <Select value={reviewerAgentId} onValueChange={setReviewerAgentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select reviewer agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents?.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="grid gap-2">
                <Label htmlFor="reviewerUser">Reviewer User ID</Label>
                <Input
                  id="reviewerUser"
                  value={reviewerUserId}
                  onChange={(e) => setReviewerUserId(e.target.value)}
                  placeholder="User ID (for now)"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || !assigneeAgentId || createMilestone.isPending}>
              {createMilestone.isPending ? "Creating..." : "Create Milestone"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add ui/src/components/NewMilestoneDialog.tsx
git commit -m "$(cat <<'EOF'
feat(ui): create NewMilestoneDialog component

Dialog for creating milestones with title, description,
assignee, and reviewer selection.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3.5: Create CompletionReportDialog Component

**Files:**
- Create: `ui/src/components/CompletionReportDialog.tsx`

- [ ] **Step 1: Create CompletionReportDialog component**

```typescript
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { issuesApi } from "../api/issues";
import { queryKeys } from "../lib/queryKeys";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface CompletionReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  goalId: string;
  milestoneId: string;
  milestoneTitle: string;
}

export function CompletionReportDialog({
  open,
  onOpenChange,
  companyId,
  goalId,
  milestoneId,
  milestoneTitle,
}: CompletionReportDialogProps) {
  const [completionReport, setCompletionReport] = useState("");

  const queryClient = useQueryClient();

  const completeMilestone = useMutation({
    mutationFn: () => issuesApi.completeMilestone(milestoneId, completionReport),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.milestones(companyId, goalId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.detail(milestoneId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.list(companyId) });
      onOpenChange(false);
      setCompletionReport("");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!completionReport.trim()) return;
    completeMilestone.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Complete Milestone</DialogTitle>
            <DialogDescription>
              Submit a completion report for "{milestoneTitle}".
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="report">Completion Report *</Label>
              <Textarea
                id="report"
                value={completionReport}
                onChange={(e) => setCompletionReport(e.target.value)}
                placeholder="Describe what was accomplished..."
                rows={6}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!completionReport.trim() || completeMilestone.isPending}>
              {completeMilestone.isPending ? "Submitting..." : "Submit for Review"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add ui/src/components/CompletionReportDialog.tsx
git commit -m "$(cat <<'EOF'
feat(ui): create CompletionReportDialog component

Dialog for submitting milestone completion reports.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3.6: Update GoalDetail Page with Milestones Tab

**Files:**
- Modify: `ui/src/pages/GoalDetail.tsx`

- [ ] **Step 1: Add imports**

Add to imports:

```typescript
import { MilestoneList } from "../components/MilestoneList";
import { NewMilestoneDialog } from "../components/NewMilestoneDialog";
import { useState } from "react";
```

- [ ] **Step 2: Add state for dialog**

Add inside the component function:

```typescript
  const [newMilestoneOpen, setNewMilestoneOpen] = useState(false);
```

- [ ] **Step 3: Add Milestones tab trigger and content**

Find the Tabs component and add after the Projects tab trigger:

```typescript
          <TabsTrigger value="milestones">
            Milestones
          </TabsTrigger>
```

And add after the Projects TabsContent:

```typescript
        <TabsContent value="milestones" className="mt-4 space-y-3">
          <div className="flex items-center justify-start">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setNewMilestoneOpen(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Milestone
            </Button>
          </div>
          <MilestoneList companyId={resolvedCompanyId!} goalId={goalId!} />
          <NewMilestoneDialog
            open={newMilestoneOpen}
            onOpenChange={setNewMilestoneOpen}
            companyId={resolvedCompanyId!}
            goalId={goalId!}
          />
        </TabsContent>
```

- [ ] **Step 4: Commit**

```bash
git add ui/src/pages/GoalDetail.tsx
git commit -m "$(cat <<'EOF'
feat(ui): add Milestones tab to GoalDetail page

Display milestones and allow creating new ones.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3.7: Add Review Milestone Approval Payload Renderer

**Files:**
- Modify: `ui/src/components/ApprovalPayload.tsx`

- [ ] **Step 1: Add type label and icon**

Update the `typeLabel` object:

```typescript
export const typeLabel: Record<string, string> = {
  hire_agent: "Hire Agent",
  approve_ceo_strategy: "CEO Strategy",
  review_milestone: "Milestone Review",
};
```

Update the `typeIcon` object:

```typescript
export const typeIcon: Record<string, typeof UserPlus> = {
  hire_agent: UserPlus,
  approve_ceo_strategy: Lightbulb,
  review_milestone: ShieldCheck,
};
```

- [ ] **Step 2: Add MilestoneReviewPayload component**

Add after `CeoStrategyPayload`:

```typescript
export function MilestoneReviewPayload({ payload }: { payload: Record<string, unknown> }) {
  return (
    <div className="mt-3 space-y-1.5 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground w-24 shrink-0 text-xs">Milestone</span>
        <span className="font-medium">{String(payload.milestoneTitle ?? "—")}</span>
      </div>
      {payload.goalTitle && (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground w-24 shrink-0 text-xs">Goal</span>
          <span>{String(payload.goalTitle)}</span>
        </div>
      )}
      {payload.completionReport && (
        <div className="mt-2">
          <span className="text-muted-foreground text-xs">Completion Report</span>
          <div className="mt-1 rounded-md bg-muted/40 px-3 py-2 text-sm text-muted-foreground whitespace-pre-wrap font-mono text-xs max-h-48 overflow-y-auto">
            {String(payload.completionReport)}
          </div>
        </div>
      )}
      {payload.reviewSummary && (
        <div className="mt-2">
          <span className="text-muted-foreground text-xs">Review Summary</span>
          <div className="mt-1 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-900 whitespace-pre-wrap max-h-32 overflow-y-auto">
            {String(payload.reviewSummary)}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Update ApprovalPayloadRenderer**

Update the renderer function:

```typescript
export function ApprovalPayloadRenderer({ type, payload }: { type: string; payload: Record<string, unknown> }) {
  if (type === "hire_agent") return <HireAgentPayload payload={payload} />;
  if (type === "review_milestone") return <MilestoneReviewPayload payload={payload} />;
  return <CeoStrategyPayload payload={payload} />;
}
```

- [ ] **Step 4: Commit**

```bash
git add ui/src/components/ApprovalPayload.tsx
git commit -m "$(cat <<'EOF'
feat(ui): add review_milestone approval payload renderer

Display milestone information, completion report, and review summary.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3.8: Create AgentChatDrawer Component

**Files:**
- Create: `ui/src/components/AgentChatDrawer.tsx`

- [ ] **Step 1: Create AgentChatDrawer component**

```typescript
import { useState, useEffect, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AgentChatDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId: string;
  agentName: string;
  milestoneId: string;
  milestoneTitle: string;
  onEndSession?: (summary: string) => void;
}

export function AgentChatDrawer({
  open,
  onOpenChange,
  agentId,
  agentName,
  milestoneId,
  milestoneTitle,
  onEndSession,
}: AgentChatDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // TODO: Implement actual WebSocket connection to agent
    // For now, simulate response after delay
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `[${agentName}] I received your message about "${milestoneTitle}". This is a placeholder response - WebSocket integration needed.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1000);
  };

  const handleEndSession = async () => {
    setIsEnding(true);
    // TODO: Call API to end session and get summary
    setTimeout(() => {
      const summary = "Placeholder summary of conversation about milestone review.";
      onEndSession?.(summary);
      setIsEnding(false);
      onOpenChange(false);
    }, 1000);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg w-full flex flex-col">
        <SheetHeader>
          <SheetTitle>Chat with {agentName}</SheetTitle>
          <SheetDescription>
            Discussing milestone: {milestoneTitle}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6" ref={scrollRef}>
          <div className="space-y-4 py-4">
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Start a conversation with {agentName} about this milestone.
              </p>
            )}
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-3 py-2 text-sm flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Thinking...
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t pt-4 space-y-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              disabled={isLoading}
            />
            <Button type="submit" size="icon" disabled={!input.trim() || isLoading}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleEndSession}
            disabled={isEnding || messages.length === 0}
          >
            {isEnding ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating Summary...
              </>
            ) : (
              "End Conversation & Generate Summary"
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add ui/src/components/AgentChatDrawer.tsx
git commit -m "$(cat <<'EOF'
feat(ui): create AgentChatDrawer component

Side drawer for real-time agent chat during milestone review.
Includes placeholder for WebSocket integration.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Chunk 4: Integration and Testing

### Task 4.1: Add approvals query key

**Files:**
- Modify: `ui/src/lib/queryKeys.ts`

- [ ] **Step 1: Add approvals query keys**

```typescript
export const approvalsKeys = {
  all: ["approvals"] as const,
  list: (companyId: string, status?: string) =>
    [...approvalsKeys.all, companyId, status ?? "all"] as const,
  detail: (id: string) => [...approvalsKeys.all, id] as const,
};
```

- [ ] **Step 2: Commit**

```bash
git add ui/src/lib/queryKeys.ts
git commit -m "$(cat <<'EOF'
feat(ui): add approvals query keys

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4.2: Update shared exports

**Files:**
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Export new validators**

Add to exports:

```typescript
export { completeMilestoneSchema, type CompleteMilestone } from "./validators/issue.js";
```

- [ ] **Step 2: Commit**

```bash
git add packages/shared/src/index.ts
git commit -m "$(cat <<'EOF'
feat(shared): export completeMilestone validator

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4.3: Manual Integration Test

- [ ] **Step 1: Build the project**

Run: `pnpm build`
Expected: No build errors

- [ ] **Step 2: Run development server**

Run: `pnpm dev`
Expected: Server starts without errors

- [ ] **Step 3: Test milestone creation flow**

1. Navigate to a goal detail page
2. Click on "Milestones" tab
3. Click "Add Milestone"
4. Fill in the form and submit
5. Verify milestone appears in list

- [ ] **Step 4: Test milestone completion flow**

1. Navigate to a milestone issue
2. Mark as done (via normal issue flow)
3. Submit completion report
4. Verify approval is created
5. Navigate to approvals page
6. Verify review_milestone approval appears

- [ ] **Step 5: Test approval resolution**

1. Approve the milestone review
2. Verify task remains done
3. Reject another milestone review
4. Verify task reverts to in_progress

---

### Task 4.4: Final Commit

- [ ] **Step 1: Commit any remaining changes**

```bash
git status
git add -A
git commit -m "$(cat <<'EOF'
feat: complete milestone review implementation

- Add milestone fields to issues table
- Add review_milestone approval type
- Create UI components for milestone management
- Add milestone completion workflow
- Add agent chat drawer placeholder

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Summary

This plan implements the milestone review feature with:

1. **Database changes**: Extended issues table with milestone-specific fields
2. **Shared types**: Added validators and types for milestones
3. **Server services**: Added milestone completion and approval handling
4. **UI components**:
   - `MilestoneList` - Display milestones with status badges
   - `NewMilestoneDialog` - Create new milestones
   - `CompletionReportDialog` - Submit completion reports
   - `AgentChatDrawer` - Chat with agents (placeholder for WebSocket)
   - Updated `ApprovalPayload` for review_milestone type
   - Updated `GoalDetail` with Milestones tab

**Note**: The agent chat WebSocket integration is structured as a placeholder. Full implementation would require:
- Extending the WebSocket server for agent chat sessions
- Integrating with the agent heartbeat/invocation system
- Adding session management for chat continuity
