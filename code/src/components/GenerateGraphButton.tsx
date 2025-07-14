import { useState } from 'react';
import { useSelectedPapers } from "../context/SelectedPapersContext";

export default function GenerateGraphButton() {
  const [loading, setLoading] = useState(false);
  const { selectedPapers } = useSelectedPapers();



  const sendSelectedToBackend = async () => {
    console.log("Sending selected papers:", selectedPapers);
    await fetch("http://localhost:8000/generate-graph-from-selection", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(selectedPapers)
    });
  };

  return (
    <div className = "flex gap-4">
      <button
        onClick={sendSelectedToBackend}
        disabled={loading}
        className="px-10 py-3 rounded-lg bg-gray-900 text-gray-200 shadow-md transition-all hover:bg-gray-800 hover:shadow-lg"
      >
        Show Selected Papers
      </button>
    </div>
  );
}