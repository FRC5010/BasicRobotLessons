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
