import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;

console.log("=== SUPABASE DEBUG ===");
console.log("URL:", supabaseUrl);
console.log("KEY PRESENT:", supabaseKey ? "YES" : "NO");

export const supabase = createClient(supabaseUrl, supabaseKey);
