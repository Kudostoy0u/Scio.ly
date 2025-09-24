## Overview
Electric Vehicle rewards deliberate engineering: a chassis that tracks straight, a drivetrain that delivers predictable motion, a brake that stops consistently, and a calibration routine that converts commanded values into distance with a quantified margin. Build for repeatability first, then shave variance; accuracy follows from a stable system and a good model.

## Motion, control, and repeatability
Distance is set by the integral of speed over time, so any variation in speed produces distance error if you stop by time or slip if you stop by wheel turns. Mechanical factors dominate repeatability: wheel diameter uniformity, alignment (toe/camber), drivetrain backlash and compliance, and bearing friction. Control sits atop the mechanics—open‑loop timing is workable if the system is stiff and battery conditioning is consistent, while sensor‑assisted strategies (encoders, limit switches where allowed) can reduce drift but add complexity. Regardless of approach, match the operating point of the motor and gearing to a flat region of the performance curve so minor voltage changes do not swing speed excessively.

## Powertrain and braking
Gear ratio determines the trade between torque and speed; pick ratios that keep acceleration smooth and within traction limits. Wheels set linearization: larger diameters amplify diameter error into distance error, and soft treads change effective diameter under load. Brakes decide your variance budget—mechanical stops (cams, screws) tend to be robust and deterministic, while friction pads are sensitive to surface and wear. If you must use friction, linearize stopping by pre‑slowing or adding a ramp so the last few centimeters occur at near‑constant, low speed.

## Calibration and uncertainty
Treat calibration as an experiment. Sweep commanded values around target distances, measure actuals, and fit a simple model (linear or gently nonlinear) that maps commands to distance. Track temperature, battery voltage, and floor conditions alongside results so you can explain shifts and adjust the safety margin. Report mean error and standard deviation and choose a positive clearance margin that covers typical variance; erring on the safe side beats disqualification for touching.

## Worked micro‑examples
- Time‑based calibration: if 2.10 s yields 9.9 m and 2.12 s yields 10.02 m, linear interpolation places 10.00 m near 2.119 s; add a 1–2 cm safety margin by subtracting a few milliseconds based on observed variance.
- Wheel wear: a 0.25% reduction in diameter produces ~0.25% undershoot; at 10.00 m, that is 25 mm—detectable and correctable if you re‑calibrate.
- Brake ramp: inserting a short, shallow ramp before the hard stop reduces sensitivity to initial speed and lowers variance of the final position.

## Pitfalls
Calibrating at a single distance encourages extrapolation errors; ignoring voltage sag or tire contamination undercuts repeatability; compensating with complex control when a mechanical fix (stiffer frame, aligned axles, lower backlash) would remove the root cause wastes time. Measure, adjust the hardware, then update the model.

## Practice prompts
- Build a residual plot from 20 calibration runs and propose an updated interpolation or a dual‑segment fit.
- Quantify alignment error by measuring lateral drift per meter on different surfaces; outline a correction plan.
- Compare two braking schemes (friction pad vs screw stop) across temperature changes; report mean and variance of stop distance.

## References
- SciOly Wiki – Electric Vehicle: https://scioly.org/wiki/index.php/Electric_Vehicle
