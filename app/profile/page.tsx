'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import PageContainer from '@/components/layout/PageContainer';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useRequireAuth } from '@/context/AuthContext';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  UserGroupIcon,
  BuildingOfficeIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

export default function ProfilePage() {
  const { user, refreshUser, isSuperAdmin, isAdmin } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
  });
  const supabase = createClientComponentClient();

  useRequireAuth();

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user?.id);

      if (error) throw error;

      await refreshUser();
      setIsEditing(false);
      toast.success('Profile updated successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      full_name: user?.full_name || '',
      phone: user?.phone || '',
    });
    setIsEditing(false);
  };

  const getRoleDisplay = (role: string) => {
    const roleMap: Record<string, string> = {
      'SUPER_ADMIN': 'Super Administrator',
      'ORG_ADMIN': 'Organization Administrator',
      'GROUP_LEADER': 'Group Leader',
      'USER': 'User',
    };
    return roleMap[role] || role;
  };

  const getRoleBadgeColor = (role: string) => {
    const colorMap: Record<string, string> = {
      'SUPER_ADMIN': 'bg-purple-100 text-purple-800',
      'ORG_ADMIN': 'bg-blue-100 text-blue-800',
      'GROUP_LEADER': 'bg-green-100 text-green-800',
      'USER': 'bg-gray-100 text-gray-800',
    };
    return colorMap[role] || 'bg-gray-100 text-gray-800';
  };

  return (
    <PageContainer
      title="Profile"
      description="Manage your account settings and preferences"
    >
      <div className="space-y-6">
        {/* Profile Information */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>
            {!isEditing ? (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <PencilIcon className="h-4 w-4 mr-2" />
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCancel}>
                  <XMarkIcon className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} loading={loading}>
                  <CheckIcon className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Full Name</label>
              {isEditing ? (
                <Input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="mt-1"
                />
              ) : (
                <p className="mt-1 text-sm text-gray-900">{user?.full_name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <p className="mt-1 text-sm text-gray-900">{user?.email}</p>
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Phone</label>
              {isEditing ? (
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Enter phone number"
                  className="mt-1"
                />
              ) : (
                <p className="mt-1 text-sm text-gray-900">{user?.phone || 'Not set'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Role</label>
              <div className="mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user?.role || '')}`}>
                  {getRoleDisplay(user?.role || '')}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <div className="mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  user?.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {user?.status}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Member Since</label>
              <p className="mt-1 text-sm text-gray-900">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
              </p>
            </div>
          </div>
        </div>

        {/* Super Admin Features */}
        {isSuperAdmin && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Super Admin Tools</h3>
            <p className="text-sm text-gray-600 mb-4">
              As a Super Administrator, you have access to advanced management features.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link href="/admin/organizations" className="block">
                <div className="border border-gray-200 rounded-lg p-4 hover:border-purple-500 hover:shadow-md transition-all">
                  <BuildingOfficeIcon className="h-8 w-8 text-purple-600 mb-2" />
                  <h4 className="font-medium text-gray-900">Manage Organizations</h4>
                  <p className="text-sm text-gray-600">Create and manage organizations</p>
                </div>
              </Link>
              <Link href="/admin/groups" className="block">
                <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition-all">
                  <UserGroupIcon className="h-8 w-8 text-blue-600 mb-2" />
                  <h4 className="font-medium text-gray-900">Manage Groups</h4>
                  <p className="text-sm text-gray-600">Create and manage groups</p>
                </div>
              </Link>
            </div>
          </div>
        )}

        {/* Admin Features */}
        {isAdmin && !isSuperAdmin && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Admin Tools</h3>
            <p className="text-sm text-gray-600 mb-4">
              As an Organization Administrator, you can manage groups within your organization.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link href="/admin/groups" className="block">
                <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition-all">
                  <UserGroupIcon className="h-8 w-8 text-blue-600 mb-2" />
                  <h4 className="font-medium text-gray-900">Manage Groups</h4>
                  <p className="text-sm text-gray-600">Create and manage groups</p>
                </div>
              </Link>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}