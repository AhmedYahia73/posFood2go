export const getCurrencySymbol = () => {
    try {
        const currencyObj = JSON.parse(localStorage.getItem("currency")) || {};
        return currencyObj.currancy_symbol || currencyObj.currency_symbol || "EGP";
    } catch {
        return "EGP";
    }
};

export const getCurrencyName = () => {
    try {
        const currencyObj = JSON.parse(localStorage.getItem("currency")) || {};
        return currencyObj.currancy_name || currencyObj.currency_name || "EGP";
    } catch {
        return "EGP";
    }
};
