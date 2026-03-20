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
import { Loader2 } from "lucide-react";

interface NewMilestoneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  goalId: string;
}

export function NewMilestoneDialog({
  open,
  onOpenChange,
  companyId,
  goalId,
}: NewMilestoneDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeAgentId, setAssigneeAgentId] = useState("");
  const [reviewerType, setReviewerType] = useState<"user" | "agent">("user");
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
            <DialogDescription>Define a review checkpoint for this goal.</DialogDescription>
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
              <Select
                value={reviewerType}
                onValueChange={(v) => setReviewerType(v as "user" | "agent")}
              >
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
            <Button
              type="submit"
              disabled={!title.trim() || !assigneeAgentId || createMilestone.isPending}
            >
              {createMilestone.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Milestone
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
