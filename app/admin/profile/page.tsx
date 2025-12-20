'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FiSave, FiUser, FiMail, FiLock, FiCheck } from 'react-icons/fi';
import toast from 'react-hot-toast';

interface ProfileData {
  username: string;
  email: string;
}

export default function AdminProfilePage() {
  const [profile, setProfile] = useState<ProfileData>({
    username: '',
    email: '',
  });
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/admin/profile');
      const data = await response.json();
      if (data.success) {
        setProfile({
          username: data.data.username,
          email: data.data.email || '',
        });
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);

    try {
      const response = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Profile updated successfully!');
      } else {
        toast.error(data.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwords.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsSavingPassword(true);

    try {
      const response = await fetch('/api/admin/profile/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Password changed successfully!');
        setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        toast.error(data.error || 'Failed to change password');
      }
    } catch (error) {
      console.error('Password change error:', error);
      toast.error('Failed to change password');
    } finally {
      setIsSavingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto space-y-4 sm:space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Profile</h1>
        <p className="text-sm sm:text-base text-base-content/60">Manage your admin account</p>
      </div>

      {/* Profile Info */}
      <form onSubmit={handleProfileSubmit}>
        <div className="card bg-base-200 shadow-lg">
          <div className="card-body p-4 sm:p-6">
            <h2 className="card-title text-base sm:text-lg flex items-center gap-2">
              <FiUser className="w-5 h-5" />
              Account Information
            </h2>

            <div className="form-control">
              <label className="label py-1 sm:py-2">
                <span className="label-text font-medium text-sm sm:text-base">Username</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <FiUser className="w-5 h-5 text-base-content/40" />
                </span>
                <input
                  type="text"
                  className="input input-bordered w-full pl-10 h-11 sm:h-12 text-sm sm:text-base"
                  placeholder="admin"
                  value={profile.username}
                  onChange={(e) => setProfile(prev => ({ ...prev, username: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="form-control">
              <label className="label py-1 sm:py-2">
                <span className="label-text font-medium text-sm sm:text-base">Email</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <FiMail className="w-5 h-5 text-base-content/40" />
                </span>
                <input
                  type="email"
                  className="input input-bordered w-full pl-10 h-11 sm:h-12 text-sm sm:text-base"
                  placeholder="admin@example.com"
                  value={profile.email}
                  onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary mt-4 min-h-[48px] w-full sm:w-auto" disabled={isSavingProfile}>
              {isSavingProfile ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                <>
                  <FiSave className="w-5 h-5" />
                  Save Profile
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Change Password */}
      <form onSubmit={handlePasswordSubmit}>
        <div className="card bg-base-200 shadow-lg">
          <div className="card-body p-4 sm:p-6">
            <h2 className="card-title text-base sm:text-lg flex items-center gap-2">
              <FiLock className="w-5 h-5" />
              Change Password
            </h2>

            <div className="form-control">
              <label className="label py-1 sm:py-2">
                <span className="label-text font-medium text-sm sm:text-base">Current Password</span>
              </label>
              <input
                type="password"
                className="input input-bordered h-11 sm:h-12 text-sm sm:text-base"
                placeholder="Enter current password"
                value={passwords.currentPassword}
                onChange={(e) => setPasswords(prev => ({ ...prev, currentPassword: e.target.value }))}
                required
              />
            </div>

            <div className="form-control">
              <label className="label py-1 sm:py-2">
                <span className="label-text font-medium text-sm sm:text-base">New Password</span>
              </label>
              <input
                type="password"
                className="input input-bordered h-11 sm:h-12 text-sm sm:text-base"
                placeholder="Enter new password"
                value={passwords.newPassword}
                onChange={(e) => setPasswords(prev => ({ ...prev, newPassword: e.target.value }))}
                required
                minLength={6}
              />
            </div>

            <div className="form-control">
              <label className="label py-1 sm:py-2">
                <span className="label-text font-medium text-sm sm:text-base">Confirm New Password</span>
              </label>
              <input
                type="password"
                className="input input-bordered h-11 sm:h-12 text-sm sm:text-base"
                placeholder="Confirm new password"
                value={passwords.confirmPassword}
                onChange={(e) => setPasswords(prev => ({ ...prev, confirmPassword: e.target.value }))}
                required
              />
              {passwords.newPassword && passwords.confirmPassword && (
                <label className="label py-1">
                  <span className={`label-text-alt flex items-center gap-1 text-xs sm:text-sm ${
                    passwords.newPassword === passwords.confirmPassword ? 'text-success' : 'text-error'
                  }`}>
                    {passwords.newPassword === passwords.confirmPassword ? (
                      <>
                        <FiCheck className="w-3 h-3" />
                        Passwords match
                      </>
                    ) : (
                      'Passwords do not match'
                    )}
                  </span>
                </label>
              )}
            </div>

            <button type="submit" className="btn btn-warning mt-4 min-h-[48px] w-full sm:w-auto" disabled={isSavingPassword}>
              {isSavingPassword ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                <>
                  <FiLock className="w-5 h-5" />
                  Change Password
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </motion.div>
  );
}
