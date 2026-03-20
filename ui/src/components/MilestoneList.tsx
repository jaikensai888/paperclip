import { useQuery } from "@tanstack/react-query";
import { useTranslation } from 'react-i18next';
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
}

function getMilestoneReviewStatus(milestone: Issue): "pending" | "approved" | "rejected" | "none" {
  if (!milestone.reviewApprovalId) {
    return "none";
  }
  // Infer from task status - if done with completionReport, pending review
  if (milestone.status === "done" && milestone.completionReport) return "pending";
  // If reverted to in_progress with completionReport, it was rejected
  if (milestone.status === "in_progress" && milestone.completionReport) return "rejected";
  return "none";
}

function isMilestoneBool(issue: Issue): boolean {
  return issue.isMilestone === 1;
}

function ReviewStatusBadge({ status, t }: { status: ReturnType<typeof getMilestoneReviewStatus>; t: (key: string) => string }) {
  switch (status) {
    case "pending":
      return (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
          <Clock className="h-3 w-3 mr-1" />
          {t('milestones.pendingReview')}
        </Badge>
      );
    case "approved":
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          {t('milestones.approved')}
        </Badge>
      );
    case "rejected":
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          <XCircle className="h-3 w-3 mr-1" />
          {t('milestones.rejected')}
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
          <AlertCircle className="h-3 w-3 mr-1" />
          {t('milestones.notCompleted')}
        </Badge>
      );
  }
}

export function MilestoneList({ companyId, goalId }: MilestoneListProps) {
  const { t } = useTranslation('pages');
  const { data: milestones, isLoading } = useQuery({
    queryKey: queryKeys.issues.milestones(companyId, goalId),
    queryFn: () => issuesApi.listMilestones(companyId, goalId),
    enabled: !!companyId && !!goalId,
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">{t('milestones.loading')}</p>;
  }

  if (!milestones || milestones.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('milestones.noMilestones')}</p>;
  }

  return (
    <div className="border border-border rounded-md">
      {milestones.map((milestone) => {
        const reviewStatus = getMilestoneReviewStatus(milestone);
        return (
          <EntityRow
            key={milestone.id}
            identifier={milestone.identifier ?? undefined}
            title={milestone.title}
            subtitle={milestone.description ?? undefined}
            to={`/issues/${milestone.id}`}
            trailing={
              <div className="flex items-center gap-2">
                <StatusBadge status={milestone.status} />
                <ReviewStatusBadge status={reviewStatus} t={t} />
              </div>
            }
          />
        );
      })}
    </div>
  );
}
