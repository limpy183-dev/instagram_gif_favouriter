export function getAppRedirectUrl() {
  const path = window.location.pathname.startsWith('/instagram_gif_favouriter')
    ? '/instagram_gif_favouriter/'
    : '/';
  return new URL(path, window.location.origin).toString();
}

export function getAuthErrorMessage(message: string, currentMode: 'login' | 'signup' | 'forgot' | string) {
  const normalized = message.toLowerCase();

  if (normalized.includes('email not confirmed')) {
    return {
      message: 'Your account exists but your email is not confirmed yet. Check your inbox and spam folder for the confirmation email.',
      showResendEmail: true
    };
  }

  if (normalized.includes('invalid login credentials')) {
    if (currentMode === 'login') {
      return {
        message: 'Invalid email or password. If you just signed up, confirm your email first before signing in.',
        showResendEmail: true
      };
    }
    return { message, showResendEmail: false };
  }

  if (normalized.includes('user already registered')) {
    return {
      message: 'This email is already registered. If you have not confirmed it yet, check your inbox for the confirmation email or use Forgot password.',
      showResendEmail: true
    };
  }

  return { message, showResendEmail: false };
}
