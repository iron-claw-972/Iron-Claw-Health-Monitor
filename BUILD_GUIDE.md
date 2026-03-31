# IronClaw Health Dashboard - Build & Maintenance Guide

This document explains how to update the code, build the application, and generate a new one-click installer for the team.

## 1. Prerequisites
To build and run this project, the following must be installed:
*   **Python 3.9+**: For the FastAPI backend.
*   **Node.js 18+**: For the React frontend.
*   **Inno Setup 6+**: (Optional) For creating the Windows `.exe` installer.

---

## 2. Fresh Installation / First Run
If you have just cloned the repository or are setting it up on a new machine:
1.  Navigate to the root folder.
2.  Double-click **`build_and_run.bat`**.
    *   The script will automatically detect missing environments.
    *   It will create the Python virtual environment (`venv`) and install dependencies.
    *   It will run `npm install` for the frontend.
    *   It will launch both servers and open your browser to `http://localhost:5173`.

---

## 3. Developing & Modifying Code
*   **Backend:** Logic is in `backend/app/`. Main entry point is `main.py`.
*   **Frontend:** Source is in `frontend/src/`. Main dashboard is in `pages/DashboardPage.tsx`.
*   **Whitelist:** To add or remove telemetry sensors, modify `WHITELIST_CHANNELS` in `backend/app/log_parser.py` and `frontend/src/pages/DashboardPage.tsx`.

---

## 4. Creating a New Installer (.exe)
When you have made code changes and want to share a new version with the team:

1.  **Cleanup:** Ensure the `backend/uploads` folder is empty and no `.db` files are in the root if you want a completely fresh installer.
2.  **Open Inno Setup:** Launch the **Inno Setup Compiler**.
3.  **Load Script:** Open the file `IronClaw_Installer.iss` located in the root directory.
4.  **Compile:** Click **Build > Compile** (or press `F9`).
5.  **Distribute:** The resulting **`IronClaw_HealthMonitor_Setup.exe`** will be generated in the root folder. Send this file to team members.

---

## 5. Maintenance & Data
*   **Logs:** System logs are stored in `backend/backend_logs.txt`.
*   **Parse Errors:** Specific WPILib data issues are recorded in `backend/parsing_errors.log`.
*   **Database:** Telemetry metadata is stored in `backend/robot_telemetry.db`.
*   **Cache:** Cached graph data is stored in `backend/uploads/` as JSON files.

---

## 6. Project Structure (Lightweight Baseline)
This repository is configured to be **source-only**. The following are excluded to prevent bloat:
*   `node_modules/` & `venv/` (Recreated by build script)
*   `uploads/*.wpilog` & `*.json` (User data)
*   `*.db` & `*.log` (Local session data)
