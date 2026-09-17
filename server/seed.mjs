import { initializeDatabase, getDb } from './database.mjs';
import { User } from './models/User.mjs';

async function seed() {
  console.log('🌱 Starting seed...');
  
  const db = await initializeDatabase();
  console.log('✅ Database connected');

  // Check if users exist
  const count = await db.get('SELECT COUNT(*) as count FROM users');
  if (count.count > 0) {
    console.log('ℹ️  Users already exist. Skipping seed.');
    process.exit(0);
  }

  console.log('👤 Creating users with beautiful avatars...');

  const users = [
    { 
      username: 'ali', 
      password: 'password',
      avatar: 'https://ui-avatars.com/api/?name=Ali&background=6C5CE7&color=fff&size=200&rounded=true&bold=true&font-size=0.5'
    },
    { 
      username: 'aref', 
      password: 'password',
      avatar: 'https://ui-avatars.com/api/?name=Aref&background=FD79A8&color=fff&size=200&rounded=true&bold=true&font-size=0.5'
    }
  ];

  for (const u of users) {
    await User.create(u);
    console.log(`  ✅ Created: ${u.username} with avatar`);
  }

  console.log('✅ Seeded 2 users successfully!');
  console.log('   👤 ali / password');
  console.log('   👤 aref / password');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});