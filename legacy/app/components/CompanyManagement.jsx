import { useState } from 'react';
import { useData } from '../context/DataContext';
import { Plus, Edit, Trash2, Building2, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

const EMPTY_FORM = { name: '', website: '', mobile: '', image: null };
const BACKEND_URL_IMG = process.env.NEXT_PUBLIC_BACKEND_URL_IMG || '';

export default function CompanyManagement() {
  const { companies, companiesLoading, addCompany, updateCompany, deleteCompany } = useData();
  const [isAdding, setIsAdding]     = useState(false);
  const [editingId, setEditingId]   = useState(null);
  const [formData, setFormData]     = useState(EMPTY_FORM);
  const [preview, setPreview]       = useState(null);   // local image preview URL

  // ── Field change ──────────────────────────────────────────────────────────
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ── Image file picked ─────────────────────────────────────────────────────
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFormData({ ...formData, image: file });
    setPreview(URL.createObjectURL(file)); // show instant preview
  };

  // ── Submit — build FormData for multipart/form-data ───────────────────────
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Company name is required.');
      return;
    }

    const payload = new FormData();
    payload.append('name',    formData.name);
    payload.append('website', formData.website);
    payload.append('mobile',  formData.mobile);
    if (formData.image instanceof File) {
      payload.append('image', formData.image);
    }

    if (editingId) {
      updateCompany(editingId, payload);
      toast.success('Company updated successfully');
    } else {
      addCompany(payload);
      toast.success('Company added successfully');
    }

    handleCancel();
  };

  // ── Edit — prefill form ───────────────────────────────────────────────────
  const handleEdit = (company) => {
    setFormData({
      name   : company.name    || '',
      website: company.website || '',
      mobile : company.mobile  || '',
      image  : null, // file input can't be prefilled
    });
    setPreview(company.image ? `${BACKEND_URL_IMG}${company.image}` : null);
    setEditingId(company._id);
    setIsAdding(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this company?')) {
      deleteCompany(id);
      toast.success('Company deleted successfully');
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setPreview(null);
  };

  return (
    <div className="bg-card rounded-lg shadow-md p-6 border border-border dark:border-primary/20 dark:shadow-[0_0_20px_rgba(212,175,55,0.05)]">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-foreground dark:text-primary">Company Management</h2>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all dark:shadow-[0_0_15px_rgba(212,175,55,0.3)]"
          >
            <Plus className="w-4 h-4" />
            Add Company
          </button>
        )}
      </div>

      {/* ── Add / Edit Form ─────────────────────────────────────────────────── */}
      {isAdding && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 p-4 bg-muted rounded-lg border border-border dark:border-primary/20"
        >
          <h3 className="mb-4 text-foreground">
            {editingId ? 'Edit Company' : 'Add New Company'}
          </h3>

          <div className="space-y-4">

            {/* Name */}
            <div>
              <label className="block text-sm mb-1 text-foreground">
                Company Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter company name"
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary dark:border-primary/20"
              />
            </div>

            {/* Website */}
            <div>
              <label className="block text-sm mb-1 text-foreground">Website</label>
              <input
                type="text"
                name="website"
                value={formData.website}
                onChange={handleChange}
                placeholder="https://example.com"
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary dark:border-primary/20"
              />
            </div>

            {/* Mobile */}
            <div>
              <label className="block text-sm mb-1 text-foreground">Mobile</label>
              <input
                type="text"
                name="mobile"
                value={formData.mobile}
                onChange={handleChange}
                placeholder="Enter mobile number"
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary dark:border-primary/20"
              />
            </div>

            {/* Image upload */}
            <div>
              <label className="block text-sm mb-1 text-foreground">Company Image</label>

              {/* preview box */}
              {preview ? (
                <div className="relative mb-2 w-full h-36 rounded-lg overflow-hidden border border-border dark:border-primary/20">
                  <img src={preview} alt="preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setPreview(null); setFormData({ ...formData, image: null }); }}
                    className="absolute top-2 right-2 bg-destructive text-white text-xs px-2 py-1 rounded"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-border dark:border-primary/30 rounded-lg cursor-pointer hover:border-primary transition-all">
                  <ImageIcon className="w-8 h-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">Click to upload image</span>
                  <span className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP — max 2MB</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all dark:shadow-[0_0_15px_rgba(212,175,55,0.3)]"
              >
                {editingId ? 'Update' : 'Add'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-all dark:border dark:border-primary/20"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ── Company Cards ───────────────────────────────────────────────────── */}
      {companiesLoading ? (
        <p className="text-muted-foreground text-sm">Loading companies...</p>
      ) : companies.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Building2 className="w-12 h-12 mb-3 opacity-30" />
          <p>No companies yet. Add your first one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {companies.map((company) => (
            <div
              key={company._id}
              className="bg-background border border-border rounded-lg p-4 hover:shadow-md transition-all dark:border-primary/20 dark:hover:border-primary/40 dark:hover:shadow-[0_0_15px_rgba(212,175,55,0.1)]"
            >
              {/* image */}
              {company.image ? (
                <img
                  src={`${BACKEND_URL_IMG}${company.image}`}
                  alt={company.name}
                  className="w-full h-32 object-contain rounded-lg mb-3"
                />
              ) : (
                <div className="w-full h-32 bg-muted rounded-lg mb-3 flex items-center justify-center">
                  <Building2 className="w-10 h-10 text-muted-foreground opacity-40" />
                </div>
              )}

              <h3 className="mb-1 text-foreground font-medium">{company.name}</h3>

              {company.website && (
                <p className="text-xs text-muted-foreground mb-1 truncate">{company.website}</p>
              )}
              {company.mobile && (
                <p className="text-xs text-muted-foreground mb-3">{company.mobile}</p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(company)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all dark:shadow-[0_0_10px_rgba(212,175,55,0.2)]"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(company._id)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}