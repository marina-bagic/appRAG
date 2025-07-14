export default function About() {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">About This App</h1>
        <p>This tool helps researchers explore scientific literature using LLMs and similarity-based graph visualization.</p>
        <p className="mt-2">Built with React, Tailwind, FastAPI, and Pyvis.</p>
      </div>
    );
  }