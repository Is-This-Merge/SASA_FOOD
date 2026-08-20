"use client";

import { useEffect } from "react";
import { prefetchCurrentMonthMeals } from "@/lib/meal-cache";

export default function MealCacheInitializer() {
  useEffect(() => {
    prefetchCurrentMonthMeals();
  }, []);

  return null;
}