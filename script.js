// ============================================
// OBEY KINCHI TRADING BOT
// Deriv connection + account balance
// ============================================

const APP_ID = "pat_8c80790aad633982c5164dae7ae60906f8218502407da70c0e0285df5c66bfd5
const API_BASE = "https://api.derivws.com";

let ws = null;
let selectedMarket = "None";
let selectedBot = "None";
let botRunning = false;

// ============================================
// ELEMENT HELPERS
// ============================================

function getElement(id) {
    return document.getElementById(id);
}

function setStatus(text, running = false) {
    const status = getElement("connectionStatus");

    if (!status) return;

    status.textContent = "Status: " + text;

    if (running) {
        status.classList.add("running");
    } else {
        status.classList.remove("running");
    }
}

// ============================================
// DERIV CONNECTION
// ============================================

async function connectDeriv() {

    const tokenInput = getElement("apiToken");

    if (!tokenInput) {
        alert("API token input was not found.");
        return;
    }

    const token = tokenInput.value.trim();

    if (token === "") {
        alert("Please enter your Deriv API Token.");
        return;
    }

    setStatus("Connecting...");

    try {

        // ----------------------------------------
        // STEP 1: GET DERIV OPTIONS ACCOUNTS
        // ----------------------------------------

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

        let account;

        if (Array.isArray(accounts)) {
            account = accounts[0];
        } else {
            account = accounts;
        }

        if (!account) {
            throw new Error(
                "No Deriv Options trading account was found."
            );
        }

        const accountId =
            account.account_id ||
            account.id;

        if (!accountId) {
            throw new Error(
                "Deriv did not return an account ID."
            );
        }

        // ----------------------------------------
        // STEP 2: REQUEST AUTHENTICATED WEBSOCKET
        // ----------------------------------------

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
            throw new Error(
                "Deriv did not return a WebSocket URL."
            );
        }

        // ----------------------------------------
        // STEP 3: CONNECT TO WEBSOCKET
        // ----------------------------------------

        if (ws) {
            try {
                ws.close();
            } catch (e) {}
        }

        ws = new WebSocket(wsUrl);

        ws.onopen = function () {

            setStatus("Connected", true);

            // Request balance
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

                const data =
                    JSON.parse(event.data);

                if (data.error) {

                    setStatus("Connection Failed");

                    alert(
                        data.error.message ||
                        "Deriv returned an error."
                    );

                    return;
                }

                // --------------------------------
                // ACCOUNT BALANCE
                // --------------------------------

                if (data.msg_type === "balance") {

                    const balance =
                        data.balance?.balance;

                    const currency =
                        data.balance?.currency ||
                        "USD";

                    if (
                        typeof balance !==
                        "undefined"
                    ) {

                        const balanceElement =
                            getElement("balance");

                        if (balanceElement) {

                            balanceElement.textContent =
                                "$" +
                                Number(balance)
                                    .toFixed(2) +
                                " " +
                                currency;
                        }
                    }
                }

            } catch (error) {

                console.error(
                    "Invalid Deriv message:",
                    error
                );
            }
        };

        ws.onerror = function () {

            setStatus("Connection Error");
        };

        ws.onclose = function () {

            if (
                getElement("connectionStatus") &&
                getElement("connectionStatus")
                    .textContent ===
                    "Status: Connected"
            ) {
                setStatus("Disconnected");
            }
        };

    } catch (error) {

        console.error(
            "Deriv connection error:",
            error
        );

        setStatus("Connection Failed");

        alert(
            error.message ||
            "Unable to connect to Deriv."
        );
    }
}

// ============================================
// DERIV ERROR HANDLER
// ============================================

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

// ============================================
// MARKET SELECTION
// ============================================

function selectMarket(market) {

    selectedMarket = market;

    const marketElement =
        getElement("selectedMarket");

    if (marketElement) {
        marketElement.textContent = market;
    }
}

// ============================================
// BOT TYPE
// ============================================

function startBotType(botName) {

    selectedBot = botName;

    const status =
        getElement("botStatus");

    if (status) {

        status.textContent =
            "Running — " + botName;

        status.classList.add("running");
    }

    alert(
        botName +
        " selected."
    );
}

// ============================================
// START BOT
// ============================================

function startBot() {

    if (selectedMarket === "None") {

        alert(
            "Please select a market first."
        );

        return;
    }

    if (selectedBot === "None") {

        alert(
            "Please select a bot first."
        );

        return;
    }

    botRunning = true;

    const status =
        getElement("botStatus");

    if (status) {

        status.textContent =
            "Running";

        status.classList.add("running");
    }

    alert(
        "Bot started in demo interface mode."
    );
}

// ============================================
// STOP BOT
// ============================================

function stopBot() {

    botRunning = false;

    const status =
        getElement("botStatus");

    if (status) {

        status.textContent =
            "Stopped";

        status.classList.remove("running");
    }
}

// ============================================
// SAVE SETTINGS
// ============================================

function saveSettings() {

    const stake =
        getElement("stake")?.value || "0.35";

    const stopLoss =
        getElement("stopLoss")?.value || "5";

    const takeProfit =
        getElement("takeProfit")?.value || "20";

    const martingale =
        getElement("martingale")?.value || "OFF";

    localStorage.setItem(
        "stake",
        stake
    );

    localStorage.setItem(
        "stopLoss",
        stopLoss
    );

    localStorage.setItem(
        "takeProfit",
        takeProfit
    );

    localStorage.setItem(
        "martingale",
        martingale
    );

    const message =
        getElement("settingsMessage");

    if (message) {

        message.style.display = "block";

        setTimeout(function () {

            message.style.display = "none";

        }, 3000);
    }
}

// ============================================
// LOAD SAVED SETTINGS
// ============================================

window.addEventListener(
    "load",
    function () {

        const savedStake =
            localStorage.getItem("stake");

        const savedStopLoss =
            localStorage.getItem("stopLoss");

        const savedTakeProfit =
            localStorage.getItem("takeProfit");

        const savedMartingale =
            localStorage.getItem("martingale");

        if (savedStake) {

            const element =
                getElement("stake");

            if (element) {
                element.value =
                    savedStake;
            }
        }

        if (savedStopLoss) {

            const element =
                getElement("stopLoss");

            if (element) {
                element.value =
                    savedStopLoss;
            }
        }

        if (savedTakeProfit) {

            const element =
                getElement("takeProfit");

            if (element) {
                element.value =
                    savedTakeProfit;
            }
        }

        if (savedMartingale) {

            const element =
                getElement("martingale");

            if (element) {
                element.value =
                    savedMartingale;
            }
        }

        // Connect button
        const connectButton =
            document.querySelector(
                'button[onclick="connectDeriv()"]'
            );

        if (connectButton) {

            connectButton.onclick =
                connectDeriv;
        }
    }
);
