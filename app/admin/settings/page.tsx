'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FiSave, FiUpload, FiImage, FiGlobe } from 'react-icons/fi';
import toast from 'react-hot-toast';

interface SiteSettings {
  site_name: string;
  site_description: string;
  logo_path: string;
  favicon_path: string;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SiteSettings>({
    site_name: '',
    site_description: '',
    logo_path: '',
    favicon_path: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings');
      const data = await response.json();
      if (data.success) {
        setSettings(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Settings saved successfully!');
      } else {
        toast.error(data.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'favicon') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    try {
      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        if (type === 'logo') {
          setSettings(prev => ({ ...prev, logo_path: data.data.path }));
        } else {
          setSettings(prev => ({ ...prev, favicon_path: data.data.path }));
        }
        toast.success(`${type === 'logo' ? 'Logo' : 'Favicon'} uploaded!`);
      } else {
        toast.error(data.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file');
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
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Site Settings</h1>
        <p className="text-sm sm:text-base text-base-content/60">Customize your site appearance and SEO</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* General Settings */}
        <div className="card bg-base-200 shadow-lg">
          <div className="card-body p-4 sm:p-6">
            <h2 className="card-title text-base sm:text-lg flex items-center gap-2">
              <FiGlobe className="w-5 h-5" />
              General Settings
            </h2>

            <div className="form-control">
              <label className="label py-1 sm:py-2">
                <span className="label-text font-medium text-sm sm:text-base">Site Name</span>
              </label>
              <input
                type="text"
                className="input input-bordered h-11 sm:h-12 text-sm sm:text-base"
                placeholder="YouTube Downloader"
                value={settings.site_name}
                onChange={(e) => setSettings(prev => ({ ...prev, site_name: e.target.value }))}
              />
              <label className="label py-1">
                <span className="label-text-alt text-xs sm:text-sm text-base-content/50">Used in page title and header</span>
              </label>
            </div>

            <div className="form-control">
              <label className="label py-1 sm:py-2">
                <span className="label-text font-medium text-sm sm:text-base">Site Description</span>
              </label>
              <textarea
                className="textarea textarea-bordered h-24 sm:h-28 text-sm sm:text-base"
                placeholder="A modern YouTube video downloader..."
                value={settings.site_description}
                onChange={(e) => setSettings(prev => ({ ...prev, site_description: e.target.value }))}
              />
              <label className="label py-1">
                <span className="label-text-alt text-xs sm:text-sm text-base-content/50">Used for SEO meta description</span>
              </label>
            </div>
          </div>
        </div>

        {/* Branding */}
        <div className="card bg-base-200 shadow-lg">
          <div className="card-body p-4 sm:p-6">
            <h2 className="card-title text-base sm:text-lg flex items-center gap-2">
              <FiImage className="w-5 h-5" />
              Branding
            </h2>

            {/* Logo Upload */}
            <div className="form-control">
              <label className="label py-1 sm:py-2">
                <span className="label-text font-medium text-sm sm:text-base">Logo</span>
              </label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-base-300 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                  {settings.logo_path ? (
                    <img src={settings.logo_path} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <FiImage className="w-6 h-6 sm:w-8 sm:h-8 text-base-content/30" />
                  )}
                </div>
                <div className="flex-1 w-full sm:w-auto">
                  <label className="btn btn-outline btn-sm sm:btn-md min-h-[44px] w-full sm:w-auto">
                    <FiUpload className="w-4 h-4" />
                    Upload Logo
                    <input
                      type="file"
                      className="hidden"
                      accept="image/png,image/svg+xml,image/jpeg"
                      onChange={(e) => handleFileUpload(e, 'logo')}
                    />
                  </label>
                  <p className="text-xs text-base-content/50 mt-2">Recommended: 200x200px, PNG or SVG</p>
                </div>
              </div>
            </div>

            {/* Favicon Upload */}
            <div className="form-control mt-4">
              <label className="label py-1 sm:py-2">
                <span className="label-text font-medium text-sm sm:text-base">Favicon</span>
              </label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                <div className="w-12 h-12 bg-base-300 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                  {settings.favicon_path ? (
                    <img src={settings.favicon_path} alt="Favicon" className="w-full h-full object-contain" />
                  ) : (
                    <FiImage className="w-5 h-5 sm:w-6 sm:h-6 text-base-content/30" />
                  )}
                </div>
                <div className="flex-1 w-full sm:w-auto">
                  <label className="btn btn-outline btn-sm sm:btn-md min-h-[44px] w-full sm:w-auto">
                    <FiUpload className="w-4 h-4" />
                    Upload Favicon
                    <input
                      type="file"
                      className="hidden"
                      accept="image/png,image/x-icon,image/ico"
                      onChange={(e) => handleFileUpload(e, 'favicon')}
                    />
                  </label>
                  <p className="text-xs text-base-content/50 mt-2">Recommended: 32x32px, ICO or PNG</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button type="submit" className="btn btn-primary w-full min-h-[52px] text-base" disabled={isSaving}>
          {isSaving ? (
            <span className="loading loading-spinner"></span>
          ) : (
            <>
              <FiSave className="w-5 h-5" />
              Save Settings
            </>
          )}
        </button>
      </form>
    </motion.div>
  );
}
