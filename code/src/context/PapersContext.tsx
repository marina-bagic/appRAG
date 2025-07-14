// context/PapersContext.tsx
import { createContext, useContext, useEffect, useState } from "react";
import type { Paper } from "../types";

const PapersContext = createContext<{
  papers: Paper[];
  loading: boolean;
}>({ papers: [], loading: true });

export const PapersProvider = ({ children }: { children: React.ReactNode }) => {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:8000/papers")
      .then((res) => res.json())
      .then((data) => {
        setPapers(data);
        setLoading(false);
      });
  }, []);

  return (
    <PapersContext.Provider value={{ papers, loading }}>
      {children}
    </PapersContext.Provider>
  );
};

export const usePapers = () => useContext(PapersContext);
