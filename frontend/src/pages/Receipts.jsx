import { lazy, Suspense } from 'react';
import { PageLoader } from '../components/Layout';

const ReceiptHistory = lazy(() => import('../components/ReceiptHistory'));

export default function Receipts() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ReceiptHistory />
    </Suspense>
  );
}
