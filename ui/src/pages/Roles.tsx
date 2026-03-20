import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from 'react-i18next';
import {
  AGENT_ROLES,
  AGENT_ROLE_LABELS,
  AGENT_ROLE_DESCRIPTIONS,
  AGENT_ROLE_ICONS,
  type AgentRole,
} from "@paperclipai/shared";
import { agentsApi } from "../api/agents";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { EmptyState } from "../components/EmptyState";
import { PageSkeleton } from "../components/PageSkeleton";
import {
  Crown,
  Cpu,
  Megaphone,
  DollarSign,
  Code,
  Palette,
  ClipboardList,
  Bug,
  Server,
  Search,
  Bot,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";

// Role categories for grouping
const ROLE_CATEGORIES = {
  executive: ["ceo", "cto", "cmo", "cfo"],
  functional: ["engineer", "designer", "pm", "qa", "devops", "researcher"],
  general: ["general"],
} as const;

// Icon mapping for roles
const ROLE_ICON_MAP: Record<string, LucideIcon> = {
  Crown,
  Cpu,
  Megaphone,
  DollarSign,
  Code,
  Palette,
  ClipboardList,
  Bug,
  Server,
  Search,
  Bot,
};

function getIconComponent(iconName: string): LucideIcon {
  return ROLE_ICON_MAP[iconName] || User;
}

function RoleCard({
  role,
  label,
  description,
  iconName,
  agentCount,
}: {
  role: AgentRole;
  label: string;
  description: string;
  iconName: string;
  agentCount: number;
}) {
  const IconComponent = getIconComponent(iconName);

  return (
    <div className="rounded-lg border border-border bg-card p-4 hover:border-border/80 transition-colors">
      <div className="flex items-start gap-3">
        <div className="shrink-0 rounded-md bg-muted p-2">
          <IconComponent className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-medium text-sm">{label}</h3>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {agentCount}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

export function Roles() {
  const { t } = useTranslation('pages');
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();

  useEffect(() => {
    setBreadcrumbs([{ label: t('roles.title') }]);
  }, [setBreadcrumbs, t]);

  const { data: agents, isLoading, error } = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId!),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  // Count agents by role
  const agentCountByRole = useMemo(() => {
    const counts = new Map<string, number>();
    for (const role of AGENT_ROLES) {
      counts.set(role, 0);
    }
    for (const agent of agents ?? []) {
      const current = counts.get(agent.role) ?? 0;
      counts.set(agent.role, current + 1);
    }
    return counts;
  }, [agents]);

  if (!selectedCompanyId) {
    return <EmptyState icon={Users} message={t('roles.selectCompany')} />;
  }

  if (isLoading) {
    return <PageSkeleton variant="list" />;
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-destructive">{error.message}</p>}

      {/* Executive Roles */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          {t('roles.categories.executive')}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {ROLE_CATEGORIES.executive.map((role) => (
            <RoleCard
              key={role}
              role={role}
              label={AGENT_ROLE_LABELS[role]}
              description={AGENT_ROLE_DESCRIPTIONS[role]}
              iconName={AGENT_ROLE_ICONS[role]}
              agentCount={agentCountByRole.get(role) ?? 0}
            />
          ))}
        </div>
      </div>

      {/* Functional Roles */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          {t('roles.categories.functional')}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {ROLE_CATEGORIES.functional.map((role) => (
            <RoleCard
              key={role}
              role={role}
              label={AGENT_ROLE_LABELS[role]}
              description={AGENT_ROLE_DESCRIPTIONS[role]}
              iconName={AGENT_ROLE_ICONS[role]}
              agentCount={agentCountByRole.get(role) ?? 0}
            />
          ))}
        </div>
      </div>

      {/* General Roles */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          {t('roles.categories.general')}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {ROLE_CATEGORIES.general.map((role) => (
            <RoleCard
              key={role}
              role={role}
              label={AGENT_ROLE_LABELS[role]}
              description={AGENT_ROLE_DESCRIPTIONS[role]}
              iconName={AGENT_ROLE_ICONS[role]}
              agentCount={agentCountByRole.get(role) ?? 0}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
