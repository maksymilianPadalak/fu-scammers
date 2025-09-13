export interface AIDetectionFrame {
  frame: number
  ai_likelihood: number // 0..1
  artifacts_detected: string[]
  rationale: string
}

// New summary shape from the system prompt
export interface AIDetectionSummary {
  ai_generated_likelihood: number // 0..1
  label: 'ai' | 'human' | 'uncertain'
  artifacts_detected: string[]
  rationale: string[]
}

export type AIDetection = AIDetectionFrame[] | AIDetectionSummary

export interface ParseResult<T> {
  data: T | null
  error?: string
}

function isFrame(obj: any): obj is AIDetectionFrame {
  return (
    obj &&
    typeof obj.frame === 'number' &&
    typeof obj.ai_likelihood === 'number' &&
    Array.isArray(obj.artifacts_detected) &&
    typeof obj.rationale === 'string'
  )
}

function isFrameArray(obj: any): obj is AIDetectionFrame[] {
  return Array.isArray(obj) && obj.length > 0 && obj.every(isFrame)
}

function isSummary(obj: any): obj is AIDetectionSummary {
  return (
    obj &&
    typeof obj.ai_generated_likelihood === 'number' &&
    ['ai', 'human', 'uncertain'].includes(obj.label) &&
    Array.isArray(obj.artifacts_detected) &&
    Array.isArray(obj.rationale)
  )
}

// Try to extract and parse JSON from a possibly verbose LLM output.
export function parseAIDetectionOutput(text: string): ParseResult<AIDetection> {
  if (!text || typeof text !== 'string') {
    return { data: null, error: 'Empty analysis text' }
  }

  const tryParse = (s: string): AIDetection | null => {
    try {
      const parsed = JSON.parse(s)
      if (isSummary(parsed) || isFrameArray(parsed)) return parsed
      return null
    } catch {
      return null
    }
  }

  // 1) Try as-is
  let data = tryParse(text)
  if (data) return { data }

  // 2) Try to extract from Markdown code block ```json ... ```
  const codeBlock = /```(?:json)?\s*([\s\S]*?)```/i.exec(text)
  if (codeBlock?.[1]) {
    data = tryParse(codeBlock[1].trim())
    if (data) return { data }
  }

  // 3) Try to locate first JSON object { ... } if present
  const objStart = text.indexOf('{')
  const objEnd = text.lastIndexOf('}')
  if (objStart !== -1 && objEnd !== -1 && objEnd > objStart) {
    const candidate = text.slice(objStart, objEnd + 1)
    data = tryParse(candidate)
    if (data) return { data }
  }

  // 4) Try to locate first [ ... ] balanced block
  const start = text.indexOf('[')
  const end = text.lastIndexOf(']')
  if (start !== -1 && end !== -1 && end > start) {
    const candidate = text.slice(start, end + 1)
    data = tryParse(candidate)
    if (data) return { data }
  }

  return { data: null, error: 'Failed to parse AI detection JSON from analysis output' }
}
