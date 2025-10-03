
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.post('/generate-ui', async (req, res) => {
  try {
    const { workflow } = req.body;

    const prompt = `
      Generate ONLY a React functional component for this n8n workflow:
      ${JSON.stringify(workflow)}
      
      CRITICAL REQUIREMENTS FOR LIVE PREVIEW WITH REAL N8N EXECUTION:
      1. NO import statements (React is provided automatically)
      2. NO export statements  
      3. Component must be named 'WorkflowApp'
      4. Use React hooks: useState, useEffect, useMemo (available in scope)
      5. Use 'workflow' variable for data (provided in scope)
      6. Style with Tailwind CSS classes only
      7. Create a multi-step application for the workflow
      8. For form submissions, use fetch to POST to: https://devasish.app.n8n.cloud/webhook/${workflow.nodes.find(n => n.type === 'n8n-nodes-base.formTrigger' || n.type === 'n8n-nodes-base.webhook')?.webhookId || 'webhook-id'}
      9. Handle real webhook responses and show success/error states
      10. Make forms interactive with actual n8n workflow execution
      11. Show loading states during API calls
      12. Display real responses from the workflow

      CONSISTENT DESIGN SYSTEM - FOLLOW THESE EXACT STYLES:
      - Container: max-w-4xl mx-auto p-6 bg-white
      - Headers: text-3xl font-bold text-gray-800 mb-6
      - Subheaders: text-xl font-semibold text-gray-700 mb-4
      - Cards: bg-white border border-gray-200 rounded-lg shadow-sm p-6 mb-6
      - Form inputs: w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500
      - Labels: block text-sm font-medium text-gray-700 mb-2
      - Primary buttons: bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors
      - Secondary buttons: bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-3 px-6 rounded-lg transition-colors
      - Success states: bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg
      - Error states: bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg
      - Loading states: bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg
      - Step indicators: flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-semibold
      - Progress bars: bg-gray-200 rounded-full h-2 with bg-blue-600 fill
      - Form sections: space-y-4 mb-6
      - Grid layouts: grid grid-cols-1 md:grid-cols-2 gap-6
      - Always use consistent spacing: mb-6 for sections, mb-4 for elements, mb-2 for labels
      
      For the form submission, use this pattern:
      const handleSubmit = async (formData) => {
        setLoading(true);
        try {
          const response = await fetch('https://devasish.app.n8n.cloud/webhook/${workflow.nodes.find(n => n.webhookId)?.webhookId}', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
          });
          const result = await response.json();
          // Handle success
        } catch (error) {
          // Handle error
        } finally {
          setLoading(false);
        }
      };
      
      Generate this exact structure:
      function WorkflowApp() {
        const [currentStep, setCurrentStep] = useState(0);
        const [formData, setFormData] = useState({});
        const [loading, setLoading] = useState(false);
        const [response, setResponse] = useState(null);
        const [error, setError] = useState(null);
        
        // implement real workflow execution
        return (
          <div className="max-w-4xl mx-auto p-6">
            {/* your UI here with real form submission */}
          </div>
        );
      }
    `;

    const response = await openai.chat.completions.create({
      // model: "gpt-4",
      model:"gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3
    });

    const generatedCode = response.choices[0].message.content;
    res.json({ code: generatedCode });
  } catch (err) {
    console.error(err);
    res.status(500).send("AI generation failed");
  }
});

