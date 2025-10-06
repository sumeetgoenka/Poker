import { createServerSupabase } from "@/utils/supabase/server";

export default async function TestPage() {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("tables")
    .select("id, small_blind, big_blind, status, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) return <pre>DB error: {error.message}</pre>;

  return (
    <ul>
      {(data ?? []).map((row) => (
        <li key={row.id}>
          {row.id} — {row.small_blind}/{row.big_blind} — {row.status} — {new Date(row.created_at).toLocaleString()}
        </li>
      ))}
      {(data ?? []).length === 0 && <li>No tables yet</li>}
    </ul>
  );
}


