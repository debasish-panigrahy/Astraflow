import React, { useState } from "react";
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

export default AppLivePreview;