// New endpoint for generating complete React app projects
app.post('/generate-app', async (req, res) => {
  try {
    const { workflow } = req.body;
    
    if (!workflow || !workflow.name) {
      return res.status(400).json({ error: 'Workflow must have a name' });
    }

    // Generate the project structure
    const projectStructure = await generateProjectStructure(workflow);
    
    res.json({ 
      projectName: workflow.name,
      files: projectStructure 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Project generation failed" });
  }
});

// Helper function to generate complete project structure
async function generateProjectStructure(workflow) {
  const projectName = workflow.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  
  // Generate main App component
  const appComponent = await generateAppComponent(workflow);
  
  // Generate individual components for each node type
  const components = await generateNodeComponents(workflow);
  
  const files = {
    'package.json': generatePackageJson(projectName, workflow),
    'public/index.html': generateIndexHtml(workflow),
    'src/index.js': generateIndexJs(),
    'src/App.jsx': appComponent,
    'src/index.css': generateIndexCss(),
    'README.md': generateReadme(workflow),
    '.gitignore': generateGitignore()
  };

  // Add component files
  components.forEach((component, index) => {
    files[`src/components/${component.name}.jsx`] = component.code;
  });

  return files;
}

// Generate package.json for the project
function generatePackageJson(projectName, workflow) {
  // Analyze workflow to determine required packages
  const requiredPackages = {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1"
  };

  // Check if workflow needs additional packages
  const workflowStr = JSON.stringify(workflow);
  
  // Add axios if HTTP requests are needed
  if (workflowStr.includes('webhook') || workflowStr.includes('http')) {
    requiredPackages.axios = "^1.6.0";
  }
  
  // Add prop-types if components use them
  requiredPackages["prop-types"] = "^15.8.1";
  
  // Add react-syntax-highlighter if function nodes exist
  if (workflowStr.includes('function') || workflowStr.includes('Function')) {
    requiredPackages["react-syntax-highlighter"] = "^15.5.0";
  }

  return JSON.stringify({
    name: projectName,
    version: "1.0.0",
    description: `Generated React app for n8n workflow: ${workflow.name}`,
    private: true,
    dependencies: requiredPackages,
    scripts: {
      "start": "react-scripts start",
      "build": "react-scripts build",
      "test": "react-scripts test",
      "eject": "react-scripts eject"
    },
    eslintConfig: {
      extends: ["react-app", "react-app/jest"]
    },
    browserslist: {
      production: [">0.2%", "not dead", "not op_mini all"],
      development: ["last 1 chrome version", "last 1 firefox version", "last 1 safari version"]
    }
  }, null, 2);
}

// Generate index.html
function generateIndexHtml(workflow) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="${workflow.name} - Generated from n8n workflow" />
    <title>${workflow.name}</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>`;
}

// Generate index.js
function generateIndexJs() {
  return `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`;
}

// Generate index.css
function generateIndexCss() {
  return `@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
    monospace;
}`;
}

// Generate README.md
function generateReadme(workflow) {
  return `# ${workflow.name}

Generated React application from n8n workflow.

## About

This app was automatically generated from an n8n workflow with ${workflow.nodes?.length || 0} nodes.

### Workflow Nodes:
${workflow.nodes?.map(node => `- **${node.name}** (${node.type})`).join('\n') || 'No nodes found'}

## Getting Started

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Start the development server:
   \`\`\`bash
   npm start
   \`\`\`

3. Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

## Available Scripts

- \`npm start\` - Runs the app in development mode
- \`npm run build\` - Builds the app for production
- \`npm test\` - Launches the test runner

## Deployment

Run \`npm run build\` to create a production build in the \`build\` folder.

---

*Generated by AI Frontend Demo*`;
}

// Generate .gitignore
function generateGitignore() {
  return `# See https://help.github.com/articles/ignoring-files/ for more about ignoring files.

# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# production
/build

# misc
.DS_Store
.env.local
.env.development.local
.env.test.local
.env.production.local

npm-debug.log*
yarn-debug.log*
yarn-error.log*`;
}

// Generate main App component using AI
async function generateAppComponent(workflow) {
  const webhookNode = workflow.nodes?.find(n => 
    n.type === 'n8n-nodes-base.formTrigger' || 
    n.type === 'n8n-nodes-base.webhook'
  );
  
  const webhookUrl = webhookNode?.webhookId ? 
    `https://devasish.app.n8n.cloud/webhook/${webhookNode.webhookId}` : 
    'https://devasish.app.n8n.cloud/webhook/your-webhook-id';

  const prompt = `Generate ONLY a complete React App.jsx file for this n8n workflow:
${JSON.stringify(workflow)}

CRITICAL REQUIREMENTS FOR REAL N8N INTEGRATION:
1. Return ONLY pure JSX/JavaScript code - NO explanations, NO comments, NO descriptions
2. Start with imports, end with export default App
3. Component name must be: App
4. Include ALL necessary imports (React, useState, useEffect, axios if needed)
5. Connect to REAL n8n webhook: ${webhookUrl}
6. Handle real form submissions to the webhook URL
7. Show actual loading states and responses
8. Use Tailwind CSS classes for styling
9. Include proper error handling for API calls
10. Make it a complete, working React component that executes real workflows
11. NO markdown code blocks, NO explanatory text
12. File must be valid JavaScript that can run immediately

CONSISTENT DESIGN SYSTEM - FOLLOW THESE EXACT STYLES:
- Container: max-w-4xl mx-auto p-6 bg-white min-h-screen
- Page header: text-3xl font-bold text-gray-800 mb-6
- Section headers: text-xl font-semibold text-gray-700 mb-4
- Cards: bg-white border border-gray-200 rounded-lg shadow-sm p-6 mb-6
- Form inputs: w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500
- Input labels: block text-sm font-medium text-gray-700 mb-2
- Primary buttons: bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-lg transition-colors
- Secondary buttons: bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-3 px-6 rounded-lg transition-colors
- Success messages: bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg mb-4
- Error messages: bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg mb-4
- Loading states: bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg mb-4
- Step indicators: flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white font-semibold text-lg
- Progress indicators: bg-gray-200 rounded-full h-3 with bg-blue-600 fill
- Form sections: space-y-4 mb-6
- Grid layouts: grid grid-cols-1 md:grid-cols-2 gap-6
- Consistent spacing: mb-6 for major sections, mb-4 for elements, mb-2 for labels
- Text styles: text-gray-600 for descriptions, text-gray-800 for content

For form submissions, use this pattern:
const handleSubmit = async (formData) => {
  setLoading(true);
  try {
    const response = await fetch('${webhookUrl}', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    const result = await response.json();
    setSuccess(true);
    setResult(result);
  } catch (error) {
    setError(error.message);
  } finally {
    setLoading(false);
  }
};

Generate the complete App.jsx file content now:`;

  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3
  });

  return cleanCodeResponse(response.choices[0].message.content);
}

