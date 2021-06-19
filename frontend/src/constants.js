const API = process.env.NODE_ENV !== 'development'
  ? "http://api.huarongdao.xyz/api"
  : "http://localhost:8080/api";
export { API };
