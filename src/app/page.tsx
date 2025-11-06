import { redirect } from "next/navigation";

/**
 * Root page - redirects to dashboard
 *
 * The authentication check is handled by the middleware and AuthProvider.
 * If user is not authenticated, AuthProvider will redirect to /login
 */
export default function RootPage() {
  redirect("/dashboard");
}
