import GenerateGraphButton from "../components/GenerateGraphButton";
import SelectedTray from "../components/SelectedPapersTray";
import { useSelectedPapers } from "../context/SelectedPapersContext";

export default function Graph() {
  const { selectedPapers } = useSelectedPapers();

   return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm p-4">
        <h1 className="text-2xl font-bold text-gray-900">
          Paper Similarity Graph
        </h1>
        <p className="text-gray-600 text-sm mt-1">
          Visualize connections between selected research papers.
        </p>
      </header>

      {/* Buttons */}
      <div className="p-4 flex justify-center gap-4">
        <GenerateGraphButton />
      </div>

      {/* Main Content */}
      <main className="flex flex-col flex-1 p-4">
        <div className="bg-white shadow-md rounded-lg p-4 flex flex-col flex-1">
          {/* The iframe now expands to fill all available space */}
          <div className="flex-1 relative">
            {selectedPapers.length > 0 ? (
              <iframe src="/graph.html" title="Graph" className="absolute w-full h-full border-none" />
            ) : (
              <div className="flex items-center justify-center w-full h-full text-gray-500 p-6">
                Please select at least one paper from the table to generate the similarity graph.
              </div>
            )}

            {/* Selected Tray stays at bottom or you can move it elsewhere */}
            <div className="p-4">
              <SelectedTray />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}