// Generate individual components for different node types
async function generateNodeComponents(workflow) {
  const components = [];
  const nodeTypes = [...new Set(workflow.nodes?.map(node => node.type) || [])];

  for (const nodeType of nodeTypes) {
    const nodesOfType = workflow.nodes.filter(node => node.type === nodeType);
    const componentName = nodeTypeToComponentName(nodeType);
    
    const prompt = `Generate ONLY a React component file for n8n node type: ${nodeType}

CRITICAL REQUIREMENTS:
1. Return ONLY pure JSX/JavaScript code - NO explanations, NO markdown blocks
2. Component name: ${componentName}
3. Handle these specific nodes: ${JSON.stringify(nodesOfType)}
4. Include ALL necessary imports
5. Use Tailwind CSS for styling
6. Export as default
7. NO comments explaining the code, NO descriptions
8. Valid JavaScript only

Nodes to handle: ${JSON.stringify(nodesOfType)}

Generate complete ${componentName}.jsx file:`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3
    });

    components.push({
      name: componentName,
      code: cleanCodeResponse(response.choices[0].message.content)
    });
  }

  return components;
}

// Clean AI response to remove explanations and code blocks
function cleanCodeResponse(response) {
  let cleaned = response.trim();
  
  // Remove markdown code blocks
  if (cleaned.startsWith('```')) {
    const lines = cleaned.split('\n');
    // Remove first line (```jsx or ```javascript)
    lines.shift();
    // Remove last line if it's ```
    if (lines[lines.length - 1].trim() === '```') {
      lines.pop();
    }
    cleaned = lines.join('\n');
  }
  
  // Remove any explanatory text after the component
  // Look for the last export statement and cut off everything after it
  const lastExportMatch = cleaned.match(/(.*export\s+default\s+\w+;?)\s*$/s);
  if (lastExportMatch) {
    cleaned = lastExportMatch[1];
  }
  
  // Remove explanation paragraphs (lines that don't look like code)
  const lines = cleaned.split('\n');
  const codeLines = lines.filter(line => {
    const trimmed = line.trim();
    // Keep empty lines and lines that look like code
    if (trimmed === '') return true;
    if (trimmed.startsWith('//')) return true; // Keep comments
    if (trimmed.includes('import ') || trimmed.includes('export ') || 
        trimmed.includes('function ') || trimmed.includes('const ') ||
        trimmed.includes('let ') || trimmed.includes('var ') ||
        trimmed.includes('return ') || trimmed.includes('{') || 
        trimmed.includes('}') || trimmed.includes(';') ||
        trimmed.startsWith('<') || trimmed.includes('useState') ||
        trimmed.includes('useEffect') || trimmed.includes('className')) {
      return true;
    }
    // Skip lines that look like explanations
    return false;
  });
  
  return codeLines.join('\n').trim();
}

// Helper to convert node type to component name
function nodeTypeToComponentName(nodeType) {
  const name = nodeType.split('.').pop() || nodeType;
  return name.charAt(0).toUpperCase() + name.slice(1).replace(/([A-Z])/g, '$1') + 'Component';
}

app.listen(5000, () => console.log("Server running on port 5000"));
