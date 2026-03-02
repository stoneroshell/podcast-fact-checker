/**
 * Supabase client (browser-safe anon key).
 * Use for client components and API routes that need anon access.
 * See project.md §3, §9.4.
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// TODO: Optional — create server client with SUPABASE_SERVICE_ROLE_KEY for admin/migrations
