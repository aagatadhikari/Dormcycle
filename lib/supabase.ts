import { createClient } from "@supabase/supabase-js";

// These two values are public by design (they ship to every browser).
// Row Level Security in the database decides what each visitor may read or change.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://lrgjipsojzlrheomnead.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "sb_publishable_6EltyEJu8lpqZQ0UG17qVg_B8BWqCCt";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

export const imageUrl = (path: string) => `${SUPABASE_URL}/storage/v1/object/public/product-images/${path}`;
