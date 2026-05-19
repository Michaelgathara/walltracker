import { NextResponse } from "next/server";
import { getAnimalTrackerCatalog } from "@/lib/animals/catalog";

export async function GET() {
  return NextResponse.json(getAnimalTrackerCatalog(), {
    headers: {
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
