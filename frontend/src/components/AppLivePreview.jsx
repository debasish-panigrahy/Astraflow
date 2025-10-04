import React, { useState } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { LiveProvider, LiveEditor, LivePreview, LiveError } from "react-live";

// Component to show actual live preview of the generated business application
function AppLivePreview({ response, workflow, onClose }) {
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('preview'); // 'preview', 'code', or 'chat'
  const [selectedFile, setSelectedFile] = useState(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState(null);
  const [chatInput, setChatInput] = useState('');
  const [isModifying, setIsModifying] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [currentCode, setCurrentCode] = useState(response?.code || response);

  // Simple VS Code-like syntax highlighting
  const highlightCode = (code) => {
    if (!code) return '';
    
    return code
      // Protect HTML entities first
      .replace(/&lt;/g, '___LT___')
      .replace(/&gt;/g, '___GT___')
      .replace(/&amp;/g, '___AMP___')
      
      // JSX/HTML tags (more careful pattern)
      .replace(/<(\/?[a-zA-Z][a-zA-Z0-9]*(?:\s[^>]*)?)\s*>/g, '<span style="color: #569CD6;">&lt;$1&gt;</span>')
      
      // JavaScript keywords
      .replace(/\b(import|export|from|const|let|var|function|return|if|else|class|extends|async|await|try|catch|for|while|do|switch|case|break|continue|typeof|instanceof)\b/g, '<span style="color: #C586C0;">$1</span>')
      
      // React/JSX specific
      .replace(/\b(React|useState|useEffect|useMemo|useCallback|Component|props|state)\b/g, '<span style="color: #4EC9B0;">$1</span>')
      
      // String literals (be more careful with quotes)
      .replace(/(['"`])([^'"`\n\r]*?)\1/g, '<span style="color: #CE9178;">$1$2$1</span>')
      
      // Comments
      .replace(/(\/\/.*?$)/gm, '<span style="color: #6A9955; font-style: italic;">$1</span>')
      .replace(/(\/\*[\s\S]*?\*\/)/g, '<span style="color: #6A9955; font-style: italic;">$1</span>')
      
      // Numbers
      .replace(/\b(\d+\.?\d*)\b/g, '<span style="color: #B5CEA8;">$1</span>')
      
      // Booleans and special values
      .replace(/\b(true|false|null|undefined|NaN|Infinity)\b/g, '<span style="color: #569CD6;">$1</span>')
      
      // Class names and properties
      .replace(/\b(className|style|onClick|onChange|onSubmit|value|type|name|id)\s*=/g, '<span style="color: #9CDCFE;">$1</span>=')
      
      // Restore HTML entities
      .replace(/___LT___/g, '&lt;')
      .replace(/___GT___/g, '&gt;')
      .replace(/___AMP___/g, '&amp;');
  };

  // Handle both structured and single component responses
  const isStructured = response?.type === 'structured' && response?.structure;
  const code = currentCode || response?.code || response;
  const structure = response?.structure;
  const project = response?.project; // Complete project structure

  // Function to modify application based on user chat
  const modifyApplication = async () => {
    if (!chatInput.trim()) return;

    setIsModifying(true);
    
    // Add user message to chat history
    const userMessage = { type: 'user', content: chatInput, timestamp: new Date() };
    setChatHistory(prev => [...prev, userMessage]);
    
    try {
      const response = await fetch('http://localhost:5000/modify-app', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentCode: code,
          modification: chatInput,
          workflow: workflow
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Add AI response to chat history
        const aiMessage = { 
          type: 'ai', 
          content: `✅ I've modified your application: ${result.summary}`, 
          timestamp: new Date() 
        };
        setChatHistory(prev => [...prev, aiMessage]);
        
        // Update the current code
        setCurrentCode(result.modifiedCode);
        
        setChatInput('');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Modification failed');
      }
    } catch (error) {
      console.error('Error modifying app:', error);
      const errorMessage = { 
        type: 'ai', 
        content: `❌ Error: ${error.message}`, 
        timestamp: new Date() 
      };
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsModifying(false);
    }
  };

  // Handle Enter key press in chat input
  const handleChatKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      modifyApplication();
    }
  };

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

  // Publish application to real hosting service
  const publishApplication = async () => {
    if (!code && !project) {
      alert('No application to publish');
      return;
    }

    setIsPublishing(true);
    
    try {
      const projectName = workflow?.name?.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'workflow-app';
      
      // Create a complete React project structure
      const completeProject = {
        'package.json': JSON.stringify({
          name: projectName,
          version: '1.0.0',
          private: true,
          dependencies: {
            'react': '^18.2.0',
            'react-dom': '^18.2.0',
            'react-scripts': '5.0.1'
          },
          scripts: {
            start: 'react-scripts start',
            build: 'react-scripts build',
            test: 'react-scripts test',
            eject: 'react-scripts eject'
          },
          browserslist: {
            production: ['>0.2%', 'not dead', 'not op_mini all'],
            development: ['last 1 chrome version', 'last 1 firefox version', 'last 1 safari version']
          }
        }, null, 2),
        
        'public/index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="Generated by Astraflow" />
  <title>${workflow?.name || 'Workflow App'}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  <noscript>You need to enable JavaScript to run this app.</noscript>
  <div id="root"></div>
</body>
</html>`,
        
        'src/index.js': `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);`,
        
        'src/App.js': getDisplayCode(code),
        
        'README.md': `# ${workflow?.name || 'Workflow App'}

Generated by Astraflow from n8n workflow.

## Available Scripts

- \`npm start\` - Runs the app in development mode
- \`npm run build\` - Builds the app for production
- \`npm test\` - Launches the test runner

## Deployment

This app is automatically deployed and hosted.
`,
        
        '.gitignore': `# Dependencies
node_modules
/.pnp
.pnp.js

# Testing
/coverage

# Production
/build

# Misc
.DS_Store
.env.local
.env.development.local
.env.test.local
.env.production.local

npm-debug.log*
yarn-debug.log*
yarn-error.log*`
      };

      // Include any additional project files
      if (project) {
        Object.entries(project).forEach(([filePath, content]) => {
          completeProject[filePath] = content;
        });
      }

      // Prepare the deployment data
      const deploymentData = {
        name: projectName,
        workflow: workflow,
        files: completeProject,
        timestamp: new Date().toISOString(),
        platform: 'vercel' // Can be 'vercel', 'netlify', or 'github-pages'
      };

      // Send to backend for real deployment
      const response = await fetch('http://localhost:5000/deploy-app', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(deploymentData)
      });

      if (response.ok) {
        const result = await response.json();
        setPublishedUrl(result.url);
        alert(`🎉 Application deployed successfully!\n\n📱 Live URL: ${result.url}\n\n✅ Your app is now live and accessible to anyone!`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Deployment failed');
      }
    } catch (error) {
      console.error('Error deploying app:', error);
      alert(`❌ Deployment failed: ${error.message}\n\nPlease check your hosting service configuration.`);
    } finally {
      setIsPublishing(false);
    }
  };

  // Clean and prepare code for live preview (keep original for Code tab)
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
    
    // Only modify for LIVE PREVIEW, not for code display
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

  // Get clean code for display (preserve original structure)
  const getDisplayCode = (rawCode) => {
    if (!rawCode) return '';
    
    let cleanCode = rawCode;
    
    // Remove code block markers only
    if (cleanCode.startsWith('```')) {
      const lines = cleanCode.split('\n');
      lines.shift(); // Remove first ```
      if (lines[lines.length - 1].trim() === '```') {
        lines.pop(); // Remove last ```
      }
      cleanCode = lines.join('\n');
    }
    
    // Check if it already has imports - if not, add them
    const hasImports = cleanCode.includes('import') && cleanCode.includes('from');
    const hasExports = cleanCode.includes('export default');
    
    if (!hasImports || !hasExports) {
      // Extract component name from function
      const functionMatch = cleanCode.match(/function\s+(\w+)\s*\(/);
      const componentName = functionMatch ? functionMatch[1] : 'WorkflowApp';
      
      let completeCode = '';
      
      // Add imports if missing
      if (!hasImports) {
        completeCode += `import React, { useState, useEffect } from 'react';\n\n`;
      }
      
      // Add the component code
      completeCode += cleanCode;
      
      // Add export if missing
      if (!hasExports) {
        completeCode += `\n\nexport default ${componentName};`;
      }
      
      return completeCode;
    }
    
    return cleanCode; // Return as-is if already complete
  };

  const previewCode = prepareCodeForPreview(code);
  const displayCode = getDisplayCode(code); // Complete component code for display

  // Update preview code when currentCode changes
  React.useEffect(() => {
    // Force re-render of live preview when code changes
    setError(null);
  }, [currentCode]);

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
              <button
                onClick={() => setActiveTab('chat')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                  activeTab === 'chat' 
                    ? 'bg-white text-gray-800 shadow-sm' 
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                💬 Modify
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

            {/* Publish Application Button */}
            <button
              onClick={publishApplication}
              disabled={isPublishing}
              className="bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
            >
              {isPublishing ? (
                <>
                  <span className="animate-spin">�</span>
                  Deploying...
                </>
              ) : (
                <>
                  �🚀 Deploy Live
                </>
              )}
            </button>

            {/* Show published URL if available */}
            {publishedUrl && (
              <a
                href={publishedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
              >
                🌐 View Live App
              </a>
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
          ) : activeTab === 'code' ? (
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
                <div className="flex-1 h-full">
                  {displayCode && (
                    <div className="h-full bg-slate-900 text-gray-100 font-mono text-sm overflow-auto">
                      <div className="p-6">
                        <pre className="whitespace-pre-wrap leading-relaxed">
                          {displayCode}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Chat Tab */
            <div className="bg-gray-50 h-full flex flex-col">
              {/* Chat Header */}
              <div className="bg-white border-b border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-lg">AI</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">Application Assistant</h3>
                    <p className="text-sm text-gray-500">Tell me how to modify your application</p>
                  </div>
                </div>
              </div>

              {/* Chat History */}
              <div className="flex-1 overflow-auto p-4 space-y-4">
                {chatHistory.length === 0 ? (
                  <div className="text-center text-gray-500 mt-8">
                    <div className="text-4xl mb-4">💬</div>
                    <div className="text-lg font-medium mb-2">Ready to help!</div>
                    <div className="text-sm">
                      Ask me to modify your application. For example:
                      <div className="mt-2 space-y-1 text-left bg-white p-3 rounded-lg border max-w-md mx-auto">
                        <div>• "Add a dark mode toggle"</div>
                        <div>• "Change the color scheme to green"</div>
                        <div>• "Add a search functionality"</div>
                        <div>• "Make it responsive for mobile"</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  chatHistory.map((message, index) => (
                    <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-3xl p-3 rounded-lg ${
                        message.type === 'user' 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-white border border-gray-200 text-gray-800'
                      }`}>
                        <div className="text-sm font-medium mb-1">
                          {message.type === 'user' ? 'You' : 'AI Assistant'}
                        </div>
                        <div className="whitespace-pre-wrap">{message.content}</div>
                        <div className={`text-xs mt-2 opacity-70`}>
                          {message.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Chat Input */}
              <div className="bg-white border-t border-gray-200 p-4">
                <div className="flex gap-3">
                  <textarea
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={handleChatKeyPress}
                    placeholder="Describe how you want to modify your application..."
                    className="flex-1 p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows="2"
                    disabled={isModifying}
                  />
                  <button
                    onClick={modifyApplication}
                    disabled={isModifying || !chatInput.trim()}
                    className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2"
                  >
                    {isModifying ? (
                      <>
                        <span className="animate-spin">⏳</span>
                        Modifying...
                      </>
                    ) : (
                      <>
                        🚀 Send
                      </>
                    )}
                  </button>
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  Press Enter to send • Shift+Enter for new line
                </div>
              </div>
            </div>
          )}
        </div>
      </LiveProvider>
    </div>
  );
}

export default AppLivePreview;