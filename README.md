# IronClaw Robot Health Monitor

A high-performance telemetry dashboard designed for FIRST Robotics (FRC) data log (`.wpilog`) analysis.

## Features
- **Fast Uploads:** Backend is optimized to process large `.wpilog` files and caches results to an SQLite database.
- **Robot Health Map:** A fast, 2D visual indicator of the robot's state, mapping specific telemetry data to physical subsystems.
- **Interactive Plots:** View highly responsive charts utilizing `Chart.js` with dual Y-axis support for comparing disparate data like voltage and velocity.

## Quick Start (Windows)
We've included a one-click script to install dependencies, start both servers, and open your browser automatically.

1. **Prerequisites:** Ensure you have [Python 3.9+](https://www.python.org/downloads/) and [Node.js 18+](https://nodejs.org/) installed.
2. **Run:** Double-click the `build_and_run.bat` file in the root directory.
3. **Use:** The script will automatically open your default browser to `http://localhost:5173/`.
4. **Stop:** To stop the application, simply close the two command prompt windows that were opened.

## Subsystem Customization
You can fine-tune how the dashboard identifies your robot's subsystems by modifying the `SUBSYSTEM_MAPPING` constant in:
`frontend/src/pages/StatusOverviewPage.tsx`

Add your team's specific log string keywords (e.g., "Arm", "Elevator", "Wrist") to the relevant category list to ensure they appear under the correct health indicator.

## LED Remapping Reference
For future adjustments, the current 2D layout uses the following percentage-based coordinates in `StaticRobotView.tsx`:

*   **Climber**: (28%, 13.5%)
*   **Shooter**: (28%, 30.5%)
*   **Intake**: (28%, 67%)
*   **Drivetrain**: (28%, 84%)
*   **Power**: (20%, 95%) — (Label Enabled)
*   **Vision**: (28%, 95%) — (Label Enabled)

## Troubleshooting
- **Port 8000 or 5173 busy**: If the app fails to start, ensure no other instances of the dashboard or other local servers are running on these ports.
- **Missing Data**: The dashboard decimated logs to **5,000 points per channel** to maintain 60fps UI performance. If you need higher resolution for specific analysis, use a professional tool like AdvantageScope.

## Architecture
- **Backend**: FastAPI parsing binary `.wpilog` files using `wpiutil`.
- **Frontend**: React 19, Vite, MUI, and Chart.js.
