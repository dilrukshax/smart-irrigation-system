import re
import psycopg2

def wipe():
    with open(".env") as f:
        url = None
        for line in f:
            if "NEON_DATABASE_URL=" in line:
                url = line.strip().split("=", 1)[1].strip('"').strip("'")
                # psycopg2 handles postgresql:// just fine
    
    print(f"Connecting to {url.split('@')[1]}...")
    conn = psycopg2.connect(url)
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute("DROP SCHEMA public CASCADE;")
    cur.execute("CREATE SCHEMA public;")
    cur.execute("GRANT ALL ON SCHEMA public TO public;")
    cur.execute("GRANT ALL ON SCHEMA public TO postgres;")
    print("Database completely wiped!")
    
wipe()
