# Position and vector math, coordinate frames

Where the robot is, which way it faces, and how its wheels should point all come down to a few
small classes and one question you have to keep asking: measured from where?

The examples come from the course's final code, after
[Lesson 33](../../lessons/v3/33-tuning-with-sysid.md), unless they say otherwise, and each
one links to the lesson section where you write it.

## 1. Translation, rotation, pose

WPILib's geometry comes in three pieces:

- A **`Translation2d`** is a position, or an arrow: an x and a y, in metres.
- A **`Rotation2d`** is an angle: which way something faces.
- A **`Pose2d`** is both together: where the robot is and which way it faces.

<!-- source: lesson-33 Constants.java -->
*Example, from `Constants.java` ([Lesson 7, section 2](../../lessons/v3/07-four-modules.md#2-rename-and-parameterize-the-module) for the corners, [Lesson 16, section 2](../../lessons/v3/16-ground-truth.md#2-how-hard-can-the-chassis-actually-accelerate) for the start, [Lesson 26, section 6](../../lessons/v3/26-drive-to-pose.md#6-the-numbers) for the target):*
```java
public static final Translation2d kFrontLeft  = new Translation2d( kHalfLength,  kHalfWidth);
public static final Translation2d kFrontRight = new Translation2d( kHalfLength, -kHalfWidth);
public static final Translation2d kBackLeft   = new Translation2d(-kHalfLength,  kHalfWidth);
public static final Translation2d kBackRight  = new Translation2d(-kHalfLength, -kHalfWidth);
// ...
public static final Pose2d kSimStartingPose = new Pose2d(3, 3, new Rotation2d());
// ...
public static final Pose2d kScoringPose = new Pose2d(5.0, 4.0, Rotation2d.fromDegrees(90));
```

All three are values that never change once built. A method like `minus` or `rotateBy` gives you
back a new one and leaves the original alone, so its answer has to be stored. <!-- claim: wpilib.swerve-velocity-methods-return-new -->

<details class="quiz" id="q-geometry-1" markdown="1">
<summary>Check yourself: which class holds "at (5, 4), facing 90°"?</summary>

- [ ] `Translation2d` *That's only the position.*
- [ ] `Rotation2d` *That's only the facing.*
- [x] `Pose2d` *A pose is a position and a rotation together.*

</details>

<details class="quiz" id="q-geometry-2" markdown="1">
<summary>Check yourself: `kFrontRight` is `(kHalfLength, -kHalfWidth)`. Why is its y negative?</summary>

- [x] +Y is to the robot's left, so the right-hand corners have negative y. *Forward is +X and left is +Y.*
- [ ] The right side of a robot always uses negative numbers by convention, whatever the axes. *It follows from the axes, not a separate rule.*
- [ ] It's a typo for `kHalfWidth`. *The front corners differ only in the sign of y.*

</details>

## 2. Two frames: the robot's and the field's

A **frame** is a choice of origin and directions. The course uses two.

**The robot's frame** is centred on the chassis: +X is forward, +Y is to the robot's left, and a
positive turn is counterclockwise, seen from above. Figure 7.1 draws it with the four corners.

![Three top-down drawings of the chassis. Left: the axes, with +X pointing up the page as forward and +Y pointing left, a counterclockwise arrow for positive yaw, and the four corners labelled FL 0, FR 1, BL 2, BR 3 with coordinates plus or minus 0.3. Middle: translate, all four wheels pointing the same way, forward and left at 45 degrees. Right: rotate, the four wheels in a pinwheel at 135, 45, minus 135 and minus 45 degrees](../../lessons/v3/images/07-chassis-frame-corners.svg)

*Figure 7.1, from [Lesson 7](../../lessons/v3/07-four-modules.md#figure-7-1) — The chassis frame, the four corners, and the two moves.*

**The field's frame** has its origin at the blue alliance's corner, with +X pointing away from the
blue driver station and +Y to the blue driver's left. Angles are counterclockwise positive here
too. <!-- claim: wpilib-tools.advantagescope-field-orientation --> A robot pose on the field is
in this frame, and the same pose means the same place whichever alliance you're on.

The two agree when the robot faces +X; otherwise you convert. Asking "how far ahead of the robot
is that point?" means moving a field position into the robot's frame: subtract the robot's
position, then rotate by the robot's opposite heading. <!-- claim: wpilib.translation2d-frame-transform -->
Lesson 26 does the same with a line instead of the robot, to measure how far along it the robot
is and how far off to the side:

<!-- source: lesson-33 subsystems/Drivetrain.java -->
*Example, from `Drivetrain.java` ([Lesson 26, section 7](../../lessons/v3/26-drive-to-pose.md#7-stage-one-covering-ground)):*
```java
/** Where 'current' sits relative to a line: x is how far along it, y how far off to the left. */
private static Translation2d inLineFrame(Translation2d start, Rotation2d direction, Pose2d current) {
  return current.getTranslation().minus(start).rotateBy(direction.unaryMinus());
}
```

<details class="quiz" id="q-geometry-3" markdown="1">
<summary>Check yourself: a robot faces the field's 180°. In the robot's own frame, which way is the field's +X?</summary>

- [ ] Forward. *That's only true when it faces 0°.*
- [x] Backward. *Facing 180°, the robot's forward points along the field's −X.*
- [ ] To its left. *That would be facing −90°.*

</details>

<details class="quiz" id="q-geometry-4" markdown="1">
<summary>Check yourself: in `inLineFrame`, why rotate by `direction.unaryMinus()` rather than by `direction`?</summary>

- [ ] It makes the answer positive. *It changes the frame, not the sign.*
- [x] To undo the line's own angle, so that "along the line" becomes the new x. *Moving into a frame turned by θ means turning by −θ.*
- [ ] Because `rotateBy` turns clockwise. *`rotateBy` turns counterclockwise, like every angle here.*

</details>

## 3. Angles wrap

An angle of 350° and one of −10° are the same direction, and 10° away from 0° either way. Plain
subtraction doesn't know that: 0 − 350 is −350, which says "turn almost all the way round". Figure
5.3 shows the long way and the short way.

![Two compass circles. On the left the wheel is at 350 degrees and the target is 0: a long orange arc sweeps 350 degrees all the way around the circle, while a short green arc nudges 10 degrees. On the right the wheel is at minus 170 and the target is 170: the orange arc sweeps 340 degrees round and the green arc turns 20 degrees across the 180 mark](../../lessons/v3/images/05-error-wrap.svg)

*Figure 5.4, from [Lesson 5](../../lessons/v3/05-steering-p-control.md#figure-5-4) — The long way round (orange) and the short way (green), for 350° → 0° and for -170° → 170°.*

So an angle error is always **wrapped** into the range −180° to 180°. Lesson 5 writes the wrap as
two `while` loops; from Lesson 10, `MathUtil.inputModulus` does it in one call: <!-- claim: wpilib.mathutil-helpers -->

<!-- source: lesson-33 subsystems/Drivetrain.java -->
*Example, from `Drivetrain.java` ([Lesson 10, section 4](../../lessons/v3/10-kinematics.md#4-replace-translate-and-rotate-with-one-drive)):*
```java
/** Signed error to 'target' in degrees, wrapped to (-180, 180]. */
private double headingError(double targetDegrees) {
  return MathUtil.inputModulus(targetDegrees - getHeadingDegrees(), -180, 180);
}
```

`Rotation2d` wraps for you: `a.minus(b)` is the shortest signed angle from `b` to `a`, so 170° minus
−170° is −20°, not 340°. <!-- claim: wpilib.rotation2d-minus-wraps --> The aiming code leans on
that:

<!-- source: lesson-33 commands/Aim.java -->
*Example, from `Aim.java` ([Lesson 27, section 2](../../lessons/v3/27-aim-at-tag.md#2-a-heading-you-can-compute)):*
```java
/** Which way the robot would have to face to look straight at the target. */
public static Rotation2d headingToward(Pose2d robot, Translation2d target) {
  // The arrow from the robot to the target. It's empty when the arrow has no
  // length: standing on the target, no way is "toward" it. Keep facing as you are.
  return target.minus(robot.getTranslation()).getAngle().orElse(robot.getRotation());
}

/** How far off that heading the robot currently is, wrapped to ±180°. */
public static Rotation2d error(Pose2d robot, Translation2d target) {
  return headingToward(robot, target).minus(robot.getRotation());
}
```

A `Translation2d`'s angle is an `Optional`, because an arrow of zero length points nowhere. <!-- claim: wpilib.translation-angle-optional -->

<details class="quiz" id="q-geometry-5" markdown="1">
<summary>Check yourself: the robot faces −170° and the target heading is 170°. What does the wrapped error say to do?</summary>

- [ ] Turn 340° counterclockwise. *That's the unwrapped difference.*
- [x] Turn 20° clockwise, an error of −20°. *The short way crosses the 180° mark.*
- [ ] Turn 20° counterclockwise. *Going from −170° to 170° the short way means decreasing past −180°.*

</details>

<details class="quiz" id="q-geometry-6" markdown="1">
<summary>Check yourself: why does `headingToward` end with `.orElse(robot.getRotation())`?</summary>

- [x] Standing on the target, the arrow to it has no length and no angle, so the robot keeps facing as it is. *`getAngle()` is empty for a zero-length arrow.*
- [ ] `getAngle()` sometimes fails at random. *It's empty only for a zero-length arrow.*
- [ ] To make the robot face 0° by default. *It keeps the robot's own heading, whatever that is.*

</details>

## 4. Kinematics: from chassis motion to four wheels

You describe how the robot should move as a **`ChassisVelocities`**: a speed forward, a speed
sideways, and a turn rate. **Kinematics** works out what each wheel must do to make that happen.
Every wheel gets the same push for the translation, plus its own push along the circle for the
turn, as Figure 10.1 shows.

![Two top-down views of the robot with its four corners. On the left, driving forward at 1 m/s, every corner has the same forward arrow. On the right, driving forward while spinning at 2 rad/s, each corner has the same forward arrow plus a different spin arrow along the circle, and the four sums point in four different directions with four different lengths.](../../lessons/v3/images/10-translation-plus-rotation.svg)

*Figure 10.1, from [Lesson 10](../../lessons/v3/10-kinematics.md#figure-10-1) — Each wheel's velocity is the translation plus the spin. The numbers are the corners' places in the array.*

<!-- source: lesson-33 subsystems/Drivetrain.java -->
*Example, from `Drivetrain.java` ([Lesson 10, section 4](../../lessons/v3/10-kinematics.md#4-replace-translate-and-rotate-with-one-drive)):*
```java
/** One tick of chassis motion: convert, desaturate, optimize, command. */
private void applyChassisSpeeds(ChassisVelocities speeds) {
  SwerveModuleVelocity[] states = m_kinematics.toSwerveModuleVelocities(speeds);

  // If the request would drive some wheel past the max, scale ALL wheels
  // down proportionally so the *shape* of the motion is preserved.
  // desaturateWheelVelocities takes a LinearVelocity directly — pass kMaxSpeed as-is.
  states = SwerveDriveKinematics.desaturateWheelVelocities(states, DriveConstants.kMaxSpeed);

  for (int i = 0; i < m_modules.length; i++) {
    states[i] = states[i].optimize(Rotation2d.fromDegrees(m_modules[i].getSteerAngleDegrees()));
    m_modules[i].setDesiredState(states[i]);
  }
  // ...
}
```

Three steps, in that order. `toSwerveModuleVelocities` does the kinematics, returning the wheels
in the order the corners were given. <!-- claim: wpilib.swerve-kinematics-api -->
`desaturateWheelVelocities` scales every wheel down together if any would go past the top speed,
so the motion keeps its shape. <!-- claim: wpilib.swerve-kinematics-api -->
And `optimize` lets a wheel drive backward instead of turning half a circle, as Figure 10.2
shows; it returns a new state, which is why the line assigns it back. <!-- claim: wpilib.swerve-velocity-methods-return-new -->

![Two copies of one steering wheel drawn as a circle, currently pointing at 10 degrees, with kinematics asking for 190 degrees. Left, without optimize: a long orange arc turns the wheel 180 degrees, and the drive runs at plus 2 meters per second. Right, with optimize: the wheel stays at 10 degrees, no steering turn, and the drive runs backward at minus 2 meters per second.](../../lessons/v3/images/10-optimize-short-way.svg)

*Figure 10.2, from [Lesson 10](../../lessons/v3/10-kinematics.md#figure-10-2) — Steering to 190° and driving forward, or staying at 10° and driving backward: the wheel moves the robot the same way, and `optimize` picks the one that needs no pirouette.* <!-- claim: wpilib.swerve-velocity-methods-return-new -->

The reverse also exists: `toChassisVelocities` takes the four wheels' measured states and gives
back the one chassis motion they add up to. <!-- claim: wpilib.swerve-kinematics-inverse -->

<details class="quiz" id="q-geometry-7" markdown="1">
<summary>Check yourself: a request would drive one wheel at 6 m/s, and the top speed is 4.8 m/s. What does `desaturateWheelVelocities` do?</summary>

- [ ] Caps that one wheel at 4.8 m/s and leaves the others. *That would change the shape of the motion.*
- [x] Scales all four wheels down by the same factor, so the fastest is at 4.8 m/s. *The robot moves the same way, only slower.*
- [ ] Throws an exception. *Scaling down is its job.*

</details>

<details class="quiz" id="q-geometry-8" markdown="1">
<summary>Check yourself: someone writes `states[i].optimize(angle);` without assigning it. What happens?</summary>

- [ ] The state is optimized anyway. *`optimize` returns a new state and leaves the old one alone.*
- [x] Nothing changes: the optimized state is thrown away, and the wheel may turn half a circle. *Assign it back: `states[i] = states[i].optimize(angle);`.*
- [ ] It doesn't compile. *It compiles; the result is just ignored.*

</details>

## 5. Odometry, and the fused estimate

**Odometry** works out where the robot is by adding up its own motion: how far each wheel rolled,
and which way the gyro says it faced, tick after tick. <!-- claim: wpilib.swerve-odometry-api -->
It's smooth and quick, but every small error adds up, so it slowly drifts. Figure 16.1 shows how
much, with the cameras left out.

![A graph over six seconds of how far ahead of the truth the estimate is, in centimeters, for three drives. A quarter-stick drive stays at zero. A full-stick start from a stop opens a gap of about 32 centimeters while the robot is moving, which closes to about 8 centimeters after the stick is released and then stays there. Driving full forward and then full reverse opens a gap of about 100 centimeters that closes only to about 78 centimeters and stays there.](../../lessons/v3/images/16-estimate-creeps-ahead.png)

*Figure 16.1, from [Lesson 16](../../lessons/v3/16-ground-truth.md#figure-16-1) — How much farther the estimate has travelled than the truth, with the cameras left out.* <!-- claim: l16.gentle-gap, l16.hardstart-peak, l16.hardstart-held, l16.fwdrev-peak, l16.fwdrev-held -->

A gentle drive stays true. A hard start leaves the estimate about 8 cm ahead for good, and full
forward then full reverse about 78 cm: the wheels slip, and odometry believes them. <!-- claim: l16.gentle-gap, l16.hardstart-held, l16.fwdrev-held -->

The fix is a **pose estimator**: the same wheel-and-gyro update, plus corrections from cameras that
see the field's tags. Each sighting nudges the estimate part of the way toward what the camera
saw, about a tenth of the gap at default trust. <!-- claim: wpilib.pose-estimator-vision-trust -->
The course's `Localizer` holds one, and the drivetrain is its first source:

<!-- source: lesson-33 subsystems/Drivetrain.java -->
*Example, from `Drivetrain.java` ([Lesson 14, section 3](../../lessons/v3/14-pose-estimator.md#3-teach-the-drivetrain-to-be-a-provider)):*
```java
/** As a PoseProvider, the drivetrain contributes wheel-and-gyro odometry. */
@Override
public void updatePoseEstimate(SwerveDrivePoseEstimator estimator) {
  estimator.update(getRotation(), getModulePositions());
}
```

A camera's picture is a little old by the time it arrives, so the estimator keeps a short history,
rewinds to when the picture was taken, blends the correction in there and replays forward. <!-- claim: wpilib.pose-estimator-latency-compensation -->

<details class="quiz" id="q-geometry-9" markdown="1">
<summary>Check yourself: why does pure odometry drift after a hard start, even with a perfect gyro?</summary>

- [ ] The gyro's zero moves. *The gyro is perfect in this question.*
- [x] The wheels slip, and odometry adds up the motion the wheels report, slip included. *It has nothing to check itself against.*
- [ ] Odometry only updates once a second. *It updates every tick.*

</details>

<details class="quiz" id="q-geometry-10" markdown="1">
<summary>Check yourself: at default trust, the estimate is 1 m from where a camera says the robot is. One sighting arrives. Roughly how far off is the estimate now?</summary>

- [ ] 0 m: the camera is believed outright. *A sighting is a nudge, not a reset.*
- [x] About 0.9 m: one sighting closes about a tenth of the gap. *Many sightings over time pull it in.*
- [ ] 0.5 m: it splits the difference. *At default trust it moves about a tenth.*

</details>

## 6. Flipping for the other alliance

The field is built so the red half is the blue half turned round: every tag has a twin at its
half-turn rotation about the field's centre. <!-- claim: wpilib.field-rotational-symmetry -->
So a path, a target or a game piece drawn on the blue side has a red twin, and B-Line's
**`FlippingUtil`** finds it. Its methods flip a position, a rotation, a pose or a speed, rotating
about the centre by default, with a mirrored setting for fields built the other way. <!-- claim: bline.flipping-util-api -->

<!-- source: lesson-33 commands/Autos.java -->
*Example, from `Autos.java` ([Lesson 17, section 8](../../lessons/v3/17-bline-autos.md#8-put-the-robot-where-the-path-starts)):*
```java
public static boolean onRedAlliance() {
  return MatchState.getAlliance().orElse(Alliance.BLUE) == Alliance.RED;
}

/** Where a path starts, on this alliance's side of the field — the same flip BLine makes. */
public static Pose2d startPose(Path path) {
  Pose2d start = path.getAuthoredStartPose().get(); // every path here starts with a waypoint
  return onRedAlliance() ? FlippingUtil.flipFieldPose(start) : start;
}
```

An alliance the Driver Station hasn't reported yet counts as blue, which matches what B-Line does
when it flips a path. <!-- claim: bline.flip-for-alliance --> The same test flips the drive-to-pose
target, the aim tag and the simulated game pieces.

One thing doesn't use `FlippingUtil`: which way the *driver* faces. The two driver stations face
each other however the field is built, so the driver's "away" is just turned 180° on red; the
[Joystick controls](../frc-hardware/03-joystick-controls.md#6-driving-from-either-end) page shows
it.

<details class="quiz" id="q-geometry-11" markdown="1">
<summary>Check yourself: the field is 16.54 m by 8.07 m and flips by rotation about its centre. Where is the red twin of a blue point at (2, 1)?</summary>

- [ ] (14.54, 1), mirrored across the centre line. *That's a mirror flip, not a rotation.*
- [x] (14.54, 7.07): both x and y are flipped about the centre. *A half turn sends (x, y) to (16.54 − x, 8.07 − y).*
- [ ] (2, 7.07) *Only y changed; a half turn changes both.*

</details>

<details class="quiz" id="q-geometry-12" markdown="1">
<summary>Check yourself: during practice the Driver Station hasn't reported an alliance yet. What does `onRedAlliance()` return?</summary>

- [ ] It throws, because the alliance is unknown. *`orElse(Alliance.BLUE)` covers the empty case.*
- [x] False: an unknown alliance counts as blue. *That matches what B-Line does with an unreported alliance.*
- [ ] True. *Unknown is treated as blue.*

</details>

## Common mistakes

- **Mixing frames**: comparing a field position with a robot-frame one, or driving
  robot-relative from a field-relative request ([section 2](#2-two-frames-the-robots-and-the-fields)).
- **Subtracting angles without wrapping.** Use `MathUtil.inputModulus` or `Rotation2d.minus`.
- **Calling `optimize` (or `minus`, `rotateBy`, `toRobotRelative`) without keeping the result.**
  They return a new value.
- **Trusting odometry for long.** It drifts; let the cameras correct it.
- **Forgetting the red side.** A target written for blue needs its twin on red.
- **Flipping the driver's view with `FlippingUtil`.** The driver stations face each other
  whatever the field's symmetry.

## Where this comes from

- **[Lesson 5](../../lessons/v3/05-steering-p-control.md):** wrapping an angle.
- **[Lesson 7](../../lessons/v3/07-four-modules.md):** the chassis frame and its corners.
- **[Lesson 10](../../lessons/v3/10-kinematics.md):** kinematics, `optimize` and
  `MathUtil.inputModulus`.
- **[Lesson 11](../../lessons/v3/11-odometry-field.md):** odometry and the field.
- **[Lesson 14](../../lessons/v3/14-pose-estimator.md):** the pose estimator.
- **[Lesson 16](../../lessons/v3/16-ground-truth.md):** how odometry drifts.
- **[Lesson 17](../../lessons/v3/17-bline-autos.md):** flipping for red.
- **[Lesson 26](../../lessons/v3/26-drive-to-pose.md):** a line's own frame.
- **[Lesson 27](../../lessons/v3/27-aim-at-tag.md):** headings toward a point.

## Quick reference

| You write | What it does |
|---|---|
| `new Translation2d(x, y)` | a position or an arrow, in metres |
| `Rotation2d.fromDegrees(deg)` | an angle |
| `new Pose2d(x, y, rotation)` | a position and a facing |
| `a.minus(b)` | the arrow from `b` to `a`; for rotations, the shortest signed angle |
| `t.rotateBy(rotation)` | turn an arrow counterclockwise |
| `t.getAngle()` | an arrow's direction, as an `Optional` |
| `MathUtil.inputModulus(error, -180, 180)` | wrap an angle error |
| `kinematics.toSwerveModuleVelocities(speeds)` | chassis motion to four wheels |
| `SwerveDriveKinematics.desaturateWheelVelocities(states, max)` | scale all wheels under the top speed |
| `state.optimize(currentAngle)` | drive backward rather than turn round; keep the result |
| `speeds.toRobotRelative(heading)` | a field-relative request in the robot's frame |
| `estimator.update(rotation, positions)` | add a tick of wheel-and-gyro motion |
| `FlippingUtil.flipFieldPose(pose)` | the red twin of a blue pose |
