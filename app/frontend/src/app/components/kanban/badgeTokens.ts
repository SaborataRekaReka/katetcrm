export const badgeBase = 'inline-flex items-center gap-1 px-1.5 h-4 rounded border text-[10px]';
export const badgeTones = {
  source:   'bg-muted/70 text-foreground/80 border-border/70',   // neutral pill
  warning:  'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-200 dark:border-red-500/40',      // problems: conflict, urgent
  caution:  'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:border-amber-500/40',// missing data, undecided, stale
  progress: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-200 dark:border-blue-500/40',   // in-progress neutral state
  success:  'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:border-emerald-500/40', // ready/done
  muted:    'bg-muted text-muted-foreground border-border/70',  // secondary info
};
