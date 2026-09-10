import { redirect } from "next/navigation";
import { SAMPLE_TRIP_ID } from "@/features/trips/data/sample-trip";

export default function Home() {
  redirect(`/trips/${SAMPLE_TRIP_ID}`);
}
