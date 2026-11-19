-- Wrong site passwords per connection (hashed IP). 4 within 24 hours lock that connection out for 24 hours
CREATE TABLE IF NOT EXISTS site_login_failures (
  key TEXT PRIMARY KEY,
  failures INTEGER NOT NULL,
  first_failure_at TIMESTAMPTZ NOT NULL,
  locked_until TIMESTAMPTZ
);
