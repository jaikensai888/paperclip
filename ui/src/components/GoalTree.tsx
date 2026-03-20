import type { Goal } from "@paperclipai/shared";
import { GOAL_STATUSES } from "@paperclipai/shared";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@/lib/router";
import { StatusBadge } from "./StatusBadge";
import { ChevronRight } from "lucide-react";
import { cn } from "../lib/utils";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

interface GoalTreeProps {
  goals: Goal[];
  goalLink?: (goal: Goal) => string;
  onSelect?: (goal: Goal) => void;
  onStatusChange?: (goal: Goal, status: string) => void;
}

interface GoalNodeProps {
  goal: Goal;
  children: Goal[];
  allGoals: Goal[];
  depth: number;
  goalLink?: (goal: Goal) => string;
  onSelect?: (goal: Goal) => void;
  onStatusChange?: (goal: Goal, status: string) => void;
}

function label(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function StatusPicker({
  current,
  onChange,
}: {
  current: string;
  onChange: (status: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <span className="cursor-pointer hover:opacity-80 transition-opacity inline-flex">
          <StatusBadge status={current} />
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-36 p-1" align="end">
        {GOAL_STATUSES.map((status) => (
          <Button
            key={status}
            variant="ghost"
            size="sm"
            className={cn("w-full justify-start text-xs", status === current && "bg-accent")}
            onClick={() => {
              onChange(status);
              setOpen(false);
            }}
          >
            {label(status)}
          </Button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function GoalNode({ goal, children, allGoals, depth, goalLink, onSelect, onStatusChange }: GoalNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const navigate = useNavigate();
  const hasChildren = children.length > 0;
  const link = goalLink?.(goal);

  const handleRowClick = () => {
    if (link) {
      navigate(link);
    } else {
      onSelect?.(goal);
    }
  };

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 text-sm transition-colors cursor-pointer hover:bg-accent/50"
        )}
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
        onClick={handleRowClick}
      >
        {hasChildren ? (
          <button
            className="p-0.5"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            <ChevronRight
              className={cn("h-3 w-3 transition-transform", expanded && "rotate-90")}
            />
          </button>
        ) : (
          <span className="w-4" />
        )}
        <span className="text-xs text-muted-foreground capitalize">{goal.level}</span>
        <span className="flex-1 truncate">{goal.title}</span>
        {onStatusChange ? (
          <div onClick={(e) => e.stopPropagation()}>
            <StatusPicker
              current={goal.status}
              onChange={(status) => onStatusChange(goal, status)}
            />
          </div>
        ) : (
          <StatusBadge status={goal.status} />
        )}
      </div>
      {hasChildren && expanded && (
        <div>
          {children.map((child) => (
            <GoalNode
              key={child.id}
              goal={child}
              children={allGoals.filter((g) => g.parentId === child.id)}
              allGoals={allGoals}
              depth={depth + 1}
              goalLink={goalLink}
              onSelect={onSelect}
              onStatusChange={onStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function GoalTree({ goals, goalLink, onSelect, onStatusChange }: GoalTreeProps) {
  const { t } = useTranslation('pages');
  const goalIds = new Set(goals.map((g) => g.id));
  const roots = goals.filter((g) => !g.parentId || !goalIds.has(g.parentId));

  if (goals.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('goals.noGoals')}</p>;
  }

  return (
    <div className="border border-border py-1">
      {roots.map((goal) => (
        <GoalNode
          key={goal.id}
          goal={goal}
          children={goals.filter((g) => g.parentId === goal.id)}
          allGoals={goals}
          depth={0}
          goalLink={goalLink}
          onSelect={onSelect}
          onStatusChange={onStatusChange}
        />
      ))}
    </div>
  );
}
