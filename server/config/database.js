import mongoose from 'mongoose';
import logger from '../utils/logger.js';

let isConnected = false;

export async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    logger.warn('MONGODB_URI not set — server will start without database. API calls requiring DB will return errors.');
    return null;
  }

  try {
    // Local networks with HTTPS-inspecting antivirus often break Atlas TLS
    // with "unable to verify the first certificate". Allow that in development only.
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      ...(process.env.NODE_ENV !== 'production'
        ? { tlsAllowInvalidCertificates: true }
        : {}),
    });
    isConnected = true;
    logger.info(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    logger.warn(`MongoDB connection failed: ${error.message} — server continuing without database.`);
    return null;
  }
}

export function isDBConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}

export async function disconnectDB() {
  try {
    await mongoose.disconnect();
    isConnected = false;
    logger.info('MongoDB disconnected');
  } catch (error) {
    logger.error(`MongoDB disconnection error: ${error.message}`);
  }
}

export default connectDB;
