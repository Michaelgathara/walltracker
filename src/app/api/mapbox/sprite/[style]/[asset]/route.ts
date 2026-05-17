import { NextResponse } from "next/server";
import { getMapboxToken, parseMapboxStyle } from "@/lib/mapbox";

const assetPattern = /^sprite(@2x)?\.(json|png)$/;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ style: string; asset: string }> },
) {
  const { style, asset } = await params;

  if (!assetPattern.test(asset)) {
    return NextResponse.json({ error: "Invalid sprite asset." }, { status: 400 });
  }

  const token = getMapboxToken();
  const styleId = parseMapboxStyle(style);
  const response = await fetch(
    `https://api.mapbox.com/styles/v1/mapbox/${styleId}/${asset}?access_token=${token}`,
  );

  if (!response.ok) {
    return NextResponse.json(
      { error: "Mapbox sprite is unavailable." },
      { status: 502 },
    );
  }

  if (asset.endsWith(".json")) {
    return NextResponse.json(await response.json(), {
      headers: { "Cache-Control": "private, max-age=86400" },
    });
  }

  return new NextResponse(await response.arrayBuffer(), {
    headers: {
      "Cache-Control": "private, max-age=86400",
      "Content-Type": "image/png",
    },
  });
}
