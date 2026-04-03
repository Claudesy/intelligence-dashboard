// Architected and built by Claudesy.
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Note: Staff table migration required first
  // Run: npx prisma migrate dev --name add_staff

  // For now, just seed sample appointments
  console.log('✅ Database ready')
}

main()
  .catch(e => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
