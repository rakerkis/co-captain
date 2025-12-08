// Consistent color palette for courses
export const COURSE_COLORS = [
  { name: "Rose", class: "bg-rose-500" },
  { name: "Orange", class: "bg-orange-500" },
  { name: "Amber", class: "bg-amber-500" },
  { name: "Emerald", class: "bg-emerald-500" },
  { name: "Teal", class: "bg-teal-500" },
  { name: "Cyan", class: "bg-cyan-500" },
  { name: "Blue", class: "bg-blue-500" },
  { name: "Indigo", class: "bg-indigo-500" },
  { name: "Violet", class: "bg-violet-500" },
  { name: "Purple", class: "bg-purple-500" },
  { name: "Pink", class: "bg-pink-500" },
  { name: "Lime", class: "bg-lime-500" },
];

const STORAGE_KEY = "course-custom-colors";

// Get custom colors from localStorage
const getCustomColors = (): Record<string, string> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

// Save custom color to localStorage
export const setCustomCourseColor = (courseId: string | number, colorClass: string): void => {
  const customColors = getCustomColors();
  customColors[String(courseId)] = colorClass;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(customColors));
  // Clear cache to force refresh
  courseColorCache.delete(String(courseId));
};

// Get custom color for a course
export const getCustomCourseColor = (courseId: string | number): string | null => {
  const customColors = getCustomColors();
  return customColors[String(courseId)] || null;
};

// Cache course color assignments
const courseColorCache = new Map<string, string>();

export const getCourseColor = (courseId: string | number): string => {
  const key = String(courseId);
  
  // Check for custom color first
  const customColor = getCustomCourseColor(courseId);
  if (customColor) {
    return customColor;
  }
  
  if (courseColorCache.has(key)) {
    return courseColorCache.get(key)!;
  }
  
  // Use consistent hash based on course ID
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  const colorIndex = Math.abs(hash) % COURSE_COLORS.length;
  const color = COURSE_COLORS[colorIndex].class;
  courseColorCache.set(key, color);
  
  return color;
};

// Get just the color name without "bg-" prefix for flexible usage
export const getCourseColorName = (courseId: string | number): string => {
  return getCourseColor(courseId).replace("bg-", "");
};
