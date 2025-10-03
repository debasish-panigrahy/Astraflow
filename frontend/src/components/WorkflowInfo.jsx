import React from "react";

function WorkflowInfo({ workflow }) {
  const getWebhookInfo = (workflow) => {
    const webhookNode = workflow?.nodes?.find(n => 
      n.type === 'n8n-nodes-base.formTrigger' || 
      n.type === 'n8n-nodes-base.webhook'
    );
    return webhookNode?.webhookId || null;
  };

  if (!workflow) {
    return null;
  }

  return (
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
  );
}

export default WorkflowInfo;