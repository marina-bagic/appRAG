import { useState, useEffect } from "react";
import { useSelectedPapers } from "../context/SelectedPapersContext";
import type { Paper } from "../types";
import SelectedTray from "../components/SelectedPapersTray";

type PaperListProps = {
  papers: Paper[];
};

export default function PapersList({ papers = [] }: PaperListProps) {
  const [expandedSummary, setExpandedSummary] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const { selectedPapers, togglePaper } = useSelectedPapers();
  const [citationStyle, setCitationStyle] = useState("");
  const [citations, setCitations] = useState<Record<string, string>>({});
  const [copiedAll, setCopiedAll] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [isSaveSuccess, setIsSaveSuccess] = useState(false);
  const [selectedForSimilar, setSelectedForSimilar] = useState<Paper | null>(null);
  const [compareFirst, setCompareFirst] = useState<Paper | null>(null);
  const [compareSecond, setCompareSecond] = useState<Paper | null>(null);
  const [selectedForLLMQuery, setSelectedForLLMQuery] = useState<Paper | { id: string; title: string }>({ id: "any", title: "All papers" });
  const [llmResponses, setLlmResponses] = useState<{
    compare: string | null;
    relatedWork: string | null;
    llmQuery: string | null;
  }>({
    compare: null,
    relatedWork: null,
    llmQuery: null,
  });
  const [similarPapers, setSimilarPapers] = useState<{ paperId: string; response: Paper[] } | null>(null);

  useEffect(() => {
    console.log("Selected Papers:", selectedPapers);
  }, [selectedPapers]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("http://localhost:8000/get-preferred-style", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        if (res.ok) {
          const data = await res.json();
          setCitationStyle(data.preferred_citation_style);
        } else if (res.status === 401) {
          setCitationStyle("APA");
        }
      } catch (err) {
        console.error("Failed to fetch preferred style:", err);
        setCitationStyle("APA");
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("http://localhost:8000/check", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        if (res.ok) {
          setIsLoggedIn(true);
        } else {
          setIsLoggedIn(false);
        }
      } catch (err) {
        setIsLoggedIn(false);
      } finally {
        setIsChecked(true);
      }
    })();
  }, []);

  const toggleSummary = (id: string) => {
    setExpandedSummary((prev) => (prev === id ? null : id)); 
  };

  const setPreferredStyle = async (style: string) => {
    try {
      const res = await fetch("http://localhost:8000/set-preferred-style", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ style })
      });
      if (res.ok) {
        setIsSaveSuccess(true);
        setTimeout(() => setIsSaveSuccess(false), 2000);
      } else {
        setIsSaveSuccess(false);
      }
    } catch (err) {
      setIsSaveSuccess(false);
    }
  };

  const handleCompare = async (paper1: Paper, paper2: Paper) => {
    try {
      const res = await fetch("http://localhost:8000/llm/compare", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paper1,
          paper2,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setLlmResponses((prev) => ({ ...prev, compare: data.comparison }));
      } else {
        console.error("Failed to compare papers:", res.status);
        setLlmResponses((prev) => ({ ...prev, compare: "Error comparing papers" }));
      }
    } catch (err) {
      console.error("Error:", err);
      setLlmResponses((prev) => ({ ...prev, compare: "Error comparing papers" }));
    }
  };

  const handleRelatedWork = async () => {
    if (selectedPapers.length < 2) return;

    try {
      const res = await fetch("http://localhost:8000/llm/related-work", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          papers: selectedPapers,
          style: citationStyle,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setLlmResponses((prev) => ({ ...prev, relatedWork: data.related_work }));
      } else {
        console.error("Failed to generate related work:", res.status);
        setLlmResponses((prev) => ({ ...prev, relatedWork: "Error generating related work" }));
      }
    } catch (err) {
      console.error("Error:", err);
      setLlmResponses((prev) => ({ ...prev, relatedWork: "Error generating related work" }));
    }
  };

  const findSimilar = async (paper: Paper) => {
    console.log(paper);
    try {
      const res = await fetch("http://localhost:8000/find-similar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paper,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        console.log(data)
        // Normalize similar_papers to always be an array
        const similarPapersArray = Array.isArray(data.similar_papers)
          ? data.similar_papers
          : data.similar_papers
            ? [data.similar_papers]
            : [];
        setSimilarPapers({ paperId: paper.id, response: similarPapersArray });
      } else {
        console.error("Failed to find similar papers:", res.status);
        setSimilarPapers({ paperId: paper.id, response: [] });
      }
    } catch (err) {
      console.error("Error:", err);
      setSimilarPapers({ paperId: paper.id, response: [] });
    }
  };

  const handleLLMQuery = async () => {
    if (!question) {
      setLlmResponses((prev) => ({ ...prev, llmQuery: "Please enter a question" }));
      return;
    }

    console.log(question)

    try {
      const res = await fetch("http://localhost:8000/llm/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          question,
          paper: selectedForLLMQuery?.id === "any" || !selectedForLLMQuery ? null : selectedForLLMQuery,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setLlmResponses((prev) => ({ ...prev, llmQuery: data.answer }));
      } else {
        setLlmResponses((prev) => ({ ...prev, llmQuery: "Error querying LLM" }));
      }
    } catch (err) {
      console.error("Error:", err);
      setLlmResponses((prev) => ({ ...prev, llmQuery: "Error querying LLM" }));
    }
  };

  const handleGenerateCitations = async (selectedIds: string | string[]) => {
    const idsArray = Array.isArray(selectedIds) ? selectedIds : [selectedIds];
    const res = await fetch("http://localhost:8000/generate-citations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paperIds: idsArray, style: citationStyle })
    });

    const data = await res.json();
    setCitations(data.citations);
  };

  return (
    <div className="mt-6 space-y-6">
      {/* Header Section */}
      <div className="p-4 bg-gray-50 rounded shadow-md space-y-4">
        {/* Citation style picker and Save button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <label htmlFor="style" className="text-sm font-semibold">
              Citation style:
            </label>
            <select
              id="style"
              value={citationStyle}
              onChange={(e) => setCitationStyle(e.target.value)}
              className="border p-1 rounded"
            >
              <option value="APA">APA</option>
              <option value="MLA">MLA</option>
              <option value="ISO690">ISO690</option>
              <option value="Chicago">Chicago</option>
              <option value="IEEE">IEEE</option>
              <option value="AMA">AMA</option>
              <option value="ACS">ACS</option>
            </select>
            {isLoggedIn ? (
              <button
                onClick={() => setPreferredStyle(citationStyle)}
                className="bg-gradient-to-r from-purple-500 to-purple-600 text-gray-100 px-4 py-1.5 rounded-lg hover:from-purple-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-transform transform hover:-translate-y-0.5"
              >
                {isSaveSuccess ? "Saved!" : "Save"}
              </button>
            ) : (
              <button
                disabled={!isChecked || !isLoggedIn}
                title={isChecked && isLoggedIn ? "Save" : "Login to save"}
                className="bg-gray-900 text-gray-200 px-4 py-1.5 rounded-lg shadow-md transition-all hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
            )}
          </div>

          {/* Q&A Section */}
          <div className="flex-1 ml-4 flex flex-col space-y-2">
            <select
              onChange={(e) => {
                const value = e.target.value;
                if (value === "any") {
                  setSelectedForLLMQuery({ id: "any", title: "All papers" });
                } else {
                  const selectedPaper = selectedPapers.find((p) => p.id == value);
                  setSelectedForLLMQuery(selectedPaper || { id: "any", title: "All papers" });
                }
              }}
              value={selectedForLLMQuery?.id || "any"}
              disabled={selectedPapers.length < 1}
              className="border p-1 rounded w-full max-w-xs disabled:bg-gray-100 disabled:cursor-not-allowed"
              aria-label="Select a paper for LLM query"
            >
              <option key="any" value="any">All papers</option>
              {selectedPapers.map((paper) => (
                <option key={paper.id} value={paper.id}>
                  {paper.title || "Untitled Paper"}
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Ask a question about the selected paper..."
              className="w-full border p-3 rounded"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />

            <button
              onClick={handleLLMQuery}
              disabled={question.trim().length === 0}
              className={`px-4 py-1.5 rounded-lg bg-gray-900 text-gray-200 shadow-md transition-all w-full max-w-xs
                ${question.trim().length === 0
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-gray-800 hover:shadow-lg"
                }`}
            >
              Ask LLM about Paper
            </button>
          </div>

        </div>
      </div>

      {/* Paper List Section */}
      <div className="bg-gray-50 p-4 rounded shadow-md">
        {papers.map((paper) => (
          <div
            key={paper.id}
            className="border rounded p-4 mb-4 flex items-start justify-between gap-4"
          >
            <div className="flex items-start gap-3 w-full">
              <input
                type="checkbox"
                checked={selectedPapers.some((p) => p.id === paper.id)}
                onChange={() => togglePaper(paper)}
              />
              <div className="flex-grow">
                <h2 className="text-lg font-semibold">{paper.title}</h2>
                {expandedSummary === paper.id && (
                  <p className="text-gray-600 mt-2">{paper.summary}</p>
                )}
              </div>
            </div>

            {/* Actions per paper */}
            <div className="flex flex-col items-end space-y-2">
              <button
                className="bg-gradient-to-r from-purple-500 to-purple-600 text-gray-100 px-4 py-1.5 rounded-lg hover:from-purple-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-transform transform hover:-translate-y-0.5"
                onClick={() => handleGenerateCitations(paper.id)}
              >
                Cite
              </button>
              <button
                className="bg-gray-900 text-gray-200 px-4 py-1.5 rounded-lg shadow-md transition-all hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => toggleSummary(paper.id)}
              >
                {expandedSummary === paper.id ? "Hide" : "Summary"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Actions Section */}
      <div className="flex flex-wrap gap-4 justify-center">
        {/* Find Similar Section */}
        <div className="flex flex-col items-center space-y-2">
          <select
            onChange={(e) => {
              const selectedPaper = selectedPapers.find((p) => p.id == e.target.value);
              setSelectedForSimilar(selectedPaper || null);
            }}
            value={selectedForSimilar?.id || ""}
            disabled={selectedPapers.length < 1}
            className="border p-1 rounded w-full max-w-xs disabled:bg-gray-100 disabled:cursor-not-allowed"
            aria-label="Select a paper for finding similar papers"
          >
            <option value="">Select a paper</option>
            {selectedPapers.map((paper) => (
              <option key={paper.id} value={paper.id}>
                {paper.title || "Untitled Paper"}
              </option>
            ))}
          </select>
          <button
            onClick={() => selectedForSimilar && findSimilar(selectedForSimilar)}
            disabled={!selectedForSimilar}
            className={`px-4 py-1.5 rounded-lg bg-gray-900 text-gray-200 shadow-md transition-all w-full max-w-xs
              ${!selectedForSimilar 
                ? "opacity-50 cursor-not-allowed" 
                : "hover:bg-gray-800 hover:shadow-lg"
              }`}
          >
            Find Similar
          </button>
        </div>

        {/* Compare Section */}
        <div className="flex flex-col items-center space-y-2">
          {/* First Paper */}
          <select
            onChange={(e) => {
              const selectedPaper = selectedPapers.find((p) => p.id == e.target.value);
              setCompareFirst(selectedPaper || null);
            }}
            value={compareFirst?.id || ""}
            disabled={selectedPapers.length < 2}
            className="border p-1 rounded w-full max-w-xs disabled:bg-gray-100 disabled:cursor-not-allowed"
            aria-label="Select first paper for comparison"
          >
            <option value="">Select first paper</option>
            {selectedPapers.map((paper) => (
              <option key={paper.id} value={paper.id}>
                {paper.title || "Untitled Paper"}
              </option>
            ))}
          </select>

          {/* Second Paper */}
          <select
            onChange={(e) => {
              const selectedPaper = selectedPapers.find((p) => p.id == e.target.value);
              setCompareSecond(selectedPaper || null);
            }}
            value={compareSecond?.id || ""}
            disabled={selectedPapers.length < 2 || !compareFirst}
            className="border p-1 rounded w-full max-w-xs disabled:bg-gray-100 disabled:cursor-not-allowed"
            aria-label="Select second paper for comparison"
          >
            <option value="">Select second paper</option>
            {selectedPapers
              .filter((p) => p.id !== compareFirst?.id)
              .map((paper) => (
                <option key={paper.id} value={paper.id}>
                  {paper.title || "Untitled Paper"}
                </option>
              ))}
          </select>

          <button
            onClick={() => compareFirst && compareSecond && handleCompare(compareFirst, compareSecond)}
            disabled={!compareFirst || !compareSecond}
            className={`px-4 py-1.5 rounded-lg bg-gray-900 text-gray-200 shadow-md transition-all w-full max-w-xs
              ${!compareFirst || !compareSecond 
                ? "opacity-50 cursor-not-allowed" 
                : "hover:bg-gray-800 hover:shadow-lg"
              }`}
          >
            Compare Two Papers
          </button>
        </div>

        {/* Related Work */}
        <button
          onClick={handleRelatedWork}
          disabled={selectedPapers.length < 2}
          className={`px-4 py-1.5 rounded-lg bg-gray-900 text-gray-200 shadow-md transition-all w-full max-w-xs
            ${selectedPapers.length < 2
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-gray-800 hover:shadow-lg"
            }`}
        >
          Generate Related Work
        </button>
      </div>



      <div className="flex justify-center mb-4">
        <button
          onClick={() =>
            handleGenerateCitations(selectedPapers.map((p) => p.id))
          }
          className="bg-gradient-to-r from-purple-500 to-purple-600 text-gray-100 px-4 py-1.5 rounded-lg hover:from-purple-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-transform transform hover:-translate-y-0.5"
        >
          Generate Citations for Selected Papers
        </button>
      </div>


      {/* Similar Papers Section */}
      {similarPapers && (
        <div className="p-4 mt-6 bg-gray-50 border rounded">
          <h2 className="font-semibold mb-4">Similar Papers</h2>
          <div className="mb-4">
            <h3 className="font-medium">
              Similar Papers for "{selectedPapers.find((p) => p.id === similarPapers.paperId)?.title || "Selected Paper"}"
            </h3>
            {similarPapers.response && similarPapers.response.length > 0 ? (
              <ul className="list-disc pl-5 mt-2">
                {similarPapers.response.map((paper, index) => (
                  <li key={index} className="text-gray-800">
                    {paper.title} {paper.authors ? `- ${paper.authors}` : ""}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-600">No similar papers found or an error occurred.</p>
            )}
          </div>
        </div>
      )}

      {/* LLM Responses Section */}
      {(llmResponses.compare || llmResponses.relatedWork || llmResponses.llmQuery) && (
        <div className="p-4 mt-6 bg-gray-50 border rounded">
          <h2 className="font-semibold mb-4">LLM Responses</h2>
          {llmResponses.compare && (
            <div className="mb-4">
              <h3 className="font-medium">Comparison of Selected Papers</h3>
              <p className="text-gray-600 mt-2 whitespace-pre-wrap">{llmResponses.compare}</p>
            </div>
          )}
          {llmResponses.relatedWork && (
            <div className="mb-4">
              <h3 className="font-medium">Generated Related Work</h3>
              <p className="text-gray-600 mt-2 whitespace-pre-wrap">{llmResponses.relatedWork}</p>
            </div>
          )}
          {llmResponses.llmQuery && (
            <div className="mb-4">
              <h3 className="font-medium">LLM Query Response</h3>
              <p className="text-gray-600 mt-2 whitespace-pre-wrap">{llmResponses.llmQuery}</p>
            </div>
          )}
        </div>
      )}

      {/* Selected Tray Section */}
      <SelectedTray />

      {/* All Papers Citations Section */}
      {Object.keys(citations).length > 0 && (
        <div className="p-4 mt-6 bg-gray-50 border rounded">
          <h2 className="font-semibold mb-4">
            All Selected Paper Citations
          </h2>
          <ul className="space-y-2">
            {Object.entries(citations).map(([paperId, citation]) => (
              <li key={paperId}>
                <p className="text-gray-800 whitespace-pre-wrap">
                  {citation}
                </p>
              </li>
            ))}
          </ul>

          <button
            onClick={() => {
              navigator.clipboard.writeText(
                Object.values(citations).join('\n\n')
              );
              setCopiedAll(true);
              setTimeout(() => setCopiedAll(false), 2000);
            }}
            className={`px-4 py-1.5 mt-4 rounded-lg w-full max-w-xs
              ${copiedAll
                ? "bg-gray-500 text-gray-100"
                : "bg-gray-900 text-gray-200 shadow-md transition-all hover:bg-gray-800 hover:shadow-lg"
              }`}
          >
            {copiedAll ? "All Copied!" : "Copy All"}
          </button>
        </div>
      )}
    </div>
  );
}