// Multi-format Deliverable File Exporter for M R S Platform

export type DeliverableFormat = 'html' | 'md' | 'json' | 'txt';

export interface MultiTypeFileSpec {
  format: DeliverableFormat;
  filename: string;
  label: string;
  description: string;
  iconName: string;
  mimeType: string;
  getContent: () => string;
}

export function triggerDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function generateServiceDeliverableFiles(
  serviceName: string,
  serviceId: string,
  orderId: string,
  clientId: string,
  clientName: string
): MultiTypeFileSpec[] {
  const timestamp = new Date().toISOString();
  const cleanServiceName = serviceName.replace(/[^a-zA-Z0-9]/g, '_');
  const baseFilename = `${orderId}_${cleanServiceName}_v1.0`;
  const siteOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://mrs-services.ai.studio';

  return [
    {
      format: 'html',
      filename: `${baseFilename}_Brief.html`,
      label: 'Printable Brief (.html)',
      description: 'Clean printable HTML deliverable summary for browser Print-to-PDF export.',
      iconName: 'FileText',
      mimeType: 'text/html',
      getContent: () => {
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${serviceName} — ${orderId}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 780px; margin: 40px auto; color: #0f172a; line-height: 1.6; padding: 0 20px; }
    h1 { font-size: 22px; border-bottom: 2px solid #0284c7; padding-bottom: 8px; }
    .meta { background: #f1f5f9; padding: 14px 18px; border-radius: 8px; font-size: 13px; margin-bottom: 24px; }
  </style>
</head>
<body>
  <h1>M R S Deliverable Summary: ${serviceName}</h1>
  <div class="meta">
    <div><strong>Client:</strong> ${clientName} (${clientId})</div>
    <div><strong>Order Reference:</strong> ${orderId}</div>
    <div><strong>Service ID:</strong> ${serviceId}</div>
    <div><strong>Coordinator:</strong> Camellia · M R S AI Assistant (Owner Reviewed)</div>
    <div><strong>Generated:</strong> ${timestamp}</div>
  </div>
  <h2>Portal & Support Details</h2>
  <p>Full deliverable files and release status are managed in the Client Portal at <code>${siteOrigin}/portal</code>.</p>
  <p>Owner Desk: <strong>mr216873@gmail.com</strong> · Office: <strong>+8809611056361</strong></p>
</body>
</html>`;
      },
    },
    {
      format: 'md',
      filename: `${baseFilename}.md`,
      label: 'Markdown Source (.md)',
      description: 'Complete editable Markdown documentation and specification summary.',
      iconName: 'FileCode',
      mimeType: 'text/markdown',
      getContent: () => {
        return `# M R S Deliverable: ${serviceName}
**Client:** ${clientName}  
**Client ID:** \`${clientId}\`  
**Order Reference:** \`${orderId}\`  
**Generated On:** ${new Date().toLocaleDateString()}  
**AI Coordinator:** Camellia · M R S AI Assistant  
**Owner Contact:** Md. Mahbubur Rahman (\`mr216873@gmail.com\`)  

---

## 1. Deliverable Overview
This file accompanies the verified production deliverables for **${serviceName}** under order **${orderId}**.

## 2. Revision & Support Policy
- **Portal URL:** ${siteOrigin}/portal
- **Revisions:** 2 free revision rounds within 7 days of release (within agreed kickoff scope)

---
*Coordinated by Camellia · M R S AI Assistant · M R S Services*
`;
      },
    },
    {
      format: 'json',
      filename: `${baseFilename}.json`,
      label: 'Structured Spec (.json)',
      description: 'Machine-readable JSON metadata for this service engagement.',
      iconName: 'Code',
      mimeType: 'application/json',
      getContent: () => {
        return JSON.stringify(
          {
            platform: 'M R S Services',
            service: {
              id: serviceId,
              name: serviceName,
              orderId,
            },
            client: {
              id: clientId,
              name: clientName,
            },
            metadata: {
              version: '1.0.0',
              generatedAt: timestamp,
              portalUrl: `${siteOrigin}/portal`,
              coordinator: 'Camellia · M R S AI Assistant',
            },
          },
          null,
          2
        );
      },
    },
    {
      format: 'txt',
      filename: `${clientId}_${cleanServiceName}_summary.txt`,
      label: 'Plaintext Summary (.txt)',
      description: 'Direct portal reference, support contacts, and scheduling links.',
      iconName: 'Key',
      mimeType: 'text/plain',
      getContent: () => {
        return `=====================================================
M R S PLATFORM - ORDER & DELIVERY REFERENCE
=====================================================
Client ID      : ${clientId}
Client Name    : ${clientName}
Order Ref      : ${orderId}
Service        : ${serviceName}
Generated Date : ${timestamp}

Portal & Owner Contacts:
-----------------------------------------------------
Client Portal  : ${siteOrigin}/portal
Owner Email    : mr216873@gmail.com
Office Phone   : +8809611056361
Calendly Sync  : https://calendly.com/mrxshahin
Gravatar Hub   : https://gravatar.com/mrxshahin
GitHub Profile : https://github.com/mrmahbubur
=====================================================`;
      },
    },
  ];
}
