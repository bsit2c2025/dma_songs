import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-3 py-24 text-center">
      <h1 className="text-3xl font-bold text-primary">404</h1>
      <p className="text-sm text-muted">This page doesn't exist.</p>
      <Link to="/" className="text-sm font-medium text-accent hover:underline">
        Back to home
      </Link>
    </div>
  );
}
