// Architected and built by the one and only Claudesy.
import { NextResponse } from 'next/server'
import { getCrewSessionFromRequest, isCrewAuthorizedRequest } from '@/lib/server/crew-access-auth'
import { getRequestIp, writeSecurityAuditLog } from '@/lib/server/security-audit'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const ip = getRequestIp(request)
  const session = getCrewSessionFromRequest(request)

  if (!isCrewAuthorizedRequest(request)) {
    await writeSecurityAuditLog({
      endpoint: '/api/voice/tts',
      action: 'VOICE_TTS',
      result: 'unauthenticated',
      userId: session?.username ?? null,
      role: session?.role ?? null,
      ip,
    })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // TODO(security): selaraskan role minimum endpoint ini dengan matriks RBAC produksi.

  const apiKey = process.env.GOOGLE_TTS_API_KEY
  if (!apiKey) {
    await writeSecurityAuditLog({
      endpoint: '/api/voice/tts',
      action: 'VOICE_TTS',
      result: 'failure',
      userId: session?.username ?? null,
      role: session?.role ?? null,
      ip,
      metadata: { reason: 'missing_google_tts_api_key' },
    })
    return NextResponse.json({ error: 'GOOGLE_TTS_API_KEY belum dikonfigurasi' }, { status: 500 })
  }

  const body = (await request.json().catch(() => ({}))) as { text?: string }
  const text = body.text?.trim()
  if (!text) {
    return NextResponse.json({ error: 'Text kosong' }, { status: 400 })
  }

  try {
    const res = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text },
          voice: {
            languageCode: 'id-ID',
            name: 'id-ID-Wavenet-D',
            ssmlGender: 'FEMALE',
          },
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: 1.0,
            pitch: 1.0,
            effectsProfileId: ['headphone-class-device'],
          },
        }),
      }
    )

    if (!res.ok) {
      const err = await res.text()
      await writeSecurityAuditLog({
        endpoint: '/api/voice/tts',
        action: 'VOICE_TTS',
        result: 'failure',
        userId: session?.username ?? null,
        role: session?.role ?? null,
        ip,
        metadata: { error: err.slice(0, 160) },
      })
      return NextResponse.json({ error: 'Google TTS request failed' }, { status: 500 })
    }

    const data = (await res.json()) as { audioContent?: string }
    if (!data.audioContent) {
      return NextResponse.json({ error: 'Tidak ada audio dari Google TTS' }, { status: 500 })
    }

    // Kembalikan sebagai audio/mpeg binary
    const audioBuffer = Buffer.from(data.audioContent, 'base64')
    await writeSecurityAuditLog({
      endpoint: '/api/voice/tts',
      action: 'VOICE_TTS',
      result: 'success',
      userId: session?.username ?? null,
      role: session?.role ?? null,
      ip,
      metadata: { textLength: text.length, audioBytes: audioBuffer.length },
    })
    return new Response(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(audioBuffer.length),
      },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    await writeSecurityAuditLog({
      endpoint: '/api/voice/tts',
      action: 'VOICE_TTS',
      result: 'failure',
      userId: session?.username ?? null,
      role: session?.role ?? null,
      ip,
      metadata: { error: msg },
    })
    return NextResponse.json({ error: 'Google TTS request failed' }, { status: 500 })
  }
}
