const statusText = document.querySelector(".status");
const balanceText = document.querySelector(".balance");
const connectButton = document.querySelector("button");

const APP_ID = "3";
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
        /*
         * STEP 1:
         * Get the user's Deriv Options accounts.
         */
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
            accountsData.data ||
            accountsData.accounts ||
            [];

        if (!Array.isArray(accounts) || accounts.length === 0) {
            throw new Error("No Deriv trading account was found.");
        }

        /*
         * Use the first account returned by Deriv.
         */
        const account = accounts[0];

        const accountId =
            account.account_id ||
            account.id;

        if (!accountId) {
            throw new Error("Deriv returned an account without an account ID.");
        }

        /*
         * STEP 2:
         * Request the authenticated WebSocket URL.
         */
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

        const wsUrl =
            otpData?.data?.url;

        if (!wsUrl) {
            throw new Error("Deriv did not return a WebSocket URL.");
        }

        /*
         * STEP 3:
         * Connect using Deriv's authenticated WebSocket URL.
         */
        ws = new WebSocket(wsUrl);

        ws.onopen = function () {
            statusText.textContent = "Status: Connected";
            statusText.classList.add("running");

            /*
             * Request the account balance.
             */
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

                    alert(data.error.message || "Deriv returned an error.");

                    return;
                }

                if (data.msg_type === "balance") {
                    const balance =
                        data.balance?.balance;

                    const currency =
                        data.balance?.currency || "USD";

                    if (typeof balance !== "undefined") {
                        balanceText.textContent =
                            "$" +
                            Number(balance).toFixed(2) +
                            " " +
                            currency;
                    }
                }
            } catch (error) {
                console.error("Invalid Deriv message:", error);
            }
        };

        ws.onerror = function () {
            statusText.textContent =
                "Status: Connection Error";

            statusText.classList.remove("running");
        };

        ws.onclose = function () {
            if (
                statusText.textContent ===
                "Status: Connected"
            ) {
                statusText.textContent =
                    "Status: Disconnected";

                statusText.classList.remove("running");
            }
        };

    } catch (error) {
        console.error("Deriv connection error:", error);

        statusText.textContent =
            "Status: Connection Failed";

        statusText.classList.remove("running");

        alert(
            error.message ||
            "Unable to connect to Deriv."
        );
    }
}

function getDerivError(data) {
    if (!data) {
        return "";
    }

    if (data.error?.message) {
        return data.error.message;
    }

    if (
        Array.isArray(data.errors) &&
        data.errors.length > 0
    ) {
        return (
            data.errors[0].message ||
            data.errors[0].code ||
            ""
        );
    }

    return "";
    }
