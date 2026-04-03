// Blueprinted & built by Claudesy.
import 'server-only'

import { type NextRequest, NextResponse } from 'next/server'
import { readEMRHistory } from '@/lib/emr/history'
import { isCrewAuthorizedRequest } from '@/lib/server/crew-access-auth'

export async function GET(req: NextRequest) {
  if (!isCrewAuthorizedRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const limit = Math.min(100, Number.parseInt(req.nextUrl.searchParams.get('limit') || '20', 10))

  const history = await readEMRHistory(limit)
  return NextResponse.json({ history, count: history.length })
}
