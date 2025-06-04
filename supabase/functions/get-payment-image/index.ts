import "jsr:@supabase/functions-js/edge-runtime.d.ts";
Deno.serve(async (req)=>{
  const imageUrl = 'https://ealcbtnmofspramewvsl.supabase.co/storage/v1/object/sign/assets/qr_momo.JPG?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9mZDAzMWVkMC0xZjZjLTRjM2MtOThiYS03MTQ1YTM5MjYxZWYiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJhc3NldHMvcXJfbW9tby5KUEciLCJpYXQiOjE3NDkwMDk5MTUsImV4cCI6MTc4MDU0NTkxNX0.Bqyg243n5-C5qT_567sYt3CW5H3W1C34ZSWzzGH2bCA';
  return new Response(JSON.stringify({
    imageUrl
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Connection': 'keep-alive'
    }
  });
});
