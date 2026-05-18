import type { FeedState } from "../types";

export function buildCombinedFeedState(selectedFeeds: FeedState[]): FeedState {
  if (selectedFeeds.length === 0) {
    return {
      status: "idle",
      message: "No layers selected.",
    };
  }

  const message = selectedFeeds.map((feed) => feed.message).join(" + ");
  const readyFeeds = selectedFeeds.filter(
    (feed): feed is Extract<FeedState, { status: "ready" }> => feed.status === "ready",
  );
  const errorFeed = selectedFeeds.find((feed) => feed.status === "error");

  if (errorFeed) {
    return {
      status: "error",
      message,
    };
  }

  if (readyFeeds.length > 0) {
    const freshestFeed = readyFeeds.reduce((latest, feed) =>
      new Date(feed.updatedAt).getTime() > new Date(latest.updatedAt).getTime()
        ? feed
        : latest,
    );

    return {
      status: "ready",
      message,
      updatedAt: freshestFeed.updatedAt,
    };
  }

  if (selectedFeeds.some((feed) => feed.status === "loading")) {
    return {
      status: "loading",
      message,
    };
  }

  return {
    status: "idle",
    message,
  };
}
