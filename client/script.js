import bot from "./assets/bot.svg";
import user from "./assets/user.svg";
import CryptoJS from "crypto-js";

const form = document.querySelector("form");
const chatContainer = document.querySelector("#chat_container");

let loadInterval;

function loader(element) {
  element.textContent = "";

  loadInterval = setInterval(() => {
    // Update the text content of the loading indicator
    element.textContent += ".";

    // If the loading indicator has reached three dots, reset it
    if (element.textContent === "....") {
      element.textContent = "";
    }
  }, 300);
}

function typeText(element, text) {
  let index = 0;

  let interval = setInterval(() => {
    if (index < text.length) {
      element.innerHTML += text.charAt(index);
      index++;
    } else {
      clearInterval(interval);
    }
  }, 20);
}

function generateUniqueId() {
  const timestamp = Date.now();
  const randomNumber = Math.random();
  const hexadecimalString = randomNumber.toString(16);

  return `id-${timestamp}-${hexadecimalString}`;
}

function validateUser(value) {
  return `
      <div class="wrapper">
          <div class="message authorizeDiv">
          <div class="authorizeText">Please contact Project Owner for Authorization Key to proceed</div>
            <input type="text" id="authorizeMessage" />
          </div>
      </div>
  `;
}

function chatStripe(isAi, value, uniqueId) {
  return `
      <div class="wrapper ${isAi && "ai"}">
          <div class="chat">
              <div class="profile">
                  <img 
                    src=${isAi ? bot : user} 
                    alt="${isAi ? "bot" : "user"}" 
                  />
              </div>
              <div class="message" id=${uniqueId}>${value}</div>
          </div>
      </div>
  `;
}

const secretKey = import.meta.env.VITE_SECRET_KEY;
const authKey = import.meta.env.VITE_AUTH_KEY;
// const encryptedChatKey = CryptoJS.AES.encrypt(authKey, secretKey).toString();

const sessionChatKey = JSON.parse(sessionStorage.getItem("chatKey"));
const decryptedChatValue = sessionChatKey
  ? CryptoJS.AES.decrypt(sessionChatKey.value, secretKey).toString(
      CryptoJS.enc.Utf8
    )
  : "";

const authorizedBrowser = authKey === decryptedChatValue;

console.log(authorizedBrowser);

const handleSubmit = async (e) => {
  e.preventDefault();
  const data = new FormData(form);
  form.reset();

  //check timestamp for key expiry
  if (sessionChatKey && Date.now() > sessionChatKey.expiry) {
    // Remove the chatKey from sessionStorage
    sessionStorage.removeItem("chatKey");
    console.log("removed chatkey");
    // Reload the page
    location.reload();
    alert("Access Expired, Please Try Again");
    return;
  }

  if (!authorizedBrowser) {
    chatContainer.innerHTML += validateUser("test");
    let authorizeMessage = chatContainer.querySelector("#authorizeMessage");
    authorizeMessage.addEventListener("keyup", (e) => {
      if (e.keyCode === 13 && e.target.value) {
        // console.log(e.target.value);
        const keyVal = e.target.value;

        // console.log("decryptedChatKey ", decryptedChatKey);
        // console.log("authKey ", authKey);
        // console.log("secretKey ", secretKey);

        if (keyVal === authKey) {
          const encryptedKey = CryptoJS.AES.encrypt(
            keyVal,
            secretKey
          ).toString(); //encrypt key in client browser

          sessionStorage.setItem(
            "chatKey",
            JSON.stringify({
              value: encryptedKey,
              expiry: Date.now() + 600000, // 10 minutes in milliseconds
            })
          );
          alert("Access Granted! Expired in 10 minutes");

          window.location.reload(); //force reload client browser to capture authorization
        } else {
          alert("Unauthorized Access!");
        }
      }
    });
    return;
  }

  chatContainer.innerHTML += chatStripe(false, data.get("prompt"));

  const uniqueId = generateUniqueId();
  chatContainer.innerHTML += chatStripe(true, " ", uniqueId);
  chatContainer.scrollTop = chatContainer.scrollHeight;

  const messageDiv = document.getElementById(uniqueId);

  loader(messageDiv);

  //fetch data from node server

  const response = await fetch(import.meta.env.VITE_FETCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: data.get("prompt"),
    }),
  });
  clearInterval(loadInterval);
  messageDiv.innerHTML = "";

  if (response.ok) {
    const data = await response.json();
    const parsedData = data.bot.trim();

    typeText(messageDiv, parsedData);
  } else {
    const err = await response.text();
    messageDiv.innerHTML = "Error occurs";
    // alert(err);
  }
};

form.addEventListener("submit", handleSubmit);
form.addEventListener("keyup", (e) => {
  if (e.keyCode === 13) handleSubmit(e);
});
