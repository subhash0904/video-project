import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

/**
 * Google OAuth callback page.
 * The backend redirects here with `?user=<JSON>`.
 * Tokens are in HTTP-only cookies (set by the backend redirect).
 * We just hydrate the user state and redirect to home.
 */
export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    try {
      const userParam = searchParams.get('user');
      if (userParam) {
        const user = JSON.parse(decodeURIComponent(userParam));
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('oauthLogin', 'true');
        window.location.href = '/';
        return;
      }

      const errorParam = searchParams.get('error');
      if (errorParam) {
        navigate(`/login?error=${encodeURIComponent(errorParam)}`, { replace: true });
        return;
      }

      navigate('/', { replace: true });
    } catch (err) {
      console.error('Auth callback error:', err);
      navigate('/login?error=auth_failed', { replace: true });
    }
  }, [searchParams, navigate]);

  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-8 h-8 border-4 border-neutral-200 border-t-red-600 rounded-full animate-spin" />
      <span className="ml-3 text-neutral-400">Completing sign in...</span>
    </div>
  );
}
