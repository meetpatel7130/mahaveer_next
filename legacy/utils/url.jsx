import axios from 'axios';

const apiHelper = axios.create({
    baseURL: '/api',
    withCredentials:true,
})

export default apiHelper