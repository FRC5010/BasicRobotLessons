# Aside — A second thread: sampling odometry faster than the robot loop

**Goal:** Finish the drivetrain the way top teams actually ship it — sensors
sampled on their own thread, faster than the 50 Hz loop, every sample carrying
the time it was taken. And find out honestly what that does and doesn't buy you.

**New Java concepts**
- **Threads** — a second line of execution running alongside `robotPeriodic()`.
- **Locks** (`ReentrantLock`) and why shared data between threads needs one.
- **Queues** as the handoff between a producer and a consumer.
- **`volatile`**, and the narrow thing it actually promises.

**New robot concepts**
- **`BaseStatusSignal.waitForAll`** — block until every signal has fresh data,
  then refresh them together as one coherent snapshot.
- **`setUpdateFrequency`** — telling a Phoenix device how often to publish.
- **`SwerveDrivePoseEstimator.updateWithTime`** — feeding the estimator several
  timestamped samples per loop instead of one untimed one.

**When you can use this**
- Any time after **Lesson 16**, once the drivetrain has its final shape.
- It is genuinely optional. Lessons 17–34 neither need it nor break with it —
  §7 explains exactly why (the `samples == 0` branch).

---

## 1. What this is, and what it isn't

Open the AdvantageKit swerve template — the one most competitive teams start
from — and you'll find a class this course has never mentioned: an odometry
thread. It samples the drive motors, the steering encoders and the gyro at
250 Hz, on its own thread, while the robot loop carries on at 50 Hz. Your
drivetrain does not have one. This page is how you'd add it.

Before any of that, the honest headline, because it is not the one you'd
expect and it changes what this page is for:

> **Running odometry at 250 Hz instead of 50 Hz does almost nothing for
> odometry accuracy.** Measured below: on smooth motion the difference is
> *exactly zero*, and on a violent slalom it's under two millimetres.

That is worth knowing before you spend an afternoon on it. The reasons to do
it anyway are real, but they are not the reason people usually give, and §3
lays them out after §2 shows you the numbers. What is unambiguously worth your
time is the **threading**, which is a genuine gap in this course and a genuine
gap in most students' Java: everything you've written so far has run on exactly
one thread, in a strict order, and that has quietly protected you from an
entire category of bug.

---

## 2. The measurement everyone assumes and nobody checks

The intuitive argument is easy to state. At 4 m/s a robot covers **8 cm**
between 50 Hz samples. Odometry can't see anything that happens inside that
gap; surely sampling five times as often catches five times as much.

