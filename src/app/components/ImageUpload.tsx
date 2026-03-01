'use client'

import { useState, useRef } from 'react'

const PIPELINE_BASE = 'https://api.almostcrackd.ai'

const SUPPORTED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
]

interface GeneratedCaption {
  id: string
  content: string
  [key: string]: unknown
}

export default function ImageUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [captions, setCaptions] = useState<GeneratedCaption[]>([])
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return

    if (!SUPPORTED_TYPES.includes(selected.type)) {
      setError(`Unsupported file type: ${selected.type}. Please use JPEG, PNG, WebP, GIF, or HEIC.`)
      return
    }

    setFile(selected)
    setError(null)
    setCaptions([])
    setPreview(URL.createObjectURL(selected))
  }

  const getAccessToken = async (): Promise<string> => {
    const res = await fetch('/api/auth/token')
    if (!res.ok) throw new Error('Failed to get access token. Are you logged in?')
    const data = await res.json()
    return data.accessToken
  }

  const handleUploadAndCaption = async () => {
    if (!file) return

    setIsLoading(true)
    setError(null)
    setCaptions([])

    try {
      // Get JWT token
      setStatus('Authenticating...')
      const token = await getAccessToken()

      // Step 1: Generate presigned URL
      setStatus('Preparing upload...')
      const presignedRes = await fetch(`${PIPELINE_BASE}/pipeline/generate-presigned-url`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contentType: file.type }),
      })

      if (!presignedRes.ok) {
        const errBody = await presignedRes.text()
        throw new Error(`Failed to generate presigned URL: ${presignedRes.status} ${errBody}`)
      }

      const { presignedUrl, cdnUrl } = await presignedRes.json()

      // Step 2: Upload image bytes to presigned URL
      setStatus('Uploading image...')
      const uploadRes = await fetch(presignedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      })

      if (!uploadRes.ok) {
        throw new Error(`Failed to upload image: ${uploadRes.status}`)
      }

      // Step 3: Register image URL in the pipeline
      setStatus('Registering image...')
      const registerRes = await fetch(`${PIPELINE_BASE}/pipeline/upload-image-from-url`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: cdnUrl,
          isCommonUse: false,
        }),
      })

      if (!registerRes.ok) {
        const errBody = await registerRes.text()
        throw new Error(`Failed to register image: ${registerRes.status} ${errBody}`)
      }

      const { imageId } = await registerRes.json()

      // Step 4: Generate captions
      setStatus('Generating captions...')
      const captionRes = await fetch(`${PIPELINE_BASE}/pipeline/generate-captions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageId }),
      })

      if (!captionRes.ok) {
        const errBody = await captionRes.text()
        throw new Error(`Failed to generate captions: ${captionRes.status} ${errBody}`)
      }

      const captionData = await captionRes.json()
      const captionsList = Array.isArray(captionData) ? captionData : captionData.captions || []
      setCaptions(captionsList)
      setStatus('Done!')
    } catch (err) {
      console.error('Pipeline error:', err)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      setStatus('')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setFile(null)
    setPreview(null)
    setCaptions([])
    setError(null)
    setStatus('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6 mb-8">
      <h2 className="text-xl font-bold text-gray-800 mb-4">📸 Upload Image & Generate Captions</h2>

      {/* File input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-600 mb-2">
          Choose an image (JPEG, PNG, WebP, GIF, HEIC)
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept={SUPPORTED_TYPES.join(',')}
          onChange={handleFileChange}
          disabled={isLoading}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 file:cursor-pointer disabled:opacity-50"
        />
      </div>

      {/* Preview */}
      {preview && (
        <div className="mb-4 bg-gray-50 rounded-lg p-2">
          <img
            src={preview}
            alt="Preview"
            className="max-h-64 mx-auto object-contain rounded"
          />
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-3 mb-4">
        <button
          onClick={handleUploadAndCaption}
          disabled={!file || isLoading}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Processing...' : 'Upload & Generate Captions'}
        </button>
        {file && (
          <button
            onClick={handleReset}
            disabled={isLoading}
            className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-lg font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      {/* Status */}
      {status && isLoading && (
        <div className="flex items-center gap-2 text-sm text-blue-600 mb-4">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {status}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Generated captions */}
      {captions.length > 0 && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">Generated Captions</h3>
          <div className="space-y-2">
            {captions.map((caption, index) => (
              <div
                key={caption.id || index}
                className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4"
              >
                <p className="text-gray-800">&ldquo;{caption.content}&rdquo;</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
