"use client";

import { useEffect } from "react";
import { prefetchNearbyMeals } from "@/lib/meal-cache";

let prefetchStarted = false;

export default function MealCacheInitializer() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (prefetchStarted) return;
    prefetchStarted = true;
    prefetchNearbyMeals();
  }, []);

  return null;
}
