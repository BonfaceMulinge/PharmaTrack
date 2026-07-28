import { lazy, Suspense } from 'react';
import { PageLoader } from '../components/Layout';

const HomePage = lazy(() => import('../components/HomePage'));

export default function Home() {
  return (
    <Suspense fallback={<PageLoader />}>
      <HomePage />
    </Suspense>
  );
}
