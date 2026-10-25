/**
 * Firebase Firestore & Auth Configuration Template
 * Production-ready Web SDK setup and Firestore CRUD services
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore with specific database ID if configured
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);
export const auth = getAuth(app);

// Collection References
export const COLLECTIONS = {
  SETTINGS: 'settings',
  USERS: 'app_users',
  TRANSACTIONS: 'transactions',
  MEMBERS: 'committee_members',
  EXPENSES: 'expense_types',
  RECEIPTS: 'receipt_types',
};

/**
 * -------------------------------------------------------------
 * Firestore Production-ready CRUD Utility Functions
 * -------------------------------------------------------------
 */

// 1. Add new document
export async function createDocument(collectionName, data) {
  try {
    const colRef = collection(db, collectionName);
    const docRef = await addDoc(colRef, {
      ...data,
      serverTime: serverTimestamp(),
      updatedAt: new Date().toISOString(),
    });
    return docRef.id;
  } catch (error) {
    console.error(`Error adding document to ${collectionName}:`, error);
    throw error;
  }
}

// 2. Set document with known ID
export async function setDocument(collectionName, id, data) {
  try {
    const docRef = doc(db, collectionName, id);
    await setDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return id;
  } catch (error) {
    console.error(`Error setting document in ${collectionName}/${id}:`, error);
    throw error;
  }
}

// 3. Update existing document
export async function updateDocument(collectionName, id, updates) {
  try {
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    return id;
  } catch (error) {
    console.error(`Error updating document in ${collectionName}/${id}:`, error);
    throw error;
  }
}

// 4. Delete document (Permanent removal)
export async function deleteDocument(collectionName, id) {
  try {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
    return id;
  } catch (error) {
    console.error(`Error deleting document in ${collectionName}/${id}:`, error);
    throw error;
  }
}

// 5. Fetch all documents from a collection
export async function getCollectionDocs(collectionName) {
  try {
    const colRef = collection(db, collectionName);
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));
  } catch (error) {
    console.error(`Error fetching collection ${collectionName}:`, error);
    throw error;
  }
}

export default {
  app,
  db,
  auth,
  COLLECTIONS,
  createDocument,
  setDocument,
  updateDocument,
  deleteDocument,
  getCollectionDocs,
};
