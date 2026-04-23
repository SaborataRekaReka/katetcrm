export const badgeBase = 'inline-flex items-center gap-1 px-1.5 h-4 rounded border text-[10px]';
export const badgeTones = {
  source:   'bg-gray-50 text-gray-700 border-gray-200',   // neutral pill
  warning:  'bg-red-50 text-red-700 border-red-200',      // problems: conflict, urgent
  caution:  'bg-amber-50 text-amber-800 border-amber-200',// missing data, undecided, stale
  progress: 'bg-blue-50 text-blue-700 border-blue-200',   // in-progress neutral state
  success:  'bg-emerald-50 text-emerald-700 border-emerald-200', // ready/done
  muted:    'bg-gray-100 text-gray-600 border-gray-200',  // secondary info
};
