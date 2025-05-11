const api = {
    api: "https://gist.githubusercontent.com/Kudostoy0u/094964cb6b9a728a8ca226d0c56e253c/raw/e9355448f248540eca438b453749875b0763a085/final.json",
    arr: JSON.parse(process.env.NEXT_PUBLIC_API_KEYS || "[]"),
};

export default api;
