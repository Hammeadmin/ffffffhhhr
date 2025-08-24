import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import WorkerLayout from './components/WorkerLayout';
import OfflineIndicator from './components/OfflineIndicator';
import FloatingActionButton from './components/FloatingActionButton';
import Dashboard from './pages/Dashboard';
import WorkerDashboard from './pages/WorkerDashboard';
import WorkerSchedule from './pages/WorkerSchedule';
import WorkerTimesheet from './pages/WorkerTimesheet';
import Customers from './pages/Customers';
import Quotes from './pages/Quotes';
import Orders from './pages/Orders';
import Calendar from './pages/Calendar';
import Invoices from './pages/Invoices';
import Team from './pages/Team';
import Settings from './pages/Settings';
import Analytics from './pages/Analytics';
import Communications from './pages/Communications';
import QuoteAcceptance from './pages/QuoteAcceptance';
import WorkerRouteHandler from './components/WorkerRouteHandler';

function App() {
  return (
    <AuthProvider>
      <OfflineIndicator />
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/quote-accept/:token" element={<QuoteAcceptance />} />
          
          {/* Protected routes */}
          <Route path="/*" element={
            <ProtectedRoute>
              <WorkerRouteHandler>
                <Routes>
                  {/* Worker routes */}
                  <Route path="/worker-dashboard" element={
                    <WorkerLayout>
                      <WorkerDashboard />
                    </WorkerLayout>
                  } />
                  <Route path="/worker-schedule" element={
                    <WorkerLayout>
                      <WorkerSchedule />
                    </WorkerLayout>
                  } />
                  <Route path="/worker-timesheet" element={
                    <WorkerLayout>
                      <WorkerTimesheet />
                    </WorkerLayout>
                  } />
                  
                  {/* Regular routes */}
                  <Route path="/" element={
                    <Layout>
                      <Dashboard />
                    </Layout>
                  } />
                  <Route path="/ordrar" element={
                    <Layout>
                      <Orders />
                    </Layout>
                  } />
                  <Route path="/kunder" element={
                    <Layout>
                      <Customers />
                    </Layout>
                  } />
                  <Route path="/offerter" element={
                    <Layout>
                      <Quotes />
                    </Layout>
                  } />
                  <Route path="/kalender" element={
                    <Layout>
                      <Calendar />
                    </Layout>
                  } />
                  <Route path="/fakturor" element={
                    <Layout>
                      <Invoices />
                    </Layout>
                  } />
                  <Route path="/team" element={
                    <Layout>
                      <Team />
                    </Layout>
                  } />
                  <Route path="/installningar" element={
                    <Layout>
                      <Settings />
                    </Layout>
                  } />
                  <Route path="/analys" element={
                    <Layout>
                      <Analytics />
                    </Layout>
                  } />
                  <Route path="/kommunikation" element={
                    <Layout>
                      <Communications />
                    </Layout>
                  } />
                </Routes>
              </WorkerRouteHandler>
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;