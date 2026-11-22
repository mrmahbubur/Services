import React, { useState, useRef, useCallback } from 'react';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  X,
  ShieldCheck,
  Lock,
  FileCheck2,
  HardDrive,
} from 'lucide-react';

export interface SecureDocumentRecord {
  docId: string;
  name: string;
  sizeBytes: number;
  sizeFormatted: string;
  mimeType: string;
  checksumSha256: string;
  scanStatus: 'scanning' | 'passed' | 'quarantined';
  uploadedAt: string;
  base64Content?: string;
}

interface ProjectFileUploadZoneProps {
  onFilesChange: (files: SecureDocumentRecord[]) => void;
  files: SecureDocumentRecord[];
  maxFiles?: number;
  maxSizeBytes?: number;
  isDark?: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export const ProjectFileUploadZone: React.FC<ProjectFileUploadZoneProps> = ({
  onFilesChange,
  files,
  maxFiles = 6,
  maxSizeBytes = 25 * 1024 * 1024,
  isDark = true,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (fileList: FileList | File[]) => {
      setErrorMessage(null);
      const incoming = Array.from(fileList);

      if (files.length + incoming.length > maxFiles) {
        setErrorMessage(`Maximum of ${maxFiles} project files allowed per order.`);
        return;
      }

      const added: SecureDocumentRecord[] = [];
      for (const file of incoming) {
        if (file.size > maxSizeBytes) {
          setErrorMessage(`"${file.name}" exceeds the maximum allowed size of 25 MB.`);
          continue;
        }

        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        if (['exe', 'bat', 'sh', 'vbs', 'scr', 'cmd', 'ps1', 'msi', 'dll', 'js'].includes(ext)) {
          setErrorMessage(`File "${file.name}" has an executable extension and was blocked by security policy.`);
          continue;
        }

        setUploadingFiles((prev) => [...prev, file.name]);
        try {
          const base64Content = await fileToBase64(file);
          const res = await fetch('/api/uploads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: file.name,
              mimeType: file.type || 'application/octet-stream',
              base64Content,
            }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok || !data.document) {
            setErrorMessage(data.error || `Failed to upload "${file.name}".`);
            continue;
          }

          added.push({
            docId: data.document.docId,
            name: data.document.name,
            sizeBytes: data.document.sizeBytes,
            sizeFormatted: formatBytes(data.document.sizeBytes),
            mimeType: data.document.mimeType,
            checksumSha256: data.document.checksumSha256,
            scanStatus: data.document.scanStatus || 'passed',
            uploadedAt: data.document.uploadedAt,
            base64Content,
          });
        } catch (err: any) {
          setErrorMessage(err?.message || `Failed to upload "${file.name}".`);
        } finally {
          setUploadingFiles((prev) => prev.filter((n) => n !== file.name));
        }
      }

      if (added.length > 0) {
        onFilesChange([...files, ...added]);
      }
    },
    [files, maxFiles, maxSizeBytes, onFilesChange]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      e.target.value = '';
    }
  };

  const removeFile = (docId: string) => {
    onFilesChange(files.filter((f) => f.docId !== docId));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <label className={`block text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
            Upload Project Files & Specifications
          </label>
          <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Uploaded directly to server storage with SHA-256 verification.
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 rounded-md self-start sm:self-auto">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Server SHA-256 Verified</span>
        </div>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-6 transition-all duration-200 cursor-pointer text-center select-none ${
          isDragging
            ? 'border-cyan-400 bg-cyan-500/15 scale-[1.01]'
            : isDark
            ? 'border-slate-700/80 hover:border-cyan-500/60 bg-slate-900/40 hover:bg-slate-900/60'
            : 'border-slate-300 hover:border-cyan-500 bg-slate-50 hover:bg-cyan-50/20'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleInputChange}
          className="hidden"
          accept=".pdf,.docx,.doc,.zip,.png,.jpg,.jpeg,.txt,.md,.json,.csv"
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform ${
              isDragging
                ? 'bg-cyan-400 text-slate-950 scale-110 shadow-lg shadow-cyan-500/30'
                : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
            }`}
          >
            <Upload className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {isDragging ? 'Drop files here to upload' : 'Drop project files here, or browse local device'}
            </p>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Supports PDF, DOCX, ZIP, PNG, JPG, Markdown, JSON, CSV (up to 25 MB per file)
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-1 text-[11px] text-slate-400 font-mono">
            <span className="flex items-center gap-1">
              <Lock className="w-3 h-3 text-cyan-400" /> Server SHA-256 Digest
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" /> Executable Blocking
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <HardDrive className="w-3 h-3 text-indigo-400" /> Private Storage
            </span>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="ml-auto text-rose-400 hover:text-rose-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map((name) => (
            <div key={name} className={`p-3 rounded-xl border text-xs flex items-center gap-2 font-mono ${
              isDark ? 'bg-slate-900 border-cyan-500/30 text-cyan-300' : 'bg-cyan-50 border-cyan-300 text-cyan-800'
            }`}>
              <Upload className="w-3.5 h-3.5 animate-pulse" />
              <span>Uploading {name} to server...</span>
            </div>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-2">
          <div className={`flex items-center justify-between text-xs font-semibold px-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            <span>Uploaded Documents ({files.length} of {maxFiles})</span>
            <span className="text-[11px] text-emerald-500 font-mono flex items-center gap-1">
              <FileCheck2 className="w-3 h-3" /> Stored on Server
            </span>
          </div>

          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.docId}
                className={`p-3 rounded-xl border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                  isDark
                    ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-500 flex items-center justify-center shrink-0 mt-0.5">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold truncate block ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{file.name}</span>
                      <span className="text-[10px] font-mono text-slate-500 shrink-0">{file.sizeFormatted}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-slate-400">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Stored ({file.docId})
                      </span>
                      <span className="text-slate-500" title={`Full SHA-256: ${file.checksumSha256}`}>
                        SHA-256: {file.checksumSha256.slice(0, 12)}...
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeFile(file.docId)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors self-end sm:self-auto"
                  title="Remove document"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
