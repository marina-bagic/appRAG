import { useState, useEffect } from "react";
import PaperList from "../components/PaperList";
import type { Paper } from "../types";
import { useSearchResults } from "../context/SearchResultContext";
import { useSelectedPapers } from "../context/SelectedPapersContext";

export default function App() {
  const [query, setQuery] = useState<string>("");
  const { papers, setPapers } = useSearchResults();
  const [file, setFile] = useState<File | null>(null);
  const [uploads, setUploads] = useState<Paper[]>([]);
  const { selectedPapers, togglePaper } = useSelectedPapers();
  const [maxResults, setMaxResults] = useState(5);
  const [loadingStates, setLoadingStates] = useState<{ [key: string]: boolean }>({});
  const [summaries, setSummaries] = useState<{ [key: string]: { text: string; isVisible: boolean } }>({});
  const isLoggedIn = !!localStorage.getItem("token");

  useEffect(() => {
    const fetchUploads = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("http://localhost:8000/my-files", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          throw new Error("Failed to fetch uploads");
        }
        const data = await res.json();
        console.log("API response:", data);
        const uploadsArray = Array.isArray(data) ? data : data.files || [];
        
        // Initialize summaries state based on fetched papers
        const initialSummaries: { [key: string]: { text: string; isVisible: boolean } } = {};
        uploadsArray.forEach((paper: Paper & { summary?: string }) => {
          if (paper.summary) {
            initialSummaries[paper.id] = { text: paper.summary, isVisible: false };
          }
        });
        setSummaries(initialSummaries);
        setUploads(uploadsArray);
      } catch (error) {
        console.error("Error fetching uploads:", error);
        setUploads([]);
        setSummaries({});
      }
    };

    fetchUploads();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Query submitted:", query);

    const startTime = performance.now();

    const res = await fetch('http://localhost:8000/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, maxResults: maxResults }),
    });

    const data = await res.json();
    setPapers(data);

    const endTime = performance.now();
    const duration = endTime - startTime;

    console.log(`Search completed in ${duration.toFixed(2)} ms`);
  };


  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('http://localhost:8000/upload-file', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });
      if (!res.ok) {
        throw new Error("Failed to upload file");
      }
      // Refetch uploads to include the new paper
      const fetchRes = await fetch("http://localhost:8000/my-files", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!fetchRes.ok) {
        throw new Error("Failed to fetch uploads");
      }
      const data = await fetchRes.json();
      const uploadsArray = Array.isArray(data) ? data : data.files || [];
      const initialSummaries: { [key: string]: { text: string; isVisible: boolean } } = {};
      uploadsArray.forEach((paper: Paper & { summary?: string }) => {
        if (paper.summary) {
          initialSummaries[paper.id] = { text: paper.summary, isVisible: false };
        }
      });
      setSummaries(initialSummaries);
      setUploads(uploadsArray);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload file. Please try again.");
    }
  };

  const handleDownload = async (paper_id: string, original_name: string) => {
    try {
      const response = await fetch(`http://localhost:8000/download/${paper_id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem("token")}`,
          'Accept': 'application/pdf',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download file');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = original_name || 'download.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download file. Please try again.');
    }
  };

  // const navigate = useNavigate();
  const handleGenerateSummary = async (paperId: string) => {
    setLoadingStates((prev) => ({ ...prev, [paperId]: true }));
    try {
      const response = await fetch(`http://localhost:8000/llm/generate-summary/${paperId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate summary');
      }

    } catch (error) {
      console.error('Summary generation error:', error);
      alert('Failed to generate summary. Please try again.');
    } finally {
      setLoadingStates((prev) => ({ ...prev, [paperId]: false }));
      window.location.reload();
    }
  };

  const toggleSummaryVisibility = (paperId: string) => {
    setSummaries((prev) => ({
      ...prev,
      [paperId]: { ...prev[paperId], isVisible: !prev[paperId].isVisible },
    }));
  };

  return (
    <div className="flex p-6 gap-6">
      {/* Left Section: Search and File Upload */}
      <div className="flex-1 flex flex-col p-6 bg-white rounded-2xl shadow-lg">
        <h1 className="text-2xl text-black font-bold mb-4">
          Scientific Paper Assistant
        </h1>

        {/* Search bar */}
        <form onSubmit={handleSubmit} className="flex gap-2 items-center mb-6">
          <input
            type="text"
            placeholder="Search for the papers..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-grow p-3 rounded-xl border border-gray-300"
          />
          <select
            value={maxResults}
            onChange={(e) => setMaxResults(Number(e.target.value))}
            className="p-3 rounded-xl border border-gray-300"
          >
            {[5, 10, 25, 50, 75, 100].map((num) => (
              <option key={num} value={num}>
                Top {num}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="px-5 py-3 rounded-lg bg-gradient-to-r text-gray-200 bg-gray-900 to-bg-gray-800 px-4 py-1.5 rounded-lg hover:bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-grey-500 transition-transform transform hover:-translate-y-0.5"
          >
            Search
          </button>
        </form>

        {/* Upload area */}
        <div className="mb-6">
          <label className="cursor-pointer bg-gray-100 border border-dashed border-gray-400 p-4 rounded-xl hover:bg-gray-200 inline-block">
            <span className="text-sm text-gray-600">
              Click to upload your paper (.pdf or .txt)
            </span>
            <input
              type="file"
              accept=".pdf,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {file && (
            <p className="text-sm mt-2 text-gray-700">
              Selected: {file.name}
            </p>
          )}

          {/* Uploaded files */}
          {uploads.length > 0 && (
            <div className="mt-6">
              <h2 className="text-lg font-bold mb-4">
                My Uploaded Papers
              </h2>
              <ul className="space-y-2">
                {uploads.map((paper) => (
                  <li key={paper.id} className="border-b pb-2">
                    <div className="flex justify-between items-center">
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handleDownload(paper.id, paper.original_name);
                        }}
                        rel="noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {paper.original_name}
                      </a>
                      <div className="flex items-center gap-2">
                        {loadingStates[paper.id] ? (
                          <div className="flex items-center gap-2">
                            <svg
                              className="animate-spin h-5 w-5 text-purple-600"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            <span className="text-sm text-gray-600">Generating...</span>
                          </div>
                        ) : summaries[paper.id] ? (
                          <button
                            onClick={() => toggleSummaryVisibility(paper.id)}
                            className="px-3 py-1 text-sm rounded-lg font-semibold bg-gradient-to-r from-purple-500 to-purple-600 text-gray-100 hover:from-purple-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-transform transform hover:-translate-y-0.5"
                          >
                            {summaries[paper.id].isVisible ? "Hide Summary" : "Show Summary"}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleGenerateSummary(paper.id)}
                            disabled={!isLoggedIn}
                            className={`px-3 py-1 text-sm rounded-lg font-semibold ${
                              isLoggedIn
                                ? "bg-gradient-to-r from-purple-500 to-purple-600 text-gray-100 hover:from-purple-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-transform transform hover:-translate-y-0.5"
                                : "bg-gray-900 text-gray-200 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                            }`}
                          >
                            Generate Summary
                          </button>
                        )}
                        <button
                          onClick={() => togglePaper(paper)}
                          className={`px-3 py-1 text-sm rounded-lg font-semibold ${
                            selectedPapers.some((p) => p.id === paper.id)
                              ? "bg-gradient-to-r from-purple-800 to-purple-900 text-gray-200 scale-95 hover:from-purple-800 hover:to-purple-900 focus:outline-none focus:ring-2 focus:ring-purple-800 transition-transform transform hover:-translate-y-0.5"
                              : "bg-gradient-to-r from-purple-500 to-purple-600 text-gray-100 hover:from-purple-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-transform transform"
                          }`}
                        >
                          {selectedPapers.some((p) => p.id === paper.id) ? "Selected" : "Select"}
                        </button>
                      </div>
                    </div>
                    {summaries[paper.id]?.isVisible && (
                      <div className="mt-2 p-3 bg-gray-100 rounded-lg text-sm text-gray-700">
                        {summaries[paper.id].text}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Right Section: Suggested Papers List */}
      <div className="flex-1 p-6 bg-gray-50 rounded-2xl shadow-lg">
        <h2 className="text-lg font-semibold mb-4">
          Suggested Papers
        </h2>
        <PaperList papers={papers} />
      </div>
    </div>
  );
}