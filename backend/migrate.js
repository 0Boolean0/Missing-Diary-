import { query } from './src/config/db.js';

async function migrate() {
  try {
    console.log('Starting migration...');
    
    // Add new columns to missing_persons table
    const alterQueries = [
      'ALTER TABLE missing_persons ADD COLUMN IF NOT EXISTS guardian_name VARCHAR(120)',
      'ALTER TABLE missing_persons ADD COLUMN IF NOT EXISTS guardian_phone VARCHAR(40)',
      'ALTER TABLE missing_persons ADD COLUMN IF NOT EXISTS guardian_email VARCHAR(160)',
      'ALTER TABLE missing_persons ADD COLUMN IF NOT EXISTS guardian_relation VARCHAR(40)',
      'ALTER TABLE missing_persons ADD COLUMN IF NOT EXISTS guardian_nid VARCHAR(40)',
      'ALTER TABLE missing_persons ADD COLUMN IF NOT EXISTS name_bn VARCHAR(120)',
      'ALTER TABLE missing_persons ADD COLUMN IF NOT EXISTS skin_color VARCHAR(40)',
      'ALTER TABLE missing_persons ADD COLUMN IF NOT EXISTS weight VARCHAR(40)',
      'ALTER TABLE missing_persons ADD COLUMN IF NOT EXISTS identifying_marks TEXT',
    ];
    
    for (const sql of alterQueries) {
      console.log(`Executing: ${sql}`);
      await query(sql);
      console.log('✓ Success');
    }
    
    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
