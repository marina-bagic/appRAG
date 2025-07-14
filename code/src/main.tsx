// import { StrictMode } from 'react' // Enables additional checks/warnings in development
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { SelectedPapersProvider } from "./context/SelectedPapersContext.tsx";
import { SearchResultsProvider } from './context/SearchResultContext.tsx';
import { AuthProvider } from "./context/AuthContext";
import { PapersProvider } from "./context/PapersContext";

createRoot(document.getElementById('root')!).render(
  <AuthProvider>
    <SelectedPapersProvider>
      <SearchResultsProvider>
        <PapersProvider>
          <App />
        </PapersProvider>
      </SearchResultsProvider>
    </SelectedPapersProvider>
  </AuthProvider>
)