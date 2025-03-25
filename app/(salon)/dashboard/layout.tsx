import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { Sidebar } from "@/components/common";
import "../../globals.css";

export const metadata: Metadata = {
  title: "Bcker/ブッカー - Dashboard",
  description: "Bcker/ブッカーはサロンの予約管理を便利にするサービスです。",
  icons: {
    icon: "/convex.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const { userId } = await auth();
  
  if (!userId) {
    return redirect("/sign-in");
  }

  const preloadedSalon = await preloadQuery(api.salon.core.getClerkId, { clerkId: userId });

  return (
        <Sidebar preloadedSalon={preloadedSalon}>
          {children}
        </Sidebar>
  );
}
