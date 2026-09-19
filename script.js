const statusText = document.querySelector(".status");
const balanceText = document.querySelector(".balance");
const connectButton = document.querySelector("button");

const APP_ID = "33YEgeMEMABjNTsoZWwU5";
const API_BASE = "https://api.derivws.com";

let ws = null;
let connected = false;

connectButton.addEventListener("click", connectDeriv);

async function connectDeriv() {
    const tokenInput = document.querySelector("input");
    const token = tokenInput ? tokenInput.value.trim() : "";

    if (token === "") {
        alert("Please enter your Deriv API Token.");
        return;
    }

    statusText.textContent = "Status: Connecting...";
    statusText.classList.remove("running");

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

        if (ws) {
            try {
                ws.close();
            } catch (error) {
                console.warn("Old WebSocket could not be closed.", error);
            }
        }

        ws = new WebSocket(wsUrl);

        ws.onopen = function () {
            connected = true;

            statusText.textContent = "Status: Connected";
            statusText.classList.add("running");

            connectButton.textContent = "Disconnect";

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

                    statusText.classList.remove("running");

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
                            `${currency} ${Number(balance).toFixed(2)}`;
                    }
                }

            } catch (error) {
                console.error(
                    "Could not read Deriv message:",
                    error
                );
            }
        };

        ws.onerror = function () {
            connected = false;

            statusText.textContent =
                "Status: Connection Error";

            statusText.classList.remove("running");
        };

        ws.onclose = function () {
            connected = false;

            statusText.textContent =
                "Status: Disconnected";

            statusText.classList.remove("running");

            connectButton.textContent = "Connect";
        };

    } catch (error) {
        connected = false;

        statusText.textContent =
            "Status: Connection Failed";

        statusText.classList.remove("running");

        console.error("Deriv connection error:", error);

        alert(
            error.message ||
            "Unable to connect to Deriv."
        );
    }
}

function getDerivError(data) {
    return (
        data?.error?.message ||
        data?.message ||
        data?.error ||
        ""
    );
}

function disconnectDeriv() {
    if (ws) {
        try {
            ws.close();
        } catch (error) {
            console.error(
                "Disconnect error:",
                error
            );
        }
    }

    ws = null;
    connected = false;

    statusText.textContent =
        "Status: Disconnected";

    statusText.classList.remove("running");

    connectButton.textContent = "Connect";
}

connectButton.addEventListener("click", function () {
    if (connected) {
        disconnectDeriv();
    }
});
