import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
}

const VARIANT_CLASSES: Record<string, string> = {
  default: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
  success: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  warning: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  danger:  'bg-red-500/15 text-red-400 border border-red-500/30',
  info:    'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  purple:  'bg-violet-500/15 text-violet-400 border border-violet-500/30',
};

const STATUS_VARIANT_MAP: Record<string, BadgeProps['variant']> = {
  NEW: 'info', ASSIGNED: 'purple', IN_PROGRESS: 'warning',
  PENDING_STUDENT: 'danger', PENDING_INTERNAL: 'warning',
  RESOLVED: 'success', CLOSED: 'default', REOPENED: 'warning', CANCELLED: 'default',
};

const PRIORITY_VARIANT_MAP: Record<string, BadgeProps['variant']> = {
  LOW: 'default', MEDIUM: 'info', HIGH: 'warning', URGENT: 'danger',
};

export function Badge({ children, variant = 'default' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 px-[9px] py-[3px] rounded-full text-[0.72rem] font-bold uppercase tracking-[0.04em] whitespace-nowrap ${VARIANT_CLASSES[variant]}`}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge variant={STATUS_VARIANT_MAP[status] ?? 'default'}>{status.replace(/_/g, ' ')}</Badge>;
}

export function PriorityBadge({ priority }: { priority: string }) {
  return <Badge variant={PRIORITY_VARIANT_MAP[priority] ?? 'default'}>{priority}</Badge>;
}

export function SLABadge({ state }: { state: string }) {
  const map: Record<string, BadgeProps['variant']> = {
    ON_TRACK: 'success', AT_RISK: 'warning', BREACHED: 'danger',
    MET: 'success', PAUSED: 'default', NOT_APPLICABLE: 'default',
  };
  return <Badge variant={map[state] ?? 'default'}>{state.replace(/_/g, ' ')}</Badge>;
}
