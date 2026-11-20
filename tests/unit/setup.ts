// Unit tests never touch the database (pure seams only), but modules that read DATABASE_URL at
// import time (src/db) must find a syntactically valid value if a test pulls them in.
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:5432/app_db";
