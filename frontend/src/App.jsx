import React, { useState } from "react";
import axios from "axios";
import AppLivePreview from "./components/AppLivePreview";
import LeftPanel from "./components/LeftPanel";
import EmptyState from "./components/EmptyState";

export default function App() {
  const [workflow, setWorkflow] = useState(null);
  const [response, setResponse] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleFileUpload = (workflowData) => {
    setWorkflow(workflowData);
    setResponse(null);
    setShowPreview(false);
  };

  const generateUI = async () => {
    if (!workflow) return;
    
    setIsGenerating(true);
    try {
      const response = await axios.post('http://localhost:5000/generate-ui', { workflow });
      setResponse(response.data);
      setShowPreview(true);
    } catch (error) {
      console.error('Error generating UI:', error);
      alert('Failed to generate UI. Please check if the backend server is running.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Panel - Upload and Workflow Info */}
      <LeftPanel 
        workflow={workflow}
        onFileUpload={handleFileUpload}
        onGenerateUI={generateUI}
        isGenerating={isGenerating}
      />

      {/* Right Panel - Preview */}
      <div className="w-3/4 bg-gray-50 transition-all duration-500 ease-in-out h-screen overflow-y-auto">
        <div className="p-6 h-full flex flex-col">
          <div className="flex-1 min-h-0">
            {response ? (
              <AppLivePreview 
                response={response} 
                workflow={workflow} 
                onClose={() => setShowPreview(false)} 
              />
            ) : (
              <EmptyState />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}