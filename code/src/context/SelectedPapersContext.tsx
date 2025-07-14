import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import type { Paper } from "../types";

type ContextType = {
  selectedPapers: Paper[];
  togglePaper: (paper: Paper) => void;
  clearSelection: () => void;
};

const SelectedPapersContext = createContext<ContextType | undefined>(undefined);

export const SelectedPapersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedPapers, setSelectedPapers] = useState<Paper[]>([]);
  const hasHydrated = useRef(false);

  // Hydrate from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("selectedPapers");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        console.log("✅ Hydrated from localStorage:", parsed);
        setSelectedPapers(parsed);
      } catch (e) {
        console.error("❌ Failed to parse localStorage:", e);
      }
    } else {
      console.log("ℹ️ No previous selectedPapers in localStorage");
    }
    hasHydrated.current = true;
  }, []);

  // Save to localStorage after hydration
  useEffect(() => {
    if (!hasHydrated.current) return;
    console.log("💾 Saving to localStorage:", selectedPapers);
    localStorage.setItem("selectedPapers", JSON.stringify(selectedPapers));
  }, [selectedPapers]);

  function normalizePaper(raw: any) {
    return {
      id: raw.id,
      title: raw.title || raw.original_name || "Untitled",
      summary: raw.summary || "",
    };
  }

  const togglePaper = (paper: any) => {
    const normalized = normalizePaper(paper);
    setSelectedPapers((prev) =>
      prev.some((p) => p.id === normalized.id)
        ? prev.filter((p) => p.id !== normalized.id)
        : [...prev, normalized]
    );
  };


  const clearSelection = () => setSelectedPapers([]);

  return (
    <SelectedPapersContext.Provider value={{ selectedPapers, togglePaper, clearSelection }}>
      {children}
    </SelectedPapersContext.Provider>
  );
};

export const useSelectedPapers = () => {
  const context = useContext(SelectedPapersContext);
  if (!context) {
    throw new Error("useSelectedPapers must be used within a SelectedPapersProvider");
  }
  return context;
};
