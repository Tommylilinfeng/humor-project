'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

export async function signInWithGoogle() {
  const supabase = createSupabaseServerClient()
  const origin = headers().get('origin') || 'http://localhost:3000'

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  })

  if (error) {
    console.error('OAuth error:', error)
    return redirect('/?error=auth')
  }

  if (data.url) {
    return redirect(data.url)
  }
}

export async function signOut() {
  const supabase = createSupabaseServerClient()
  await supabase.auth.signOut()
  return redirect('/')
}

export async function voteOnCaption(captionId: string, voteValue: number) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be logged in to vote' }
  }

  // Check if user already voted on this caption
  const { data: existingVote } = await supabase
    .from('caption_votes')
    .select('id, vote_value')
    .eq('profile_id', user.id)
    .eq('caption_id', captionId)
    .maybeSingle()

  if (existingVote) {
    if (existingVote.vote_value === voteValue) {
      const { error } = await supabase
        .from('caption_votes')
        .delete()
        .eq('id', existingVote.id)

      if (error) {
        console.error('Error removing vote:', error)
        return { error: 'Failed to remove vote' }
      }
      return { success: true, action: 'removed' as const }
    }

    const { error } = await supabase
      .from('caption_votes')
      .update({
        vote_value: voteValue,
        modified_datetime_utc: new Date().toISOString(),
      })
      .eq('id', existingVote.id)

    if (error) {
      console.error('Error updating vote:', error)
      return { error: 'Failed to update vote' }
    }
    return { success: true, action: 'updated' as const }
  }

  const { error } = await supabase
    .from('caption_votes')
    .insert({
      profile_id: user.id,
      caption_id: captionId,
      vote_value: voteValue,
      created_datetime_utc: new Date().toISOString(),
    })

  if (error) {
    console.error('Error inserting vote:', error)
    return { error: 'Failed to submit vote' }
  }
  return { success: true, action: 'created' as const }
}

export interface DeckImage {
  id: string
  url: string | null
  image_description: string | null
}

export interface DeckCaption {
  id: string
  content: string
  image_id: string
  image: DeckImage | null
  upvotes: number
  downvotes: number
}

interface CaptionImageRaw {
  id: string
  url: string | null
  image_description: string | null
}

interface CaptionRowRaw {
  id: string
  content: string
  image_id: string
  images: CaptionImageRaw | CaptionImageRaw[] | null
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

interface BaseCaption {
  id: string
  content: string
  image_id: string
  image: DeckImage | null
}

// Round-robin interleave so the same image rarely appears back-to-back.
function interleaveByImage<T extends { id: string; image_id: string }>(captions: T[]): T[] {
  const groups: Record<string, T[]> = {}
  for (const c of captions) {
    const key = c.image_id || c.id
    if (!groups[key]) groups[key] = []
    groups[key].push(c)
  }
  for (const key of Object.keys(groups)) {
    groups[key] = shuffle(groups[key])
  }

  const keys = shuffle(Object.keys(groups))
  const result: T[] = []
  let lastKey: string | null = null
  while (keys.some(k => groups[k].length > 0)) {
    let chosen: string | undefined = keys.find(k => groups[k].length > 0 && k !== lastKey)
    if (!chosen) chosen = keys.find(k => groups[k].length > 0)
    if (!chosen) break
    const next = groups[chosen].shift()!
    result.push(next)
    lastKey = chosen
  }
  return result
}

export async function fetchNextCaptions(limit = 60): Promise<DeckCaption[]> {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const [votedRes, capRes] = await Promise.all([
    supabase
      .from('caption_votes')
      .select('caption_id')
      .eq('profile_id', user.id),
    supabase
      .from('captions')
      .select(`
        id,
        content,
        image_id,
        images (
          id,
          url,
          image_description
        )
      `)
      .eq('is_public', true),
  ])

  if (capRes.error) {
    console.error('Error fetching captions:', capRes.error)
    return []
  }

  const votedIds = new Set((votedRes.data ?? []).map(v => v.caption_id as string))
  const allRows = (capRes.data ?? []) as CaptionRowRaw[]

  const unvoted: BaseCaption[] = allRows
    .filter(r => !votedIds.has(r.id))
    .map(row => {
      let image: DeckImage | null = null
      if (Array.isArray(row.images)) image = row.images[0] ?? null
      else if (row.images) image = row.images
      return { id: row.id, content: row.content, image_id: row.image_id, image }
    })

  if (unvoted.length === 0) return []

  const sliced = interleaveByImage(shuffle(unvoted)).slice(0, limit)
  const slicedIds = sliced.map(c => c.id)

  const { data: voteRows } = await supabase
    .from('caption_votes')
    .select('caption_id, vote_value')
    .in('caption_id', slicedIds)

  const counts: Record<string, { up: number; down: number }> = {}
  for (const id of slicedIds) counts[id] = { up: 0, down: 0 }
  for (const v of voteRows ?? []) {
    const c = counts[v.caption_id as string]
    if (!c) continue
    if ((v.vote_value as number) > 0) c.up++
    else if ((v.vote_value as number) < 0) c.down++
  }

  return sliced.map(c => ({
    ...c,
    upvotes: counts[c.id]?.up ?? 0,
    downvotes: counts[c.id]?.down ?? 0,
  }))
}
