## Overview
Robot Tour is a problem of repeatable localization and path execution under constraints. The robot must sense or estimate its state, command actuators through a control law, and reject drift imposed by mechanics and the environment. Study by understanding how encoders, gyros, and range sensors complement each other, how differential‑drive kinematics relates commands to motion, and how calibration routines turn variable hardware into predictable behavior.

## Sensing, estimation, and control
Encoders measure wheel rotation that you integrate into linear and angular displacement; they are precise but slip when traction is poor. A gyroscope provides smooth short‑term heading but drifts over time; accelerometers help detect bias changes rather than providing position directly. Range sensors such as ultrasonic or IR report distance to walls or obstacles with geometry‑dependent blind zones and crosstalk. Simple fusion—treating the gyro as short‑term truth and encoders as long‑term reference—stabilizes heading; wall or line references can periodically re‑zero accumulated error. Differential‑drive kinematics maps wheel speeds to body velocity (v, ω), and a PID loop on heading or wall distance corrects deviations. Feedforward sets a nominal command; feedback cancels disturbances.

## Calibration and error sources
Dead‑reckoning error grows with wheel diameter mismatch, backlash and compliance in the drivetrain, floor friction variability, and battery voltage sag. Reduce drift mechanically first: match wheels and axles, square the frame, and distribute mass symmetrically. Then calibrate: command known motions and compare to measured outcomes, compute scale factors for encoders and gyro, and bake a pre‑run battery conditioning routine into operations. For range sensors, characterize useful operating distances and angles and record conditions (surface, temperature) alongside results to explain shifts.

## Navigation patterns
Line following stabilizes lateral error using a single switch or multi‑sensor array; a PD controller damps oscillation. Wall following maintains a target offset with proportional or PD control on range error and handles corners by switching setpoints. Waypoint driving alternates heading holds and straight segments or uses constant (v, ω) to trace arcs. All methods benefit from intentional, brief re‑references to landmarks to arrest drift.

## Worked micro‑examples
- Heading calibration: command a 360° turn by encoders; if the gyro reports 350°, scale the gyro by 360/350 or adjust the encoder ticks‑per‑radian until they agree.
- Wheel mismatch compensation: if a constant command curves right, increase the left wheel’s calibration factor (or reduce the right’s) and verify on long straight runs.
- Range‑based alignment: approach a wall and hold 30 cm; if the robot oscillates, reduce proportional gain or add derivative action; verify steady‑state error and settling time.

## Reliability in practice
Mechanical, electrical, and software hygiene produce reliability. Tighten fasteners and keep axles parallel; secure wiring and provide stable regulators; add watchdogs and bounds to outputs and timeouts to sensor reads. Test on multiple surfaces and start orientations. Most control problems are hardware problems in disguise—fix slop and alignment before fighting the controller.

## Practice prompts
- Design a PD wall follower, describe a tuning plan, and predict behavior at convex and concave corners.
- Propose a simple fusion scheme that uses the gyro to stabilize short‑term heading and encoders to eliminate long‑term drift.
- Create a drift test that quantifies straight‑line deviation per meter and outline acceptance thresholds.

## References
- SciOly Wiki – Robot Tour: https://scioly.org/wiki/index.php/Robot_Tour
