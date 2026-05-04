import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

axios.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => Promise.reject(error));

export const register = async (username, password) => {
    const res = await axios.post(`${API_URL}/auth/register`, { username, password });
    return res.data;
};

export const login = async (username, password) => {
    const res = await axios.post(`${API_URL}/auth/login`, { username, password });
    return res.data;
};

export const loginGuest = async () => {
    const res = await axios.post(`${API_URL}/auth/guest`);
    return res.data;
};

export const getProgress = async () => {
    const res = await axios.get(`${API_URL}/progress`);
    return res.data;
};

export const updateProgress = async (data) => {
    const res = await axios.post(`${API_URL}/progress`, data);
    return res.data;
};

export const getHistory = async (mode) => {
    const res = await axios.get(`${API_URL}/history/${mode}`);
    return res.data;
};

export const getAllHistory = async () => {
    const res = await axios.get(`${API_URL}/history`);
    return res.data;
};

export const saveHistory = async (mode, messages) => {
    const res = await axios.post(`${API_URL}/history/${mode}`, { messages });
    return res.data;
};

export const clearHistory = async () => {
    const res = await axios.post(`${API_URL}/history/clear`);
    return res.data;
};

export const sendChatMessage = async (provider, model, messages, promptText = null, apiKey = null) => {
    try {
        const res = await axios.post(`${API_URL}/chat`, { provider, model, messages, promptText, apiKey });
        return res.data;
    } catch (error) {
        throw new Error(error.response?.data?.error || error.message);
    }
};
