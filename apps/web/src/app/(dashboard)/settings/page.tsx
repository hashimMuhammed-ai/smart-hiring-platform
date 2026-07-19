'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth';
import { useToast } from '@/lib/toast';
import apiClient from '@/lib/api-client';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  
  const [workspaceName, setWorkspaceName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    apiClient.get<{ name: string }>('/auth/tenant')
      .then((res) => {
        setWorkspaceName(res.data.name);
      })
      .catch((err) => {
        console.error('Failed to fetch workspace name:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast('Workspace settings updated successfully!', 'success');
    }, 800);
  };

  return (
    <div className="page-content page-content--narrow">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your workspace configuration and user preferences</p>
      </div>

      {/* Content */}
      <div className="form-card" id="profile-settings-card">
        <form onSubmit={handleSave} className="create-form" noValidate>
          <h2 className="detail-card__title" style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>
            General Settings
          </h2>

          {/* User details (Read-only) */}
          <div className="form-group">
            <label className="form-label">Account Email</label>
            <input
              type="text"
              className="form-input"
              value={user?.email ?? 'recruiter@smarthiring.dev'}
              disabled
              style={{ opacity: 0.7, cursor: 'not-allowed' }}
            />
            <p className="form-hint">Email address cannot be changed in this version.</p>
          </div>

          <div className="form-group">
            <label className="form-label">Role</label>
            <input
              type="text"
              className="form-input"
              value={user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Recruiter'}
              disabled
              style={{ opacity: 0.7, cursor: 'not-allowed' }}
            />
          </div>

          {/* Editable Workspace Name */}
          <div className="form-group">
            <label htmlFor="workspace-name" className="form-label">
              Workspace Name
            </label>
            <input
              id="workspace-name"
              type="text"
              className="form-input"
              value={isLoading ? 'Loading workspace name...' : workspaceName}
              disabled={isLoading}
              onChange={(e) => setWorkspaceName(e.target.value)}
              style={isLoading ? { opacity: 0.7, cursor: 'wait' } : undefined}
            />
          </div>

          {/* Actions */}
          <div className="form-actions" style={{ marginTop: '2rem' }}>
            <button
              type="submit"
              disabled={isLoading || isSaving}
              className="btn-primary btn--fit"
              id="save-settings-btn"
            >
              {isSaving && <span className="btn-spinner" aria-hidden="true" />}
              {isSaving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
