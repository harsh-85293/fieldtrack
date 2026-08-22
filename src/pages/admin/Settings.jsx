import React, { useState, useEffect, useCallback } from 'react';
import { Settings as SettingsIcon, Pencil, Save, X } from 'lucide-react';
import { settingsService } from '../../api/services.js';
import {
  LoadingCard, EmptyState, ErrorState, Button, Input,
} from '../../components/ui/index.jsx';
import { useToast } from '../../components/ui/Toast.jsx';

export default function Settings() {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const { toastSuccess, toastError } = useToast();

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await settingsService.getAll();
      const data = res.data.data || res.data;
      setSettings(data.settings || data.items || data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const startEdit = (setting) => {
    setEditingId(setting.id);
    setEditValue(setting.value);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const saveEdit = async (setting) => {
    setSaving(true);
    try {
      await settingsService.update(setting.id, { value: editValue });
      toastSuccess('Setting updated successfully');
      setEditingId(null);
      setEditValue('');
      loadSettings();
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to update setting');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">Manage system configuration</p>
      </div>

      {loading ? (
        <LoadingCard rows={5} />
      ) : error ? (
        <ErrorState message={error} onRetry={loadSettings} />
      ) : settings.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <EmptyState icon={SettingsIcon} title="No settings found" />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-6 py-3 text-left font-medium text-gray-600">Key</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-600">Description</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-600">Value</th>
                  <th className="px-6 py-3 text-right font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {settings.map((setting) => (
                  <tr key={setting.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-mono text-gray-900">{setting.key}</td>
                    <td className="px-6 py-3 text-gray-600">{setting.description || '—'}</td>
                    <td className="px-6 py-3">
                      {editingId === setting.id ? (
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="max-w-xs"
                        />
                      ) : (
                        <span className="text-gray-700">{String(setting.value)}</span>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {editingId === setting.id ? (
                          <>
                            <Button size="sm" onClick={() => saveEdit(setting)} loading={saving}>
                              <Save className="w-4 h-4" />
                              Save
                            </Button>
                            <Button size="sm" variant="secondary" onClick={cancelEdit}>
                              <X className="w-4 h-4" />
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <button
                            onClick={() => startEdit(setting)}
                            className="p-1.5 text-gray-500 hover:text-primary-700 hover:bg-primary-50 rounded-lg"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
