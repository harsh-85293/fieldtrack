import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/database.js';
import logger from '../utils/logger.js';

import User from '../models/User.js';
import EmployeeProfile from '../models/EmployeeProfile.js';
import Store from '../models/Store.js';
import Product from '../models/Product.js';
import WorkSession from '../models/WorkSession.js';
import LocationPoint from '../models/LocationPoint.js';
import StoreVisit from '../models/StoreVisit.js';
import AppSetting from '../models/AppSetting.js';

import { ROLES, SESSION_STATUS, SYNC_STATUS } from '../config/constants.js';
import { haversineKm, distanceMeters, toMinorUnits, startOfDayUTC, endOfDayUTC } from '../utils/geo.js';

/**
 * Seed the database with demo data.
 */
async function seed() {
  await connectDB();

  logger.info('Clearing existing data...');
  await Promise.all([
    User.deleteMany({}),
    EmployeeProfile.deleteMany({}),
    Store.deleteMany({}),
    Product.deleteMany({}),
    WorkSession.deleteMany({}),
    LocationPoint.deleteMany({}),
    StoreVisit.deleteMany({}),
    AppSetting.deleteMany({}),
  ]);

  // ---- Admin user ----
  const admin = await User.create({
    role: ROLES.ADMIN,
    email: 'admin@fieldtrack.com',
    password: 'Admin@12345',
    fullName: 'System Administrator',
    phone: '+919999999999',
    isActive: true,
    mustChangePassword: false,
  });
  logger.info(`Admin created: ${admin.email}`);

  // ---- Employee users ----
  const employeeData = [
    { email: 'rahul@fieldtrack.com', fullName: 'Rahul Sharma', employeeId: 'EMP001', designation: 'Field Sales Executive', department: 'Sales', city: 'Mumbai', state: 'Maharashtra', phone: '+919876543210' },
    { email: 'priya@fieldtrack.com', fullName: 'Priya Patel', employeeId: 'EMP002', designation: 'Field Sales Executive', department: 'Sales', city: 'Pune', state: 'Maharashtra', phone: '+919876543211' },
    { email: 'amit@fieldtrack.com', fullName: 'Amit Kumar', employeeId: 'EMP003', designation: 'Field Sales Executive', department: 'Sales', city: 'Delhi', state: 'Delhi', phone: '+919876543212' },
  ];

  const employees = [];
  for (const emp of employeeData) {
    const user = await User.create({
      role: ROLES.EMPLOYEE,
      email: emp.email,
      password: 'Employee@123',
      fullName: emp.fullName,
      employeeId: emp.employeeId,
      phone: emp.phone,
      isActive: true,
      mustChangePassword: false,
    });

    const profile = await EmployeeProfile.create({
      user: user._id,
      designation: emp.designation,
      department: emp.department,
      city: emp.city,
      state: emp.state,
      joiningDate: new Date('2024-01-01'),
      avatarColor: ['#6366f1', '#ec4899', '#f59e0b'][employees.length],
    });

    employees.push({ user, profile, city: emp.city });
    logger.info(`Employee created: ${user.email}`);
  }

  // ---- Stores (Indian cities with coordinates) ----
  const storesData = [
    { name: 'Sharma Kirana Store', code: 'STR001', ownerName: 'Ramesh Sharma', phone: '+912226543210', address: 'Shop 12, Hill Road', city: 'Mumbai', state: 'Maharashtra', postalCode: '400050', lat: 19.076, lng: 72.8777 },
    { name: 'Patel Grocery Mart', code: 'STR002', ownerName: 'Suresh Patel', phone: '+912026543211', address: 'FC Road, Shop 45', city: 'Pune', state: 'Maharashtra', postalCode: '411005', lat: 18.5204, lng: 73.8567 },
    { name: 'Kumar Provision Store', code: 'STR003', ownerName: 'Vijay Kumar', phone: '+911126543212', address: 'Lajpat Nagar, Block B', city: 'Delhi', state: 'Delhi', postalCode: '110024', lat: 28.5675, lng: 77.2425 },
    { name: 'Gupta General Store', code: 'STR004', ownerName: 'Anil Gupta', phone: '+912226543213', address: 'Linking Road, Shop 8', city: 'Mumbai', state: 'Maharashtra', postalCode: '400050', lat: 19.0638, lng: 72.8358 },
    { name: 'Singh Super Market', code: 'STR005', ownerName: 'Harbhajan Singh', phone: '+911126543214', address: 'Karol Bagh, Ajmal Khan Road', city: 'Delhi', state: 'Delhi', postalCode: '110005', lat: 28.6519, lng: 77.1909 },
  ];

  const stores = [];
  for (const s of storesData) {
    const store = await Store.create({
      name: s.name,
      code: s.code,
      ownerName: s.ownerName,
      phone: s.phone,
      address: s.address,
      city: s.city,
      state: s.state,
      postalCode: s.postalCode,
      location: { lat: s.lat, lng: s.lng },
      isActive: true,
      createdBy: admin._id,
    });
    stores.push(store);
    logger.info(`Store created: ${store.name}`);
  }

  // ---- Products (Indian grocery items with prices in rupees) ----
  const productsData = [
    { name: 'Basmati Rice 5kg', sku: 'RICE5KG', unit: 'bag', defaultPrice: 450 },
    { name: 'Toor Dal 1kg', sku: 'TOOR1KG', unit: 'kg', defaultPrice: 130 },
    { name: 'Sunflower Oil 1L', sku: 'OIL1L', unit: 'ltr', defaultPrice: 180 },
    { name: 'Wheat Flour 10kg', sku: 'WHEAT10KG', unit: 'bag', defaultPrice: 420 },
    { name: 'Sugar 1kg', sku: 'SUGAR1KG', unit: 'kg', defaultPrice: 48 },
    { name: 'Tata Salt 1kg', sku: 'SALT1KG', unit: 'kg', defaultPrice: 28 },
    { name: 'Tea Leaves 500g', sku: 'TEA500G', unit: 'pack', defaultPrice: 220 },
    { name: 'Detergent Powder 2kg', sku: 'DET2KG', unit: 'pack', defaultPrice: 180 },
    { name: 'Biscuit Family Pack', sku: 'BISCFP', unit: 'pack', defaultPrice: 50 },
    { name: 'Milk 1L Pouch', sku: 'MILK1L', unit: 'ltr', defaultPrice: 65 },
  ];

  const products = [];
  for (const p of productsData) {
    const product = await Product.create({
      name: p.name,
      sku: p.sku,
      unit: p.unit,
      defaultPrice: p.defaultPrice,
      isActive: true,
      createdBy: admin._id,
    });
    products.push(product);
    logger.info(`Product created: ${product.name} (${product.sku})`);
  }

  // ---- Sample sessions with GPS routes and store visits for last 3 days ----
  for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
    for (const emp of employees) {
      const sessionDate = new Date();
      sessionDate.setDate(sessionDate.getDate() - dayOffset);
      sessionDate.setHours(9, 0, 0, 0);

      // Find stores in the employee's city
      const cityStores = stores.filter((s) => s.city === emp.city);
      if (cityStores.length === 0) continue;

      // Check-in location near the first store
      const firstStore = cityStores[0];
      const checkInLat = firstStore.location.lat + (Math.random() - 0.5) * 0.01;
      const checkInLng = firstStore.location.lng + (Math.random() - 0.5) * 0.01;

      const checkInAt = new Date(sessionDate);

      const session = await WorkSession.create({
        employee: emp.user._id,
        sessionDate: startOfDayUTC(sessionDate),
        checkInAt,
        checkInLocation: { lat: checkInLat, lng: checkInLng, accuracy: 15 },
        status: SESSION_STATUS.COMPLETED,
        deviceInfo: { platform: 'android', appVersion: '1.0.0' },
      });

      // Generate GPS route points between stores
      const routePoints = [];
      let currentLat = checkInLat;
      let currentLng = checkInLng;
      let timestamp = checkInAt.getTime();

      // Visit 2-3 stores per day
      const numVisits = Math.min(cityStores.length, 2 + Math.floor(Math.random() * 2));
      const visitedStores = cityStores.slice(0, numVisits);

      for (let si = 0; si < visitedStores.length; si++) {
        const targetStore = visitedStores[si];
        // Generate ~10 points walking toward the store
        const steps = 10;
        for (let step = 0; step < steps; step++) {
          const frac = (step + 1) / steps;
          currentLat = currentLat + (targetStore.location.lat - currentLat) * frac * 0.8;
          currentLng = currentLng + (targetStore.location.lng - currentLng) * frac * 0.8;
          timestamp += 60000; // 1 minute between points
          routePoints.push({
            employee: emp.user._id,
            session: session._id,
            latitude: currentLat,
            longitude: currentLng,
            accuracy: 10 + Math.random() * 20,
            speed: 5 + Math.random() * 15,
            heading: Math.random() * 360,
            clientTimestamp: new Date(timestamp),
            serverTimestamp: new Date(timestamp),
            status: SYNC_STATUS.SYNCED,
          });
        }

        // Create a store visit at this store
        const visitLat = targetStore.location.lat + (Math.random() - 0.5) * 0.001;
        const visitLng = targetStore.location.lng + (Math.random() - 0.5) * 0.001;
        const distM = distanceMeters(visitLat, visitLng, targetStore.location.lat, targetStore.location.lng);

        // Pick 2-3 random products for the visit
        const numItems = 2 + Math.floor(Math.random() * 2);
        const visitItems = [];
        let totalQty = 0;
        let totalValueMinor = 0;

        for (let pi = 0; pi < numItems; pi++) {
          const product = products[Math.floor(Math.random() * products.length)];
          const qty = 1 + Math.floor(Math.random() * 5);
          const priceMinor = toMinorUnits(product.defaultPrice);
          visitItems.push({
            product: product._id,
            productName: product.name,
            sku: product.sku,
            quantity: qty,
            unitPrice: product.defaultPrice,
            collectedAmount: (priceMinor * qty * (0.5 + Math.random() * 0.5)) / 100,
            notes: '',
          });
          totalQty += qty;
          totalValueMinor += priceMinor * qty;
        }

        await StoreVisit.create({
          employee: emp.user._id,
          session: session._id,
          store: targetStore._id,
          visitDate: new Date(timestamp),
          location: { lat: visitLat, lng: visitLng, accuracy: 15 },
          distanceFromStoreMeters: distM,
          isOutsideRadius: distM > 250,
          notes: 'Regular visit',
          items: visitItems,
          totalQuantity: totalQty,
          totalValue: totalValueMinor,
          idempotencyKey: `${emp.user._id}-${session._id}-${targetStore._id}-${si}`,
          syncStatus: SYNC_STATUS.SYNCED,
        });

        session.visitCount += 1;
      }

      // Insert route points
      if (routePoints.length > 0) {
        await LocationPoint.insertMany(routePoints);
      }

      // Calculate total distance
      const routeCoords = routePoints.map((p) => ({ latitude: p.latitude, longitude: p.longitude }));
      let totalDistance = 0;
      for (let i = 1; i < routeCoords.length; i++) {
        totalDistance += haversineKm(routeCoords[i - 1].latitude, routeCoords[i - 1].longitude, routeCoords[i].latitude, routeCoords[i].longitude);
      }

      const checkOutAt = new Date(timestamp + 3600000); // 1 hour after last point
      session.checkOutAt = checkOutAt;
      session.checkOutLocation = { lat: currentLat, lng: currentLng, accuracy: 12 };
      session.totalDurationMs = checkOutAt - checkInAt;
      session.totalDistanceKm = Number(totalDistance.toFixed(2));
      await session.save();

      logger.info(`Session created for ${emp.user.email} on day ${dayOffset}: ${session.visitCount} visits, ${totalDistance.toFixed(2)}km`);
    }
  }

  // ---- Default app settings ----
  const defaultSettings = [
    { key: 'businessName', value: 'FieldTrack Demo', category: 'general', label: 'Business Name', isPublic: true },
    { key: 'storeVisitRadiusMeters', value: 250, category: 'tracking', label: 'Store Visit Radius (meters)', isPublic: true },
    { key: 'locationMaxAccuracyMeters', value: 100, category: 'tracking', label: 'Max GPS Accuracy (meters)', isPublic: true },
    { key: 'locationMaxSpeedKmh', value: 160, category: 'tracking', label: 'Max Speed (km/h)', isPublic: true },
    { key: 'defaultCurrency', value: 'INR', category: 'general', label: 'Default Currency', isPublic: true },
    { key: 'businessTimezone', value: 'Asia/Kolkata', category: 'general', label: 'Business Timezone', isPublic: true },
  ];

  for (const s of defaultSettings) {
    await AppSetting.create({ ...s, updatedBy: admin._id });
  }
  logger.info(`Created ${defaultSettings.length} app settings`);

  // ---- Print demo credentials ----
  console.log('\n');
  console.log('========================================');
  console.log('   FieldTrack - Database Seeded!');
  console.log('========================================');
  console.log('\n--- Demo Credentials ---\n');
  console.log('ADMIN:');
  console.log('  Email:     admin@fieldtrack.com');
  console.log('  Password:  Admin@12345');
  console.log('\nEMPLOYEES:');
  console.log('  1. Email: rahul@fieldtrack.com   | Password: Employee@123 | ID: EMP001');
  console.log('  2. Email: priya@fieldtrack.com   | Password: Employee@123 | ID: EMP002');
  console.log('  3. Email: amit@fieldtrack.com    | Password: Employee@123 | ID: EMP003');
  console.log('\n--- Seed Data Summary ---\n');
  console.log(`  Users:         ${1 + employees.length} (1 admin, ${employees.length} employees)`);
  console.log(`  Stores:        ${stores.length}`);
  console.log(`  Products:      ${products.length}`);
  console.log(`  Settings:      ${defaultSettings.length}`);
  console.log('\n========================================\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  logger.error(`Seed error: ${err.message}`);
  logger.error(err.stack);
  process.exit(1);
});
