const statusText = document.querySelector(".status");
const balanceText = document.querySelector(".balance");
const connectButton = document.querySelector("button");

const APP_ID = "33YEgeMEMABjNTsoZWwU5";
const API_BASE = "https://api.derivws.com";

let ws = null;

connectButton.addEventListener("click", connectDeriv);

async function connectDeriv() {
    const tokenInput = document.querySelector("input");
    const token = tokenInput.value.trim();

    if (token === "") {
        alert("Please enter your Deriv API Token.");
        return;
    }

    statusText.textContent = "Status: Connecting...";

    try {
        const accountsResponse = await fetch(
            `${API_BASE}/trading/v1/options/accounts`,
            {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Deriv-App-ID": APP_ID
                }
            }
        );

        const accountsData = await accountsResponse.json();

        if (!accountsResponse.ok) {
            throw new Error(
                getDerivError(accountsData) ||
                `Account request failed (${accountsResponse.status})`
            );
        }

        const accounts =
            Array.isArray(accountsData.data)
                ? accountsData.data
                : accountsData.data
                ? [accountsData.data]
                : [];

        if (accounts.length === 0) {
            throw new Error("No Deriv trading account was found.");
        }

        const account = accounts[0];

        const accountId =
            account.account_id ||
            account.id;

        if (!accountId) {
            throw new Error("Deriv did not return an account ID.");
        }

        const otpResponse = await fetch(
            `${API_BASE}/trading/v1/options/accounts/${encodeURIComponent(accountId)}/otp`,
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Deriv-App-ID": APP_ID
                }
            }
        );

        const otpData = await otpResponse.json();

        if (!otpResponse.ok) {
            throw new Error(
                getDerivError(otpData) ||
                `Authentication request failed (${otpResponse.status})`
            );
        }

        const wsUrl = otpData?.data?.url;

        if (!wsUrl) {
            throw new Error("Deriv did not return a WebSocket URL.");
        }

        ws = new WebSocket(wsUrl);

        ws.onopen = function () {
            statusText.textContent = "Status: Connected";
            statusText.classList.add("running");

            ws.send(
                JSON.stringify({
                    balance: 1,
                    subscribe: 1,
                    req_id: 1
                })
            );
        };

        ws.onmessage = function (event) {
            try {
                const data = JSON.parse(event.data);

                if (data.error) {
                    statusText.textContent =
                        "Status: Connection Failed";

                    alert(
                        data.error.message ||
                        "Deriv returned an error."
                    );

                    return;
                }

                if (data.msg_type === "balance") {
                    const balance =
                        data.balance?.balance;

                    const currency =
                        data.balance?.currency || "USD";

                    if (typeof balance !== "undefined") {
                        balanceText.textContent =
                            "$"
