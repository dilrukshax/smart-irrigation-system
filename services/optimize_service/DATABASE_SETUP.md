# Database Setup Instructions

## ✅ Your PostgreSQL Credentials

- **Host**: localhost
- **Port**: 5432
- **Username**: postgres
- **Password**: Charuka@0
- **Database**: aca_o_db (will be created)

---

## 🚀 Quick Setup (3 Steps)

### Step 1: Install psycopg2 (PostgreSQL adapter)

```bash
cd C:\Users\dilan\Projact\smart-irrigation-system\services\optimize_service
pip install psycopg2-binary
```

### Step 2: Run Database Setup Script

```bash
python setup_database.py
```

**This script will:**
1. ✅ Create database `aca_o_db`
2. ✅ Create `fields` and `crops` tables
3. ✅ Import data from crops.csv (30 crops)
4. ✅ Import data from fields.csv (15 fields)

**Expected Output:**
```
============================================================
Database Setup Script
============================================================
INFO: Creating database 'aca_o_db'...
INFO: ✓ Database 'aca_o_db' created successfully
INFO: Creating tables...
INFO: ✓ Fields table created/verified
INFO: ✓ Crops table created/verified
INFO: ✓ All tables created successfully
INFO: Seeding crops data...
INFO: ✓ Inserted 30 crops
INFO: Seeding fields data...
INFO: ✓ Inserted 15 fields
INFO: ✓ Data seeding completed
============================================================
✓ Database setup completed successfully!
============================================================
```

### Step 3: Restart Backend

```bash
# Stop backend (Ctrl+C in terminal where uvicorn is running)

# Restart backend
uvicorn app.main:app --reload --port 8004
```

**Expected Output (no more database error!):**
```
INFO: Loading ML Models...
INFO: ✓ Price Prediction Model loaded successfully
INFO: ✓ Yield Prediction Model loaded successfully
INFO: ✓ Crop Recommendation Model loaded successfully
INFO: ✓ Database connection verified  ← This should now work!
INFO: ✓ aca-o-service is ready to accept requests
```

---

## 🎯 Option: Switch to Real Database API

The frontend is currently using demo endpoints. Once database is set up, you can switch to real database queries:

**Edit**: `web/src/api/f4-acao.api.ts`

```typescript
const USE_DEMO = false;  // Change from true to false
```

**Then restart frontend:**
```bash
cd web
npm run dev
```

---

## 🔍 Verify Database Setup

### Option 1: Using psql Command Line

```bash
# Connect to database
psql -U postgres -d aca_o_db

# Check tables
\dt

# Count crops
SELECT COUNT(*) FROM crops;

# Count fields
SELECT COUNT(*) FROM fields;

# View some data
SELECT crop_id, crop_name FROM crops LIMIT 5;

# Exit
\q
```

### Option 2: Using pgAdmin 4 (GUI)

1. Open pgAdmin 4 (installed with PostgreSQL)
2. Connect with password: `Charuka@0`
3. Expand: Servers → PostgreSQL → Databases → aca_o_db
4. Right-click on Tables → Refresh
5. You should see:
   - `crops` (30 rows)
   - `fields` (15 rows)

---

## 🧪 Test Database Connection

```bash
# Test with curl
curl http://localhost:8004/health

# Should return:
# {
#   "status": "healthy",
#   "service": "aca-o-service",
#   "version": "0.1.0"
# }
```

---

## 🛠️ Troubleshooting

### Issue: "psycopg2-binary not found"

**Solution:**
```bash
pip install psycopg2-binary
```

### Issue: "database already exists"

**Solution:**
This is fine! The script will skip creation and just create tables + seed data.

### Issue: "password authentication failed"

**Solution:**
1. Open `.env` file
2. Verify password is exactly: `Charuka@0`
3. Test PostgreSQL connection:
   ```bash
   psql -U postgres -h localhost
   # Enter password: Charuka@0
   ```

### Issue: "could not connect to server"

**Solution:**
1. Check if PostgreSQL is running:
   ```bash
   # Windows Services
   services.msc
   # Find: postgresql-x64-XX
   # Status should be: Running
   ```

2. Or restart PostgreSQL:
   - Open Services (Win+R → services.msc)
   - Find PostgreSQL
   - Right-click → Restart

### Issue: Backend still shows database error

**Solution:**
1. Verify `.env` file exists in `services/optimize_service/`
2. Restart backend completely (Ctrl+C, then rerun uvicorn)
3. Check logs for specific error

---

## 📊 What Gets Created

### Tables

**1. crops table**
- crop_id (PRIMARY KEY)
- crop_name
- water_sensitivity
- growth_duration_days
- typical_yield_t_ha
- water_requirement_mm
- created_at

**2. fields table**
- field_id (PRIMARY KEY)
- field_name
- area_ha
- soil_type, soil_ph, soil_ec
- location, latitude, longitude, elevation
- soil_suitability
- water_availability_mm
- created_at

### Data Seeded

**Crops**: 30 Sri Lankan crops
- Paddy, Tomato, Onion, Cabbage, Chili, Potato, Carrot, Beans
- Eggplant, Cucumber, Pumpkin, Bitter Gourd, Okra, Radish, Beetroot
- Sweet Corn, Cowpea, Green Gram, Banana, Papaya, Pineapple, Mango
- Coconut, Tea, Rubber, Sugarcane, Maize, Soybean, Groundnut, Watermelon

**Fields**: 15 sample fields
- Locations: Kandy, Dambulla, Anuradhapura, Polonnaruwa, Kurunegala, Matale, Gampaha, Kegalle, Ratnapura, Hambantota, Nuwara Eliya, Chilaw, Puttalam
- Soil types: Clay Loam, Sandy Loam, Loam, Clay, Silty Loam, Sandy Clay, Red Loam
- Various elevations (10m - 1800m)

---

## ✅ Success Checklist

After running setup script:

- [ ] Database `aca_o_db` created
- [ ] Tables `crops` and `fields` exist
- [ ] 30 crops inserted
- [ ] 15 fields inserted
- [ ] Backend restarts without database error
- [ ] Backend logs show: "✓ Database connection verified"
- [ ] Optional: Frontend switched to USE_DEMO=false

---

## 🎯 Next Steps After Database Setup

1. ✅ Database is now configured
2. ✅ Demo endpoints still work (good for testing)
3. ✅ Real database endpoints also work
4. 📊 You can now:
   - Use demo mode (current setup - works without database queries)
   - Use real database mode (switch USE_DEMO=false)
   - Add more crops/fields via database
   - Import full Hector price dataset (1M records - optional)

---

**Questions? Check logs or contact support!**
