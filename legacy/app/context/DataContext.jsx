import { createContext, useContext, useState } from 'react';
import { useAuth } from './AuthContext';
import { useCompanies, useAddCompany, useUpdateCompany, useDeleteCompany } from '../../hooks/useCompanies';
import { useUsers, useAddUser, useUpdateUser, useDeleteUser } from '../../hooks/useUsers';
import { useCategories, useAddCategory, useUpdateCategory, useDeleteCategory } from '../../hooks/useCategories';
import { useProducts, useAddProduct, useUpdateProduct, useDeleteProduct } from '../../hooks/useProducts';
import { useQuotations, useAddQuotation } from '../../hooks/useQuotations';

const DataContext = createContext(undefined);

export function DataProvider({ children }) {
  const { user } = useAuth();
  const [productParams, setProductParams] = useState({ page: 1, limit: 12, search: '', category: '', company: '' });
  const [quotationParams, setQuotationParams] = useState({
    page: 1, limit: 10, search: '', clientName: '', firmName: '', from: '', to: '', sortBy: 'createdAt', sortOrder: 'desc',
  });
  const isAdmin = user?.userType === 'admin';
  const isSales = user?.userType === 'sales';

  const { data: companiesData, isLoading: companiesLoading } = useCompanies({ enabled: isAdmin || isSales });
  const { mutate: addCompanyFn } = useAddCompany();
  const { mutate: updateCompanyFn } = useUpdateCompany();
  const { mutate: deleteCompanyFn } = useDeleteCompany();
  const companies = companiesData?.companies || companiesData?.data?.companies || [];
  const addCompany = (data, callbacks) => addCompanyFn(data, callbacks);
  const updateCompany = (id, data, callbacks) => updateCompanyFn({ id, data }, callbacks);
  const deleteCompany = (id, callbacks) => isAdmin ? deleteCompanyFn(id, callbacks) : console.warn('[PERMISSION] sales cannot delete company');

  const { data: usersData, isLoading: usersLoading } = useUsers({ enabled: isAdmin });
  const { mutate: addUserFn } = useAddUser();
  const { mutate: updateUserFn } = useUpdateUser();
  const { mutate: deleteUserFn } = useDeleteUser();
  const users = usersData?.users || usersData?.data?.users || [];
  const addUser = (data, callbacks) => addUserFn(data, callbacks);
  const updateUser = (id, data, callbacks) => updateUserFn({ id, data }, callbacks);
  const deleteUser = (id, callbacks) => deleteUserFn(id, callbacks);

  const { data: categoriesData, isLoading: categoriesLoading } = useCategories({ enabled: isAdmin || isSales });
  const { mutate: addCategoryFn } = useAddCategory();
  const { mutate: updateCategoryFn } = useUpdateCategory();
  const { mutate: deleteCategoryFn } = useDeleteCategory();
  const categories = categoriesData?.categories || categoriesData?.data?.categories || [];
  const addCategory = (data, callbacks) => addCategoryFn(data, callbacks);
  const updateCategory = (id, data, callbacks) => updateCategoryFn({ id, data }, callbacks);
  const deleteCategory = (id, callbacks) => isAdmin ? deleteCategoryFn(id, callbacks) : console.warn('[PERMISSION] sales cannot delete category');

  const { data: productsData, isLoading: productsLoading } = useProducts({ params: productParams, enabled: isAdmin || isSales });
  const { mutate: addProductFn } = useAddProduct();
  const { mutate: updateProductFn } = useUpdateProduct();
  const { mutate: deleteProductFn } = useDeleteProduct();
  const products = productsData?.products || productsData?.data?.products || [];
  const productTotal = productsData?.total ?? productsData?.data?.total ?? 0;
  const productPages = productsData?.pages ?? productsData?.data?.pages ?? 1;
  const setProductFilter = (params) => setProductParams((previous) => ({ ...previous, ...params }));
  const addProduct = (data, callbacks) => addProductFn(data, callbacks);
  const updateProduct = (id, data, callbacks) => updateProductFn({ id, data }, callbacks);
  const deleteProduct = (id, callbacks) => isAdmin ? deleteProductFn(id, callbacks) : console.warn('[PERMISSION] sales cannot delete product');

  const { data: quotationsData, isLoading: quotationsLoading } = useQuotations({ params: quotationParams });
  const { mutate: addQuotationFn, isPending: addQuotationLoading } = useAddQuotation();
  const quotations = quotationsData?.data || quotationsData?.data?.data || [];
  const quotationTotal = quotationsData?.pagination?.total ?? quotationsData?.data?.pagination?.total ?? 0;
  const quotationPages = quotationsData?.pagination?.totalPages ?? quotationsData?.data?.pagination?.totalPages ?? 1;
  const setQuotationFilter = (params) => setQuotationParams((previous) => ({ ...previous, ...params }));
  const addQuotation = (data, callbacks) => addQuotationFn(data, callbacks);

  return (
    <DataContext.Provider value={{
      users, companies, categories, products, productTotal, productPages, productParams,
      quotations, quotationPages, quotationTotal, quotationParams,
      usersLoading, companiesLoading, categoriesLoading, productsLoading, quotationsLoading, addQuotationLoading,
      addUser, updateUser, deleteUser, addCompany, updateCompany, deleteCompany,
      addCategory, updateCategory, deleteCategory, addProduct, updateProduct, deleteProduct,
      setProductFilter, addQuotation, setQuotationFilter,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) throw new Error('useData must be used within a DataProvider');
  return context;
}
