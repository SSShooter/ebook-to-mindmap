import axios from 'axios'

const relink = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:7001',
  withCredentials: true, // 这样才会发送 cookie
})

// 请求拦截器：如果以后有用 token 的需求可以在这里加
relink.interceptors.request.use(
  function (config) {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  function (error) {
    return Promise.reject(error)
  }
)

// 响应拦截器
relink.interceptors.response.use(
  function (res) {
    return res.data
  },
  function (error) {
    console.log('API Error:', error)

    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token')
    }

    return Promise.reject(error)
  }
)

export default relink
