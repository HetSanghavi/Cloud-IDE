DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "User"
    GROUP BY LOWER("email")
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot add case-insensitive email uniqueness because duplicate user emails exist.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "User"
    GROUP BY LOWER("name")
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot add case-insensitive username uniqueness because duplicate user names exist.';
  END IF;
END $$;

CREATE UNIQUE INDEX "User_email_lower_key" ON "User" (LOWER("email"));
CREATE UNIQUE INDEX "User_name_lower_key" ON "User" (LOWER("name"));
