const API = process.env.NODE_ENV !== 'development'
  ? "https://ticket.huarongdao.xyz/api"
  : "http://localhost:8080/api";
export { API };
