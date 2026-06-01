// File: apps/admin/src/app/(authed)/events/[id]/edit/page.tsx
'use client';
import { useParams } from 'next/navigation';
import { useAdminEvent } from '@/hooks/use-events';
import { EventForm } from '@/components/event-form';

export default function EditEventPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useAdminEvent(id);

  if (isLoading || !data) return <div className="p-8 text-muted-foreground">Loading…</div>;

  return (
    <EventForm
      initial={{
        id: data.id,
        name: data.name,
        venue: data.venue,
        eventDate: data.eventDate,
        status: data.status,
      }}
    />
  );
}
