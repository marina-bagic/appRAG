import { useState } from "react";
import { useSelectedPapers } from "../context/SelectedPapersContext";

export default function SelectedTray() {
  const { selectedPapers, togglePaper } = useSelectedPapers();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Button to show or hide the tray */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed top-4 right-4 z-50 p-2 bg-indigo-600 text-gray-100 font-semibold rounded-md shadow-md hover:bg-indigo-500 transition-all"
        title="Toggle Selected Papers"
      >
        {isOpen ? "Close" : "Open"} Selected
      </button>

      {/* Side panel */}
      <div
        className={`fixed top-0 right-0 bottom-0 w-80 p-4 shadow-lg bg-indigo-900 transform transition-transform duration-500 z-50 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header with close button */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-100">
            Selected Papers
          </h3>
          <button
            onClick={() => setIsOpen(false)}
            aria-label="Close panel"
            className="p-1 text-gray-100 hover:text-gray-400 transition"
          >
            ✕
          </button>
        </div>

        {/* List of papers */}
        <ul className="text-sm max-h-[80vh] overflow-auto space-y-2">
          {selectedPapers.length > 0 ? (
            selectedPapers.map((p) => (
              <li
                key={p.id}
                className="flex justify-between items-center gap-2 p-2 bg-indigo-800 rounded-md group"
              >
                <span className="flex-1 text-gray-100">
                   {p.title}
                </span>
                <button
                   onClick={() => togglePaper(p)}
                   aria-label="Deselect"
                   className="text-red-400 hover:text-red-500 transition-opacity duration-200"
                 >
                   ✕
                 </button>
               </li>
             ))
          ) : (
            <p className="text-gray-400">No papers selected</p>
          )}

        </ul>
      </div>
    </>
  )
}
