const statusText = document.querySelector(".status");
const balanceText = document.querySelector(".balance");
const connectButton = document.querySelector("button");

connectButton.addEventListener("click", function () {
    const token = document.querySelector("input").value.trim();

    if (token === "") {
        alert("Please enter your Deriv API Token.");
        return;
    }

    statusText.textContent = "Status: Connecting...";

    const ws = new WebSocket("wss://ws.derivws.com/websockets/v3?app_id=1089");

    ws.onopen = function () {
        ws.send(JSON.stringify({
            authorize: token
        }));
    };

    ws.onmessage = function (event) {
        const data = JSON.parse(event.data);

        if (data.error) {
            statusText.textContent = "Status: Connection Failed";
            alert(data.error.message);
            ws.close();
            return;
        }

        if (data.msg_type === "authorize") {
            statusText.textContent = "Status: Connected";
            balanceText.textContent = "$" + data.authorize.balance;
        }
    };

    ws.onerror = function () {
        statusText.textContent = "Status: Error";
    };
});
