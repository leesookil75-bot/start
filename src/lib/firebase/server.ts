import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    try {
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }
    } catch (error) {
        console.error('Firebase Admin Initialization Error:', error);
    }
}

export const adminAuth = admin.apps.length > 0 ? admin.auth() : null;

export async function verifyIdToken(idToken: string) {
    if (!adminAuth) {
        throw new Error('Firebase Admin is not configured. Please check FIREBASE_SERVICE_ACCOUNT env var.');
    }
    try {
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        return decodedToken;
    } catch (error) {
        console.error('Error verifying Firebase ID token:', error);
        throw new Error('Invalid Firebase ID token');
    }
}
