"use client";

import { createContext, ReactNode, useContext, useState } from "react";

type MealDateContextValue = {
  mealDate: string | null;
  setMealDate: (date: string) => void;
};

const MealDateContext = createContext<MealDateContextValue | null>(null);

export function MealDateProvider({ children }: { children: ReactNode }) {
  const [mealDate, setMealDate] = useState<string | null>(null);
  return <MealDateContext.Provider value={{ mealDate, setMealDate }}>{children}</MealDateContext.Provider>;
}

export function useMealDate() {
  const context = useContext(MealDateContext);
  if (!context) throw new Error("useMealDate must be used within MealDateProvider");
  return context;
}
