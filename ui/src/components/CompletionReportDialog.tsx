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
import { Loader2 } from "lucide-react";

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
              Submit a completion report for &quot;{milestoneTitle}&quot;.
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
            <Button
              type="submit"
              disabled={!completionReport.trim() || completeMilestone.isPending}
            >
              {completeMilestone.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit for Review
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
