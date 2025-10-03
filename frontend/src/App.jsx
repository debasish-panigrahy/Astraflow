
import React, { useState } from "react";
import axios from "axios";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { LiveProvider, LiveEditor, LivePreview, LiveError } from "react-live";

// Component to show actual live preview of the generated application
function AppLivePreview({ code, workflow }) {
  const [error, setError] = useState(null);

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
        <div className="text-gray-500 text-lg mb-2">📱</div>
        <p className="text-gray-600">No application to preview</p>
        <p className="text-sm text-gray-500 mt-2">Generate a UI to see the live preview here</p>
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
    <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <div className="w-3 h-3 bg-red-400 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
          </div>
          <span className="font-medium">Live Application Preview</span>
          <span className="text-blue-100 text-sm">- {workflow?.name || 'Generated App'}</span>
        </div>
      </div>
      
      <LiveProvider code={previewCode} scope={scope} noInline>
        <div className="bg-gray-50 p-4 max-h-96 overflow-auto">
          <LiveError className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4" />
          <div className="bg-white rounded-lg shadow-sm border min-h-48">
            <LivePreview className="p-4" />
          </div>
        </div>
        
        {/* Optional: Show a minimal code editor */}
        <details className="bg-gray-100 border-t">
          <summary className="px-4 py-2 cursor-pointer text-sm text-gray-600 hover:bg-gray-200">
            🔍 View/Edit Code
          </summary>
          <div className="border-t bg-gray-900">
            <LiveEditor className="text-sm" style={{ fontFamily: 'monospace', fontSize: '12px' }} />
          </div>
        </details>
      </LiveProvider>
    </div>
  );
}

