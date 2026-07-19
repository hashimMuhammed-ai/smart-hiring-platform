'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import type { FileRejection } from 'react-dropzone';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_FILES = 20;

interface ResumeDropzoneProps {
  onAccepted: (files: File[]) => void;
  disabled?: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getRejectionMessage(rejection: FileRejection): string {
  const code = rejection.errors[0]?.code;
  if (code === 'file-too-large') {
    return `${rejection.file.name} is too large (max 5 MB, got ${formatBytes(rejection.file.size)})`;
  }
  if (code === 'file-invalid-type') {
    return `${rejection.file.name} is not a PDF`;
  }
  if (code === 'too-many-files') {
    return `Too many files — max ${MAX_FILES} at once`;
  }
  return `${rejection.file.name}: ${rejection.errors[0]?.message ?? 'Invalid file'}`;
}

export default function ResumeDropzone({ onAccepted, disabled = false }: ResumeDropzoneProps) {
  const onDrop = useCallback(
    (accepted: File[], _rejections: FileRejection[]) => {
      if (accepted.length > 0) {
        onAccepted(accepted);
      }
      // Rejections are surfaced via fileRejections from useDropzone state
    },
    [onAccepted],
  );


  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragReject,
    fileRejections,
  } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: MAX_FILES,
    maxSize: MAX_FILE_SIZE,
    disabled,
    multiple: true,
  });

  const zoneClass = [
    'dropzone',
    isDragActive && !isDragReject ? 'dropzone--active' : '',
    isDragReject ? 'dropzone--reject' : '',
    disabled ? 'dropzone--disabled' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="dropzone-wrapper">
      <div
        {...getRootProps()}
        className={zoneClass}
        id="resume-dropzone"
        aria-label="Drop PDF resumes here or click to browse"
      >
        <input {...getInputProps()} id="resume-file-input" aria-label="Upload PDF files" />

        <div className="dropzone-content">
          {isDragReject ? (
            <>
              <div className="dropzone-icon dropzone-icon--reject" aria-hidden="true">✗</div>
              <p className="dropzone-label">PDFs only — drop rejected files</p>
            </>
          ) : isDragActive ? (
            <>
              <div className="dropzone-icon dropzone-icon--active" aria-hidden="true">↓</div>
              <p className="dropzone-label">Release to upload</p>
            </>
          ) : (
            <>
              <div className="dropzone-icon" aria-hidden="true">📄</div>
              <p className="dropzone-label">
                {disabled ? 'Upload in progress…' : 'Drop PDF resumes here, or click to browse'}
              </p>
              <p className="dropzone-hint">
                PDF only · max 5 MB per file · up to {MAX_FILES} files
              </p>
            </>
          )}
        </div>
      </div>

      {/* Inline rejection errors */}
      {fileRejections.length > 0 && (
        <ul className="dropzone-rejections" role="alert" aria-live="polite">
          {fileRejections.map((r, i) => (
            <li key={`${r.file.name}-${i}`} className="dropzone-rejection-item">
              ⚠ {getRejectionMessage(r)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
