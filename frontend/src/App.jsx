import React, { useState } from "react";
import axios from "axios";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { LiveProvider, LiveEditor, LivePreview, LiveError } from "react-live";

// Component to show actual live preview of the generated business application
function AppLivePreview({ response, workflow, onClose }) {
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('preview'); // 'preview' or 'code'
  const [selectedFile, setSelectedFile] = useState(null);

  // Handle both structured and single component responses
  const isStructured = response?.type === 'structured' && response?.structure;
  const code = response?.code || response;
  const structure = response?.structure;
  const project = response?.project; // Complete project structure

  // Download project as ZIP
  const downloadProject = async () => {
    if (!project) {
      alert('No project structure available for download');
      return;
    }

    try {
      const zip = new JSZip();
      const projectName = workflow?.name?.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'workflow-app';

      // Add all files to the zip
      Object.entries(project).forEach(([filePath, content]) => {
        zip.file(filePath, content);
      });

      // Generate the zip file
      const blob = await zip.generateAsync({ type: "blob" });
      saveAs(blob, `${projectName}.zip`);
    } catch (error) {
      console.error('Error creating zip:', error);
      alert('Error creating project download');
    }
  };

  // Clean and prepare code for live preview
  const prepareCodeForPreview = (rawCode) => {
    if (!rawCode) return '';
    
    let cleanCode = rawCode;
    
    // Remove code block markers
    if (cleanCode.startsWith('```')) {
      const lines = cleanCode.split('\n');
      lines.shift(); // Remove first ```
      if (lines[lines.length - 1].trim() === '```') {
        lines.pop(); // Remove last ```
      }
      cleanCode = lines.join('\n');
    }
    
    // Remove import statements (react-live provides React automatically)
    cleanCode = cleanCode.replace(/import.*from.*['""][;\n\r]*/g, '');
    
    // Remove export statements
    cleanCode = cleanCode.replace(/export\s+default\s+\w+[;\n\r]*/g, '');
    
    // Extract the component function
    const functionMatch = cleanCode.match(/(function\s+\w+.*?{[\s\S]*?^})/m);
    if (functionMatch) {
      cleanCode = functionMatch[1];
    }
    
    // If it's an App function, rename it to avoid conflicts
    cleanCode = cleanCode.replace(/function\s+App\s*\(/g, 'function WorkflowApp(');
    
    // Add a simple render at the end
    if (!cleanCode.includes('<WorkflowApp')) {
      cleanCode += '\n\nrender(<WorkflowApp />);';
    }
    
    return cleanCode;
  };

  const previewCode = prepareCodeForPreview(code);

  if (!code) {
    return (
      <div className="border border-gray-300 bg-gray-50 p-8 rounded text-center">
        <div className="text-gray-500 text-lg mb-2">🏢</div>
        <p className="text-gray-600">No business application to preview</p>
        <p className="text-sm text-gray-500 mt-2">Generate a workflow to see your complete business application here</p>
      </div>
    );
  }

  const scope = {
    useState: React.useState,
    useEffect: React.useEffect,
    useMemo: React.useMemo,
    workflow: workflow || { nodes: [] },
    // Provide fetch for API calls to n8n
    fetch: async (url, options) => {
      try {
        const response = await fetch(url, {
          ...options,
          mode: 'cors', // Enable CORS
          headers: {
            'Content-Type': 'application/json',
            ...options?.headers
          }
        });
        return response;
      } catch (error) {
        console.error('API call failed:', error);
        throw error;
      }
    }
  };

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden bg-white h-full flex flex-col">
      {/* Tab Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-3 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex gap-1">
              <div className="w-3 h-3 bg-red-400 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            </div>
            <span className="font-medium">Business Application</span>
            <span className="text-blue-100 text-sm">- {workflow?.name || 'Generated App'}</span>
          </div>
          
          {/* Tab Switcher */}
          <div className="flex items-center gap-2">
            <div className="flex bg-black/20 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === 'preview' 
                    ? 'bg-white text-gray-800 shadow-sm' 
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                👁️ Preview
              </button>
              <button
                onClick={() => setActiveTab('code')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                  activeTab === 'code' 
                    ? 'bg-white text-gray-800 shadow-sm' 
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                &lt;&gt; Code
              </button>
            </div>
            
            {/* Download Project Button */}
            {project && (
              <button
                onClick={downloadProject}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
              >
                📁 Download Project
              </button>
            )}
            
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white text-xl p-2 hover:bg-white/10 rounded-md transition-all"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
      
      <LiveProvider code={previewCode} scope={scope} noInline>
        <LiveError className="bg-red-50 border-b border-red-200 text-red-700 p-3" />
        
        {/* Tab Content */}
        <div className="flex-1 min-h-0">
          {activeTab === 'preview' ? (
            <div className="bg-white h-full overflow-auto">
              <LivePreview />
            </div>
          ) : (
            <div className="bg-gray-900 text-white h-full overflow-auto flex">
              {isStructured ? (
                <>
                  {/* File Explorer */}
                  <div className="w-1/3 border-r border-gray-700 p-4">
                    <h3 className="text-sm font-semibold mb-3 text-gray-300">📁 Complete Project</h3>
                    <div className="space-y-1 max-h-96 overflow-auto">
                      {/* Show all project files */}
                      {project && Object.entries(project).map(([filePath, content]) => {
                        const fileName = filePath.split('/').pop();
                        const isInSubfolder = filePath.includes('/');
                        const folderName = isInSubfolder ? filePath.split('/')[0] : '';
                        
                        return (
                          <div 
                            key={filePath}
                            onClick={() => setSelectedFile({ name: fileName, content, path: filePath })}
                            className={`cursor-pointer p-2 rounded text-sm hover:bg-gray-800 transition-colors ${
                              selectedFile?.path === filePath ? 'bg-blue-600' : ''
                            } ${isInSubfolder ? 'ml-4' : ''}`}
                          >
                            📄 {fileName}
                            {isInSubfolder && <span className="text-gray-400 text-xs ml-2">({folderName})</span>}
                          </div>
                        );
                      })}
                      
                      {/* Fallback to structure if no project */}
                      {!project && (
                        <>
                          <div 
                            onClick={() => setSelectedFile({ name: 'App.jsx', content: structure.mainComponent })}
                            className={`cursor-pointer p-2 rounded text-sm hover:bg-gray-800 ${
                              selectedFile?.name === 'App.jsx' ? 'bg-blue-600' : ''
                            }`}
                          >
                            📄 App.jsx (Main)
                          </div>
                          
                          {structure.components && Object.entries(structure.components).map(([path, content]) => (
                            <div 
                              key={path}
                              onClick={() => setSelectedFile({ name: path.split('/').pop(), content, path })}
                              className={`cursor-pointer p-2 rounded text-sm hover:bg-gray-800 ml-4 ${
                                selectedFile?.path === path ? 'bg-blue-600' : ''
                              }`}
                            >
                              📄 {path.split('/').pop()}
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Code Viewer */}
                  <div className="flex-1 p-4">
                    {selectedFile ? (
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-lg font-semibold">{selectedFile.name}</h4>
                          <span className="text-sm text-gray-400">
                            {selectedFile.content?.length || 0} characters
                          </span>
                        </div>
                        <pre className="bg-gray-800 p-4 rounded-lg overflow-auto text-sm font-mono max-h-96 border">
                          <code className="text-green-400">{selectedFile.content || '// No content available'}</code>
                        </pre>
                      </div>
                    ) : (
                      <div className="text-center text-gray-400 mt-8">
                        <div className="text-4xl mb-4">📁</div>
                        <div>Select a file from the project structure to view its content</div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 p-4">
                  <h4 className="text-lg font-semibold mb-3">📄 Generated Code</h4>
                  <pre className="bg-gray-800 p-4 rounded-lg overflow-auto text-sm font-mono max-h-96 border">
                    <code className="text-green-400">{code || '// No code available'}</code>
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </LiveProvider>
    </div>
  );
}

export default function App() {
  const [workflow, setWorkflow] = useState(null);
  const [response, setResponse] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const workflowData = JSON.parse(e.target.result);
          setWorkflow(workflowData);
          setResponse(null);
          setShowPreview(false);
        } catch (error) {
          alert('Invalid JSON file. Please upload a valid n8n workflow.');
        }
      };
      reader.readAsText(file);
    }
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

  const getWebhookInfo = (workflow) => {
    const webhookNode = workflow?.nodes?.find(n => 
      n.type === 'n8n-nodes-base.formTrigger' || 
      n.type === 'n8n-nodes-base.webhook'
    );
    return webhookNode?.webhookId || null;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Panel - Upload and Workflow Info */}
      <div className="w-1/4 bg-white border-r border-gray-200 p-6 flex flex-col">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Astraflow</h1>
          <p className="text-gray-600 text-sm">Transform n8n workflows into React applications</p>
        </div>

        {/* File Upload */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload n8n Workflow
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
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

        {/* Workflow Info */}
        {workflow && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-2">📋 Workflow Loaded</h3>
            <div className="space-y-1 text-sm">
              <p><strong>Name:</strong> {workflow.name || 'Untitled'}</p>
              <p><strong>Nodes:</strong> {workflow.nodes?.length || 0}</p>
              <p><strong>Connections:</strong> {workflow.connections ? Object.keys(workflow.connections).length : 0}</p>
              {getWebhookInfo(workflow) && (
                <p><strong>🔗 Webhook:</strong> <code className="bg-blue-100 px-1 rounded text-xs">{getWebhookInfo(workflow)}</code></p>
              )}
            </div>
          </div>
        )}

        {/* Generate Button */}
        <button
          onClick={generateUI}
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

      {/* Right Panel - Preview */}
      <div className="w-3/4 bg-gray-50 transition-all duration-500 ease-in-out h-screen overflow-y-auto">
        <div className="p-6 h-full flex flex-col">
          <div className="flex-1 min-h-0">
            {response ? (
              <AppLivePreview response={response} workflow={workflow} onClose={() => setShowPreview(false)} />
            ) : (
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}