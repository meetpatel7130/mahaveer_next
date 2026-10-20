import { useRef, useState } from 'react';
import { useData } from '../context/DataContext';
import { Plus, Edit2, Trash2, X, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

const EMPTY_FORM = { name: '', img: null };
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL_IMG || '';

export default function CategoryManagement() {
  const { categories, categoriesLoading, addCategory, updateCategory, deleteCategory } = useData();
  const [isAdding, setIsAdding]         = useState(false);
  const [editingId, setEditingId]       = useState(null);
  const [formData, setFormData]         = useState(EMPTY_FORM);
  const [preview, setPreview]           = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null); // ← ref to trigger file input manually

  // ── Image picked ──────────────────────────────────────────────────────────
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2MB.');
      return;
    }
    setFormData((prev) => ({ ...prev, img: file }));
    setPreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setPreview(null);
    setFormData((prev) => ({ ...prev, img: null }));
    if (fileInputRef.current) fileInputRef.current.value = ''; // reset file input
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Category name is required.');
      return;
    }

    const payload = new FormData();
    payload.append('name', formData.name.trim());
    if (formData.img instanceof File) {
      payload.append('img', formData.img);
    }

    setIsSubmitting(true);

    if (editingId) {
      updateCategory(editingId, payload );
      toast.success('Category updated successfully');
    } else {
      addCategory(payload);
      toast.success('Category added successfully');
    }
    setIsSubmitting(false);
    setFormData(EMPTY_FORM)
    setIsAdding(false);
  };

  // ── Cancel — also resets isSubmitting ─────────────────────────────────────
  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setPreview(null);
    setIsSubmitting(false); // ← fix: reset saving state
  };

  // ── Edit ──────────────────────────────────────────────────────────────────
  const handleEdit = (category) => {
    setFormData({ name: category.name || '', img: null });
    setPreview(category.img ? `${BACKEND_URL}${category.img}` : null);
    setEditingId(category._id);
    setIsAdding(true);
    setIsSubmitting(false);
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = (id) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    deleteCategory(id);
    toast.success('Category deleted successfully');
  };

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-foreground">Category Management</h2>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Category
          </button>
        )}
      </div>

      {/* ── Form ─────────────────────────────────────────────────────────────── */}
      {isAdding && (
        <div className="bg-card border border-border rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-foreground">{editingId ? 'Edit Category' : 'Add New Category'}</h3>
            <button type="button" onClick={handleCancel} className="p-1 hover:bg-muted rounded">
              <X className="w-5 h-5 text-foreground" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Name */}
            <div>
              <label className="block text-foreground mb-2">
                Category Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Crockery"
                className="w-full px-4 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              />
            </div>

            {/* Image upload */}
            <div>
              <label className="block text-foreground mb-2">
                Category Image
                {editingId && <span className="text-xs text-muted-foreground ml-2">(leave empty to keep existing)</span>}
              </label>

              {/* hidden file input — triggered manually via ref */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleImageChange}
                className="hidden"
              />

              {preview ? (
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-border flex-shrink-0">
                    <img src={preview} alt="preview" className="w-full h-full object-contain" />
                  </div>
                  <button
                    type="button"
                    onClick={removeImage}
                    className="px-3 py-1 bg-destructive text-white text-sm rounded"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                // ← type="button" stops click from submitting the form
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-all"
                >
                  <ImageIcon className="w-7 h-7 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">Click to upload image</span>
                  <span className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP — max 2MB</span>
                </button>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                {isSubmitting ? 'Saving...' : editingId ? 'Update Category' : 'Add Category'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-2 border border-border text-foreground rounded-lg hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Cards ──────────────────────────────────────────────────────────── */}
      {categoriesLoading ? (
        <p className="text-muted-foreground text-sm">Loading categories...</p>
      ) : categories.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">No categories yet. Add your first one.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <div key={category._id} className="bg-card border border-border rounded-lg shadow-md p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-border flex-shrink-0">
                  {category.img ? (
                    <img
                      src={`${BACKEND_URL}${category.img}`}
                      alt={category.name}
                      className="w-full h-full object-contain"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-muted-foreground opacity-40" />
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(category)} className="p-2 hover:bg-muted rounded-lg transition-colors">
                    <Edit2 className="w-4 h-4 text-foreground" />
                  </button>
                  <button onClick={() => handleDelete(category._id)} className="p-2 hover:bg-destructive/10 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </button>
                </div>
              </div>
              <h3 className="text-foreground">{category.name}</h3>
              {category.addedByWhom?.fullName && (
                <p className="text-xs text-muted-foreground mt-1">Added by: {category.addedByWhom.fullName}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}