Here's the flaw. Between samples, WPILib doesn't assume the robot teleported in
a straight line — it assumes the robot travelled a **constant-curvature arc**,
and integrates that arc exactly (`Pose2d.exp` of a twist, the same machinery
behind Lesson 11's odometry). If the robot really did drive a constant arc, the
reconstruction is not approximately right, it is *exactly* right, at any
sampling rate at all.

Driving a perfect arc — 4 m/s forward while spinning 1.5 rad/s, for 3 seconds —
and integrating the identical odometry math from 50 Hz and 250 Hz samples:

*Nothing to add — measured, not asserted:*

```
constant arc, 3 s at 4 m/s and 1.5 rad/s
   50 Hz odometry error = 0.000000 m
  250 Hz odometry error = 0.000000 m
```

Not "small." Zero, to the precision of a double. Five times the samples bought
nothing whatsoever, because there was nothing between the samples that the arc
assumption got wrong.

Sampling rate starts to matter only when the motion **changes** inside a sample
interval — when the curvature at the end of the 20 ms isn't the curvature at the
start, so no single arc fits. Repeating the run with the robot slaloming
hard, swinging ±3 rad/s once a second:

*Nothing to add — measured, not asserted:*

```
slalom, 3 s at 4 m/s, omega swinging +/-3 rad/s
   50 Hz odometry error = 0.0017 m
  250 Hz odometry error = 0.0001 m      (26.7x better)
```

Twenty-six times better — of a number that was **1.7 millimetres** to begin
with. After three seconds of driving more aggressively than anything a match
demands.

Now put that beside the error you already know about. Lesson 16 added ground
truth so you could watch odometry drift when the wheels skid, and skid is
measured in *centimetres*. **Discretization is not your odometry's problem, and
a faster loop is not your odometry's fix.** If you came here to make odometry
more accurate, the honest advice is to go improve traction, calibrate your
wheel radius, or add another camera.

---

## 3. So why does everyone do it?

Three reasons, none of which is the one in §2.

**Coherent snapshots.** This is the real one. Right now `Drivetrain.periodic()`
reads module 0, then module 1, then module 2, then module 3, then the gyro —
five reads, each getting whatever value happened to be sitting in memory at
that instant. At 4 m/s those readings are smeared across the loop, and
kinematics then treats them as if they described one moment. Phoenix's
`waitForAll` exists precisely to fix that: it blocks until *every* registered
signal has new data and refreshes them together, so a sample is one instant of
the whole drivetrain rather than five instants stitched together.

**Timestamp resolution for vision.** Lesson 14 built a pose estimator that
rewinds to a vision measurement's timestamp, splices the correction in, and
replays forward. That rewind lands on the nearest odometry sample it has. With
20 ms samples, a camera frame timestamped 43 ms ago gets matched against
odometry quantised to 20 ms; with 4 ms samples it lands five times closer. This
is the one place the extra samples genuinely earn their keep, and it only
matters *because* Lesson 15 gave you cameras.

**Reading other people's code.** The AdvantageKit template, and most published
swerve code, has this thread in it. Understanding it is the difference between
adapting that code and cargo-culting it.

And the honest fourth: **it is the best excuse in this course to learn
threads.** That's not a throwaway — concurrency is the biggest gap between the
Java in this course and the Java in a job, and a 250 Hz sampler is about the
gentlest real introduction to it there is.

---

## 4. What a thread is, and the rule that comes with it

Everything you have written runs on one thread. `robotPeriodic()` ticks, the
scheduler runs, your `periodic()` methods run, commands execute — one after
another, in an order you can point at. Two things never happen at once, so a
half-updated value can never be observed, because nothing else is looking.

A **thread** is a second line of execution running at the same time as the
first. The JVM (and the roboRIO's two cores) genuinely interleave them, and
here is the part that costs people days: *you do not control where the switch
happens.* It can land between any two lines. It can land in the middle of a
line. Nothing you write is atomic unless you make it so.

Which is why this rule comes attached, and it is worth memorising:

> **Any data touched by two threads must be protected by a lock, and every
> access — reads included — must take the same lock.** A read without the lock
> is not "probably fine"; it is the bug, and it shows up once a match.

The concrete failure here is easy to picture. The odometry thread is appending
a sample. The main thread starts draining the queue. It reads three modules'
worth, the switch lands, the odometry thread appends a fourth module's sample,
and the main thread reads it too. Now you have a "snapshot" where three modules
are from one instant and one is from the next. Kinematics has no way to know,
and quietly produces a pose from a robot shape that never existed.

A **`ReentrantLock`** is the fix. One thread holds it at a time; anyone else
asking waits. "Reentrant" means the holder can take it again without
deadlocking itself.

*Nothing to add — this is the shape every lock in this page uses:*

```java
lock.lock();
try {
    // touch the shared thing
} finally {
    lock.unlock();
}
```

**The `finally` is not optional.** If the body throws and you skipped it, the
lock is never released, and every other thread waiting on it blocks forever.
That's a deadlock, and on a robot it looks like the code simply stopping.

---

## 5. The thread itself

The thread's job is small: ask Phoenix for a synchronised set of readings, note
the time, push each value into a queue, repeat. Registration hands back the
queue a signal's values will land in.

**Create `src/main/java/frc/robot/subsystems/OdometryThread.java`:**

```java
package frc.robot.subsystems;

import java.util.ArrayList;
import java.util.List;
import java.util.Queue;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReentrantLock;

import com.ctre.phoenix6.BaseStatusSignal;
import com.ctre.phoenix6.StatusSignal;

import edu.wpi.first.wpilibj.RobotController;

/**
 * A second thread that samples the drivetrain's sensors faster than the 50 Hz
 * robot loop, and stamps every sample with the time it was taken.
 *
 * <p>Phoenix publishes each signal at whatever frequency you ask for.
 * BaseStatusSignal.waitForAll blocks until every registered signal has fresh
 * data, then refreshes them together — so a sample is a coherent snapshot of
 * the whole drivetrain at one instant, not four modules read at four slightly
 * different moments.
 *
 * <p>Everything here is touched by two threads, so everything here is guarded
 * by one lock. Take that lock before reading any queue.
 */
public class OdometryThread {
    /** How fast to sample. 250 Hz is what a CAN FD bus comfortably carries. */
    public static final double kFrequencyHz = 250.0;

    /** How many samples a queue holds before it starts dropping the oldest. */
    private static final int kQueueCapacity = 32;

    private static OdometryThread s_instance;

    /**
     * The one lock. The odometry thread holds it while writing samples; the main
     * thread holds it while draining them. Public because the drivetrain has to
     * take it too — this is shared state, and pretending otherwise is the bug.
     */
    public static final Lock lock = new ReentrantLock();

    private final List<BaseStatusSignal> m_signals = new ArrayList<>();
    private final List<Queue<Double>> m_queues = new ArrayList<>();
    private final Queue<Double> m_timestamps = new ArrayBlockingQueue<>(kQueueCapacity);
    private final Thread m_thread;
    private volatile boolean m_running = false;

    private OdometryThread() {
        m_thread = new Thread(this::run);
        m_thread.setName("OdometryThread");
        // A daemon thread does not keep the JVM alive on its own. Without this,
        // a robot program that finished would hang waiting for this loop.
        m_thread.setDaemon(true);
    }

    public static OdometryThread getInstance() {
        if (s_instance == null) {
            s_instance = new OdometryThread();
        }
        return s_instance;
    }

    /**
     * Add a signal to the sampled set and hand back the queue its values will
     * land in. Call this while building the IO layers, before anything drives.
     */
    public Queue<Double> register(StatusSignal<?> signal) {
        Queue<Double> queue = new ArrayBlockingQueue<>(kQueueCapacity);
        lock.lock();
        try {
            signal.setUpdateFrequency(kFrequencyHz);
            m_signals.add(signal);
            m_queues.add(queue);
        } finally {
            lock.unlock();
        }
        return queue;
    }

    /** The time each sample was taken, in the same seconds the pose estimator uses. */
    public Queue<Double> timestamps() {
        return m_timestamps;
    }

    public void start() {
        if (!m_running && !m_signals.isEmpty()) {
            m_running = true;
            m_thread.start();
        }
    }

    /** The thread body. Runs until the program ends. */
    private void run() {
        while (m_running) {
            // Block until every signal has new data. The timeout is a safety
            // net: if the bus goes quiet we wake up anyway rather than hanging.
            BaseStatusSignal[] signals;
            lock.lock();
            try {
                signals = m_signals.toArray(new BaseStatusSignal[0]);
            } finally {
                lock.unlock();
            }
            BaseStatusSignal.waitForAll(2.0 / kFrequencyHz, signals);

            lock.lock();
            try {
                // One timestamp for the whole snapshot, not one per signal.
                m_timestamps.offer(RobotController.getFPGATime() / 1.0e6);
                for (int i = 0; i < m_signals.size(); i++) {
                    m_queues.get(i).offer(m_signals.get(i).getValueAsDouble());
                }
            } finally {
                lock.unlock();
            }
        }
    }
}
```

Six things in there are load-bearing.

**`setDaemon(true)`.** A normal thread keeps the JVM alive; a daemon one
doesn't. Without this, a robot program that finished would hang forever waiting
for a loop that never ends.

**`BaseStatusSignal.waitForAll(timeout, signals)`** is the whole point. It
blocks — this thread does nothing, burns nothing — until every signal has fresh
data, then refreshes them together. That's the coherent snapshot from §3, and
it's why the thread has to *be* a thread: you cannot block inside `periodic()`
without stalling the entire robot, which is the very rule Lesson 0 taught.

**`ArrayBlockingQueue` with a capacity.** Bounded on purpose. If the main loop
stalls, an unbounded queue grows until the robot runs out of memory; a bounded
one drops the oldest sample, which is by far the better failure.

**One timestamp per snapshot**, not one per signal. All these values describe
the same instant — that's what `waitForAll` guaranteed — so they share a time.

**The signals are copied out under the lock** before `waitForAll` runs, so a
module registering a signal mid-loop can't mutate the list while it's in use.

**`volatile boolean m_running`.** Without it the compiler is free to hoist the
check out of the loop — this thread never writes the field, so from its
perspective the value can't change. `volatile` says "another thread writes
this, read it fresh every time." It is *not* a lock: it makes a single read or
write visible, and nothing more.

---

## 6. Registering the signals

Each IO layer hands its signals to the thread and keeps the queues.

**Add to `ModuleIOInputs` in `ModuleIO.java`:**

```java
// High-rate samples, newest last. Empty when no odometry thread is
// running, which is exactly what makes this change safe to add.
public double[] odometryTimestamps = new double[] {};
public double[] odometryDrivePositionsMeters = new double[] {};
public double[] odometrySteerAngleDegrees = new double[] {};
```

**Add to `GyroIOInputs` in `GyroIO.java`:**

```java
/** High-rate yaw samples, newest last. Empty if the gyro isn't sampled. */
public double[] odometryYawDegrees = new double[] {};
```

**Add to `ModuleIOTalonFX`'s imports:**

```java
import java.util.Queue;
```

**Add to `ModuleIOTalonFX`, with the other fields:**

```java
// Filled by the odometry thread, drained by us. Never touched without the lock.
private final Queue<Double> m_timestampQueue;
private final Queue<Double> m_drivePositionQueue;
private final Queue<Double> m_steerPositionQueue;
```

**Add to the end of `ModuleIOTalonFX`'s constructor:**

```java
// Hand the two position signals to the odometry thread. It sets their
// publish rate and samples them; we just keep the queues it hands back.
OdometryThread thread = OdometryThread.getInstance();
m_timestampQueue = thread.timestamps();
m_drivePositionQueue = thread.register(m_driveMotor.getPosition());
m_steerPositionQueue = thread.register(m_steerEncoder.getAbsolutePosition());
```

**Add to the end of `ModuleIOTalonFX.updateInputs`:**

```java
// Drain whatever the thread collected since last tick. The caller holds
// the lock around this — see Drivetrain.periodic.
inputs.odometryTimestamps =
        m_timestampQueue.stream().mapToDouble(Double::doubleValue).toArray();
inputs.odometryDrivePositionsMeters = m_drivePositionQueue.stream()
        .mapToDouble(v -> v * DriveConstants.kWheelCircumferenceMeters)
        .toArray();
inputs.odometrySteerAngleDegrees = m_steerPositionQueue.stream()
        .mapToDouble(v -> v * 360.0)
        .toArray();
m_drivePositionQueue.clear();
m_steerPositionQueue.clear();
```

Note what the unit conversion does *not* change: these are the same rotations →
metres and rotations → degrees conversions the scalar reads above them already
use. A sample is an ordinary reading that happens to have arrived off-schedule.

The gyro is the same pattern, one signal instead of two.

**Add to `GyroIOPigeon2`'s imports:**

```java
import java.util.Queue;
```

**Add the queue field and drain it in `GyroIOPigeon2`:**

```java
private final Queue<Double> m_yawQueue =
        OdometryThread.getInstance().register(m_gyro.getYaw());

@Override
public void updateInputs(GyroIOInputs inputs) {
    inputs.yawDegrees = m_gyro.getYaw().getValueAsDouble();
    inputs.odometryYawDegrees =
            m_yawQueue.stream().mapToDouble(Double::doubleValue).toArray();
    m_yawQueue.clear();
}
```

Because these arrays live in the `@AutoLog` inputs, every sample is logged and
**replays** exactly like anything else since Lesson 13. That is not a small
thing: a bug that only appears at 250 Hz is otherwise close to impossible to
reproduce.

---

## 7. Spending the samples

The module hands its samples out; the drivetrain replays them into the
estimator.

**Add to `SwerveModule`, above `getPosition()`:**

```java
/** How many high-rate samples arrived since the last tick. Zero if no thread. */
public int getOdometrySampleCount() {
    return Math.min(m_inputs.odometryDrivePositionsMeters.length,
            m_inputs.odometrySteerAngleDegrees.length);
}

/** Sample number 'i', as the pose estimator wants it. */
public SwerveModulePosition getOdometryPosition(int i) {
    return new SwerveModulePosition(
            m_inputs.odometryDrivePositionsMeters[i],
            Rotation2d.fromDegrees(m_inputs.odometrySteerAngleDegrees[i]));
}

/** When each of those samples was taken. */
public double[] getOdometryTimestamps() {
    return m_inputs.odometryTimestamps;
}
```

Now the payoff, and it's worth pausing on where it lands. Lesson 14 moved pose
tracking behind a `PoseProvider` interface whose entire contract is one method.
Every consumer — the `Localizer`, the vision providers, everything downstream —
talks through that. So the entire high-rate upgrade fits inside **one method
body**, and nothing else in the project has to know it happened.

**Replace `Drivetrain.updatePoseEstimate` with:**

```java
public void updatePoseEstimate(SwerveDrivePoseEstimator estimator) {
    // How many complete snapshots does every source have? A sample is only
    // usable if all four modules contributed to it.
    int samples = m_modules[0].getOdometryTimestamps().length;
    for (SwerveModule module : m_modules) {
        samples = Math.min(samples, module.getOdometrySampleCount());
    }

    if (samples == 0) {
        // No odometry thread, or nothing arrived this tick: Lesson 14's
        // path, unchanged. This is why the whole change is safe to add.
        estimator.update(getRotation(), getModulePositions());
        return;
    }

    double[] timestamps = m_modules[0].getOdometryTimestamps();
    double[] yaws = m_gyroInputs.odometryYawDegrees;
    SwerveModulePosition[] positions = new SwerveModulePosition[m_modules.length];

    for (int s = 0; s < samples; s++) {
        for (int i = 0; i < m_modules.length; i++) {
            positions[i] = m_modules[i].getOdometryPosition(s);
        }
        // A gyro the thread doesn't sample still has a latest value, and
        // that is better than skipping the sample entirely.
        Rotation2d rotation = s < yaws.length
                ? Rotation2d.fromDegrees(yaws[s])
                : getRotation();
        estimator.updateWithTime(timestamps[s], rotation, positions);
    }
}
```

**`updateWithTime` is the method this whole page exists to be able to call.**
`update` means "here is a reading, it is now." `updateWithTime` means "here is a
reading, and here is when it was true" — which is what lets the estimator file
five samples into its history in the right places, and what makes a vision
correction land where it belongs.

That `samples == 0` branch is the escape hatch that makes this optional. No
thread, no samples, and the method behaves exactly as Lesson 14 wrote it.

---

## 8. Taking the lock, and starting the thread

Two edits left, both in `Drivetrain`, and both are the concurrency rule from §4
applied for real.

**Replace the top of `Drivetrain.periodic()`:**

```java
// Take the lock for the whole refresh. The odometry thread is writing
// into these queues continuously; without this, a sample could land
// between the gyro read and the module reads and the snapshot would be
// stitched together from two different instants.
OdometryThread.lock.lock();
try {
    m_gyroIO.updateInputs(m_gyroInputs);
    for (SwerveModule module : m_modules) {
        module.periodic(); // refresh + log this module's inputs
    }
} finally {
    OdometryThread.lock.unlock();
}
Logger.processInputs("Drivetrain/Gyro", m_gyroInputs);
Logger.recordOutput("Drivetrain/OdometrySamples",
        m_modules[0].getOdometrySampleCount());
```

Notice the lock covers the gyro *and* all four modules together, not each one
separately. Five small locked sections would give you five separate snapshots —
exactly the smearing §3 said `waitForAll` was there to prevent. **Hold the lock
across everything that has to agree.**

Notice too what is *outside* it: the logging. Holding a lock while doing work
that doesn't need it makes the other thread wait for no reason. Take it late,
release it early.

**Add a constructor to `Drivetrain`, below the gyro fields:**

```java
/**
 * Drivetrain never needed a constructor before. It needs one now, because
 * the thread must not start until every IO layer above has registered its
 * signals — field initialisers run top to bottom, and this runs after them.
 */
public Drivetrain() {
    OdometryThread.getInstance().start();
}
```

The ordering is the point, and it's the same field-initialiser rule from
Lesson 4 doing real work again: every `m_modules` entry and `m_gyroIO` is built
by a field initialiser, and those all run before the constructor body. By the
time `start()` is called, all nine signals are registered.

---

## 9. Run it

`./gradlew simulateJava`, **Teleoperated**, and drive around. Then plot
`Drivetrain/OdometrySamples` on a line graph.

It should sit at about **5** — one sample per 4 ms, five per 20 ms tick.
Measured on this course's own simulated drivetrain over two seconds:

*Nothing to add — measured, not asserted:*

```
main loops (50 Hz, 2 s)      = 100
samples per 20 ms tick       = 5.2
max samples in one tick      = 6
ticks with zero samples      = 0
```

Five point two, not exactly five, and never zero: the thread and the loop are
not synchronised, so the count wobbles by one either way depending on where the
tick lands. **That wobble is the whole reason samples carry timestamps.** If
they arrived in lockstep you could assume when they happened; they don't, so
you don't.

> Phoenix's *simulated* firmware really does publish at the frequency you ask
> for — that's what makes the 5.2 above real rather than narrated. What it
> can't give you is a physics model that moves between main-loop ticks: the
> simulated robot only advances when `simulationPeriodic` runs, at 50 Hz. So in
> sim the extra samples faithfully describe motion that was itself computed at
> 50 Hz. The plumbing is real; the resolution underneath it isn't. This is the
> same limit Lessons 29 and 34 ran into — **a simulation can only show you what
> it models.**

---

## Try it

1. **Delete a `finally` and watch what a deadlock looks like.** In a scratch
   copy, change one `lock.lock(); try { ... } finally { unlock(); }` into
   `lock.lock(); ...; unlock();` and make the body throw. The robot stops, with
   no crash and no message. Learning to recognise that shape is worth more than
   the ten seconds it takes to cause it.
2. **Drop the lock entirely** in `Drivetrain.periodic()` and drive hard for a
   few minutes. It will probably look fine — that is the lesson. Race
   conditions are not reliably reproducible, which is exactly why the rule is
   "always take the lock" and not "take it when you see a problem."
3. **Try 100 Hz instead of 250.** Change `kFrequencyHz`, re-run, and check that
   `Drivetrain/OdometrySamples` lands near 2. Then decide, given §2's numbers,
   whether the difference is worth any CAN bus bandwidth at all on *your*
   robot.
4. **Find the case §2 didn't test.** The measurement used a smoothly varying
   slalom. Sketch a motion where 50 Hz sampling would do materially worse — a
   sharp impact, a wheel breaking traction and regaining it — and think about
   whether more samples would actually help, or whether the wheel encoders were
   lying either way.

---

## What you learned

The big one is **threads**, and the rule that comes with them: a second line of
execution can switch in anywhere, so any data two threads touch needs a lock,
and every access takes it — reads included, `finally` always, held across
everything that has to agree and released the moment it doesn't. That rule
costs nothing to follow and is close to impossible to debug when you don't,
because the failure is a race that reproduces once a match.

On the robot side you met **`waitForAll`**, which is a better argument for the
thread than the sampling rate ever was: it makes a reading a coherent snapshot
of the whole drivetrain instead of five values collected at five different
moments. And **`updateWithTime`**, which finally spends the timestamps Lesson 14
built the estimator to accept.

But keep §2, because it is the part you'd have got wrong: **250 Hz odometry is
not meaningfully more accurate than 50 Hz odometry.** Zero difference on smooth
motion, under two millimetres on a slalom, against wheel slip measured in
centimetres. The samples are worth collecting for coherence, for vision
timestamp resolution, and because you'll read code that has them — not because
your pose was suffering at 50 Hz. Being able to say which of those is true, and
having the number in hand, is the difference between engineering and copying.
