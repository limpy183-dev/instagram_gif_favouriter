import { useMemo } from "react";

export interface HashRoute {
  type: "public-collection" | "public-user" | "page" | "app";
  id: string;
}

export function parseHashRoute(): HashRoute {
  const hash = window.location.hash.replace(/^#/, "");
  if (hash.startsWith("/collections/")) {
    return { type: "public-collection", id: hash.replace("/collections/", "") };
  }
  if (hash.startsWith("/users/")) {
    return { type: "public-user", id: hash.replace("/users/", "") };
  }
  if (hash.startsWith("/page/")) {
    return { type: "page", id: hash.replace("/page/", "") };
  }
  if (["/discover", "/favourites", "/toolbox", "/users", "/profile"].includes(hash)) {
    return { type: "page", id: hash.replace("/", "") };
  }
  return { type: "app", id: "" };
}

export function useHashRoute(hash: string) {
  const route = useMemo(parseHashRoute, [hash]);
  return route;
}
