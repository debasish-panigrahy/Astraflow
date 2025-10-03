import React from "react";

function WorkflowUpload({ onFileUpload }) {
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const workflowData = JSON.parse(e.target.result);
          onFileUpload(workflowData);
        } catch (error) {
          alert('Invalid JSON file. Please upload a valid n8n workflow.');
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Upload n8n Workflow
      </label>
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
        <input
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
          id="workflow-upload"
        />
        <label htmlFor="workflow-upload" className="cursor-pointer">
          <div className="text-gray-400 mb-2">
            <svg className="mx-auto h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <p className="text-sm text-gray-600">
            Click to upload or drag and drop
          </p>
          <p className="text-xs text-gray-500">JSON files only</p>
        </label>
      </div>
    </div>
  );
}

export default WorkflowUpload;