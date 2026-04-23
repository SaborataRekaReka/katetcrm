import { Globe, Phone, Send, MessageCircle, User, Link as LinkIcon } from 'lucide-react';
import { SourceChannel } from '../../types/kanban';

interface SourceBadgeProps {
  source?: string;
  channel?: SourceChannel;
  size?: 'xs' | 'sm';
  className?: string;
}

function resolveChannel(source?: string, channel?: SourceChannel): SourceChannel {
  if (channel) return channel;
  const s = (source || '').toLowerCase();
  if (s.includes('сайт') || s.includes('site')) return 'site';
  if (s.includes('mango') || s.includes('манго') || s.includes('телефон')) return 'mango';
  if (s.includes('telegram') || s.includes('телеграм')) return 'telegram';
  if (s.includes('max')) return 'max';
  if (s.includes('ручн') || s.includes('manual')) return 'manual';
  return 'other';
}

// Source is secondary information — kept neutral (gray) across all channels.
// Channel is distinguished by icon only, not color, to avoid pill-noise.
const NEUTRAL_TONE = 'bg-gray-50 text-gray-600 border-gray-200';

const channelMeta: Record<SourceChannel, { label: string; icon: React.ComponentType<{ className?: string }>; tone: string }> = {
  site: { label: 'Сайт', icon: Globe, tone: NEUTRAL_TONE },
  mango: { label: 'Mango', icon: Phone, tone: NEUTRAL_TONE },
  telegram: { label: 'Telegram', icon: Send, tone: NEUTRAL_TONE },
  max: { label: 'MAX', icon: MessageCircle, tone: NEUTRAL_TONE },
  manual: { label: 'Ручной', icon: User, tone: NEUTRAL_TONE },
  other: { label: 'Источник', icon: LinkIcon, tone: NEUTRAL_TONE },
};

export function SourceBadge({ source, channel, size = 'xs', className = '' }: SourceBadgeProps) {
  const resolved = resolveChannel(source, channel);
  const meta = channelMeta[resolved];
  const Icon = meta.icon;
  const label = source && resolved === 'other' ? source : meta.label;
  const text = size === 'sm' ? 'text-[11px] h-5' : 'text-[10px] h-4';

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 rounded border ${meta.tone} ${text} ${className}`}
    >
      <Icon className="w-3 h-3 flex-shrink-0" />
      <span className="truncate">{label}</span>
    </span>
  );
}
