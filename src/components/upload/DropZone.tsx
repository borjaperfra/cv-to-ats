'use client'

import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'

interface DropZoneProps {
  onFileSelect: (file: File) => void
  disabled?: boolean
}

export default function DropZone({ onFileSelect, disabled }: DropZoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) onFileSelect(acceptedFiles[0])
    },
    [onFileSelect]
  )

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
    },
    maxFiles: 1,
    disabled,
  })

  return (
    <div
      {...getRootProps()}
      className={[
        'relative flex flex-col items-center justify-center',
        'w-full min-h-[280px] rounded-xl border-2 border-dashed',
        'cursor-pointer transition-all duration-300 p-8',
        isDragActive && !isDragReject
          ? 'border-teal bg-teal/5 scale-[1.01]'
          : isDragReject
          ? 'border-red-400 bg-red-50'
          : 'border-gray-light hover:border-teal hover:bg-bg-light',
        disabled ? 'opacity-50 cursor-not-allowed' : '',
      ].join(' ')}
    >
      <input {...getInputProps()} />

      {/* Upload Icon */}
      <div
        className={[
          'mb-4 flex items-center justify-center w-16 h-16 rounded-full transition-colors duration-300',
          isDragActive && !isDragReject ? 'bg-teal/10' : 'bg-bg-light',
        ].join(' ')}
      >
        <svg
          className={`w-8 h-8 transition-colors duration-300 ${isDragActive && !isDragReject ? 'text-teal' : 'text-gray-400'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
      </div>

      {isDragReject ? (
        <p className="text-red-500 font-sans font-[800] text-center">
          Formato no admitido
        </p>
      ) : isDragActive ? (
        <p className="text-teal font-sans font-[800] text-center">
          Suelta tu CV aquí
        </p>
      ) : (
        <>
          <p className="text-purple-dark font-sans font-[800] text-lg text-center mb-2">
            Arrastra tu CV aquí
          </p>
          <p className="text-gray-400 font-sans text-sm text-center">
            o haz clic para seleccionar un archivo
          </p>
          <p className="mt-4 text-xs text-gray-400 font-sans">
            PDF, DOCX, TXT o MD · Máximo 3 MB
          </p>
        </>
      )}
    </div>
  )
}
