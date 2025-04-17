import { onAuthStateChanged, User } from 'firebase/auth'; // Import Firebase Auth
import { auth } from '@/lib/firebase'; // Import auth instance
import { updateGamePoints } from '@/app/utils/gamepoints'; // Import game points utility

        await updateGamePoints(currentUser?.uid || null, 1); // +1 point for win
// Listen for auth state changes
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    setCurrentUser(user);
  });
  return () => unsubscribe(); // Cleanup subscription on unmount
}, []);