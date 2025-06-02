import './style.css'
import { Scene } from './scene'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Initialize Supabase client (optional - only if credentials are provided)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export let supabase: SupabaseClient | null = null

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey)
  } catch (error) {
    console.warn('Failed to initialize Supabase client:', error)
  }
}

// Initialize the scene
const scene = new Scene()
scene.init()
scene.animate()