export default function App() {
  const [workflow, setWorkflow] = useState({});
  const [workflowText, setWorkflowText] = useState("");
  const [code, setCode] = useState("");
  const [projectFiles, setProjectFiles] = useState(null);
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [projectName, setProjectName] = useState("");

  const handleWorkflowChange = (text) => {
    setWorkflowText(text);
    setError("");
    
    if (text.trim() === "") {
      setWorkflow({});
      return;
    }
    
    try {
      const parsed = JSON.parse(text);
      setWorkflow(parsed);
    } catch (err) {
      setError("Invalid JSON format");
    }
  };

  const generateUI = async () => {
    setIsGenerating(true);
    try {
      const res = await axios.post("http://localhost:5000/generate-ui", { workflow });
      setCode(res.data.code);
    } catch (err) {
      setError("Failed to generate UI: " + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateApp = async () => {
    setIsGenerating(true);
    try {
      const res = await axios.post("http://localhost:5000/generate-app", { workflow });
      setProjectFiles(res.data.files);
      setProjectName(res.data.projectName);
      setCode(""); // Clear single component view
    } catch (err) {
      setError("Failed to generate app: " + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadProject = async () => {
    if (!projectFiles) return;

    try {
      const zip = new JSZip();
      
      // Create folder structure and add files
      Object.entries(projectFiles).forEach(([filePath, content]) => {
        // Clean up the content if it has code block markers or explanations
        let cleanContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
        
        // Advanced cleaning for code files
        if (filePath.endsWith('.jsx') || filePath.endsWith('.js')) {
          cleanContent = cleanCodeContent(cleanContent);
        }
        
        // Remove any remaining code block markers
        if (cleanContent.startsWith('```')) {
          const lines = cleanContent.split('\n');
          // Remove first line if it's a code block marker
          if (lines[0].startsWith('```')) {
            lines.shift();
          }
          // Remove last line if it's a code block marker
          if (lines[lines.length - 1].trim() === '```') {
            lines.pop();
          }
          cleanContent = lines.join('\n');
        }
        
        zip.file(filePath, cleanContent.trim());
      });
      
      // Generate the zip file
      const zipBlob = await zip.generateAsync({ type: "blob" });
      
      // Download the zip file
      saveAs(zipBlob, `${projectName}.zip`);
      
    } catch (error) {
      console.error('Error creating zip file:', error);
      setError('Failed to create project download: ' + error.message);
    }
  };

  // Advanced code cleaning function
  const cleanCodeContent = (content) => {
    let cleaned = content.trim();
    
    // Remove explanatory text that comes after the code
    // Look for patterns that indicate end of code
    const codeEndPatterns = [
      /export\s+default\s+\w+;?\s*$/,
      /}\s*;\s*$/,
      /}\s*$/
    ];
    
    for (const pattern of codeEndPatterns) {
      const match = cleaned.match(new RegExp(`(.*${pattern.source})([\\s\\S]*)`, 's'));
      if (match && match[2].trim().length > 50) { // If there's significant text after
        // Check if the text after looks like explanation
        const afterText = match[2].trim();
        if (!afterText.includes('import ') && !afterText.includes('function ') && 
            !afterText.includes('const ') && !afterText.includes('{')) {
          cleaned = match[1].trim();
          break;
        }
      }
    }
    
    // Remove lines that look like explanations (not code)
    const lines = cleaned.split('\n');
    const codeLines = [];
    let inCodeBlock = false;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Always keep empty lines
      if (trimmed === '') {
        codeLines.push(line);
        continue;
      }
      
      // Check if line looks like code
      const looksLikeCode = 
        trimmed.startsWith('import ') ||
        trimmed.startsWith('export ') ||
        trimmed.startsWith('function ') ||
        trimmed.startsWith('const ') ||
        trimmed.startsWith('let ') ||
        trimmed.startsWith('var ') ||
        trimmed.startsWith('return ') ||
        trimmed.includes('{') ||
        trimmed.includes('}') ||
        trimmed.includes(';') ||
        trimmed.startsWith('<') ||
        trimmed.startsWith('//') ||
        trimmed.includes('useState') ||
        trimmed.includes('useEffect') ||
        trimmed.includes('className') ||
        trimmed.includes('=>') ||
        /^\s*\w+\s*[=:]/.test(trimmed) ||
        inCodeBlock;
      
      if (looksLikeCode) {
        codeLines.push(line);
        inCodeBlock = true;
      } else if (inCodeBlock && trimmed.length < 100) {
        // Might be a short comment or label, keep it
        codeLines.push(line);
      }
      // Skip lines that look like explanations
    }
    
    return codeLines.join('\n').trim();
  };

  // Helper function to analyze workflow structure
  const analyzeWorkflow = (wf) => {
    if (!wf.nodes) return null;
    
    const nodeTypes = wf.nodes.reduce((acc, node) => {
      const type = node.type?.split('.').pop() || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    const hasConnections = wf.connections && Object.keys(wf.connections).length > 0;
    
    return {
      totalNodes: wf.nodes.length,
      nodeTypes,
      hasConnections,
      isMultiStep: hasConnections && wf.nodes.length > 1
    };
  };

  // Helper function to get webhook URL info
  const getWebhookInfo = (wf) => {
    if (!wf.nodes) return null;
    
    const webhookNode = wf.nodes.find(node => 
      node.type === 'n8n-nodes-base.formTrigger' || 
      node.type === 'n8n-nodes-base.webhook'
    );
    
    if (webhookNode?.webhookId) {
      return `https://devasish.app.n8n.cloud/webhook/${webhookNode.webhookId}`;
    }
    
    return null;
  };

  const workflowInfo = analyzeWorkflow(workflow);

  return (
    <div className="p-4">
      {/* <h1 className="text-2xl font-bold mb-4">Astraflow - AI Application Generator</h1> */}
      <h1 className="text-2xl font-bold mb-4">AI Application Generator</h1>

      <textarea
        rows={10}
        className="w-full border p-2 mb-4"
        placeholder='Paste your workflow JSON here to generate an application with Astraflow'
        value={workflowText}
        onChange={e => handleWorkflowChange(e.target.value)}
      />

      {error && (
        <div className="text-red-500 mb-4">
          {error}
        </div>
      )}

      {workflowInfo && (
        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded">
          <h3 className="font-medium text-gray-700 mb-2">Workflow Analysis:</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>Name:</strong> {workflow.name || 'Untitled Workflow'}</p>
            <p><strong>Nodes:</strong> {workflowInfo.totalNodes}</p>
            <p><strong>Types:</strong> {Object.entries(workflowInfo.nodeTypes).map(([type, count]) => `${type} (${count})`).join(', ')}</p>
            <p><strong>Multi-step:</strong> {workflowInfo.isMultiStep ? '✅ Yes - Will generate step-by-step UI' : '❌ No - Single component'}</p>
            {getWebhookInfo(workflow) && (
              <p><strong>🔗 Webhook:</strong> <code className="bg-gray-100 px-1 rounded text-xs">{getWebhookInfo(workflow)}</code></p>
            )}
          </div>
        </div>
      )}

      {getWebhookInfo(workflow) && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
          <p className="text-green-800 text-sm">
            <strong>🚀 Real Workflow Execution Enabled!</strong> This workflow will execute against your n8n cloud instance with actual webhook calls.
          </p>
        </div>
      )}

      <div className="flex gap-3 mb-4">
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
          onClick={generateUI}
          disabled={!workflow.nodes || workflow.nodes.length === 0 || isGenerating}
        >
          {isGenerating ? (
            <span className="animate-spin">⏳</span>
          ) : null}
          {workflowInfo?.isMultiStep ? 'Generate Multi-Step UI' : 'Generate UI Component'}
        </button>

        <button
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50 flex items-center gap-2"
          onClick={generateApp}
          disabled={!workflow.nodes || workflow.nodes.length === 0 || !workflow.name || isGenerating}
        >
          {isGenerating ? (
            <span className="animate-spin">⏳</span>
          ) : null}
          🚀 Generate Complete App
        </button>
      </div>

      {!workflow.name && workflow.nodes && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-yellow-800 text-sm">
            <strong>Note:</strong> Add a "name" field to your workflow JSON to enable complete app generation.
          </p>
        </div>
      )}

      {code && (
        <div className="space-y-4">
          <div>
            <h2 className="font-semibold mb-2">🚀 Live Application Preview:</h2>
            <AppLivePreview code={code} workflow={workflow} />
          </div>
          
          <details className="border border-gray-200 rounded">
            <summary className="bg-gray-50 px-4 py-2 cursor-pointer font-medium text-gray-700 hover:bg-gray-100">
              📝 View Generated Code
            </summary>
            <div className="p-4 bg-gray-900 text-gray-100">
              <pre className="text-sm overflow-auto max-h-64">
                <code>{code}</code>
              </pre>
            </div>
          </details>
        </div>
      )}

      {projectFiles && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Astraflow Generated App: {projectName}</h2>
            <button
              onClick={downloadProject}
              className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 flex items-center gap-2"
            >
              � Download ZIP Project
            </button>
          </div>
          
          <div className="bg-gray-50 border rounded-lg p-4">
            <h3 className="font-medium mb-3">Project Structure:</h3>
            <div className="font-mono text-sm">
              <div className="text-blue-600 font-semibold">{projectName}/</div>
              {Object.keys(projectFiles).map(filePath => (
                <div key={filePath} className="ml-4 text-gray-700">
                  📄 {filePath}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Object.entries(projectFiles).map(([filePath, content]) => (
              <div key={filePath} className="bg-white border rounded-lg">
                <div className="bg-gray-100 px-4 py-2 text-sm font-medium border-b">
                  {filePath}
                </div>
                <pre className="p-4 text-xs overflow-auto max-h-64 bg-gray-900 text-gray-100">
                  <code>{typeof content === 'string' ? content : JSON.stringify(content, null, 2)}</code>
                </pre>
              </div>
            ))}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded p-4">
            <h4 className="font-medium text-blue-800 mb-2">🚀 Next Steps:</h4>
            <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
              <li>Click "📦 Download ZIP Project" above</li>
              <li>Extract the ZIP file to your desired location</li>
              <li>Open terminal in the extracted folder</li>
              <li>Run <code className="bg-blue-100 px-1 rounded">npm install</code></li>
              <li>Run <code className="bg-blue-100 px-1 rounded">npm start</code></li>
              <li>Your workflow app will be running at http://localhost:3000</li>
            </ol>
            <div className="mt-3 p-2 bg-blue-100 rounded">
              <p className="text-xs text-blue-600">
                💡 <strong>Tip:</strong> The downloaded ZIP contains a complete React project with proper folder structure, 
                not just a JSON file. You can extract it anywhere and run it as a standalone application!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
