# Remote Access Guide for Clean Track

This guide explains how to access the Clean Track application from other devices (phones, tablets, etc.) connected to the same Wi-Fi/Local Network.

## Prerequisites

1.  **Same Network**: Ensure both your PC (hosting the app) and your mobile device are connected to the exact same Wi-Fi/Local Network.
2.  **Firewall**: You may need to allow Node.js through your Windows Firewall if you haven't already.

## Steps

### 1. Find your PC's Local IP Address

1.  Open Command Prompt or PowerShell on your PC.
2.  Run the command: `ipconfig`
3.  Look for **IPv4 Address** under your active adapter (e.g., Wireless LAN adapter Wi-Fi).
    *   It usually looks like `192.168.x.x` or `172.x.x.x`.
    *   *Example*: `192.168.0.15`

### 2. Run the Application

First, make sure you are in the project folder. Run this command in your terminal:

```bash
cd .gemini/antigravity/scratch/clean-track
```

Then, run the command to start the server:

```bash
npm run dev:lan
```

### 3. Access from Mobile Device

1.  Open a browser (Chrome, Safari, etc.) on your phone.
2.  Type the following address:
    *   **Link**: `http://192.168.0.3:3000`

> **Note**: If your computer's IP changes later, check `ipconfig` again.

## Troubleshooting: Site Not Loading?

**Most Common Cause: "Public" Network Profile**

Windows is currently treating your Wi-Fi as a **Public Network**, which blocks incoming connections. You need to change it to **Private**.

**How to fix:**

1.  Press `Windows Key` + `I` to open **Settings**.
2.  Go to **Network & Internet** -> **Wi-Fi**.
3.  Click on your connected Wi-Fi name (`skyiptime5gA625`).
4.  Under **Network profile type**, switch from **Public** to **Private**.
5.  Try refreshing the page on your phone.

OR

**Turn off Firewall Temporarily (Test only)**
1.  Search for "Firewall & network protection" in Windows Search.
2.  Click on **Public network (active)**.
3.  Turn **Microsoft Defender Firewall** switch to **Off**.
4.  Try accessing the site again.
