// Consistent color palette for courses
const COURSE_COLORS = [
  "bg-rose-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-teal-500",
  "bg-cyan-500",
  "bg-blue-500",
  "bg-indigo-500",
  "bg-violet-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-lime-500",
];

// Cache course color assignments
const courseColorCache = new Map<string, string>();

export const getCourseColor = (courseId: string | number): string => {
  const key = String(courseId);
  
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
  const color = COURSE_COLORS[colorIndex];
  courseColorCache.set(key, color);
  
  return color;
};

// Get just the color name without "bg-" prefix for flexible usage
export const getCourseColorName = (courseId: string | number): string => {
  return getCourseColor(courseId).replace("bg-", "");
};
