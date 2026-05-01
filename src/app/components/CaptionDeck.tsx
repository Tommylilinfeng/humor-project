'use client'

import { useCallback, useState, useTransition } from 'react'
import {
  voteOnCaption,
  fetchNextCaptions,
  type DeckCaption,
} from '@/app/auth/actions'

interface Props {
  initialCaptions: DeckCaption[]
}

export default function CaptionDeck({ initialCaptions }: Props) {
  const [pool, setPool] = useState<DeckCaption[]>(initialCaptions)
  const [index, setIndex] = useState(0)
  const [voted, setVoted] = useState(0)
  const [exhausted, setExhausted] = useState(initialCaptions.length === 0)
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [lastVote, setLastVote] = useState<1 | -1 | null>(null)

  const current = pool[index] ?? null

  const advance = useCallback(async () => {
    const nextIdx = index + 1
    if (nextIdx < pool.length) {
      setIndex(nextIdx)
      return
    }
    const more = await fetchNextCaptions(60)
    if (more.length === 0) {
      setExhausted(true)
      setPool([])
      setIndex(0)
    } else {
      setPool(more)
      setIndex(0)
    }
  }, [index, pool.length])

  const handleVote = (value: 1 | -1) => {
    if (!current || isPending) return
    setErrorMsg(null)
    setLastVote(value)
    startTransition(async () => {
      const res = await voteOnCaption(current.id, value)
      if ('error' in res && res.error) {
        setErrorMsg(res.error)
        setLastVote(null)
        return
      }
      setVoted(v => v + 1)
      await advance()
      setLastVote(null)
    })
  }

  const handleRefresh = () => {
    setErrorMsg(null)
    startTransition(async () => {
      const more = await fetchNextCaptions(60)
      if (more.length === 0) {
        setExhausted(true)
        setPool([])
        setIndex(0)
      } else {
        setExhausted(false)
        setPool(more)
        setIndex(0)
      }
    })
  }

  if (exhausted || !current) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
        <h3 className="text-xl font-serif text-stone-900 mb-2">
          You&rsquo;re all caught up
        </h3>
        <p className="text-stone-500 mb-6 text-sm">
          {voted > 0
            ? `${voted} caption${voted === 1 ? '' : 's'} rated this session.`
            : 'No new captions to rate right now.'}
        </p>
        <button
          onClick={handleRefresh}
          disabled={isPending}
          className="px-5 py-2.5 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800 disabled:bg-stone-300 transition-colors"
        >
          {isPending ? 'Checking…' : 'Check for new captions'}
        </button>
      </div>
    )
  }

  const remaining = pool.length - index

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
      {current.image?.url && (
        <div className="w-full bg-stone-100 border-b border-stone-200">
          <img
            key={current.id}
            src={current.image.url}
            alt={current.image.image_description || 'Caption image'}
            className="w-full h-80 object-contain"
          />
        </div>
      )}

      <div className="px-8 pt-8 pb-6">
        <p className="text-stone-900 text-2xl font-serif leading-snug text-center max-w-xl mx-auto mb-8">
          &ldquo;{current.content}&rdquo;
        </p>

        <div className="flex items-stretch justify-center gap-3">
          <button
            onClick={() => handleVote(1)}
            disabled={isPending}
            aria-label="Mark as funny"
            className={`flex-1 max-w-[220px] flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-sm font-medium transition-colors border ${
              isPending && lastVote === 1
                ? 'bg-stone-900 text-white border-stone-900'
                : 'bg-white text-stone-900 border-stone-300 hover:border-stone-900 hover:bg-stone-50'
            } ${isPending ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
          >
            <ThumbsUpIcon />
            <span>Funny</span>
          </button>

          <button
            onClick={() => handleVote(-1)}
            disabled={isPending}
            aria-label="Mark as not funny"
            className={`flex-1 max-w-[220px] flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-sm font-medium transition-colors border ${
              isPending && lastVote === -1
                ? 'bg-stone-900 text-white border-stone-900'
                : 'bg-white text-stone-500 border-stone-300 hover:border-stone-900 hover:text-stone-900 hover:bg-stone-50'
            } ${isPending ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
          >
            <ThumbsDownIcon />
            <span>Not funny</span>
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700">{errorMsg}</p>
          </div>
        )}
      </div>

      <div className="border-t border-stone-200 bg-stone-50 px-8 py-3 flex items-center justify-between text-xs text-stone-500">
        <span>{current.upvotes} funny · {current.downvotes} not</span>
        <span>{remaining} left in batch · {voted} rated</span>
      </div>
    </div>
  )
}

function ThumbsUpIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 10v12" />
      <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H7V10l5-9 1 .5a2 2 0 0 1 1 2.38Z" />
    </svg>
  )
}

function ThumbsDownIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 14V2" />
      <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H17v12l-5 9-1-.5a2 2 0 0 1-1-2.38Z" />
    </svg>
  )
}
