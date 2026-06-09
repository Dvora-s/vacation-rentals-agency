import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// כפתור "התחברות עם Google". מוסתר אם לא הוגדר VITE_GOOGLE_CLIENT_ID.
function GoogleSignInButton({ onSuccess, onError }) {
  const { loginWithGoogle } = useAuth();

  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <div className="google-signin">
      <div className="google-signin-divider">
        <span>או</span>
      </div>
      <div className="google-signin-btn">
        <GoogleLogin
          locale="he"
          text="continue_with"
          shape="rectangular"
          width="320"
          onSuccess={async (credentialResponse) => {
            try {
              const user = await loginWithGoogle(credentialResponse.credential);
              onSuccess?.(user);
            } catch (err) {
              onError?.(err.message || 'ההתחברות עם גוגל נכשלה');
            }
          }}
          onError={() => onError?.('ההתחברות עם גוגל נכשלה')}
        />
      </div>
    </div>
  );
}

export default GoogleSignInButton;
