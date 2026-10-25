import { Navigate, Route, Routes } from 'react-router';
import { FoundationPage } from '../features/foundation/foundation-page';

export function AppRouter() {
  return <Routes>
    <Route path="/" element={<FoundationPage />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}
