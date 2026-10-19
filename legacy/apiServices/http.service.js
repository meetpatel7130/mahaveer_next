import httpClient from './http.client';

const get = async (url, config) => {
  const res = await httpClient.get(url, config);
  return res.data;
};

const post = async (url, body, config) => {
  const res = await httpClient.post(url, body, config);
  return res.data;
};

const put = async (url, body, config) => {
  const res = await httpClient.put(url, body, config);
  return res.data;
};

const patch = async (url, body, config) => {
  const res = await httpClient.patch(url, body, config);
  return res.data;
};

// Axios carries DELETE bodies on config.data; bulk deletes rely on this.
const del = async (url, body, config) => {
  const res = await httpClient.delete(url, {
    ...config,
    ...(body !== undefined ? { data: body } : {}),
  });
  return res.data;
};

export default { get, post, put, patch, del };
