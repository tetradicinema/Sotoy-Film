# 📋 DEPLOYMENT GUIDE - PHASE 1 SECURITY FIXES

**Time Required:** 15-30 menit  
**Critical Step:** Verify Firestore user roles SEBELUM deploy!

---

## ⚠️ PENTING DIBACA DULU

**Perubahan Critical:**
- Firestore rules: Hardcoded admin UIDs sudah dihapus
- **WAJIB verify:** Admin users punya field `role` di Firestore
- **Jika skip:** Admin bisa kehilangan akses!

---

## 🚀 STEP 1: VERIFY FIRESTORE USER ROLES (CRITICAL!)

### Cara Check:

1. **Buka Firebase Console:** https://console.firebase.google.com
2. **Pilih project Sotoy Film** > Firestore Database
3. **Buka collection `users`**
4. **Check setiap admin user punya field `role`:**
   ```
   users/{uid}
     └─ role: 'admin'              // WAJIB ada!
   ```

### Jika BELUM ada field `role`:

1. Klik user document yang belum punya role
2. Add field:
   - Name: `role`
   - Type: `string`
   - Value: `admin` (atau `penulis_sotoy`, `si_paling_sotoy`)
3. Save

### Verify dengan Query:

1. Firestore Console > Tab "Query"
2. Collection: `users`
3. Where: `role` == `admin`
4. Run
5. **Count hasil harus = jumlah admin**

**⚠️ JANGAN lanjut kalau belum verify ini!**

---

## 🚀 STEP 2: BACKUP RULES

```bash
cd "g:\VIDEO PRODUCTION\VIDEO CAMPAIGN\www\Sotoy-Film"
copy firestore.rules firestore.rules.backup
```

---

## 🚀 STEP 3: DEPLOY FIRESTORE RULES

```bash
# Login (jika belum)
firebase login

# Check project
firebase projects:list

# Set project
firebase use sotoy-film

# Deploy ONLY rules
firebase deploy --only firestore:rules
```

**✅ Expected output:**
```
✔ Deploy complete!
✔ Firestore rules deployed
```

### IMMEDIATELY TEST:

1. Buka website production
2. Login sebagai admin
3. Try access admin panel
4. **Jika tidak bisa akses → ROLLBACK:**
   ```bash
   copy firestore.rules.backup firestore.rules
   firebase deploy --only firestore:rules
   ```

---

## 🚀 STEP 4: TEST LOCALLY (Optional)

```bash
# Install dependencies
npm install

# Build
npm run build

# Start dev server
npm run dev
```

**Quick Tests:**
- Health: http://localhost:5173/api/health
- TMDB: http://localhost:5173/api/tmdb?action=search&query=test
- Browse website normally

---

## 🚀 STEP 5: DEPLOY APPLICATION

### Option A: Vercel (Recommended)

```bash
vercel --prod
```

### Option B: Manual Server

```bash
npm run build
# Upload files ke server
# Di server:
npm install --production
NODE_ENV=production npm start
```

### Option C: PM2

```bash
pm2 start npm --name "sotoy-film" -- start
pm2 save
```

---

## 🚀 STEP 6: POST-DEPLOY TESTING

```bash
# Health check
curl https://sotoyfilm.my.id/api/health

# Check security headers
curl -I https://sotoyfilm.my.id

# Check compression
curl -H "Accept-Encoding: gzip" -I https://sotoyfilm.my.id
```

**Manual Tests:**
- ✅ Website loads
- ✅ Admin login works
- ✅ Create/edit content works
- ✅ Browse katalog works
- ✅ No errors in console

---

## 🚀 STEP 7 (OPTIONAL): FIREBASE ADMIN SDK

**Purpose:** Enable API authentication

### Setup:

1. Firebase Console > Project Settings > Service Accounts
2. Generate new private key
3. Download JSON file
4. Set environment variable:
   ```bash
   export FIREBASE_SERVICE_ACCOUNT_PATH="/path/to/service-account.json"
   ```

**Note:** Optional - server works without this (auth skipped)

---

## ❌ ROLLBACK (Jika Ada Masalah)

### Rollback Firestore Rules:
```bash
copy firestore.rules.backup firestore.rules
firebase deploy --only firestore:rules
```

### Rollback Application:
```bash
# Vercel:
vercel rollback

# PM2:
git checkout HEAD~1
npm install
pm2 restart sotoy-film
```

---

## ✅ COMPLETION CHECKLIST

- [ ] Firestore user roles verified
- [ ] Firestore rules deployed
- [ ] Admin access tested
- [ ] Application deployed
- [ ] Website loading normally
- [ ] No errors in logs

---

## 🆘 TROUBLESHOOTING

**Problem: Admin tidak bisa login**
```bash
# Check Firestore user document
# Pastikan field 'role' = 'admin'
# Jika salah/missing: update di Firestore Console
```

**Problem: Rate limiting terlalu strict**
```bash
# Edit: src/middleware/rateLimiter.ts
# Adjust max: 100 ke value lebih tinggi
# Redeploy
```

**Problem: Firebase Admin error**
```bash
# Check: echo $FIREBASE_SERVICE_ACCOUNT_PATH
# Server tetap jalan tanpa ini (warning only)
```

---

## 🎉 SUCCESS!

Jika semua checklist ✅:

**Phase 1 Security Fixes: DEPLOYED!** 🚀

New features active:
- ✅ Rate limiting
- ✅ Input validation
- ✅ XSS prevention
- ✅ Security headers
- ✅ Request logging
- ✅ Pure RBAC

**Next:** Monitor 1-2 hari, lalu lanjut Phase 2 (Split AppContext)

---

*Guide: 2026-10-06T04:30:44Z*
