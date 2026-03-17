import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// shadcn utility for merging tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
