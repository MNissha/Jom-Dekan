import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="page-container page-container-reading flex min-h-[60vh] flex-col items-center justify-center text-center">
      <h1 className="text-page-title text-content-primary">Page not found</h1>
      <p className="mt-grid-2 text-body text-content-secondary">The page you're looking for doesn't exist.</p>
      <Link to="/" className="mt-grid-6 text-label text-brand-primary hover:underline">
        Back to home
      </Link>
    </div>
  );
}
