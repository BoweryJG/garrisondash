import './style.css'
import { Scene } from './scene'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client (you'll need to add your credentials)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
export const supabase = createClient(supabaseUrl, supabaseKey)

// Initialize the scene
const scene = new Scene()
scene.init()
scene.animate()