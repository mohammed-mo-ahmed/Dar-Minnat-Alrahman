import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/service';

export async function POST(req: NextRequest) {
  const { credential, type } = await req.json();
  if (!credential || !type) {
    return NextResponse.json({ error: 'Missing credential or type' }, { status: 400 });
  }

  const field = type === 'email' ? 'email' : 'phone';

  const { data, error } = await supabaseAdmin()
    .from('profiles')
    .select('id')
    .eq(field, credential)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ exists: false }, { status: 200 });
  }

  return NextResponse.json({ exists: !!data }, { status: 200 });
}
