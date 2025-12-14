<<<<<<< HEAD
export async function GET() {
  return new Response(JSON.stringify({ status: 'ok', time: new Date().toISOString() }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

export const dynamic = 'force-dynamic';

=======
export async function GET() {
  return new Response(JSON.stringify({ status: 'ok', time: new Date().toISOString() }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

export const dynamic = 'force-dynamic';

>>>>>>> 5cd363bb994f0fd88d630a5340afb06e48edefab
