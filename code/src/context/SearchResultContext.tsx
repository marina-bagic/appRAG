import React, { createContext, useContext, useState } from "react";
import type { Paper } from "../types";


type SearchResultsContextType = {
  papers: Paper[];
  setPapers: (papers: Paper[]) => void;
};

const SearchResultsContext = createContext<SearchResultsContextType | undefined>(undefined);

export const SearchResultsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [papers, setPapers] = useState<Paper[]>([]);

  return (
    <SearchResultsContext.Provider value={{ papers, setPapers }}>
      {children}
    </SearchResultsContext.Provider>
  );
};



export const useSearchResults = () => {
  const context = useContext(SearchResultsContext);
  if (!context) {
    throw new Error("useSearchResults must be used within a SearchResultsProvider");
  }
  return context;
};