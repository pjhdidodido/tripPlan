import { TripPlanner } from "@/features/trips/components/trip-planner";

type TripPageProps = { params: Promise<{ tripId: string }> };

export default async function TripPage({ params }: TripPageProps) {
  const { tripId } = await params;
  return <TripPlanner tripId={tripId} />;
}
