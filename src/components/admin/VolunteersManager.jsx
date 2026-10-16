import React, { useState, useEffect, useCallback } from 'react';
import {
  UserPlus,
  Edit2,
  Trash2,
  Shield,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  AlertTriangle,
  X,
} from 'lucide-react';

const STATIONS = [
  'All / Registration Desk',
  'Free Fire',
  'BGMI',
  'Mini Militia',
  'Valorant',
  'eFootball',
  'Carrom',
];

export function VolunteersManager({ token }) {
  const [volunteers, setVolunteers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Add form fields
  const [addName, setAddName] = useState('');
  const [addCampusId, setAddCampusId] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addStation, setAddStation] = useState('All / Registration Desk');
  const [addActive, setAddActive] = useState(true);
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);

  // Edit form fields
  const [editName, setEditName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editStation, setEditStation] = useState('All / Registration Desk');
  const [editActive, setEditActive] = useState(true);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Fetch volunteers list
  const fetchVolunteers = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/admin/volunteers', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setVolunteers(data.volunteers || []);
      } else {
        setErrorMsg(data?.error || `Server error (${res.status}): Failed to load volunteers.`);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Network error fetching volunteers list.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchVolunteers();
  }, [fetchVolunteers]);

  // Handle Add Volunteer
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmittingAdd(true);

    try {
      const res = await fetch('/api/admin/volunteers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: addName.trim(),
          campusId: addCampusId.trim(),
          password: addPassword.trim(),
          station: addStation,
          active: addActive,
        }),
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setSuccessMsg(`Volunteer '${addName}' created successfully.`);
        setIsAddModalOpen(false);
        setAddName('');
        setAddCampusId('');
        setAddPassword('');
        fetchVolunteers();
      } else {
        setErrorMsg(data?.error || `Failed to create volunteer (HTTP ${res.status}).`);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Network error while creating volunteer.');
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (volunteer) => {
    setEditTarget(volunteer);
    setEditName(volunteer.name);
    setEditStation(volunteer.station || 'All / Registration Desk');
    setEditActive(Boolean(volunteer.active));
    setEditPassword('');
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editTarget) return;
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmittingEdit(true);

    try {
      const res = await fetch('/api/admin/volunteers', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          volunteerId: editTarget.volunteerId,
          name: editName.trim(),
          campusId: editTarget.username,
          station: editStation,
          active: editActive,
          password: editPassword.trim() || undefined, // only send if non-empty
        }),
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setSuccessMsg(`Volunteer '${editName}' updated successfully.`);
        setEditTarget(null);
        fetchVolunteers();
      } else {
        setErrorMsg(data?.error || `Failed to update volunteer (HTTP ${res.status}).`);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Network error while updating volunteer.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Handle Delete Volunteer
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`/api/admin/volunteers?volunteerId=${encodeURIComponent(deleteTarget.volunteerId)}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setSuccessMsg(`Volunteer '${deleteTarget.name}' deleted.`);
        setDeleteTarget(null);
        fetchVolunteers();
      } else {
        setErrorMsg(data?.error || `Failed to delete volunteer (HTTP ${res.status}).`);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Network error while deleting volunteer.');
    }
  };

  // Filter volunteers
  const filteredVolunteers = volunteers.filter((v) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      v.name.toLowerCase().includes(q) ||
      v.username.toLowerCase().includes(q) ||
      v.volunteerId.toLowerCase().includes(q) ||
      v.station.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#070b29] border border-white/10 p-5 rounded-3xl">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black font-orbitron text-white">VOLUNTEER ROSTER & PASSWORDS</h2>
              <p className="text-xs text-slate-400">Admin-exclusive volunteer provisioning, password assignment, and station controls</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={fetchVolunteers}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-cyan-400 border border-white/10 transition-colors cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-black font-orbitron text-xs transition-all shadow-[0_0_20px_rgba(0,229,255,0.3)] flex items-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Volunteer</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="text-rose-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search volunteer by name, Campus ID, or assigned station..."
          className="w-full pl-11 pr-4 py-3 bg-[#080d2c] border border-white/10 focus:border-cyan-400 rounded-2xl text-white placeholder-slate-500 text-xs outline-none transition-colors"
        />
      </div>

      {/* Volunteers Table / Cards */}
      <div className="bg-[#070b29] border border-white/10 rounded-3xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="py-20 text-center space-y-2">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Loading volunteer accounts from Supabase...</p>
          </div>
        ) : filteredVolunteers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-[#04061a] text-slate-400 font-mono uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4 font-bold">Volunteer</th>
                  <th className="py-3.5 px-4 font-bold">Campus ID</th>
                  <th className="py-3.5 px-4 font-bold">Station</th>
                  <th className="py-3.5 px-4 font-bold">Status</th>
                  <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {filteredVolunteers.map((v) => (
                  <tr key={v.volunteerId} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white text-sm">{v.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{v.volunteerId}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-cyan-400">
                      {v.username}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-lg bg-white/5 text-slate-300 border border-white/10 font-medium">
                        {v.station}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {v.active ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                          <XCircle className="w-3 h-3" />
                          Deactivated
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(v)}
                          className="p-2 rounded-xl bg-white/5 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-white/10 transition-colors cursor-pointer"
                          title="Edit details & change password"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(v)}
                          className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-white/10 transition-colors cursor-pointer"
                          title="Delete volunteer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center space-y-2">
            <Shield className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-sm font-bold text-slate-300">No Volunteers Found</p>
            <p className="text-xs text-slate-500">
              {searchQuery ? `No match for "${searchQuery}".` : 'Click "Add Volunteer" to create one.'}
            </p>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* ADD VOLUNTEER MODAL */}
      {/* ========================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#070b24] border border-cyan-500/30 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold font-orbitron text-white">CREATE NEW VOLUNTEER</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="e.g. Farhan Shaikh"
                  className="w-full px-3.5 py-2.5 bg-[#030617] border border-white/15 focus:border-cyan-400 rounded-xl text-white text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Campus ID (Username)
                </label>
                <input
                  type="text"
                  required
                  value={addCampusId}
                  onChange={(e) => setAddCampusId(e.target.value)}
                  placeholder="e.g. 55555"
                  className="w-full px-3.5 py-2.5 bg-[#030617] border border-white/15 focus:border-cyan-400 rounded-xl text-white text-xs font-mono outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Admin-Assigned Password
                </label>
                <div className="relative">
                  <input
                    type={showAddPassword ? 'text' : 'password'}
                    required
                    value={addPassword}
                    onChange={(e) => setAddPassword(e.target.value)}
                    placeholder="Enter assigned password"
                    className="w-full pl-3.5 pr-10 py-2.5 bg-[#030617] border border-white/15 focus:border-cyan-400 rounded-xl text-white text-xs outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddPassword(!showAddPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showAddPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1 font-mono">
                  Only the admin assigns and controls this password.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Assigned Station
                </label>
                <select
                  value={addStation}
                  onChange={(e) => setAddStation(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#030617] border border-white/15 focus:border-cyan-400 rounded-xl text-white text-xs outline-none"
                >
                  {STATIONS.map((s) => (
                    <option key={s} value={s} className="bg-[#070b24]">
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="text-xs font-bold text-slate-300">Account Active</span>
                <input
                  type="checkbox"
                  checked={addActive}
                  onChange={(e) => setAddActive(e.target.checked)}
                  className="w-4 h-4 accent-cyan-400 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-white/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdd}
                  className="px-5 py-2 rounded-xl text-xs font-bold font-orbitron bg-cyan-500 hover:bg-cyan-400 text-black shadow-md disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmittingAdd && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Volunteer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* EDIT VOLUNTEER & CHANGE PASSWORD MODAL */}
      {/* ========================================================= */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#070b24] border border-cyan-500/30 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold font-orbitron text-white">EDIT VOLUNTEER</h3>
              </div>
              <button
                onClick={() => setEditTarget(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#030617] border border-white/15 focus:border-cyan-400 rounded-xl text-white text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Campus ID (Username)
                </label>
                <input
                  type="text"
                  disabled
                  value={editTarget.username}
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-400 text-xs font-mono outline-none cursor-not-allowed"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Alter / Reset Password
                  </label>
                  <span className="text-[10px] text-amber-400 font-mono">Optional</span>
                </div>
                <div className="relative">
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Enter new password (leave blank to keep current)"
                    className="w-full pl-3.5 pr-10 py-2.5 bg-[#030617] border border-white/15 focus:border-cyan-400 rounded-xl text-white text-xs outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Assigned Station
                </label>
                <select
                  value={editStation}
                  onChange={(e) => setEditStation(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#030617] border border-white/15 focus:border-cyan-400 rounded-xl text-white text-xs outline-none"
                >
                  {STATIONS.map((s) => (
                    <option key={s} value={s} className="bg-[#070b24]">
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                <div>
                  <div className="text-xs font-bold text-white">Active Status</div>
                  <div className="text-[10px] text-slate-400">Deactivating immediately prevents login</div>
                </div>
                <input
                  type="checkbox"
                  checked={editActive}
                  onChange={(e) => setEditActive(e.target.checked)}
                  className="w-4 h-4 accent-cyan-400 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-white/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-5 py-2 rounded-xl text-xs font-bold font-orbitron bg-cyan-500 hover:bg-cyan-400 text-black shadow-md disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmittingEdit && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* DELETE CONFIRMATION MODAL */}
      {/* ========================================================= */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#070b24] border border-rose-500/40 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-rose-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold font-orbitron text-white">DELETE VOLUNTEER</h3>
            </div>
            <p className="text-xs text-slate-300">
              Are you sure you want to permanently delete volunteer{' '}
              <strong className="text-white">{deleteTarget.name}</strong> (Campus ID:{' '}
              <span className="font-mono text-cyan-400">{deleteTarget.username}</span>)?
            </p>
            <p className="text-[11px] text-slate-500">
              This action removes their account from Supabase.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-white/5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-xl text-xs font-bold font-orbitron bg-rose-600 hover:bg-rose-500 text-white shadow-md cursor-pointer"
              >
                Delete Volunteer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
