import { lazy, Suspense } from 'react';
import { PageLoader } from '../components/Layout';

const NotificationsForecasting = lazy(() => import('../components/NotificationsForecasting'));

export default function Notifications() {
  return (
    <Suspense fallback={<PageLoader />}>
      <NotificationsForecasting />
    </Suspense>
  );
}
