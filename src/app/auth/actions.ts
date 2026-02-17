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
