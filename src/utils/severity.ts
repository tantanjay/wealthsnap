import { Ionicons } from '@expo/vector-icons';

export type Severity = 'error' | 'warning' | 'success' | 'info';

// One icon per severity, reused everywhere a dialog/notice needs to signal state.
export const SEVERITY_ICON: Record<Severity, React.ComponentProps<typeof Ionicons>['name']> = {
    error: 'close-circle',
    warning: 'warning',
    success: 'checkmark-circle',
    info: 'information-circle',
};

// colors.error/warning/success/info match the Severity union exactly.
export function getSeverityColor(colors: Record<Severity, string>, severity: Severity): string {
    return colors[severity];
}

export function inferSeverity(title: string, hasDestructiveButton: boolean): Severity {
    const normalized = title.trim().toLowerCase();
    if (normalized === 'error' || normalized === 'failed') return 'error';
    if (normalized === 'success' || normalized === 'complete') return 'success';
    if (normalized === 'warning') return 'warning';
    if (hasDestructiveButton) return 'warning';
    return 'info';
}
