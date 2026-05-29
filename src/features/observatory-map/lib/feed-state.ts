import type { FeedState } from "../types";

export function buildCombinedFeedState(selectedFeeds: FeedState[]): FeedState {
  if (selectedFeeds.length === 0) {
    return {
      status: "idle",
      label: "Feed",
      count: 0,
      message: "No layers selected.",
    };
  }

  const message = selectedFeeds
    .map((feed) => `${feed.count} ${feed.label}`)
    .join("\n");
  const readyFeeds = selectedFeeds.filter(
    (feed): feed is Extract<FeedState, { status: "ready" }> => feed.status === "ready",
  );
  const errorFeed = selectedFeeds.find((feed) => feed.status === "error");

  if (errorFeed) {
    return {
      status: "error",
      label: "Feed",
      count: selectedFeeds.reduce((sum, feed) => sum + feed.count, 0),
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
      label: "Feed",
      count: selectedFeeds.reduce((sum, feed) => sum + feed.count, 0),
      message,
      updatedAt: freshestFeed.updatedAt,
    };
  }

  if (selectedFeeds.some((feed) => feed.status === "loading")) {
    return {
      status: "loading",
      label: "Feed",
      count: selectedFeeds.reduce((sum, feed) => sum + feed.count, 0),
      message,
    };
  }

  return {
    status: "idle",
    label: "Feed",
    count: selectedFeeds.reduce((sum, feed) => sum + feed.count, 0),
    message,
  };
}
