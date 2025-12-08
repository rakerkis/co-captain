import { useState, useEffect, useCallback } from "react";

const HIDDEN_CALENDAR_KEY = "hidden-courses-calendar";
const HIDDEN_ASSIGNMENTS_KEY = "hidden-courses-assignments";

export const useHiddenCourses = () => {
  const [hiddenCalendarIds, setHiddenCalendarIds] = useState<number[]>([]);
  const [hiddenAssignmentIds, setHiddenAssignmentIds] = useState<number[]>([]);

  useEffect(() => {
    const storedCalendar = localStorage.getItem(HIDDEN_CALENDAR_KEY);
    if (storedCalendar) {
      try {
        setHiddenCalendarIds(JSON.parse(storedCalendar));
      } catch {
        setHiddenCalendarIds([]);
      }
    }

    const storedAssignments = localStorage.getItem(HIDDEN_ASSIGNMENTS_KEY);
    if (storedAssignments) {
      try {
        setHiddenAssignmentIds(JSON.parse(storedAssignments));
      } catch {
        setHiddenAssignmentIds([]);
      }
    }
  }, []);

  const toggleCalendarVisibility = useCallback((courseId: number) => {
    setHiddenCalendarIds((prev) => {
      const newHidden = prev.includes(courseId)
        ? prev.filter((id) => id !== courseId)
        : [...prev, courseId];
      localStorage.setItem(HIDDEN_CALENDAR_KEY, JSON.stringify(newHidden));
      return newHidden;
    });
  }, []);

  const toggleAssignmentsVisibility = useCallback((courseId: number) => {
    setHiddenAssignmentIds((prev) => {
      const newHidden = prev.includes(courseId)
        ? prev.filter((id) => id !== courseId)
        : [...prev, courseId];
      localStorage.setItem(HIDDEN_ASSIGNMENTS_KEY, JSON.stringify(newHidden));
      return newHidden;
    });
  }, []);

  const isCourseHiddenFromCalendar = useCallback(
    (courseId: number) => hiddenCalendarIds.includes(courseId),
    [hiddenCalendarIds]
  );

  const isCourseHiddenFromAssignments = useCallback(
    (courseId: number) => hiddenAssignmentIds.includes(courseId),
    [hiddenAssignmentIds]
  );

  return {
    hiddenCalendarIds,
    hiddenAssignmentIds,
    toggleCalendarVisibility,
    toggleAssignmentsVisibility,
    isCourseHiddenFromCalendar,
    isCourseHiddenFromAssignments,
  };
};
