"use client";
import React, { useState, useEffect } from "react";
import { authenticatedFetch } from "../../lib/api/apiHelpers";
import { WikiPage } from "../../types";

interface SiteSettings {
  defaultPageId: number | null;
}

export default function SiteSettingsPage() {
  const [settings, setSettings] = useState<SiteSettings>({ defaultPageId: null });
  const [pages, setPages] = useState<WikiPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      // Fetch current settings
      authenticatedFetch("/api/admin/settings")
        .then(res => {
          if (!res.ok) throw new Error("Failed to fetch settings");
          return res.json();
        }),
      // Fetch all pages
      authenticatedFetch("/api/pages")
        .then(res => {
          if (!res.ok) throw new Error("Failed to fetch pages");
          return res.json();
        })
    ])
      .then(([settingsData, pagesData]) => {
        setSettings(settingsData);
        setPages(pagesData);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await authenticatedFetch("/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save settings");
      }

      setSuccessMessage("Settings saved successfully!");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
        <p className="text-indigo-100">Loading settings...</p>
      </div>
    );
  }

  const selectedPage = pages.find(p => p.id === settings.defaultPageId);

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-indigo-300 mb-4">Site Settings</h3>
      
      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="bg-green-900/50 border border-green-700 text-green-200 px-4 py-3 rounded mb-4">
          {successMessage}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="defaultPage" className="block text-sm font-medium text-indigo-300 mb-2">
            Default Home Page
          </label>
          <p className="text-xs text-indigo-400 mb-2">
            Select a page to display when users visit the site. If not set, the page list will be shown.
          </p>
          <select
            id="defaultPage"
            value={settings.defaultPageId || ""}
            onChange={(e) => {
              const value = e.target.value;
              setSettings({
                ...settings,
                defaultPageId: value ? parseInt(value, 10) : null,
              });
            }}
            className="w-full bg-gray-900 border border-gray-600 text-indigo-100 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">No default page (show page list)</option>
            {pages.map((page) => (
              <option key={page.id} value={page.id}>
                {page.title} ({page.path})
              </option>
            ))}
          </select>
          {selectedPage && (
            <p className="text-xs text-indigo-400 mt-2">
              Selected: <span className="font-semibold">{selectedPage.title}</span> at{" "}
              <span className="font-mono">{selectedPage.path}</span>
            </p>
          )}
        </div>

        <div className="flex gap-3 pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 text-white px-6 py-2 rounded-lg transition font-medium"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
          <button
            onClick={() => {
              setSettings({ defaultPageId: null });
            }}
            disabled={saving}
            className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 text-white px-6 py-2 rounded-lg transition font-medium"
          >
            Clear Default Page
          </button>
        </div>
      </div>
    </div>
  );
}
