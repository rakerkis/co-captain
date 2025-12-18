import { useState, useEffect } from "react";

interface AssignmentTypeOverrides {
  [assignmentId: string]: "assignment" | "event";
}

export const useAssignmentTypes = () => {
  const [typeOverrides, setTypeOverrides] = useState<AssignmentTypeOverrides>(() => {
    const stored = localStorage.getItem("assignment-type-overrides");
    return stored ? JSON.parse(stored) : {};
  });

  useEffect(() => {
    localStorage.setItem("assignment-type-overrides", JSON.stringify(typeOverrides));
  }, [typeOverrides]);

  const setAssignmentType = (assignmentId: string, type: "assignment" | "event") => {
    setTypeOverrides((prev) => ({
      ...prev,
      [assignmentId]: type,
    }));
  };

  const getAssignmentType = (assignmentId: string): "assignment" | "event" | undefined => {
    return typeOverrides[assignmentId];
  };

  return { typeOverrides, setAssignmentType, getAssignmentType };
};
