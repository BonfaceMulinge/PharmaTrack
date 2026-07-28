import { lazy, Suspense, useCallback } from 'react';
import { PageLoader } from '../components/Layout';
import { emit, Events } from '../store';

const SalesPos = lazy(() => import('../components/SalesPos'));

export default function Sales() {
  const handleSaleComplete = useCallback(() => {
    emit(Events.SALE_COMPLETED);
    emit(Events.MEDICINES_CHANGED);
  }, []);

  return (
    <Suspense fallback={<PageLoader />}>
      <SalesPos onSaleComplete={handleSaleComplete} />
    </Suspense>
  );
}
