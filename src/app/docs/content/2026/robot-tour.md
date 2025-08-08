# Robot Tour (2026)

Division: C  
Type: Build (Autonomous)  
Participants: 2  
Allowed Materials: Components per rules; logs; safety; impound

## Overview
Autonomous robot navigates a course to reach a target within constraints.

## Core Topics
- Sensors and control strategies; odometry  
- Obstacle avoidance and calibration  
- Scoring optimization and reliability

## Deep dives
- Sensing: encoders, IMU, IR/ultrasonic/LiDAR (if allowed); sensor fusion basics
- Control: open-loop vs closed-loop; PID tuning workflow; odometry drift and mitigation
- Navigation: path planning with constraints; calibration landmarks; wall following

## Testing and logs
- Course analogs: tape layout with comparable geometry; measure repeatability and drift
- Logs: start pose, environmental conditions, success metrics; adjust parameters systematically

## Strategy
- Tune control (PID or open-loop compensation)  
- Test in realistic courses; measure success rates  
- Prepare for on-site adjustments

## References
- SciOly Wiki: https://scioly.org/wiki/index.php/Robot_Tour
