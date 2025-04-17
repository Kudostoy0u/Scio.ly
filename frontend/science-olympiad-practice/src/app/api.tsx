const api = {
    api: "https://gist.githubusercontent.com/Kudostoy0u/b428bcce3cf270673786702ea934a0ba/raw/7d2c849590d8fd408aadec3c085e6957886ba098/final.json",
    arr: JSON.parse(process.env.NEXT_PUBLIC_API_KEYS || "[]"),
};

export default api;
