import { CapabilityCard } from './CapabilityCard.js';
export default function Activities() {
  return <CapabilityCard
    title="Activities"
    description="Track student activity minutes and points."
    endpoint="/api/activities"
    dataKey="activities"
    emptyMessage="No activities yet."
    renderItem={(item) => `${item.type ?? 'Activity'} · ${item.minutes ?? 0} minutes · ${item.points ?? 0} points`}
  />;
}
