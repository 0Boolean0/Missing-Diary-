CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DROP TABLE IF EXISTS audit_logs, police_updates, sightings, person_images, missing_persons, users CASCADE;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) UNIQUE NOT NULL,
  phone VARCHAR(40),
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin','police','guardian','local')) DEFAULT 'local',
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE missing_persons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guardian_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name VARCHAR(120) NOT NULL,
  age INT,
  gender VARCHAR(40),
  height VARCHAR(40),
  clothing TEXT,
  medical_info TEXT,
  description TEXT,
  last_seen_location TEXT NOT NULL,
  last_seen_lat DOUBLE PRECISION NOT NULL,
  last_seen_lng DOUBLE PRECISION NOT NULL,
  last_seen_time TIMESTAMP,
  status VARCHAR(30) CHECK (status IN ('pending','verified','active','found','closed','rejected')) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE person_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  missing_person_id UUID REFERENCES missing_persons(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  public_id TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE sightings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  missing_person_id UUID REFERENCES missing_persons(id) ON DELETE CASCADE,
  reported_by UUID REFERENCES users(id) ON DELETE SET NULL,
  location_text TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  description TEXT,
  image_url TEXT,
  confidence_level VARCHAR(20) CHECK (confidence_level IN ('sure','maybe','not_sure')) DEFAULT 'maybe',
  status VARCHAR(20) CHECK (status IN ('pending','verified','rejected')) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE police_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  missing_person_id UUID REFERENCES missing_persons(id) ON DELETE CASCADE,
  police_id UUID REFERENCES users(id) ON DELETE SET NULL,
  update_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO users (name,email,password_hash,role,verified) VALUES
('Admin','admin@missingdiary.test','$2b$10$QP7iDNJ8ybvx0kAALfL5QeGwYqtW7/9Ot5sUYf0oqB4QQ1QaEeAw2','admin',true),
('Police Officer','police@missingdiary.test','$2b$10$QP7iDNJ8ybvx0kAALfL5QeGwYqtW7/9Ot5sUYf0oqB4QQ1QaEeAw2','police',true),
('Guardian User','guardian@missingdiary.test','$2b$10$QP7iDNJ8ybvx0kAALfL5QeGwYqtW7/9Ot5sUYf0oqB4QQ1QaEeAw2','guardian',true),
('Local User','local@missingdiary.test','$2b$10$QP7iDNJ8ybvx0kAALfL5QeGwYqtW7/9Ot5sUYf0oqB4QQ1QaEeAw2','local',true);
-- all seeded passwords: password123
