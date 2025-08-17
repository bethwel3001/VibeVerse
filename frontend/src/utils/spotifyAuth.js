const BACKEND = process.env.REACT_APP_SERVER_URL || 'http://127.0.0.1:5000';

export function getLoginHref() {
  return `${BACKEND}/auth/spotify`;
}

export function greetingByTime() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}
