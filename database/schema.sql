-- Invoice Instructions - SQL Server schema.
-- Applied automatically when the app first connects (src/server/db.server.ts), after creating
-- the database if needed. Safe to re-run: every object is created only if it does not exist.
-- Separate batches with a line containing only GO. To apply by hand:
--   sqlcmd -S <server> -U <user> -P <password> -d leads_qrs -i database/schema.sql

SET NOCOUNT ON;

-- role: the first account to sign up becomes 'admin', later sign-ups are 'user'.
IF OBJECT_ID(N'dbo.users', N'U') IS NULL
CREATE TABLE dbo.users (
  id            UNIQUEIDENTIFIER NOT NULL CONSTRAINT pk_users PRIMARY KEY DEFAULT NEWID(),
  email         NVARCHAR(320)    NOT NULL CONSTRAINT uq_users_email UNIQUE,
  password_hash NVARCHAR(256)    NOT NULL,
  full_name     NVARCHAR(100)    NULL,
  role          NVARCHAR(10)     NOT NULL CONSTRAINT df_users_role DEFAULT N'user'
    CONSTRAINT ck_users_role CHECK (role IN (N'admin', N'user')),
  created_at    DATETIME2(3)     NOT NULL CONSTRAINT df_users_created_at DEFAULT SYSUTCDATETIME()
);

-- Login sessions. token_hash is the SHA-256 of the random token kept in the browser cookie.
IF OBJECT_ID(N'dbo.sessions', N'U') IS NULL
CREATE TABLE dbo.sessions (
  token_hash CHAR(64)         NOT NULL CONSTRAINT pk_sessions PRIMARY KEY,
  user_id    UNIQUEIDENTIFIER NOT NULL
    CONSTRAINT fk_sessions_user REFERENCES dbo.users(id) ON DELETE CASCADE,
  expires_at DATETIME2(3)     NOT NULL,
  created_at DATETIME2(3)     NOT NULL CONSTRAINT df_sessions_created_at DEFAULT SYSUTCDATETIME()
);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_sessions_user_id')
  CREATE INDEX ix_sessions_user_id ON dbo.sessions(user_id);

IF OBJECT_ID(N'dbo.clients', N'U') IS NULL
CREATE TABLE dbo.clients (
  id           UNIQUEIDENTIFIER NOT NULL CONSTRAINT pk_clients PRIMARY KEY DEFAULT NEWID(),
  client_name  NVARCHAR(200)    NOT NULL,
  site_name    NVARCHAR(200)    NULL,
  project_name NVARCHAR(200)    NULL,
  active       BIT              NOT NULL CONSTRAINT df_clients_active DEFAULT 1,
  created_at   DATETIME2(3)     NOT NULL CONSTRAINT df_clients_created_at DEFAULT SYSUTCDATETIME()
);

IF OBJECT_ID(N'dbo.leads_pics', N'U') IS NULL
CREATE TABLE dbo.leads_pics (
  id         UNIQUEIDENTIFIER NOT NULL CONSTRAINT pk_leads_pics PRIMARY KEY DEFAULT NEWID(),
  name       NVARCHAR(100)    NOT NULL,
  active     BIT              NOT NULL CONSTRAINT df_leads_pics_active DEFAULT 1,
  created_at DATETIME2(3)     NOT NULL CONSTRAINT df_leads_pics_created_at DEFAULT SYSUTCDATETIME()
);

-- Clients and PICs that are referenced here cannot be deleted (no cascade); set them inactive.
-- credit_limit: one of $1000/$5000/$10000/$25000/$50000/Unlimited (see src/lib/constants.ts).
-- invoice_note: required by the form, minimum 30 characters.
IF OBJECT_ID(N'dbo.invoice_instructions', N'U') IS NULL
CREATE TABLE dbo.invoice_instructions (
  id                UNIQUEIDENTIFIER NOT NULL CONSTRAINT pk_invoice_instructions PRIMARY KEY DEFAULT NEWID(),
  client_id         UNIQUEIDENTIFIER NOT NULL
    CONSTRAINT fk_invoice_instructions_client REFERENCES dbo.clients(id),
  project_site      NVARCHAR(200)    NOT NULL,
  quotation_ref     NVARCHAR(50)     NULL,
  email_to          NVARCHAR(1000)   NOT NULL,
  attention_to      NVARCHAR(100)    NULL,
  email_cc          NVARCHAR(1000)   NULL,
  invoice_cycle     NVARCHAR(20)     NOT NULL
    CONSTRAINT ck_invoice_instructions_cycle CHECK (invoice_cycle IN (N'daily', N'weekly', N'bi_weekly', N'monthly')),
  delivery_mode     NVARCHAR(20)     NOT NULL
    CONSTRAINT ck_invoice_instructions_mode CHECK (delivery_mode IN (N'portal', N'hard_copy', N'email_einvoice')),
  credit_limit      NVARCHAR(20)     NULL,
  leads_pic_id      UNIQUEIDENTIFIER NOT NULL
    CONSTRAINT fk_invoice_instructions_pic REFERENCES dbo.leads_pics(id),
  payment_pic_name  NVARCHAR(100)    NULL,
  payment_pic_email NVARCHAR(255)    NULL,
  payment_pic_phone NVARCHAR(30)     NULL,
  invoice_note      NVARCHAR(500)    NULL,
  notes             NVARCHAR(2000)   NULL,
  active            BIT              NOT NULL CONSTRAINT df_invoice_instructions_active DEFAULT 1,
  created_at        DATETIME2(3)     NOT NULL CONSTRAINT df_invoice_instructions_created_at DEFAULT SYSUTCDATETIME(),
  updated_at        DATETIME2(3)     NOT NULL CONSTRAINT df_invoice_instructions_updated_at DEFAULT SYSUTCDATETIME()
);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_invoice_instructions_client_id')
  CREATE INDEX ix_invoice_instructions_client_id ON dbo.invoice_instructions(client_id);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_invoice_instructions_leads_pic_id')
  CREATE INDEX ix_invoice_instructions_leads_pic_id ON dbo.invoice_instructions(leads_pic_id);
