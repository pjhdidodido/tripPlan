import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TripWeave — 함께 짜는 여행",
  description: "일정과 경비, 결정을 한곳에서 관리하는 협업 여행 플래너",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
