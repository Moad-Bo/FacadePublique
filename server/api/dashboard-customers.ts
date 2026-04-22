import { db } from '../utils/db'
import { user } from '../../drizzle/src/db/schema'
import { desc } from 'drizzle-orm'
import { requireUserSession } from '../utils/auth'

export default eventHandler(async (event) => {
  await requireUserSession(event, { permission: 'manager:customers' })
  
  try {
    const users = await db.select().from(user).orderBy(desc(user.createdAt)).limit(100)
    
    // Map database users to the format expected by the dashboard UI
    return users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      avatar: {
        src: u.image || `https://i.pravatar.cc/128?u=${u.id}`
      },
      status: u.banned ? 'bounced' : 'subscribed',
      location: 'N/A' // Location isn't in our schema yet
    }))
  } catch (error) {
    console.error('Failed to fetch customers from DB:', error)
    return []
  }
})
