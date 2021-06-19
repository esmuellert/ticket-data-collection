const API = process.env.NODE_ENV !== 'development'
  ? "https://52.43.199.8/api"
  : "http://localhost:8080/api";
export { API };
