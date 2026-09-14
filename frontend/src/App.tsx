import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "./layouts/MainLayout";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { ProtectedRoute } from "./components/common/ProtectedRoute";
import { useSessionBootstrap } from "./hooks/useSessionBootstrap";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import Profile from "./pages/Profile";
import Help from "./pages/Help";
import UserProfile from "./pages/UserProfile";
import Dashboard from "./pages/Dashboard";
import Resources from "./pages/Resources";
import UploadResource from "./pages/UploadResource";
import ResourceDetail from "./pages/ResourceDetail";
import Favorites from "./pages/Favorites";
import Forum from "./pages/Forum";
import ForumPostDetail from "./pages/ForumPostDetail";
import Notifications from "./pages/Notifications";

import { ErrorBoundary } from "./errors/ErrorBoundary";
import NotFound from "./pages/NotFound";
import "./App.css";
import Marketplace from "./pages/Marketplace";
import AdminPanel from "./pages/admin/AdminPanel";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminUserDetail from "./pages/admin/AdminUserDetail";
import AdminModerationQueue from "./pages/admin/AdminModerationQueue";
import AdminOpportunities from "./pages/admin/AdminOpportunities";
import AdminNotifications from "./pages/admin/AdminNotifications";
import AdminLogs from "./pages/admin/AdminLogs";

function App() {
  useSessionBootstrap();

  return (
    <BrowserRouter>
      <Routes>
        {/* Public marketing pages keep the normal document-scrolling
            MainLayout shell (sticky header, footer, page scrolls). */}
        <Route
          path="/"
          element={
            <MainLayout>
              <Landing />
            </MainLayout>
          }
        />
        <Route
          path="/login"
          element={
            <MainLayout>
              <Login />
            </MainLayout>
          }
        />
        <Route
          path="/register"
          element={
            <MainLayout>
              <Register />
            </MainLayout>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <MainLayout>
              <ForgotPassword />
            </MainLayout>
          }
        />
        <Route
          path="/reset-password"
          element={
            <MainLayout>
              <ResetPassword />
            </MainLayout>
          }
        />
        <Route
          path="/verify-email"
          element={
            <MainLayout>
              <VerifyEmail />
            </MainLayout>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Dashboard />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/resources"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Resources />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/resources/upload"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <UploadResource />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/resources/:id"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <ErrorBoundary>
                  <ResourceDetail />
                </ErrorBoundary>
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/favorites"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Favorites />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/forum"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Forum />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/forum/:id"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <ForumPostDetail />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute requireAdmin>
              <DashboardLayout>
                <AdminPanel />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/analytics"
          element={
            <ProtectedRoute requireAdmin>
              <Navigate to="/dashboard" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/universities"
          element={
            <ProtectedRoute requireAdmin>
              <Navigate to="/admin?section=universities" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/faculties"
          element={
            <ProtectedRoute requireAdmin>
              <Navigate to="/admin?section=faculties" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/programmes"
          element={
            <ProtectedRoute requireAdmin>
              <Navigate to="/admin?section=programmes" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/subjects"
          element={
            <ProtectedRoute requireAdmin>
              <Navigate to="/admin?section=subjects" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Profile />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/help"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Help />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/users/:id"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <ErrorBoundary>
                  <UserProfile />
                </ErrorBoundary>
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Notifications />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/marketplace"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Marketplace />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/moderation"
          element={
            <ProtectedRoute requireAdmin>
              <DashboardLayout>
                <AdminModerationQueue embedded />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/tutoring"
          element={
            <ProtectedRoute requireAdmin>
              <DashboardLayout>
                <AdminOpportunities embedded category="tutoring" />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/opportunities"
          element={
            <ProtectedRoute requireAdmin>
              <DashboardLayout>
                <AdminOpportunities embedded category="freelance" />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute requireAdmin>
              <DashboardLayout>
                <AdminUsers embedded />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users/:id"
          element={
            <ProtectedRoute requireAdmin>
              <DashboardLayout>
                <AdminUserDetail embedded />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/logs"
          element={
            <ProtectedRoute requireAdmin>
              <DashboardLayout>
                <AdminLogs embedded />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/notifications"
          element={
            <ProtectedRoute requireAdmin>
              <DashboardLayout>
                <AdminNotifications />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="*"
          element={
            <MainLayout>
              <NotFound />
            </MainLayout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
