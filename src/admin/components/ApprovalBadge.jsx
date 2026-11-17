import { Icon } from './Icon';
import { Badge } from './ui/Badge';

export function ApprovalBadge({ s }) {
  const norm = (s || '').toLowerCase().replace(/[\s_]+/g, '');
  if (norm === 'pending') return <Badge tone="black">Pending</Badge>;
  if (norm === 'approved')
    return (
      <Badge tone="solid">
        <Icon n="CheckCircle2" size={11} />
        Approved
      </Badge>
    );
  if (norm === 'rejected') return <Badge tone="outline">Rejected</Badge>;
  return <Badge tone="green">Under Review</Badge>;
}
