const api = {
    api: "https://gist.githubusercontent.com/Kudostoy0u/898eebbb1f6e5369e9886ee218065b41/raw/e3fee8e9826324a5c71e3f2a9e2ce782b8091625/final.json",
    arr: JSON.parse(process.env.NEXT_PUBLIC_API_KEYS || "[]"),
};

export default api;
