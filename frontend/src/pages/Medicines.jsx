import { lazy, Suspense } from 'react';
import { PageLoader } from '../components/Layout';

const MedicineManagement = lazy(() => import('../components/MedicineManagement'));

export default function Medicines() {
  return (
    <Suspense fallback={<PageLoader />}>
      <MedicineManagement />
    </Suspense>
  );
}
