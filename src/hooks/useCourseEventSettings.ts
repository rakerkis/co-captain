import { useState, useEffect } from "react";

export const useCourseEventSettings = () => {
  const [courseEventIds, setCourseEventIds] = useState<number[]>(() => {
    const stored = localStorage.getItem("course-treat-as-events");
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    localStorage.setItem("course-treat-as-events", JSON.stringify(courseEventIds));
  }, [courseEventIds]);

  const toggleCourseTreatAsEvent = (courseId: number) => {
    setCourseEventIds((prev) =>
      prev.includes(courseId)
        ? prev.filter((id) => id !== courseId)
        : [...prev, courseId]
    );
  };

  const isCourseTreatedAsEvent = (courseId: number) => {
    return courseEventIds.includes(courseId);
  };

  return { courseEventIds, toggleCourseTreatAsEvent, isCourseTreatedAsEvent };
};
