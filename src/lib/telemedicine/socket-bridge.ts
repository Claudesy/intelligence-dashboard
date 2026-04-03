// Designed and constructed by Claudesy.
/**
 * Telemedicine Socket Bridge
 * Emit real-time events ke dashboard saat ada request masuk dari website pasien.
 */

import type { TelemedicineRequest } from '@prisma/client'
import type { Server as SocketIOServer } from 'socket.io'

let _io: SocketIOServer | null = null

export function setTeleSocketIO(io: SocketIOServer): void {
  _io = io
}

export function emitTeleRequest(request: TelemedicineRequest): void {
  if (!_io) return
  _io.to('crew').emit('telemedicine:new-request', request)
}

export interface AssistConsultPayload {
  consultId: string
  targetDoctorId: string
  sentAt: string
  patient: { name: string; age: number; gender: string; rm: string }
  ttv: {
    sbp: string
    dbp: string
    hr: string
    rr: string
    temp: string
    spo2: string
    glucose: string
  }
  keluhan_utama: string
  risk_factors: string[]
  anthropometrics: {
    tinggi: number
    berat: number
    imt: number
    hasil_imt: string
    lingkar_perut: number
  }
  penyakit_kronis: string[]
}

export function emitAssistConsult(payload: AssistConsultPayload): void {
  if (!_io) return
  // Broadcast ke crew room — client-side filters by targetDoctorId
  _io.to('crew').emit('assist:consult', payload)
}
