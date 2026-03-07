import { getAuth } from 'firebase/auth';
import { app } from './firebase';

export const auth = getAuth(app);
