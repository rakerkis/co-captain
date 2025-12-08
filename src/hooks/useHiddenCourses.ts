import { useState, useEffect, useCallback } from "react";

const HIDDEN_COURSES_KEY = "hidden-courses";

export const useHiddenCourses = () => {
  const [hiddenCourseIds, setHiddenCourseIds] = useState<number[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(HIDDEN_COURSES_KEY);
    if (stored) {
      try {
        setHiddenCourseIds(JSON.parse(stored));
      } catch {
        setHiddenCourseIds([]);
      }
    }
  }, []);

  const toggleCourseVisibility = useCallback((courseId: number) => {
    setHiddenCourseIds((prev) => {
      const newHidden = prev.includes(courseId)
        ? prev.filter((id) => id !== courseId)
        : [...prev, courseId];
      localStorage.setItem(HIDDEN_COURSES_KEY, JSON.stringify(newHidden));
      return newHidden;
    });
  }, []);

  const isCourseHidden = useCallback(
    (courseId: number) => hiddenCourseIds.includes(courseId),
    [hiddenCourseIds]
  );

  return { hiddenCourseIds, toggleCourseVisibility, isCourseHidden };
};
