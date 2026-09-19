import { IconName } from '../shared/components/icon/icon.component';

export interface NavItem {
  label: string;
  path: string;
  icon: IconName;
  /** Shown in the phone bottom bar (space for 5 items only). */
  mobile: boolean;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: 'home', mobile: true },
  { label: 'Income', path: '/income', icon: 'income', mobile: true },
  { label: 'Expenses', path: '/expenses', icon: 'expense', mobile: true },
  { label: 'History', path: '/transactions', icon: 'list', mobile: false },
  { label: 'Reports', path: '/reports', icon: 'report', mobile: true },
  { label: 'Settings', path: '/settings', icon: 'settings', mobile: true },
];
