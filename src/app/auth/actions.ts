'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

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
      // Same vote — remove it (toggle off)
      const { error } = await supabase
        .from('caption_votes')
        .delete()
        .eq('id', existingVote.id)

      if (error) {
        console.error('Error removing vote:', error)
        return { error: 'Failed to remove vote' }
      }

      revalidatePath('/')
      return { success: true, action: 'removed' }
    } else {
      // Different vote — update it
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

      revalidatePath('/')
      return { success: true, action: 'updated' }
    }
  }

  // No existing vote — insert new one
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

  revalidatePath('/')
  return { success: true, action: 'created' }
}
