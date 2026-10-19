import { useState } from 'react';
import { useData } from '../context/DataContext';
import { Plus, Edit2, Trash2, X, Eye, EyeOff, User } from 'lucide-react';
import { toast } from 'sonner';

const EMPTY_FORM = {
  fullName: '',
  email   : '',
  mobile  : '',
  username: '',
  password: '',
  role    : 'sales',
};

export default function UserManagement() {
  const { users, usersLoading, addUser, updateUser, deleteUser } = useData();
  const [isAdding, setIsAdding]         = useState(false);
  const [editingId, setEditingId]       = useState(null);
  const [formData, setFormData]         = useState(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setField = (key, val) => setFormData((prev) => ({ ...prev, [key]: val }));

  const inputCls = 'w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground text-sm';

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = (e) => {
    e.preventDefault();

    const { fullName, email, mobile, username, password, role } = formData;

    if (!fullName || !email || !mobile || !username) {
      toast.error('Full name, email, mobile and username are required.');
      return;
    }
    if (!editingId && !password) {
      toast.error('Password is required for new users.');
      return;
    }

    const payload = { fullName, email, mobile, username, role };
    if (password) payload.password = password; // only send if filled

    setIsSubmitting(true);

    // After
if (editingId) {
  updateUser(editingId, payload, {
    onSuccess: () => toast.success('User updated successfully'),
    onError  : () => toast.error('Failed to update user.'),
  });
} else {
  const data = addUser(payload);
  console.log("addd user",data)
  toast.success('User added successfully');
}
setIsSubmitting(false);
setIsAdding(false);
  };

  // ── Edit ──────────────────────────────────────────────────────────────────
  const handleEdit = (user) => {
    setFormData({
      fullName: user.fullName || '',
      email   : user.email    || '',
      mobile  : user.mobile   || '',
      username: user.username || '',
      password: '',             // never prefill password
      role    : user.role     || 'sales',
    });
    setEditingId(user._id);
    setIsAdding(true);
    setShowPassword(false);
    setIsSubmitting(false);
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    deleteUser(id, {
      onSuccess: () => toast.success('User deleted successfully'),
      onError  : () => toast.error('Failed to delete user.'),
    });
  };

  // ── Cancel ────────────────────────────────────────────────────────────────
  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setShowPassword(false);
    setIsSubmitting(false);
  };

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-foreground">User Management</h2>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add User
          </button>
        )}
      </div>

      {/* ── Form ─────────────────────────────────────────────────────────────── */}
      {isAdding && (
        <div className="bg-card border border-border rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-foreground">{editingId ? 'Edit User' : 'Add New User'}</h3>
            <button type="button" onClick={handleCancel} className="p-1 hover:bg-muted rounded">
              <X className="w-5 h-5 text-foreground" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Full Name */}
              <div>
                <label className="block text-sm text-foreground mb-1">
                  Full Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text" value={formData.fullName}
                  onChange={(e) => setField('fullName', e.target.value)}
                  placeholder="John Doe" className={inputCls}
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm text-foreground mb-1">
                  Email <span className="text-destructive">*</span>
                </label>
                <input
                  type="email" value={formData.email}
                  onChange={(e) => setField('email', e.target.value)}
                  placeholder="john@example.com" className={inputCls}
                />
              </div>

              {/* Mobile */}
              <div>
                <label className="block text-sm text-foreground mb-1">
                  Mobile <span className="text-destructive">*</span>
                </label>
                <input
                  type="text" value={formData.mobile}
                  onChange={(e) => setField('mobile', e.target.value)}
                  placeholder="9876543210" className={inputCls}
                />
              </div>

              {/* Username */}
              <div>
                <label className="block text-sm text-foreground mb-1">
                  Username <span className="text-destructive">*</span>
                </label>
                <input
                  type="text" value={formData.username}
                  onChange={(e) => setField('username', e.target.value)}
                  placeholder="john_doe" className={inputCls}
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm text-foreground mb-1">Role</label>
                <select value={formData.role} onChange={(e) => setField('role', e.target.value)} className={inputCls}>
                  <option value="sales">Sales</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {/* Password with eye toggle */}
              <div>
                <label className="block text-sm text-foreground mb-1">
                  Password {!editingId && <span className="text-destructive">*</span>}
                  {editingId && <span className="text-xs text-muted-foreground ml-1">(leave blank to keep existing)</span>}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setField('password', e.target.value)}
                    placeholder={editingId ? '••••••••' : 'Min 6 characters'}
                    className={`${inputCls} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="submit" disabled={isSubmitting}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                {isSubmitting ? 'Saving...' : editingId ? 'Update User' : 'Add User'}
              </button>
              <button
                type="button" onClick={handleCancel}
                className="px-6 py-2 border border-border text-foreground rounded-lg hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── User List ──────────────────────────────────────────────────────── */}
      {usersLoading ? (
        <p className="text-muted-foreground text-sm">Loading users...</p>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <User className="w-12 h-12 mb-3 opacity-30" />
          <p>No users yet. Add your first one.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 text-foreground font-medium">Name</th>
                <th className="text-left px-4 py-3 text-foreground font-medium">Email</th>
                <th className="text-left px-4 py-3 text-foreground font-medium">Mobile</th>
                <th className="text-left px-4 py-3 text-foreground font-medium">Username</th>
                <th className="text-left px-4 py-3 text-foreground font-medium">Role</th>
                <th className="text-left px-4 py-3 text-foreground font-medium">Last Login</th>
                <th className="text-right px-4 py-3 text-foreground font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((user) => (
                <tr key={user._id} className="hover:bg-muted/40 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary text-xs font-semibold">
                          {user.fullName?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-foreground font-medium">{user.fullName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">{user.mobile}</td>
                  <td className="px-4 py-3 text-muted-foreground">@{user.username}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      user.role === 'admin'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {user.userType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {user.lastLogin
                      ? new Date(user.lastLogin).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(user)}
                        className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4 text-foreground" />
                      </button>
                      <button
                        onClick={() => handleDelete(user._id)}
                        className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}