import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import Profile from './pages/Profile';
import Explore from './pages/Explore';
import Messages from './pages/Messages';
import AnonymousFeed from './pages/AnonymousFeed';
import Landing from './pages/Landing';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Pricing from './pages/Pricing';
import ReferralProgram from './pages/ReferralProgram';
import SocketManager from './components/SocketManager';

function App() {
  return (
    <>
      <SocketManager />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/anonymous" element={<AnonymousFeed />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/:userId" element={<Profile />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/referral" element={<ReferralProgram />} />
        <Route path="/" element={<Landing />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
