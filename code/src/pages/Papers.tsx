import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { Paper } from "../types";
import { useSelectedPapers } from "../context/SelectedPapersContext";
import SelectedTray from "../components/SelectedPapersTray";
import { usePapers } from "../context/PapersContext";

export default function PapersTable() {
  const { selectedPapers, togglePaper } = useSelectedPapers();
  const { papers, loading } = usePapers();

  const [searchParams] = useSearchParams();
  const searchTerm = searchParams.get("search") || "";
  const [search, setSearch] = useState(searchTerm);

  const pageParam = parseInt(searchParams.get("page") || "1");
  const [currentPage, setCurrentPage] = useState(pageParam);

  const papersPerPage = 10;

  const filteredPapers = useMemo(() => {
    return papers.filter((paper: Paper) =>
      paper.title.toLowerCase().includes(search.toLowerCase()),
    );
  }, [search, papers]);

  const totalPages = Math.ceil(filteredPapers.length / papersPerPage);

  const paginatedPapers = useMemo(() => {
    const start = (currentPage - 1) * papersPerPage;
    return filteredPapers.slice(start, start + papersPerPage);
  }, [filteredPapers, currentPage]);

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      {/* Site-Wide Header (Example) */}
      <header className="bg-white shadow-sm">
        <div className="w-full px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900">Research Papers</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full px-4 sm:px-6 lg:px-8 py-4">
        <div className="bg-white shadow-md rounded-lg">
          {/* Search + Pagination Controls */}
          <div className="px-4 py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <input
              type="text"
              placeholder="Search by title..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="border border-gray-200 px-4 py-2 rounded-lg w-full sm:w-1/2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 text-gray-700 placeholder-gray-400"
              aria-label="Search papers by title"
            />
            <div className="flex items-center gap-3">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="px-4 py-2 bg-gray-900 text-gray-200 rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-gray-800 transition duration-200"
              >
                Previous
              </button>
              <span className="text-gray-600 font-medium">
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="px-4 py-2 bg-gray-900 text-gray-200 rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-gray-800 transition duration-200"
              >
                Next
              </button>
            </div>
          </div>

          {/* Loading Indicator */}
          {loading && (
            <div className="text-center text-gray-600 text-lg font-medium py-6">
              Loading papers...
            </div>
          )}

          {/* Table */}
          {!loading && (
            <div className="overflow-x-auto">
              <table className="w-full bg-white text-sm">
                <thead className="bg-gray-50 text-gray-700 font-semibold text-left">
                  <tr>
                    <th className="p-3">Select</th>
                    <th className="p-3">arXiv ID</th>
                    <th className="p-3">Title</th>
                    <th className="p-3">Authors</th>
                    <th className="p-3">Summary</th>
                    <th className="p-3 text-center">Published?</th>
                    <th className="p-3">Publish Date</th>
                    <th className="p-3">DOI</th>
                    <th className="p-3">Journal</th>
                    <th className="p-3">URL</th>
                  </tr>
                </thead>
                <tbody className="text-gray-600">
                  {paginatedPapers.map((paper: Paper) => (
                    <tr
                      key={paper.id}
                      className="hover:bg-gray-50 transition duration-150"
                    >
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedPapers.some((p) => p.id === paper.id)}
                          onChange={() => togglePaper(paper)}
                          className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                      </td>
                      <td className="p-3">{paper.arxivid}</td>
                      <td className="p-3 font-medium text-gray-800">
                        {paper.title}
                      </td>
                      <td className="p-3">{paper.authors.join(", ")}</td>
                      <td className="p-3 max-w-md">
                        <div className="relative group">
                          <span className="line-clamp-2">{paper.summary}</span>
                          <div className="absolute hidden group-hover:block bg-gray-800 text-white text-xs rounded-lg p-3 w-96 z-10 shadow-lg">
                            {paper.summary}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        {paper.is_published ? "✅" : "❌"}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {paper.publish_date}
                      </td>
                      <td className="p-3">
                        {paper.doi ? (
                          <a
                            href={`https://doi.org/${paper.doi}`}
                            className="text-blue-600 hover:text-blue-800 hover:underline transition duration-150"
                            target="_blank"
                            rel="noreferrer"
                          >
                            {paper.doi}
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="p-3">
                        {paper.journal_ref || <span className="text-gray-400">-</span>}
                      </td>
                      <td className="p-3">
                        <a
                          href={`https://arxiv.org/pdf/${paper.arxivid}.pdf`}
                          className="text-blue-600 hover:text-blue-800 hover:underline transition duration-150"
                          target="_blank"
                          rel="noreferrer"
                        >
                          PDF
                        </a>

                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Selected Tray */}
          <div className="px-4 py-4">
            <SelectedTray />
          </div>
        </div>
      </main>
    </div>
  );
}