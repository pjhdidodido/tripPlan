"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getTrips } from "@/features/trips/api/trip-api";

export default function Home() {
  const router = useRouter();
  const [message, setMessage] = useState("여행 목록을 불러오는 중입니다.");

  useEffect(() => {
    const controller = new AbortController();
    void getTrips(controller.signal)
      .then((trips) => router.replace(trips[0] ? `/trips/${trips[0].id}` : "/trips/empty"))
      .catch(() => setMessage("Python API를 먼저 실행해 주세요."));
    return () => controller.abort();
  }, [router]);

  return <main className="landing-state"><div className="brand-mark"><span>TW</span></div><p>{message}</p></main>;
}
