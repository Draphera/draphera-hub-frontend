export default function HPGLLoading() {
  return (
    <div className="min-h-screen bg-drapera-dark flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-cyan-400">VectorEngine<sup>™</sup></p>
          <p className="text-xs text-gray-500 mt-1">Reading Geometry...</p>
        </div>
      </div>
    </div>
  );
}
