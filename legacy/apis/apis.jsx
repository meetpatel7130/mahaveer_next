import apiHelper from '../apiServices/http.service';

const apiServices ={

    //auth apis
    login : (payload) => apiHelper.post('/auth/login',payload),
    signup : (payload) => apiHelper.post('/auth/signup',payload),
    getProfile : () => apiHelper.get('/auth/me'),
    logout : () => apiHelper.post('/auth/logout'),

    //users apis
    addUser: (payload)=> apiHelper.post('/users/adduser',payload),
    updateUser : (payload) => apiHelper.put('/users/edituser/'+payload.id,payload.data),
    deleteUser : (id) => apiHelper.del('/users/deleteuser/'+id),
    getAllUsers : () => apiHelper.get('/users/getalluser'),

    //--------------products apis
    addProduct : (payload)=> apiHelper.post('/products/addproduct',payload,{
        headers: { "Content-Type": "multipart/form-data" }
    }),
    getAllProducts : (params) => {
        const { search, category, company, page = 1, limit = 10 } = params;
 
        const query = new URLSearchParams();
        query.append('page',  page);
        query.append('limit', limit);
        if (search)   query.append('search',   search);
        if (category) query.append('category', category);
        if (company)  query.append('company',  company);
    
        return apiHelper.get(`/products/getallproducts?${query.toString()}`);
    },
    updateProduct : (payload) => apiHelper.put('/products/editproduct/'+payload.id,payload.data,{
        headers: { "Content-Type": "multipart/form-data" }
    }),
    deleteProduct : (payload) => apiHelper.del('/products/deleteproduct/'+payload.id,payload),
    getProductsByIds : (ids)  => apiHelper.post('/products/getbyids', { ids }),

    //-----------------category apis
    addCategory : (payload)=> apiHelper.post('/category/addcategory',payload,{
        headers: { "Content-Type": "multipart/form-data" }
    }),
    getAllCategory : () => apiHelper.get('/category/getall'),
    updateCategory : (payload) => apiHelper.put('/category/editcategory/'+payload.id,payload.data,{
        headers: { "Content-Type": "multipart/form-data" }
    }),
    deleteCategory : (id) => apiHelper.del('/category/deletecategory/'+id),

    //-----------------company apis
    addCompany : (payload)=> apiHelper.post('/company/addcompany',payload,{
        headers: { "Content-Type": "multipart/form-data" }
    }),
    getAllCompany : () => apiHelper.get('/company/getallcompany'),
    createCompany : (payload) => apiHelper.post('/company/createcompany',payload),
    updateCompany : (payload) => apiHelper.put('/company/editcompany/'+payload.id,payload.data,{
        headers: { "Content-Type": "multipart/form-data" }
    }),
    deleteCompany : (id) => apiHelper.del('/company/deletecompany/'+id),

    //-----------------quotation apis
    addQuotation : (payload) => apiHelper.post('/quotations/addquotation', payload),
 
    // params: { page, limit, search, clientName, firmName, from, to, sortBy, sortOrder }
    getAllQuotations : (params = {}) => {
        const {
            page      = 1,
            limit     = 10,
            search,
            clientName,
            firmName,
            from,
            to,
            sortBy    = 'createdAt',
            sortOrder = 'desc',
        } = params;
 
        const query = new URLSearchParams();
        query.append('page',      page);
        query.append('limit',     limit);
        query.append('sortBy',    sortBy);
        query.append('sortOrder', sortOrder);
        if (search)     query.append('search',     search);
        if (clientName) query.append('clientName', clientName);
        if (firmName)   query.append('firmName',   firmName);
        if (from)       query.append('from',       from);
        if (to)         query.append('to',         to);
 
        return apiHelper.get(`/quotations/getallquotations?${query.toString()}`);
    },

    //------------------whatsapp apis
    getWhatsAppStatus        : ()        => apiHelper.get('/whatsapp/status'),
    getWhatsAppQR            : ()        => apiHelper.get('/whatsapp/qr'),
    connectWhatsApp          : ()        => apiHelper.post('/whatsapp/connect'),
    disconnectWhatsApp       : ()        => apiHelper.post('/whatsapp/disconnect'),
    sendWhatsAppQuotation    : (payload) => apiHelper.post('/whatsapp/send-quotation', payload),
    getWhatsAppSessions      : ()        => apiHelper.get('/whatsapp/sessions'),
}

export default apiServices
