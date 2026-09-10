import { notFound } from "next/navigation";
import { TripPlanner } from "@/features/trips/components/trip-planner";
import { SAMPLE_TRIP_ID } from "@/features/trips/data/sample-trip";

type TripPageProps = { params: Promise<{ tripId: string }> };

export default async function TripPage({ params }: TripPageProps) {
  const { tripId } = await params;
  if (tripId !== SAMPLE_TRIP_ID) notFound();
  return <TripPlanner tripId={tripId} />;
}
