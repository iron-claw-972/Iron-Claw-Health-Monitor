# IronClaw Robot Health Dashboard - Knowledge Base

## Project Overview
A specialized FRC telemetry dashboard for Team 972, built with a FastAPI backend and a React (MUI) frontend.

## Critical Engineering Standards
- **Theme:** Professional Black (#000000) and Orange (#ff9800).
- **Whitelist:** Strict 82-attribute whitelist enforced in `backend/app/log_parser.py`.
- **Path Normalization:** Always strip `NT:/AdvantageKit/` and `NT:/` prefixes.
- **Stability First:** Avoid `chartjs-plugin-zoom` or `chartjs-plugin-annotation` as they cause blank pages. Use the React-based **Timeline Slider** for zooming.

## Health LED Logic (Status Map)
### Battery Voltage
- **Red:** Min < 6.3V (Brownout).
- **Yellow:** Min < 8.5V (Dip).
- **Green:** Avg >= 8.5V.
- *Note: Do not apply this logic to BatteryCurrent.*

### Vision Latency
- **Green (Optimal):** 5ms – 20ms.
- **Yellow (Acceptable):** 20ms – 80ms.
- **Orange (High):** 80ms – 200ms.
- **Red (Poor):** > 200ms.

## Subsystem Mappings
- **Shooter:** Includes flywheels, hood, and **all Turret attributes**.
- **Spindexer:** Strictly includes `spindexer` and `score` paths.
- **Drivetrain:** `drive`, `gyro`, `odometry`, `swerve`.
- **Vision:** `vision`, `photonalerts`, `apriltags`.

## UI/UX Rules
- **Robot Map:** Fixed height of 550px. Indicators center-aligned at 30% width.
- **Plot View:** Ultra-wide cinematic aspect ratio (Sidebar `md:1`, Chart `md:11`).
- **Navigation:** Persistent Home icon and floating Scroll-to-top button.

## Active Task State
1. [DONE] Hierarchical attribute tree with search.
2. [DONE] Battery and Vision health threshold lines on graphs.
3. [DONE] 100% stable timeline zoom via orange slider.
4. [DONE] Corrected subsystem groupings (Turret -> Shooter).
5. [TODO] Implement Match Period markers (Auto/Teleop) using a stable non-plugin UI component.
6. [TODO] Push to GitHub.
7. [TODO] Generate standalone Windows .exe installer.
