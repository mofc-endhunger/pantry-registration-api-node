-- Migration DDL (MySQL) for households feature

CREATE TABLE IF NOT EXISTS households (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  primary_user_id BIGINT NULL,
  address_line_1 VARCHAR(255) NULL,
  address_line_2 VARCHAR(255) NULL,
  city VARCHAR(100) NULL,
  state VARCHAR(50) NULL,
  zip_code VARCHAR(20) NULL,
  preferred_language VARCHAR(50) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_households_primary_user_id (primary_user_id),
  CONSTRAINT fk_households_primary_user FOREIGN KEY (primary_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS household_members (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  household_id BIGINT NOT NULL,
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  first_name VARCHAR(100) NULL,
  middle_name VARCHAR(100) NULL,
  last_name VARCHAR(100) NULL,
  suffix VARCHAR(50) NULL,
  gender VARCHAR(50) NULL,
  phone VARCHAR(50) NULL,
  email VARCHAR(255) NULL,
  address_line_1 VARCHAR(255) NULL,
  address_line_2 VARCHAR(255) NULL,
  city VARCHAR(100) NULL,
  state VARCHAR(50) NULL,
  zip_code VARCHAR(20) NULL,
  date_of_birth DATE NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_household_members_household_id (household_id),
  CONSTRAINT fk_household_members_household FOREIGN KEY (household_id) REFERENCES households(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;



CREATE TABLE IF NOT EXISTS household_member_audits (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  household_id BIGINT NOT NULL,
  member_id BIGINT NULL,
  change_type VARCHAR(50) NOT NULL,
  changed_by_user_id BIGINT NULL,
  changes JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_hma_household_id (household_id),
  INDEX idx_hma_member_id (member_id),
  CONSTRAINT fk_hma_household FOREIGN KEY (household_id) REFERENCES households(id),
  CONSTRAINT fk_hma_member FOREIGN KEY (member_id) REFERENCES household_members(id),
  CONSTRAINT fk_hma_changed_by FOREIGN KEY (changed_by_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

