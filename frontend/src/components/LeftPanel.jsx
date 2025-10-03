import React from "react";
import WorkflowUpload from "./WorkflowUpload";
import WorkflowInfo from "./WorkflowInfo";

function LeftPanel({ workflow, onFileUpload, onGenerateUI, isGenerating }) {
  return (
    <div className="w-1/4 bg-white border-r border-gray-200 p-6 flex flex-col">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Astraflow</h1>
        <p className="text-gray-600 text-sm">Transform n8n workflows into React applications</p>
      </div>

      {/* File Upload */}
      <WorkflowUpload onFileUpload={onFileUpload} />

      {/* Workflow Info */}
      <WorkflowInfo workflow={workflow} />

      {/* Generate Button */}
      <button
        onClick={onGenerateUI}
        disabled={!workflow || isGenerating}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {isGenerating ? (
          <>
            <span className="animate-spin">⏳</span>
            Generating...
          </>
        ) : (
          <>
            🚀 Generate Business App
          </>
        )}
      </button>

      {/* Tips */}
      <div className="mt-auto pt-6 border-t border-gray-200">
        <h4 className="font-medium text-gray-800 mb-2">💡 Tips</h4>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• Upload any n8n workflow JSON file</li>
          <li>• Generated apps include authentication</li>
          <li>• Download complete React projects</li>
          <li>• Preview apps work with real webhooks</li>
        </ul>
      </div>
    </div>
  );
}

export default LeftPanel;