import fetch from 'node-fetch';
import FormData from 'form-data';
import { Readable } from 'stream';

// Vercel deployment function
async function deployToVercel(projectData) {
  const VERCEL_TOKEN = 'BfDlTZTJoS7XC0j2RRUPzknI';
  
  try {
    // Prepare files for Vercel deployment
    const files = [];
    
    Object.entries(projectData.files).forEach(([filePath, content]) => {
      files.push({
        file: filePath,
        data: content
      });
    });

    // Create deployment payload
    const deploymentPayload = {
      name: projectData.name,
      files: files,
      projectSettings: {
        framework: 'create-react-app',
        buildCommand: 'npm run build',
        outputDirectory: 'build',
        installCommand: 'npm install'
      },
      target: 'production'
    };

    // Deploy to Vercel
    const deploymentResponse = await fetch('https://api.vercel.com/v13/deployments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(deploymentPayload)
    });

    if (!deploymentResponse.ok) {
      const error = await deploymentResponse.json();
      throw new Error(`Vercel deployment failed: ${error.message || 'Unknown error'}`);
    }

    const deployment = await deploymentResponse.json();
    
    // Wait for deployment to be ready (optional polling)
    let deploymentStatus = 'BUILDING';
    let attempts = 0;
    const maxAttempts = 30; // 5 minutes max

    while (deploymentStatus !== 'READY' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      
      const statusResponse = await fetch(`https://api.vercel.com/v13/deployments/${deployment.id}`, {
        headers: {
          'Authorization': `Bearer ${VERCEL_TOKEN}`
        }
      });

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        deploymentStatus = statusData.readyState;
      }
      
      attempts++;
    }

    return {
      success: true,
      url: `https://${deployment.url}`,
      deploymentId: deployment.id,
      status: deploymentStatus
    };

  } catch (error) {
    console.error('Vercel deployment error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Netlify deployment function (alternative)
async function deployToNetlify(projectData) {
  // This would require netlify API token
  // Implementation similar to Vercel but using Netlify API
  throw new Error('Netlify deployment not implemented yet');
}

export {
  deployToVercel,
  deployToNetlify
};