import React from "react";

function EmptyState() {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-8 text-center h-full flex flex-col items-center justify-center">
      <div className="text-gray-400 mb-4">
        <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Generate</h3>
      <p className="text-gray-500 mb-4">
        Upload an n8n workflow to get started with your business application
      </p>
      <div className="text-sm text-gray-400">
        Your generated application will appear here
      </div>
    </div>
  );
}

export default EmptyState;