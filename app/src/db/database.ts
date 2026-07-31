import { Database } from '@nozbe/watermelondb'
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite'
import { Platform } from 'react-native'
import { schema } from './schema'
import Thread from './models/Thread'
import Message from './models/Message'
import CachedAnswer from './models/CachedAnswer'
import OfflineQueue from './models/OfflineQueue'
import FarmerProfile from './models/FarmerProfile'

let adapter;

if (Platform.OS === 'web') {
  // Simple mock adapter fallback for web/testing environment
  const LokiJSAdapter = require('@nozbe/watermelondb/adapters/lokijs').default;
  adapter = new LokiJSAdapter({
    schema,
    useWebWorker: false,
    useIncrementalIndexedDB: true,
  });
} else {
  try {
    adapter = new SQLiteAdapter({
      schema,
      dbName: 'vaani_db',
      jsi: true,
      onSetUpError: (error) => {
        console.warn('WatermelonDB setup error, attempting fallback:', error);
      }
    });
  } catch (e) {
    console.warn('Failed to construct SQLiteAdapter. Creating in-memory fallback adapter.', e);
    const LokiJSAdapter = require('@nozbe/watermelondb/adapters/lokijs').default;
    adapter = new LokiJSAdapter({
      schema,
      useWebWorker: false,
      useIncrementalIndexedDB: true,
    });
  }
}

export const database = new Database({
  adapter,
  modelClasses: [Thread, Message, CachedAnswer, OfflineQueue, FarmerProfile],
});
