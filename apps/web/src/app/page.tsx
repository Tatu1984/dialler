import { redirect } from 'next/navigation';

export default function HomePage() {
  // Redirect to login or dashboard based on auth status
  redirect('/login');
}
