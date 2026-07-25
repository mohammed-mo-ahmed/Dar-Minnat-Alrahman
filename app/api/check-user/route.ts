import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { credential, type } = await req.json();
    if (!credential || !type) {
      return NextResponse.json({ ok: false, exists: false }, { status: 200 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ ok: false, exists: false }, { status: 200 });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const field = type === 'email' ? 'email' : 'phone';

    const { data } = await admin
      .from('profiles')
      .select('id')
      .eq(field, credential)
      .maybeSingle();

    return NextResponse.json({ ok: true, exists: !!data }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, exists: false }, { status: 200 });
  }
}
