'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';

interface Organization {
  id: string;
  slug: string;
  display_name: string;
  is_active: boolean;
}

interface Category {
  id: string;
  name: string;
  description: string;
  need_type: string;
  is_active: boolean;
  is_hidden: boolean;
  display_order: number;
}

interface CategorySetting {
  id: string;
  organization_id: string;
  category_id: string;
  is_enabled: boolean;
}

export default function OrganizationCategoriesPage() {
  const { user, loading: authLoading, isSuperAdmin } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<CategorySetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const supabase = createClientComponentClient();

  useEffect(() => {
    if (!authLoading && !isSuperAdmin) {
      window.location.href = '/';
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch organizations
        const { data: orgsData, error: orgsError } = await supabase
          .from('organizations')
          .select('id, slug, display_name, is_active')
          .order('display_name');

        if (orgsError) throw orgsError;
        setOrganizations(orgsData || []);

        // Set first org as selected by default
        if (orgsData && orgsData.length > 0 && !selectedOrgId) {
          setSelectedOrgId(orgsData[0].id);
        }

        // Fetch global categories (non-hidden ones, plus hidden for superadmin visibility)
        const { data: catsData, error: catsError } = await supabase
          .from('need_categories')
          .select('*')
          .is('organization_id', null)
          .eq('is_active', true)
          .order('display_order');

        if (catsError) throw catsError;
        setCategories(catsData || []);

        // Fetch all category settings
        const { data: settingsData, error: settingsError } = await supabase
          .from('organization_category_settings')
          .select('*');

        if (settingsError) throw settingsError;
        setSettings(settingsData || []);

      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && user) {
      fetchData();
    }
  }, [authLoading, user, isSuperAdmin, supabase, selectedOrgId]);

  // Check if a category is enabled for an organization
  const isCategoryEnabled = (orgId: string, categoryId: string, isHidden: boolean): boolean => {
    // Hidden categories are disabled by default unless explicitly enabled
    const setting = settings.find(
      (s) => s.organization_id === orgId && s.category_id === categoryId
    );
    
    if (setting) {
      return setting.is_enabled;
    }
    
    // Default: enabled if not hidden, disabled if hidden
    return !isHidden;
  };

  const toggleCategory = async (orgId: string, categoryId: string, currentlyEnabled: boolean) => {
    const settingKey = `${orgId}-${categoryId}`;
    setSaving(settingKey);

    try {
      const existingSetting = settings.find(
        (s) => s.organization_id === orgId && s.category_id === categoryId
      );

      if (existingSetting) {
        // Update existing setting
        const { error } = await supabase
          .from('organization_category_settings')
          .update({ is_enabled: !currentlyEnabled, updated_at: new Date().toISOString() })
          .eq('id', existingSetting.id);

        if (error) throw error;

        setSettings(settings.map((s) =>
          s.id === existingSetting.id ? { ...s, is_enabled: !currentlyEnabled } : s
        ));
      } else {
        // Create new setting
        const { data, error } = await supabase
          .from('organization_category_settings')
          .insert({
            organization_id: orgId,
            category_id: categoryId,
            is_enabled: !currentlyEnabled,
          })
          .select()
          .single();

        if (error) throw error;

        setSettings([...settings, data]);
      }

      toast.success(`Category ${!currentlyEnabled ? 'enabled' : 'disabled'}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update category setting');
    } finally {
      setSaving(null);
    }
  };

  // Enable all categories for an organization
  const enableAllForOrg = async (orgId: string) => {
    setSaving(`all-${orgId}`);
    
    try {
      for (const category of categories) {
        const existingSetting = settings.find(
          (s) => s.organization_id === orgId && s.category_id === category.id
        );

        if (existingSetting) {
          if (!existingSetting.is_enabled) {
            await supabase
              .from('organization_category_settings')
              .update({ is_enabled: true, updated_at: new Date().toISOString() })
              .eq('id', existingSetting.id);
          }
        } else if (category.is_hidden) {
          // Only need to create setting for hidden categories (to enable them)
          await supabase
            .from('organization_category_settings')
            .insert({
              organization_id: orgId,
              category_id: category.id,
              is_enabled: true,
            });
        }
      }

      // Refresh settings
      const { data: settingsData } = await supabase
        .from('organization_category_settings')
        .select('*');
      
      setSettings(settingsData || []);
      toast.success('All categories enabled');
    } catch (error: any) {
      toast.error(error.message || 'Failed to enable all categories');
    } finally {
      setSaving(null);
    }
  };

  // Reset to defaults for an organization
  const resetToDefaults = async (orgId: string) => {
    setSaving(`reset-${orgId}`);
    
    try {
      // Delete all settings for this org (will fall back to defaults)
      await supabase
        .from('organization_category_settings')
        .delete()
        .eq('organization_id', orgId);

      setSettings(settings.filter((s) => s.organization_id !== orgId));
      toast.success('Reset to default categories');
    } catch (error: any) {
      toast.error(error.message || 'Failed to reset categories');
    } finally {
      setSaving(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const selectedOrg = organizations.find((o) => o.id === selectedOrgId);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin">
                <Button variant="outline" size="sm">
                  <ArrowLeftIcon className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Category Settings by Organization</h1>
                <p className="text-sm text-gray-500">Enable or disable need categories for each organization</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Organization Selector */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Organizations</h2>
              <div className="space-y-2">
                {organizations.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => setSelectedOrgId(org.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                      selectedOrgId === org.id
                        ? 'bg-blue-50 border-2 border-blue-500'
                        : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">{org.display_name}</p>
                        <p className="text-xs text-gray-500">{org.slug}</p>
                      </div>
                    </div>
                    {!org.is_active && (
                      <span className="text-xs text-red-600 ml-8">Inactive</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Category Settings */}
          <div className="lg:col-span-3">
            {selectedOrg ? (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Categories for {selectedOrg.display_name}
                    </h2>
                    <p className="text-sm text-gray-500">
                      Toggle which need categories are available for this organization
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => resetToDefaults(selectedOrgId)}
                      loading={saving === `reset-${selectedOrgId}`}
                    >
                      Reset to Defaults
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => enableAllForOrg(selectedOrgId)}
                      loading={saving === `all-${selectedOrgId}`}
                    >
                      Enable All
                    </Button>
                  </div>
                </div>

                <div className="divide-y divide-gray-200">
                  {categories.map((category) => {
                    const isEnabled = isCategoryEnabled(selectedOrgId, category.id, category.is_hidden);
                    const settingKey = `${selectedOrgId}-${category.id}`;

                    return (
                      <div key={category.id} className="px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div
                            className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                              isEnabled ? 'bg-green-100' : 'bg-gray-100'
                            }`}
                          >
                            {isEnabled ? (
                              <CheckCircleIcon className="h-6 w-6 text-green-600" />
                            ) : (
                              <XCircleIcon className="h-6 w-6 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900">{category.name}</p>
                              {category.is_hidden && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-800">
                                  <EyeSlashIcon className="h-3 w-3" />
                                  Hidden by default
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">{category.description}</p>
                            <p className="text-xs text-gray-400 mt-1">Type: {category.need_type}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => toggleCategory(selectedOrgId, category.id, isEnabled)}
                          disabled={saving === settingKey}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                            isEnabled ? 'bg-blue-600' : 'bg-gray-200'
                          } ${saving === settingKey ? 'opacity-50' : ''}`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              isEnabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <BuildingOfficeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Select an organization to manage its categories</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}